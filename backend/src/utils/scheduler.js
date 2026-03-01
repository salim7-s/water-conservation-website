import cron from 'node-cron';
import { calculateAllGoalsProgress } from './calculateGoalProgress.js';
import pool from '../db.js';

/**
 * Check for water usage anomalies and generate alerts
 */
async function checkUsageAnomalies() {
    try {
        console.log('🔍 Checking for usage anomalies...');

        // Get all users
        const [users] = await pool.execute('SELECT user_id FROM users WHERE role = "user"');

        for (const user of users) {
            // Get average daily usage for the past 30 days
            const [avgData] = await pool.execute(
                `SELECT AVG(quantity_used) as avg_usage
         FROM water_usage
         WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
                [user.user_id]
            );

            const avgUsage = parseFloat(avgData[0]?.avg_usage) || 0;
            if (avgUsage === 0) continue;

            // Get today's usage
            const [todayData] = await pool.execute(
                `SELECT SUM(quantity_used) as today_usage
         FROM water_usage
         WHERE user_id = ? AND date = CURDATE()`,
                [user.user_id]
            );

            const todayUsage = parseFloat(todayData[0]?.today_usage) || 0;

            // If today's usage is 150% or more of average, create an alert
            if (todayUsage >= avgUsage * 1.5 && todayUsage > 0) {
                // Check if alert already exists for today
                const [existingAlerts] = await pool.execute(
                    `SELECT alert_id FROM alerts
           WHERE user_id = ? AND alert_type = 'high_usage' AND alert_date = CURDATE()`,
                    [user.user_id]
                );

                if (existingAlerts.length === 0) {
                    const increasePercent = Math.round(((todayUsage - avgUsage) / avgUsage) * 100);
                    const message = `Your water usage today (${Math.round(todayUsage)}L) is ${increasePercent}% higher than your 30-day average (${Math.round(avgUsage)}L). This could indicate a leak or unusual activity.`;
                    
                    await pool.execute(
                        `INSERT INTO alerts (user_id, alert_type, status, alert_date, message, severity)
             VALUES (?, 'high_usage', 'active', CURDATE(), ?, ?)`,
                        [user.user_id, message, increasePercent > 100 ? 'high' : 'medium']
                    );
                    console.log(`⚠️  Created high usage alert for user ${user.user_id}`);
                }
            }
        }

        console.log('✅ Anomaly check completed');
    } catch (error) {
        console.error('Error checking usage anomalies:', error);
    }
}

/**
 * Check for goals at risk and generate alerts
 */
async function checkGoalsAtRisk() {
    try {
        console.log('🎯 Checking for goals at risk...');

        const [goals] = await pool.execute(
            `SELECT g.*, u.user_id
       FROM goals g
       JOIN users u ON g.user_id = u.user_id
       WHERE g.status = 'active' AND g.deadline >= CURDATE()`
        );

        for (const goal of goals) {
            const deadline = new Date(goal.deadline);
            const today = new Date();
            const daysRemaining = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

            // Parse progress (stored as "50%" string)
            const progressMatch = goal.progress.match(/(\d+)/);
            const progress = progressMatch ? parseInt(progressMatch[1]) : 0;

            // If less than 7 days remaining and progress < 50%, create alert
            if (daysRemaining <= 7 && progress < 50) {
                // Check if alert already exists for this specific goal
                const [existingAlerts] = await pool.execute(
                    `SELECT alert_id FROM alerts
           WHERE user_id = ? AND alert_type = 'goal_at_risk' 
           AND message LIKE ?
           AND alert_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
                    [goal.user_id, `%Goal #${goal.goal_id}%`]
                );

                if (existingAlerts.length === 0) {
                    const message = `Goal #${goal.goal_id} (${goal.goal_type}) is at risk! Only ${daysRemaining} day(s) remaining and you're at ${progress}% progress. Target: ${goal.target_quantity}.`;
                    
                    await pool.execute(
                        `INSERT INTO alerts (user_id, alert_type, status, alert_date, message, severity)
             VALUES (?, 'goal_at_risk', 'active', CURDATE(), ?, ?)`,
                        [goal.user_id, message, daysRemaining <= 3 ? 'high' : 'medium']
                    );
                    console.log(`⚠️  Created goal at risk alert for user ${goal.user_id}, goal ${goal.goal_id}`);
                }
            }
        }

        console.log('✅ Goal risk check completed');
    } catch (error) {
        console.error('Error checking goals at risk:', error);
    }
}

/**
 * Update smart meter totals based on water usage
 */
async function updateSmartMeterTotals() {
    try {
        console.log('📊 Updating smart meter totals...');

        const [meters] = await pool.execute(
            'SELECT meter_id, user_id FROM smart_meters WHERE status = "active"'
        );

        for (const meter of meters) {
            // Calculate total usage for this user
            const [usageData] = await pool.execute(
                `SELECT SUM(quantity_used) as total
         FROM water_usage
         WHERE user_id = ?`,
                [meter.user_id]
            );

            const total = parseFloat(usageData[0]?.total) || 0;

            // Update meter
            await pool.execute(
                'UPDATE smart_meters SET total_usage = ? WHERE meter_id = ?',
                [total, meter.meter_id]
            );
        }

        console.log(`✅ Updated ${meters.length} smart meters`);
    } catch (error) {
        console.error('Error updating smart meter totals:', error);
    }
}

/**
 * Initialize all scheduled tasks
 */
export function initializeScheduler() {
    console.log('🚀 Initializing scheduler...');

    // Update goal progress every hour
    cron.schedule('0 * * * *', async () => {
        console.log('⏰ Running scheduled goal progress update...');
        await calculateAllGoalsProgress();
    });

    // Check for anomalies every 6 hours
    cron.schedule('0 */6 * * *', async () => {
        console.log('⏰ Running scheduled anomaly check...');
        await checkUsageAnomalies();
    });

    // Check for goals at risk once daily at 9 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('⏰ Running scheduled goal risk check...');
        await checkGoalsAtRisk();
    });

    // Update smart meter totals every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
        console.log('⏰ Running scheduled smart meter update...');
        await updateSmartMeterTotals();
    });

    console.log('✅ Scheduler initialized successfully');
    console.log('📅 Scheduled tasks:');
    console.log('  - Goal progress update: Every hour');
    console.log('  - Anomaly check: Every 6 hours');
    console.log('  - Goal risk check: Daily at 9 AM');
    console.log('  - Smart meter update: Every 30 minutes');
}

// Export individual functions for manual triggering
export {
    checkUsageAnomalies,
    checkGoalsAtRisk,
    updateSmartMeterTotals
};
