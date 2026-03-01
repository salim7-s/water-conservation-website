import express from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { validateWaterUsage } from '../middleware/validation.js';
import { calculateUserGoalsProgress } from '../utils/calculateGoalProgress.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/water-usage
 * Get water usage records (user's own or all if admin)
 */
router.get('/', async (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'admin') {
      query = `
        SELECT wu.*, u.firstname, u.lastname, ws.source_name
        FROM water_usage wu
        LEFT JOIN users u ON wu.user_id = u.user_id
        LEFT JOIN water_source ws ON wu.source_id = ws.source_id
        ORDER BY wu.date DESC, wu.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT wu.*, ws.source_name
        FROM water_usage wu
        LEFT JOIN water_source ws ON wu.source_id = ws.source_id
        WHERE wu.user_id = ?
        ORDER BY wu.date DESC, wu.created_at DESC
      `;
      params = [req.user.user_id];
    }

    const [usage] = await pool.execute(query, params);
    res.json(usage);
  } catch (error) {
    console.error('Error fetching water usage:', error);
    res.status(500).json({ error: 'Failed to fetch water usage' });
  }
});

/**
 * GET /api/water-usage/stats
 * Get usage statistics for current user
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Daily usage
    const [daily] = await pool.execute(
      `SELECT SUM(quantity_used) as total, SUM(cost) as total_cost, COUNT(*) as count
       FROM water_usage 
       WHERE user_id = ? AND date = CURDATE()`,
      [userId]
    );

    // Weekly usage
    const [weekly] = await pool.execute(
      `SELECT SUM(quantity_used) as total, SUM(cost) as total_cost, COUNT(*) as count
       FROM water_usage 
       WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
      [userId]
    );

    // Monthly usage
    const [monthly] = await pool.execute(
      `SELECT SUM(quantity_used) as total, SUM(cost) as total_cost, COUNT(*) as count
       FROM water_usage 
       WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
      [userId]
    );

    // Predictions (enhanced with trend analysis)
    const [avgDaily] = await pool.execute(
      `SELECT AVG(quantity_used) as avg_daily
       FROM water_usage 
       WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
      [userId]
    );

    // Get previous month average for trend
    const [prevAvgDaily] = await pool.execute(
      `SELECT AVG(quantity_used) as avg_daily
       FROM water_usage 
       WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
       AND date < DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
      [userId]
    );

    const currentAvg = parseFloat(avgDaily[0]?.avg_daily) || 0;
    const previousAvg = parseFloat(prevAvgDaily[0]?.avg_daily) || 0;

    // Calculate trend
    let trend = 'stable';
    let trendFactor = 1.0;
    if (previousAvg > 0) {
      const change = ((currentAvg - previousAvg) / previousAvg) * 100;
      if (change > 10) {
        trend = 'increasing';
        trendFactor = 1.1; // Predict 10% increase
      } else if (change < -10) {
        trend = 'decreasing';
        trendFactor = 0.9; // Predict 10% decrease
      }
    }

    const predictedWeekly = currentAvg * 7 * trendFactor;
    const predictedMonthly = currentAvg * 30 * trendFactor;

    res.json({
      daily: daily[0],
      weekly: weekly[0],
      monthly: monthly[0],
      predictions: {
        nextWeek: Math.round(predictedWeekly * 100) / 100,
        nextMonth: Math.round(predictedMonthly * 100) / 100,
        trend: trend,
        avgDaily: Math.round(currentAvg * 100) / 100
      },
    });
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    res.status(500).json({ error: 'Failed to fetch usage statistics' });
  }
});

/**
 * GET /api/water-usage/:id
 * Get water usage record by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [usage] = await pool.execute(
      `SELECT wu.*, ws.source_name
       FROM water_usage wu
       LEFT JOIN water_source ws ON wu.source_id = ws.source_id
       WHERE wu.usage_id = ?`,
      [id]
    );

    if (usage.length === 0) {
      return res.status(404).json({ error: 'Water usage record not found' });
    }

    // Users can only view their own records unless admin
    if (req.user.role !== 'admin' && usage[0].user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(usage[0]);
  } catch (error) {
    console.error('Error fetching water usage:', error);
    res.status(500).json({ error: 'Failed to fetch water usage' });
  }
});

/**
 * POST /api/water-usage
 * Create new water usage record
 */
