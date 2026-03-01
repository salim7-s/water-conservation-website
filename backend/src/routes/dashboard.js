import express from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { calculateUserGoalsProgress } from '../utils/calculateGoalProgress.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/dashboard
 * Get comprehensive dashboard data for the current user
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.user.user_id;
        const dashboardData = {};

        // 1. Water Usage Statistics
        const [dailyUsage] = await pool.execute(
            `SELECT SUM(quantity_used) as total, SUM(cost) as total_cost, COUNT(*) as count
       FROM water_usage 
       WHERE user_id = ? AND date = CURDATE()`,
            [userId]
        );

        const [weeklyUsage] = await pool.execute(
            `SELECT SUM(quantity_used) as total, SUM(cost) as total_cost, COUNT(*) as count
       FROM water_usage 
       WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
            [userId]
        );

        const [monthlyUsage] = await pool.execute(
            `SELECT SUM(quantity_used) as total, SUM(cost) as total_cost, COUNT(*) as count
       FROM water_usage 
       WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
            [userId]
        );

        dashboardData.usage = {
            daily: {
                quantity: parseFloat(dailyUsage[0]?.total) || 0,
                cost: parseFloat(dailyUsage[0]?.total_cost) || 0,
                count: dailyUsage[0]?.count || 0
            },
            weekly: {
                quantity: parseFloat(weeklyUsage[0]?.total) || 0,
                cost: parseFloat(weeklyUsage[0]?.total_cost) || 0,
                count: weeklyUsage[0]?.count || 0
            },
            monthly: {
                quantity: parseFloat(monthlyUsage[0]?.total) || 0,
                cost: parseFloat(monthlyUsage[0]?.total_cost) || 0,
                count: monthlyUsage[0]?.count || 0
            }
        };

        // 2. Usage Trend Analysis
        const [avgDaily] = await pool.execute(
            `SELECT AVG(quantity_used) as avg_daily
       FROM water_usage 
       WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
            [userId]
        );

        const [previousMonthUsage] = await pool.execute(
            `SELECT SUM(quantity_used) as total
       FROM water_usage 
       WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) 
       AND date < DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
            [userId]
        );

        const currentMonthTotal = dashboardData.usage.monthly.quantity;
        const previousMonthTotal = parseFloat(previousMonthUsage[0]?.total) || 0;

        let trend = 'stable';
        let trendPercentage = 0;

        if (previousMonthTotal > 0) {
            trendPercentage = ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100;
            if (trendPercentage > 10) trend = 'increasing';
            else if (trendPercentage < -10) trend = 'decreasing';
        }

        dashboardData.trend = {
            direction: trend,
            percentage: Math.round(trendPercentage),
            avgDaily: parseFloat(avgDaily[0]?.avg_daily) || 0
        };

        // 3. Predictions (enhanced with trend analysis)
        const avgDailyUsage = parseFloat(avgDaily[0]?.avg_daily) || 0;
        
        // Get usage for last 7 days to calculate recent trend
        const [recent7Days] = await pool.execute(
            `SELECT AVG(quantity_used) as avg_recent
             FROM water_usage 
             WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
            [userId]
        );
        
        const recentAvg = parseFloat(recent7Days[0]?.avg_recent) || 0;
        
        // Calculate trend factor
        let trendFactor = 1.0;
        let trendDirection = 'stable';
        if (avgDailyUsage > 0 && recentAvg > 0) {
            const change = ((recentAvg - avgDailyUsage) / avgDailyUsage) * 100;
            if (change > 10) {
                trendFactor = 1.1; // 10% increase trend
                trendDirection = 'increasing';
            } else if (change < -10) {
                trendFactor = 0.9; // 10% decrease trend
                trendDirection = 'decreasing';
            }
        }
        
        // Use recent average if available, otherwise use 30-day average
        const basePrediction = recentAvg > 0 ? recentAvg : avgDailyUsage;
        
        dashboardData.predictions = {
            nextWeek: Math.round(basePrediction * 7 * trendFactor * 100) / 100,
            nextMonth: Math.round(basePrediction * 30 * trendFactor * 100) / 100,
            trend: trendDirection,
            confidence: avgDailyUsage > 0 ? 'high' : 'low',
            avgDaily: Math.round(basePrediction * 100) / 100
        };

        // 4. Goals Progress (recalculate to ensure accuracy)
        try {
            // Recalculate all user goals to ensure they're up-to-date
            await calculateUserGoalsProgress(userId);
        } catch (error) {
            console.error('Error recalculating goals for dashboard:', error);
            // Continue even if recalculation fails
        }
        
        const [goals] = await pool.execute(
            `SELECT goal_id, goal_type, target_quantity, deadline, status, progress, created_at
       FROM goals 
       WHERE user_id = ? AND status IN ('active', 'completed')
       ORDER BY deadline ASC
       LIMIT 5`,
            [userId]
        );

        dashboardData.goals = goals.map(goal => {
            const progressMatch = goal.progress ? goal.progress.match(/(\d+)/) : null;
            const progressNumber = progressMatch ? parseInt(progressMatch[1]) : 0;
            return {
                ...goal,
                progressNumber: progressNumber
            };
        });

        // 5. Active Alerts (with meaningful messages)
        const [alerts] = await pool.execute(
            `SELECT alert_id, alert_type, status, alert_date, message, severity
       FROM alerts 
       WHERE user_id = ? AND status IN ('active', 'reported')
       ORDER BY alert_date DESC, created_at DESC
       LIMIT 10`,
            [userId]
        );

        // Enhance alerts with default messages if missing
        const enhancedAlerts = alerts.map(alert => {
            let message = alert.message;
            if (!message) {
                switch(alert.alert_type) {
                    case 'high_usage':
                        message = 'Your water usage today is significantly higher than your average. Consider checking for leaks.';
                        break;
                    case 'goal_at_risk':
                        message = 'One or more of your goals are at risk of not being completed. Review your progress.';
                        break;
                    case 'leak_detected':
                        message = 'Potential water leak detected. Please check your water fixtures.';
                        break;
                    default:
                        message = 'You have a new alert. Please review your dashboard.';
                }
            }
            return {
                ...alert,
                message: message
            };
        });

        dashboardData.alerts = {
            active: enhancedAlerts,
            count: enhancedAlerts.length
        };

        // 6. Conservation Activities
        const [activities] = await pool.execute(
            `SELECT ua.*, ca.activity_name, ca.category, ca.description
       FROM user_activities ua
       JOIN conservation_activities ca ON ua.activity_id = ca.activity_id
       WHERE ua.user_id = ?
       ORDER BY ua.participation_date DESC
       LIMIT 10`,
            [userId]
        );

        // Get total count
        const [totalCount] = await pool.execute(
            `SELECT COUNT(*) as total
       FROM user_activities
       WHERE user_id = ?`,
            [userId]
        );

        dashboardData.conservation = {
            activities: activities,
            totalActivities: parseInt(totalCount[0]?.total) || 0,
            recentActivities: activities.slice(0, 5)
        };

        // 7. Smart Meter Data
        const [meters] = await pool.execute(
            `SELECT meter_id, meter_type, status, total_usage, install_date
       FROM smart_meters 
       WHERE user_id = ? AND status = 'active'`,
            [userId]
        );

        dashboardData.smartMeters = meters;

        // 8. Recent Usage History (last 7 days)
        const [recentHistory] = await pool.execute(
            `SELECT date, SUM(quantity_used) as total, SUM(cost) as cost
       FROM water_usage
       WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY date
       ORDER BY date ASC`,
            [userId]
        );

        dashboardData.recentHistory = recentHistory.map(day => ({
            date: day.date,
            quantity: parseFloat(day.total) || 0,
            cost: parseFloat(day.cost) || 0
        }));

        res.json(dashboardData);
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

/**
 * GET /api/dashboard/summary
 * Get a quick summary for the dashboard header
 */
router.get('/summary', async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Recalculate goals to ensure accuracy
        try {
            await calculateUserGoalsProgress(userId);
        } catch (error) {
            console.error('Error recalculating goals for summary:', error);
        }

        const [todayUsage] = await pool.execute(
            'SELECT SUM(quantity_used) as total FROM water_usage WHERE user_id = ? AND date = CURDATE()',
            [userId]
        );

        const [activeGoals] = await pool.execute(
            'SELECT COUNT(*) as count FROM goals WHERE user_id = ? AND status = "active"',
            [userId]
        );

        const [activeAlerts] = await pool.execute(
            'SELECT COUNT(*) as count FROM alerts WHERE user_id = ? AND status IN ("active", "reported")',
            [userId]
        );

        res.json({
            todayUsage: parseFloat(todayUsage[0]?.total) || 0,
            activeGoals: parseInt(activeGoals[0]?.count) || 0,
            activeAlerts: parseInt(activeAlerts[0]?.count) || 0
        });
    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard summary' });
    }
});

/**
 * GET /api/dashboard/predictions
 * Get detailed predictions for water usage
 */
router.get('/predictions', async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Get 30-day average
        const [avgDaily] = await pool.execute(
            `SELECT AVG(quantity_used) as avg_daily
             FROM water_usage 
             WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
            [userId]
        );

        // Get last 7 days average
        const [recent7Days] = await pool.execute(
            `SELECT AVG(quantity_used) as avg_recent
             FROM water_usage 
             WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
            [userId]
        );

        // Get last 14 days for trend calculation
        const [last14Days] = await pool.execute(
            `SELECT AVG(quantity_used) as avg_14
             FROM water_usage 
             WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
             AND date < DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
            [userId]
        );

        const avgDailyUsage = parseFloat(avgDaily[0]?.avg_daily) || 0;
        const recentAvg = parseFloat(recent7Days[0]?.avg_recent) || 0;
        const previousAvg = parseFloat(last14Days[0]?.avg_14) || 0;

        // Calculate trend
        let trend = 'stable';
        let trendFactor = 1.0;
        let confidence = 'low';

        if (avgDailyUsage > 0) {
            confidence = 'high';
            
            if (recentAvg > 0 && previousAvg > 0) {
                const change = ((recentAvg - previousAvg) / previousAvg) * 100;
                if (change > 15) {
                    trend = 'increasing';
                    trendFactor = 1.15;
                } else if (change > 5) {
                    trend = 'slightly_increasing';
                    trendFactor = 1.05;
                } else if (change < -15) {
                    trend = 'decreasing';
                    trendFactor = 0.85;
                } else if (change < -5) {
                    trend = 'slightly_decreasing';
                    trendFactor = 0.95;
                }
            } else if (recentAvg > 0) {
                // Use recent average if available
                trendFactor = 1.0;
            }
        }

        // Use most recent data for prediction
        const basePrediction = recentAvg > 0 ? recentAvg : avgDailyUsage;

        const predictions = {
            nextWeek: Math.round(basePrediction * 7 * trendFactor * 100) / 100,
            nextMonth: Math.round(basePrediction * 30 * trendFactor * 100) / 100,
            nextQuarter: Math.round(basePrediction * 90 * trendFactor * 100) / 100,
            trend: trend,
            confidence: confidence,
            avgDaily: Math.round(basePrediction * 100) / 100,
            currentAvg: Math.round(avgDailyUsage * 100) / 100,
            recentAvg: Math.round(recentAvg * 100) / 100,
            trendFactor: Math.round(trendFactor * 100) / 100
        };

        res.json(predictions);
    } catch (error) {
        console.error('Error fetching predictions:', error);
        res.status(500).json({ error: 'Failed to fetch predictions' });
    }
});

export default router;
