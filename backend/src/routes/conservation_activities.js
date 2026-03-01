import express from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/conservation-activities
 * Get all conservation activities
 */
router.get('/', async (req, res) => {
  try {
    const [activities] = await pool.execute(
      'SELECT * FROM conservation_activities ORDER BY category, activity_name'
    );
    res.json(activities);
  } catch (error) {
    console.error('Error fetching conservation activities:', error);
    res.status(500).json({ error: 'Failed to fetch conservation activities' });
  }
});

/**
 * GET /api/conservation-activities/:id
 * Get conservation activity by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [activities] = await pool.execute(
      'SELECT * FROM conservation_activities WHERE activity_id = ?',
      [id]
    );

    if (activities.length === 0) {
      return res.status(404).json({ error: 'Conservation activity not found' });
    }

    res.json(activities[0]);
  } catch (error) {
    console.error('Error fetching conservation activity:', error);
    res.status(500).json({ error: 'Failed to fetch conservation activity' });
  }
});

/**
 * POST /api/conservation-activities
 * Create new conservation activity (admin only)
 */
router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { activity_name, description, category } = req.body;

    const [result] = await pool.execute(
      'INSERT INTO conservation_activities (activity_name, description, category) VALUES (?, ?, ?)',
      [activity_name, description, category]
    );

    const [newActivity] = await pool.execute(
      'SELECT * FROM conservation_activities WHERE activity_id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Conservation activity created successfully',
      activity: newActivity[0],
    });
  } catch (error) {
    console.error('Error creating conservation activity:', error);
    res.status(500).json({ error: 'Failed to create conservation activity' });
  }
});

/**
 * PUT /api/conservation-activities/:id
 * Update conservation activity (admin only)
 */
router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { activity_name, description, category } = req.body;

    await pool.execute(
      'UPDATE conservation_activities SET activity_name = ?, description = ?, category = ? WHERE activity_id = ?',
      [activity_name, description, category, id]
    );

    res.json({ message: 'Conservation activity updated successfully' });
  } catch (error) {
    console.error('Error updating conservation activity:', error);
    res.status(500).json({ error: 'Failed to update conservation activity' });
  }
});

/**
 * DELETE /api/conservation-activities/:id
 * Delete conservation activity (admin only)
 */
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    await pool.execute('DELETE FROM conservation_activities WHERE activity_id = ?', [id]);

    res.json({ message: 'Conservation activity deleted successfully' });
  } catch (error) {
    console.error('Error deleting conservation activity:', error);
    res.status(500).json({ error: 'Failed to delete conservation activity' });
  }
});

export default router;


