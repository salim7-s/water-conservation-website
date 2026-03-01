import express from 'express';
import pool from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireRole('admin'));

/**
 * POST /api/admin/alerts/:id/approve
 * Approve an alert
 */
router.post('/alerts/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    await pool.execute(
      `UPDATE alerts 
       SET status = 'approved', 
           admin_id = ?, 
           admin_comment = ?, 
           action_date = NOW() 
       WHERE alert_id = ?`,
      [req.user.user_id, comment || null, id]
    );

    res.json({ message: 'Alert approved successfully' });
  } catch (error) {
    console.error('Error approving alert:', error);
    res.status(500).json({ error: 'Failed to approve alert' });
  }
});

/**
 * POST /api/admin/alerts/:id/reject
 * Reject an alert
 */
router.post('/alerts/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    await pool.execute(
      `UPDATE alerts 
       SET status = 'rejected', 
           admin_id = ?, 
           admin_comment = ?, 
           action_date = NOW() 
       WHERE alert_id = ?`,
      [req.user.user_id, comment || null, id]
    );

    res.json({ message: 'Alert rejected successfully' });
  } catch (error) {
    console.error('Error rejecting alert:', error);
    res.status(500).json({ error: 'Failed to reject alert' });
  }
});

/**
 * POST /api/admin/alerts/:id/in-progress
 * Mark alert as in progress
 */
router.post('/alerts/:id/in-progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    await pool.execute(
      `UPDATE alerts 
       SET status = 'in-progress', 
           admin_id = ?, 
           admin_comment = ?, 
           action_date = NOW() 
       WHERE alert_id = ?`,
      [req.user.user_id, comment || null, id]
    );

    res.json({ message: 'Alert marked as in-progress' });
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

/**
 * POST /api/admin/alerts/:id/resolve
 * Resolve an alert
 */
router.post('/alerts/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    await pool.execute(
      `UPDATE alerts 
       SET status = 'resolved', 
           admin_id = ?, 
           admin_comment = ?, 
           action_date = NOW() 
       WHERE alert_id = ?`,
      [req.user.user_id, comment || null, id]
    );

    res.json({ message: 'Alert resolved successfully' });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

/**
 * GET /api/admin/alerts
 * Get all alerts with admin info (alias for /api/alerts for admin)
 */
router.get('/alerts', async (req, res) => {
  try {
    const [alerts] = await pool.execute(
      `SELECT a.*, u.firstname, u.lastname, u.email,
              admin.firstname as admin_firstname, admin.lastname as admin_lastname
       FROM alerts a
       LEFT JOIN users u ON a.user_id = u.user_id
       LEFT JOIN users admin ON a.admin_id = admin.user_id
       ORDER BY a.alert_date DESC, a.created_at DESC`
    );

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE role = "user"');
    const [totalAlerts] = await pool.execute('SELECT COUNT(*) as count FROM alerts');
    const [pendingAlerts] = await pool.execute('SELECT COUNT(*) as count FROM alerts WHERE status = "reported"');
    const [totalUsage] = await pool.execute('SELECT SUM(quantity_used) as total FROM water_usage');
    const [activeMeters] = await pool.execute('SELECT COUNT(*) as count FROM smart_meters WHERE status = "active"');
    
    // Additional stats
    const [resolvedAlerts] = await pool.execute('SELECT COUNT(*) as count FROM alerts WHERE status = "resolved"');
    const [totalGoals] = await pool.execute('SELECT COUNT(*) as count FROM goals');
    const [activeGoals] = await pool.execute('SELECT COUNT(*) as count FROM goals WHERE status = "active"');
    const [totalActivities] = await pool.execute('SELECT COUNT(*) as count FROM conservation_activities');
    const [userActivities] = await pool.execute('SELECT COUNT(*) as count FROM user_activities');
    
    // Recent activity (last 7 days)
    const [recentUsage] = await pool.execute(
      'SELECT SUM(quantity_used) as total FROM water_usage WHERE date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)'
    );

    res.json({
      totalUsers: totalUsers[0].count,
      totalAlerts: totalAlerts[0].count,
      pendingAlerts: pendingAlerts[0].count,
      resolvedAlerts: resolvedAlerts[0].count,
      totalUsage: totalUsage[0].total || 0,
      recentUsage: recentUsage[0].total || 0,
      activeMeters: activeMeters[0].count,
      totalGoals: totalGoals[0].count,
      activeGoals: activeGoals[0].count,
      totalActivities: totalActivities[0].count,
      userActivities: userActivities[0].count,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;


