import express from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/user-activities
 * Get user activities for current user or all (admin)
 */
router.get('/', async (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'admin') {
      query = `
        SELECT ua.*, u.firstname, u.lastname, ca.activity_name, ca.description, ca.category
        FROM user_activities ua
        LEFT JOIN users u ON ua.user_id = u.user_id
        LEFT JOIN conservation_activities ca ON ua.activity_id = ca.activity_id
        ORDER BY ua.participation_date DESC
      `;
      params = [];
    } else {
      query = `
        SELECT ua.*, ca.activity_name, ca.description, ca.category
        FROM user_activities ua
        LEFT JOIN conservation_activities ca ON ua.activity_id = ca.activity_id
        WHERE ua.user_id = ?
        ORDER BY ua.participation_date DESC
      `;
      params = [req.user.user_id];
    }

    const [activities] = await pool.execute(query, params);
    res.json(activities);
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({ error: 'Failed to fetch user activities' });
  }
});

/**
 * POST /api/user-activities
 * Join a conservation activity
 */
router.post('/', async (req, res) => {
  try {
    const { user_id, activity_id } = req.body;

    // Users can only join activities for themselves unless admin
    if (req.user.role !== 'admin' && parseInt(user_id) !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if already joined
    const [existing] = await pool.execute(
      'SELECT * FROM user_activities WHERE user_id = ? AND activity_id = ?',
      [user_id, activity_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already participating in this activity' });
    }

    // Get activity details for response
    const [activityDetails] = await pool.execute(
      'SELECT activity_name, category, description FROM conservation_activities WHERE activity_id = ?',
      [activity_id]
    );

    if (activityDetails.length === 0) {
      return res.status(404).json({ error: 'Conservation activity not found' });
    }

    await pool.execute(
      'INSERT INTO user_activities (user_id, activity_id, participation_date) VALUES (?, ?, CURDATE())',
      [user_id, activity_id]
    );

    // Create a positive alert/notification for joining activity
    try {
      const [result] = await pool.execute(
        `INSERT INTO alerts (user_id, alert_type, status, alert_date, message, severity)
         VALUES (?, 'activity_joined', 'active', CURDATE(), ?, 'low')`,
        [user_id, `You've joined the conservation activity: ${activityDetails[0].activity_name}. Great job taking steps to conserve water!`]
      );
    } catch (error) {
      console.error('Error creating activity join alert:', error);
      // Don't fail the request if alert creation fails
    }

    res.status(201).json({ 
      message: 'Successfully joined conservation activity',
      activity: activityDetails[0]
    });
  } catch (error) {
    console.error('Error joining activity:', error);
    res.status(500).json({ error: 'Failed to join activity' });
  }
});

/**
 * DELETE /api/user-activities
 * Leave a conservation activity
 */
router.delete('/', async (req, res) => {
  try {
    const { user_id, activity_id } = req.body;

    // Users can only leave activities for themselves unless admin
    if (req.user.role !== 'admin' && parseInt(user_id) !== req.user.user_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.execute(
      'DELETE FROM user_activities WHERE user_id = ? AND activity_id = ?',
      [user_id, activity_id]
    );

    res.json({ message: 'Successfully left conservation activity' });
  } catch (error) {
    console.error('Error leaving activity:', error);
    res.status(500).json({ error: 'Failed to leave activity' });
  }
});

/**
 * GET /api/user-activities/impact
 * Get conservation impact metrics for the current user
 */
router.get('/impact', async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Get all user's conservation activities
    const [activities] = await pool.execute(
      `SELECT ua.*, ca.activity_name, ca.category, ca.description
       FROM user_activities ua
       JOIN conservation_activities ca ON ua.activity_id = ca.activity_id
       WHERE ua.user_id = ?`,
      [userId]
    );

    // Estimate water savings based on activity categories
    // These are rough estimates - in a real system, you'd have more precise data
    const savingsEstimates = {
      'indoor': 40,  // liters per day
      'outdoor': 60,
      'leak_prevention': 100,
      'efficient_appliances': 75,
      'behavioral_change': 30,
      'water_saving': 50,
      'default': 25
    };

    let totalEstimatedSavings = 0;
    const impactByCategory = {};

    activities.forEach(activity => {
      const category = activity.category || 'default';
      const savings = savingsEstimates[category] || savingsEstimates['default'];

      // Calculate days since participation
      const participationDate = new Date(activity.participation_date);
      const today = new Date();
      const daysSince = Math.ceil((today - participationDate) / (1000 * 60 * 60 * 24));

      // Estimate total savings (savings per day * days active)
      const activitySavings = savings * daysSince;
      totalEstimatedSavings += activitySavings;

      if (!impactByCategory[category]) {
        impactByCategory[category] = {
          count: 0,
          estimatedSavings: 0,
          activities: []
        };
      }

      impactByCategory[category].count++;
      impactByCategory[category].estimatedSavings += activitySavings;
      impactByCategory[category].activities.push(activity.activity_name);
    });

    // Get actual usage reduction (compare to before joining activities)
    let actualReduction = 0;
    if (activities.length > 0) {
      const earliestActivity = activities.reduce((earliest, current) => {
        return new Date(current.participation_date) < new Date(earliest.participation_date)
          ? current : earliest;
      });

      const startDate = new Date(earliestActivity.participation_date);

      // Get usage before activities
      const [beforeUsage] = await pool.execute(
        `SELECT AVG(quantity_used) as avg_usage
         FROM water_usage
         WHERE user_id = ? AND date < ?
         LIMIT 30`,
        [userId, startDate]
      );

      // Get usage after activities
      const [afterUsage] = await pool.execute(
        `SELECT AVG(quantity_used) as avg_usage
         FROM water_usage
         WHERE user_id = ? AND date >= ?`,
        [userId, startDate]
      );

      const before = parseFloat(beforeUsage[0]?.avg_usage) || 0;
      const after = parseFloat(afterUsage[0]?.avg_usage) || 0;

      if (before > 0 && after > 0) {
        actualReduction = before - after;
      }
    }

    res.json({
      totalActivities: activities.length,
      estimatedTotalSavings: Math.round(totalEstimatedSavings),
      actualDailyReduction: Math.round(actualReduction * 100) / 100,
      impactByCategory,
      activities: activities.map(a => ({
        name: a.activity_name,
        category: a.category,
        participationDate: a.participation_date
      }))
    });
  } catch (error) {
    console.error('Error calculating conservation impact:', error);
    res.status(500).json({ error: 'Failed to calculate conservation impact' });
  }
});

export default router;