router.post('/', validateWaterUsage, async (req, res) => {
  try {
    const { user_id, source_id, purpose, date, quantity_used, cost } = req.body;

    // Users can only create records for themselves unless admin
    if (req.user.role !== 'admin' && parseInt(user_id) !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [result] = await pool.execute(
      `INSERT INTO water_usage (user_id, source_id, purpose, date, quantity_used, cost) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, source_id, purpose, date, quantity_used, cost || 0]
    );

    const [newUsage] = await pool.execute(
      'SELECT * FROM water_usage WHERE usage_id = ?',
      [result.insertId]
    );

    // Auto-update goal progress for this user (critical - must work)
    try {
      await calculateUserGoalsProgress(parseInt(user_id));
      console.log(`✅ Updated goal progress for user ${user_id} after water usage entry`);
    } catch (error) {
      console.error('Error updating goal progress:', error);
      // Log but don't fail the request
    }

    // Check for anomalies and generate alerts if needed
    try {
      const [avgData] = await pool.execute(
        `SELECT AVG(quantity_used) as avg_usage
         FROM water_usage
         WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
        [user_id]
      );

      const avgUsage = parseFloat(avgData[0]?.avg_usage) || 0;
      if (avgUsage > 0) {
        const [todayData] = await pool.execute(
          `SELECT SUM(quantity_used) as today_usage
           FROM water_usage
           WHERE user_id = ? AND date = CURDATE()`,
          [user_id]
        );

        const todayUsage = parseFloat(todayData[0]?.today_usage) || 0;
        if (todayUsage >= avgUsage * 1.5 && todayUsage > 0) {
          // Check if alert already exists
          const [existingAlerts] = await pool.execute(
            `SELECT alert_id FROM alerts
             WHERE user_id = ? AND alert_type = 'high_usage' AND alert_date = CURDATE()`,
            [user_id]
          );

          if (existingAlerts.length === 0) {
            const increasePercent = Math.round(((todayUsage - avgUsage) / avgUsage) * 100);
            const message = `Your water usage today (${Math.round(todayUsage)}L) is ${increasePercent}% higher than your 30-day average (${Math.round(avgUsage)}L).`;

            await pool.execute(
              `INSERT INTO alerts (user_id, alert_type, status, alert_date, message, severity)
               VALUES (?, 'high_usage', 'active', CURDATE(), ?, ?)`,
              [user_id, message, increasePercent > 100 ? 'high' : 'medium']
            );
          }
        }
      }
    } catch (error) {
      console.error('Error checking for anomalies:', error);
      // Don't fail the request
    }

    // Auto-update smart meter total for this user
    try {
      const [meterTotal] = await pool.execute(
        'SELECT SUM(quantity_used) as total FROM water_usage WHERE user_id = ?',
        [user_id]
      );
      const total = parseFloat(meterTotal[0]?.total) || 0;

      await pool.execute(
        'UPDATE smart_meters SET total_usage = ? WHERE user_id = ? AND status = "active"',
        [total, user_id]
      );
    } catch (error) {
      console.error('Error updating smart meter:', error);
      // Don't fail the request if meter update fails
    }

    res.status(201).json({
      message: 'Water usage recorded successfully',
      usage: newUsage[0],
    });
  } catch (error) {
    console.error('Error creating water usage:', error);
    res.status(500).json({ error: 'Failed to create water usage record' });
  }
});

/**
 * PUT /api/water-usage/:id
 * Update water usage record
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { source_id, purpose, date, quantity_used, cost } = req.body;

    // Check ownership
    const [existing] = await pool.execute(
      'SELECT user_id FROM water_usage WHERE usage_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Water usage record not found' });
    }

    if (req.user.role !== 'admin' && existing[0].user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.execute(
      `UPDATE water_usage 
       SET source_id = ?, purpose = ?, date = ?, quantity_used = ?, cost = ? 
       WHERE usage_id = ?`,
      [source_id, purpose, date, quantity_used, cost, id]
    );

    // Recalculate goals after update
    try {
      await calculateUserGoalsProgress(existing[0].user_id);
    } catch (error) {
      console.error('Error updating goal progress after usage update:', error);
    }

    res.json({ message: 'Water usage updated successfully' });
  } catch (error) {
    console.error('Error updating water usage:', error);
    res.status(500).json({ error: 'Failed to update water usage' });
  }
});

/**
 * DELETE /api/water-usage/:id
 * Delete water usage record
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const [existing] = await pool.execute(
      'SELECT user_id FROM water_usage WHERE usage_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Water usage record not found' });
    }

    if (req.user.role !== 'admin' && existing[0].user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const userId = existing[0].user_id;

    await pool.execute('DELETE FROM water_usage WHERE usage_id = ?', [id]);

    // Recalculate goals after deletion
    try {
      await calculateUserGoalsProgress(userId);
    } catch (error) {
      console.error('Error updating goal progress after usage deletion:', error);
    }

    res.json({ message: 'Water usage deleted successfully' });
  } catch (error) {
    console.error('Error deleting water usage:', error);
    res.status(500).json({ error: 'Failed to delete water usage' });
  }
});

export default router;


