import pool from '../db.js';

/**
 * Calculate progress for a specific goal
 * @param {number} goalId - The goal ID to calculate progress for
 * @returns {Promise<{progress: number, status: string}>}
 */
export async function calculateSingleGoalProgress(goalId) {
  try {
    // Get the goal
    const [goals] = await pool.execute(
      'SELECT * FROM goals WHERE goal_id = ?',
      [goalId]
    );

    if (goals.length === 0) {
      throw new Error('Goal not found');
    }

    const goal = goals[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day
    const deadline = new Date(goal.deadline);
    deadline.setHours(23, 59, 59, 999); // End of deadline day
    
    // Use created_at as start date, or if not available, use 30 days before deadline
    let startDate = goal.created_at ? new Date(goal.created_at) : new Date(deadline);
    if (!goal.created_at) {
      startDate.setDate(startDate.getDate() - 30);
    }
    startDate.setHours(0, 0, 0, 0);

    // Ensure we don't go beyond today
    const effectiveEndDate = today < deadline ? today : deadline;

    // Get user's water usage in goal period
    const [usageData] = await pool.execute(
      `SELECT SUM(quantity_used) as total_usage, SUM(cost) as total_cost, COUNT(*) as usage_count
       FROM water_usage
       WHERE user_id = ? AND date >= ? AND date <= ?`,
      [goal.user_id, startDate.toISOString().split('T')[0], effectiveEndDate.toISOString().split('T')[0]]
    );

    const totalUsage = parseFloat(usageData[0]?.total_usage) || 0;
    const totalCost = parseFloat(usageData[0]?.total_cost) || 0;
    const targetQuantity = parseFloat(goal.target_quantity) || 0;

    if (targetQuantity === 0) {
      // Invalid target, set progress to 0
      await pool.execute(
        `UPDATE goals SET progress = ?, status = ? WHERE goal_id = ?`,
        ['0%', 'active', goalId]
      );
      return { progress: 0, status: 'active' };
    }

    let progress = 0;
    let newStatus = goal.status;

    // Calculate time progress (how much of the goal period has passed)
    const totalDays = Math.ceil((deadline - startDate) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.ceil((effectiveEndDate - startDate) / (1000 * 60 * 60 * 24));
    const timeProgress = totalDays > 0 ? (daysPassed / totalDays) * 100 : 0;

    // Calculate progress based on goal type
    if (goal.goal_type === 'reduce_consumption' || goal.goal_type === 'daily_limit') {
      // For reduction goals: target is maximum allowed usage
      // Progress = how well we're staying under the target
      if (totalUsage === 0) {
        progress = 100; // No usage = perfect
      } else if (totalUsage <= targetQuantity) {
        // We're under target - calculate how well
        progress = Math.min(100, (targetQuantity / (totalUsage || 1)) * 100);
      } else {
        // We're over target - negative progress
        const overage = totalUsage - targetQuantity;
        progress = Math.max(0, 100 - ((overage / targetQuantity) * 100));
      }
    } else if (goal.goal_type === 'save_money') {
      // For cost savings: target is maximum cost allowed
      if (totalCost === 0) {
        progress = 100;
      } else if (totalCost <= targetQuantity) {
        progress = Math.min(100, (targetQuantity / (totalCost || 1)) * 100);
      } else {
        const overage = totalCost - targetQuantity;
        progress = Math.max(0, 100 - ((overage / targetQuantity) * 100));
      }
    } else if (goal.goal_type === 'increase_awareness' || goal.goal_type === 'track_usage') {
      // For tracking goals: progress based on usage entries
      // Target might be number of entries or total usage
      if (usageData[0]?.usage_count > 0) {
        progress = Math.min(100, (usageData[0].usage_count / targetQuantity) * 100);
      } else {
        progress = 0;
      }
    } else {
      // Default: progress toward target usage (e.g., "use 1000L this month")
      progress = Math.min(100, (totalUsage / targetQuantity) * 100);
    }

    progress = Math.round(Math.max(0, Math.min(100, progress)));

    // Update status based on deadline and progress
    if (today > deadline) {
      // Deadline has passed
      if (progress >= 80) {
        newStatus = 'completed';
      } else if (progress >= 50) {
        newStatus = 'failed'; // Partial completion but not enough
      } else {
        newStatus = 'failed';
      }
    } else if (progress >= 100) {
      newStatus = 'completed';
    } else if (progress < 0 || (timeProgress > 80 && progress < 30)) {
      // Very behind schedule
      newStatus = 'active'; // Keep active but might trigger alerts
    } else {
      newStatus = 'active';
    }

    // Update goal in database
    await pool.execute(
      `UPDATE goals SET progress = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE goal_id = ?`,
      [`${progress}%`, newStatus, goalId]
    );

    return { progress, status: newStatus, totalUsage, totalCost };
  } catch (error) {
    console.error('Error calculating goal progress:', error);
    throw error;
  }
}

/**
 * Calculate progress for all active goals
 */
export async function calculateAllGoalsProgress() {
  try {
    // Get all active goals
    const [goals] = await pool.execute(
      'SELECT goal_id FROM goals WHERE status IN ("active", "completed")'
    );

    let updated = 0;
    for (const goal of goals) {
      try {
        await calculateSingleGoalProgress(goal.goal_id);
        updated++;
      } catch (error) {
        console.error(`Failed to update goal ${goal.goal_id}:`, error.message);
      }
    }

    console.log(`✅ Updated progress for ${updated}/${goals.length} goals`);
    return updated;
  } catch (error) {
    console.error('Error calculating all goals progress:', error);
    throw error;
  }
}

/**
 * Calculate progress for all goals belonging to a specific user
 * @param {number} userId - The user ID
 */
export async function calculateUserGoalsProgress(userId) {
  try {
    const [goals] = await pool.execute(
      'SELECT goal_id FROM goals WHERE user_id = ? AND status IN ("active", "completed")',
      [userId]
    );

    for (const goal of goals) {
      await calculateSingleGoalProgress(goal.goal_id);
    }

    return goals.length;
  } catch (error) {
    console.error('Error calculating user goals progress:', error);
    throw error;
  }
}