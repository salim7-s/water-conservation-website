import express from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { calculateSingleGoalProgress, calculateUserGoalsProgress } from '../utils/calculateGoalProgress.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/goals
 * Get goals (user's own or all if admin)
 */
router.get('/', async (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'admin') {
      query = `
        SELECT g.*, u.firstname, u.lastname, u.email
        FROM goals g
        LEFT JOIN users u ON g.user_id = u.user_id
        ORDER BY g.deadline DESC, g.created_at DESC
      `;
      params = [];
    } else {
      query = 'SELECT * FROM goals WHERE user_id = ? ORDER BY deadline DESC, created_at DESC';
      params = [req.user.user_id];
    }

    const [goals] = await pool.execute(query, params);
    
    // Ensure all goals have up-to-date progress by recalculating active ones
    if (req.user.role !== 'admin') {
      // Recalculate user's active goals
      try {
        await calculateUserGoalsProgress(req.user.user_id);
      } catch (error) {
        console.error('Error recalculating goals:', error);
      }
      
      // Fetch again to get updated data
      const [updatedGoals] = await pool.execute(
        'SELECT * FROM goals WHERE user_id = ? ORDER BY deadline DESC, created_at DESC',
        [req.user.user_id]
      );
      return res.json(updatedGoals);
    }
    
    res.json(goals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

/**
 * GET /api/goals/:id
 * Get goal by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [goals] = await pool.execute(
      'SELECT * FROM goals WHERE goal_id = ?',
      [id]
    );

    if (goals.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Users can only view their own goals unless admin
    if (req.user.role !== 'admin' && goals[0].user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(goals[0]);
  } catch (error) {
    console.error('Error fetching goal:', error);
    res.status(500).json({ error: 'Failed to fetch goal' });
  }
});

/**
 * POST /api/goals
 * Create new goal
 */
router.post('/', async (req, res) => {
  try {
    const { user_id, goal_type, target_quantity, deadline, status, progress } = req.body;

    // Users can only create goals for themselves unless admin
    if (req.user.role !== 'admin' && parseInt(user_id) !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [result] = await pool.execute(
      `INSERT INTO goals (user_id, goal_type, target_quantity, deadline, status, progress) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, goal_type, target_quantity, deadline, status || 'active', progress || '0%']
    );

    const goalId = result.insertId;

    // Calculate initial progress for the new goal
    try {
      await calculateSingleGoalProgress(goalId);
    } catch (error) {
      console.error('Error calculating initial goal progress:', error);
      // Continue even if calculation fails
    }

    const [newGoal] = await pool.execute(
      'SELECT * FROM goals WHERE goal_id = ?',
      [goalId]
    );

    res.status(201).json({
      message: 'Goal created successfully',
      goal: newGoal[0],
    });
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

/**
 * PUT /api/goals/:id
 * Update goal
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { goal_type, target_quantity, deadline, status, progress } = req.body;

    // Check ownership
    const [existing] = await pool.execute(
      'SELECT user_id FROM goals WHERE goal_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (req.user.role !== 'admin' && existing[0].user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.execute(
      `UPDATE goals 
       SET goal_type = ?, target_quantity = ?, deadline = ?, status = ?, progress = ? 
       WHERE goal_id = ?`,
      [goal_type, target_quantity, deadline, status, progress, id]
    );

    // Recalculate progress if goal parameters changed (unless status is being set manually)
    if (status !== 'completed' && status !== 'failed') {
      try {
        await calculateSingleGoalProgress(parseInt(id));
      } catch (error) {
        console.error('Error recalculating goal progress after update:', error);
      }
    }

    const [updatedGoal] = await pool.execute(
      'SELECT * FROM goals WHERE goal_id = ?',
      [id]
    );

    res.json({ 
      message: 'Goal updated successfully',
      goal: updatedGoal[0]
    });
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

/**
 * DELETE /api/goals/:id
 * Delete goal
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const [existing] = await pool.execute(
      'SELECT user_id FROM goals WHERE goal_id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (req.user.role !== 'admin' && existing[0].user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.execute('DELETE FROM goals WHERE goal_id = ?', [id]);

    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

/**
 * GET /api/goals/:id/progress
 * Get current progress for a specific goal (recalculates)
 */
router.get('/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const [goals] = await pool.execute(
      'SELECT user_id FROM goals WHERE goal_id = ?',
      [id]
    );

    if (goals.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (req.user.role !== 'admin' && goals[0].user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Recalculate progress
    const result = await calculateSingleGoalProgress(parseInt(id));

    res.json(result);
  } catch (error) {
    console.error('Error calculating goal progress:', error);
    res.status(500).json({ error: 'Failed to calculate goal progress' });
  }
});

/**
 * POST /api/goals/:id/recalculate
 * Manually trigger progress recalculation for a goal
 */
router.post('/:id/recalculate', async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const [goals] = await pool.execute(
      'SELECT user_id FROM goals WHERE goal_id = ?',
      [id]
    );

    if (goals.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (req.user.role !== 'admin' && goals[0].user_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Recalculate progress
    await calculateSingleGoalProgress(parseInt(id));

    // Fetch updated goal
    const [updatedGoal] = await pool.execute(
      'SELECT * FROM goals WHERE goal_id = ?',
      [id]
    );

    res.json({
      message: 'Goal progress recalculated successfully',
      goal: updatedGoal[0]
    });
  } catch (error) {
    console.error('Error recalculating goal progress:', error);
    res.status(500).json({ error: 'Failed to recalculate goal progress' });
  }
});

/**
 * POST /api/goals/recalculate-all
 * Recalculate progress for all user's goals
 */
router.post('/recalculate-all', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const count = await calculateUserGoalsProgress(userId);

    res.json({
      message: `Successfully recalculated ${count} goals`,
      count
    });
  } catch (error) {
    console.error('Error recalculating all goals:', error);
    res.status(500).json({ error: 'Failed to recalculate goals' });
  }
});

export default router;


