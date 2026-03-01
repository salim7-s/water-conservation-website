import express from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/smart-meters
 * Get smart meters (user's own or all if admin)
 */
router.get('/', async (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'admin') {
      query = `
        SELECT sm.*, u.firstname, u.lastname, u.email
        FROM smart_meters sm
        LEFT JOIN users u ON sm.user_id = u.user_id
        ORDER BY sm.install_date DESC
      `;
      params = [];
    } else {
      query = 'SELECT * FROM smart_meters WHERE user_id = ? ORDER BY install_date DESC';
      params = [req.user.user_id];
    }

    const [meters] = await pool.execute(query, params);
    res.json(meters);
  } catch (error) {
    console.error('Error fetching smart meters:', error);
    res.status(500).json({ error: 'Failed to fetch smart meters' });
  }
});

/**
 * GET /api/smart-meters/:id
 * Get smart meter by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [meters] = await pool.execute(
      'SELECT * FROM smart_meters WHERE meter_id = ?',
      [id]
    );

    if (meters.length === 0) {
      return res.status(404).json({ error: 'Smart meter not found' });
    }

    // Users can only view their own meters unless admin
    if (req.user.role !== 'admin' && meters[0].user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(meters[0]);
  } catch (error) {
    console.error('Error fetching smart meter:', error);
    res.status(500).json({ error: 'Failed to fetch smart meter' });
  }
});

/**
 * POST /api/smart-meters
 * Create new smart meter (admin only)
 */
router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { user_id, meter_type, status, total_usage, install_date } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO smart_meters (user_id, meter_type, status, total_usage, install_date) 
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, meter_type, status || 'active', total_usage || 0, install_date || new Date()]
    );

    const [newMeter] = await pool.execute(
      'SELECT * FROM smart_meters WHERE meter_id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Smart meter created successfully',
      meter: newMeter[0],
    });
  } catch (error) {
    console.error('Error creating smart meter:', error);
    res.status(500).json({ error: 'Failed to create smart meter' });
  }
});

/**
 * PUT /api/smart-meters/:id
 * Update smart meter
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { meter_type, status, total_usage } = req.body;

    // Check ownership
    const [existing] = await pool.execute(
      'SELECT user_id FROM smart_meters WHERE meter_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Smart meter not found' });
    }

    // Only admin can update, or users can update their own meters' status
    if (req.user.role !== 'admin' && existing[0].user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = [];
    const values = [];

    if (meter_type !== undefined) {
      updates.push('meter_type = ?');
      values.push(meter_type);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (total_usage !== undefined) {
      updates.push('total_usage = ?');
      values.push(total_usage);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    await pool.execute(
      `UPDATE smart_meters SET ${updates.join(', ')} WHERE meter_id = ?`,
      values
    );

    res.json({ message: 'Smart meter updated successfully' });
  } catch (error) {
    console.error('Error updating smart meter:', error);
    res.status(500).json({ error: 'Failed to update smart meter' });
  }
});

/**
 * DELETE /api/smart-meters/:id
 * Delete smart meter (admin only)
 */
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    await pool.execute('DELETE FROM smart_meters WHERE meter_id = ?', [id]);

    res.json({ message: 'Smart meter deleted successfully' });
  } catch (error) {
    console.error('Error deleting smart meter:', error);
    res.status(500).json({ error: 'Failed to delete smart meter' });
  }
});

/**
 * GET /api/smart-meters/:id/sync
 * Sync smart meter total with actual water usage data
 */
router.get('/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;

    // Get meter and check ownership
    const [meters] = await pool.execute(
      'SELECT user_id FROM smart_meters WHERE meter_id = ?',
      [id]
    );

    if (meters.length === 0) {
      return res.status(404).json({ error: 'Smart meter not found' });
    }

    if (req.user.role !== 'admin' && meters[0].user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate total usage from water_usage table
    const [usageData] = await pool.execute(
      'SELECT SUM(quantity_used) as total FROM water_usage WHERE user_id = ?',
      [meters[0].user_id]
    );

    const total = parseFloat(usageData[0]?.total) || 0;

    // Update meter
    await pool.execute(
      'UPDATE smart_meters SET total_usage = ? WHERE meter_id = ?',
      [total, id]
    );

    // Get updated meter
    const [updatedMeter] = await pool.execute(
      'SELECT * FROM smart_meters WHERE meter_id = ?',
      [id]
    );

    res.json({
      message: 'Smart meter synced successfully',
      meter: updatedMeter[0]
    });
  } catch (error) {
    console.error('Error syncing smart meter:', error);
    res.status(500).json({ error: 'Failed to sync smart meter' });
  }
});

/**
 * GET /api/smart-meters/:id/readings
 * Get historical readings for a smart meter (from water usage)
 */
router.get('/:id/readings', async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;

    // Get meter and check ownership
    const [meters] = await pool.execute(
      'SELECT user_id FROM smart_meters WHERE meter_id = ?',
      [id]
    );

    if (meters.length === 0) {
      return res.status(404).json({ error: 'Smart meter not found' });
    }

    if (req.user.role !== 'admin' && meters[0].user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get daily readings
    const [readings] = await pool.execute(
      `SELECT date, SUM(quantity_used) as daily_usage, SUM(cost) as daily_cost
       FROM water_usage
       WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY date
       ORDER BY date DESC`,
      [meters[0].user_id, parseInt(days)]
    );

    res.json({
      meter_id: parseInt(id),
      readings: readings.map(r => ({
        date: r.date,
        usage: parseFloat(r.daily_usage) || 0,
        cost: parseFloat(r.daily_cost) || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching meter readings:', error);
    res.status(500).json({ error: 'Failed to fetch meter readings' });
  }
});

export default router;


