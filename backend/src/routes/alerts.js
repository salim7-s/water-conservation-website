import express from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { validateAlert } from '../middleware/validation.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/alerts
 * Get alerts for current user or all alerts (admin)
 */
router.get('/', async (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'admin') {
      query = `
        SELECT a.*, u.firstname, u.lastname, u.email,
               admin.firstname as admin_firstname, admin.lastname as admin_lastname
        FROM alerts a
        LEFT JOIN users u ON a.user_id = u.user_id
        LEFT JOIN users admin ON a.admin_id = admin.user_id
        ORDER BY a.alert_date DESC, a.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT a.*, admin.firstname as admin_firstname, admin.lastname as admin_lastname
        FROM alerts a
        LEFT JOIN users admin ON a.admin_id = admin.user_id
        WHERE a.user_id = ?
        ORDER BY a.alert_date DESC, a.created_at DESC
      `;
      params = [req.user.user_id];
    }

    const [alerts] = await pool.execute(query, params);
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * GET /api/alerts/:id
 * Get alert by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [alerts] = await pool.execute(
      `SELECT a.*, u.firstname, u.lastname, u.email,
              admin.firstname as admin_firstname, admin.lastname as admin_lastname
       FROM alerts a
       LEFT JOIN users u ON a.user_id = u.user_id
       LEFT JOIN users admin ON a.admin_id = admin.user_id
       WHERE a.alert_id = ?`,
      [id]
    );

    if (alerts.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const alert = alerts[0];

    // Users can only view their own alerts unless admin
    if (req.user.role !== 'admin' && alert.user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(alert);
  } catch (error) {
    console.error('Error fetching alert:', error);
    res.status(500).json({ error: 'Failed to fetch alert' });
  }
});

/**
 * POST /api/alerts
 * Create a new alert (e.g., leak report)
 */
