import express from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/users
 * Get all users (admin only) or current user
 */
router.get('/', async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const [users] = await pool.execute(
        'SELECT user_id, firstname, lastname, email, contact_no, address, role, created_at FROM users'
      );
      res.json(users);
    } else {
      const [users] = await pool.execute(
        'SELECT user_id, firstname, lastname, email, contact_no, address, role, created_at FROM users WHERE user_id = ?',
        [req.user.user_id]
      );
      res.json(users[0] || {});
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Users can only view their own profile unless admin
    if (req.user.role !== 'admin' && parseInt(id) !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [users] = await pool.execute(
      'SELECT user_id, firstname, lastname, email, contact_no, address, role, created_at FROM users WHERE user_id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * PUT /api/users/:id
 * Update user profile
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstname, lastname, contact_no, address } = req.body;

    // Users can only update their own profile unless admin
    if (req.user.role !== 'admin' && parseInt(id) !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.execute(
      `UPDATE users SET firstname = ?, lastname = ?, contact_no = ?, address = ? 
       WHERE user_id = ?`,
      [firstname, lastname, contact_no, address, id]
    );

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;


