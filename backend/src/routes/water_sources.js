import express from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/water-sources
 * Get all water sources
 */
router.get('/', async (req, res) => {
  try {
    const [sources] = await pool.execute(
      'SELECT * FROM water_source ORDER BY source_name'
    );
    res.json(sources);
  } catch (error) {
    console.error('Error fetching water sources:', error);
    res.status(500).json({ error: 'Failed to fetch water sources' });
  }
});

/**
 * GET /api/water-sources/:id
 * Get water source by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [sources] = await pool.execute(
      'SELECT * FROM water_source WHERE source_id = ?',
      [id]
    );

    if (sources.length === 0) {
      return res.status(404).json({ error: 'Water source not found' });
    }

    res.json(sources[0]);
  } catch (error) {
    console.error('Error fetching water source:', error);
    res.status(500).json({ error: 'Failed to fetch water source' });
  }
});

/**
 * POST /api/water-sources
 * Create new water source (admin only)
 */
router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { source_name, location, source_type } = req.body;

    const [result] = await pool.execute(
      'INSERT INTO water_source (source_name, location, source_type) VALUES (?, ?, ?)',
      [source_name, location, source_type]
    );

    const [newSource] = await pool.execute(
      'SELECT * FROM water_source WHERE source_id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Water source created successfully',
      source: newSource[0],
    });
  } catch (error) {
    console.error('Error creating water source:', error);
    res.status(500).json({ error: 'Failed to create water source' });
  }
});

/**
 * PUT /api/water-sources/:id
 * Update water source (admin only)
 */
router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { source_name, location, source_type } = req.body;

    await pool.execute(
      'UPDATE water_source SET source_name = ?, location = ?, source_type = ? WHERE source_id = ?',
      [source_name, location, source_type, id]
    );

    res.json({ message: 'Water source updated successfully' });
  } catch (error) {
    console.error('Error updating water source:', error);
    res.status(500).json({ error: 'Failed to update water source' });
  }
});

/**
 * DELETE /api/water-sources/:id
 * Delete water source (admin only)
 */
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    await pool.execute('DELETE FROM water_source WHERE source_id = ?', [id]);

    res.json({ message: 'Water source deleted successfully' });
  } catch (error) {
    console.error('Error deleting water source:', error);
    res.status(500).json({ error: 'Failed to delete water source' });
  }
});

export default router;