router.post('/', validateAlert, async (req, res) => {
  try {
    const { user_id, alert_type, message, location, severity } = req.body;

    // Users can only create alerts for themselves unless admin
    if (req.user.role !== 'admin' && parseInt(user_id) !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [result] = await pool.execute(
      `INSERT INTO alerts (user_id, alert_type, message, location, severity, status, alert_date) 
       VALUES (?, ?, ?, ?, ?, 'reported', CURDATE())`,
      [user_id, alert_type, message, location || null, severity || 'medium']
    );

    const [newAlert] = await pool.execute(
      'SELECT * FROM alerts WHERE alert_id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Alert created successfully',
      alert: newAlert[0],
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

/**
 * PUT /api/alerts/:id
 * Update alert (users can only update their own unreviewed alerts)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { message, location, severity } = req.body;

    // Check if alert exists and user has permission
    const [alerts] = await pool.execute(
      'SELECT user_id, status FROM alerts WHERE alert_id = ?',
      [id]
    );

    if (alerts.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const alert = alerts[0];

    // Only allow updates if status is 'reported' and user owns it, or if admin
    if (req.user.role !== 'admin') {
      if (alert.user_id !== req.user.user_id || alert.status !== 'reported') {
        return res.status(403).json({ error: 'Cannot update this alert' });
      }
    }

    await pool.execute(
      `UPDATE alerts SET message = ?, location = ?, severity = ? WHERE alert_id = ?`,
      [message, location, severity, id]
    );

    res.json({ message: 'Alert updated successfully' });
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

/**
 * PUT /api/alerts/:id/status
 * Update alert status (e.g., mark as read, resolved)
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'read', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be: active, read, resolved, or dismissed' });
    }

    // Check if alert exists and user has permission
    const [alerts] = await pool.execute(
      'SELECT user_id FROM alerts WHERE alert_id = ?',
      [id]
    );

    if (alerts.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const alert = alerts[0];

    // Users can only update their own alerts unless admin
    if (req.user.role !== 'admin' && alert.user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.execute(
      'UPDATE alerts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE alert_id = ?',
      [status, id]
    );

    res.json({ message: 'Alert status updated successfully', status });
  } catch (error) {
    console.error('Error updating alert status:', error);
    res.status(500).json({ error: 'Failed to update alert status' });
  }
});

/**
 * POST /api/alerts/check-anomalies
 * Check for usage anomalies and generate alerts if needed
 */
router.post('/check-anomalies', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const alertsGenerated = [];

    // Get average daily usage for the past 30 days
    const [avgData] = await pool.execute(
      `SELECT AVG(quantity_used) as avg_usage
       FROM water_usage
       WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
      [userId]
    );

    const avgUsage = parseFloat(avgData[0]?.avg_usage) || 0;

    if (avgUsage > 0) {
      // Get today's usage
      const [todayData] = await pool.execute(
        `SELECT SUM(quantity_used) as today_usage
         FROM water_usage
         WHERE user_id = ? AND date = CURDATE()`,
        [userId]
      );

      const todayUsage = parseFloat(todayData[0]?.today_usage) || 0;

      // If today's usage is 150% or more of average, create an alert
      if (todayUsage >= avgUsage * 1.5 && todayUsage > 0) {
        // Check if alert already exists for today
        const [existingAlerts] = await pool.execute(
          `SELECT alert_id FROM alerts
           WHERE user_id = ? AND alert_type = 'high_usage' AND alert_date = CURDATE()`,
          [userId]
        );

        if (existingAlerts.length === 0) {
          const increasePercent = Math.round(((todayUsage - avgUsage) / avgUsage) * 100);
          const message = `Your water usage today (${Math.round(todayUsage)}L) is ${increasePercent}% higher than your 30-day average (${Math.round(avgUsage)}L). This could indicate a leak or unusual activity.`;
          
          const [result] = await pool.execute(
            `INSERT INTO alerts (user_id, alert_type, status, alert_date, message, severity)
             VALUES (?, 'high_usage', 'active', CURDATE(), ?, ?)`,
            [userId, message, increasePercent > 100 ? 'high' : 'medium']
          );
          alertsGenerated.push({ type: 'high_usage', id: result.insertId });
        }
      }
    }

    // Check for goals at risk
    const [goals] = await pool.execute(
      `SELECT goal_id, progress, deadline
       FROM goals
       WHERE user_id = ? AND status = 'active' AND deadline >= CURDATE()`,
      [userId]
    );

    for (const goal of goals) {
      const deadline = new Date(goal.deadline);
      const today = new Date();
      const daysRemaining = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

      // Parse progress
      const progressMatch = goal.progress.match(/(\d+)/);
      const progress = progressMatch ? parseInt(progressMatch[1]) : 0;

      // If less than 7 days remaining and progress < 50%, create alert
      if (daysRemaining <= 7 && progress < 50) {
        const [existingAlerts] = await pool.execute(
          `SELECT alert_id FROM alerts
           WHERE user_id = ? AND alert_type = 'goal_at_risk' 
           AND alert_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
          [userId]
        );

        if (existingAlerts.length === 0) {
          const message = `Goal #${goal.goal_id} (${goal.goal_type}) is at risk! Only ${daysRemaining} day(s) remaining and you're at ${progress}% progress.`;
          
          const [result] = await pool.execute(
            `INSERT INTO alerts (user_id, alert_type, status, alert_date, message, severity)
             VALUES (?, 'goal_at_risk', 'active', CURDATE(), ?, ?)`,
            [userId, message, daysRemaining <= 3 ? 'high' : 'medium']
          );
          alertsGenerated.push({ type: 'goal_at_risk', id: result.insertId });
        }
      }
    }

    res.json({
      message: 'Anomaly check completed',
      alertsGenerated: alertsGenerated.length,
      alerts: alertsGenerated
    });
  } catch (error) {
    console.error('Error checking anomalies:', error);
    res.status(500).json({ error: 'Failed to check anomalies' });
  }
});

export default router;


