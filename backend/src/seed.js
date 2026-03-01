/**
 * Database Seeding Script
 * Usage: node src/seed.js [demo|admin]
 */
import bcrypt from 'bcryptjs';
import pool from './db.js';
import dotenv from 'dotenv';

dotenv.config();

const seedType = process.argv[2] || 'all';

async function seedAdmin() {
  try {
    const adminEmail = 'admin@watertracker.com';
    const adminPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Check if admin exists
    const [existing] = await pool.execute(
      'SELECT user_id FROM users WHERE email = ?',
      [adminEmail]
    );

    if (existing.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    await pool.execute(
      `INSERT INTO users (firstname, lastname, email, password_hash, role) 
       VALUES (?, ?, ?, ?, ?)`,
      ['Admin', 'User', adminEmail, hashedPassword, 'admin']
    );

    console.log('\nAdmin user created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('Please change the password after first login!\n');
  } catch (error) {
    console.error('Error seeding admin:', error);
  }
}

async function seedDemo() {
  try {
    console.log('Seeding demo data...\n');

    // Seed demo users
    const demoUsers = [
      ['John', 'Doe', 'john@example.com', await bcrypt.hash('password123', 10), '555-0101', '123 Main St, City'],
      ['Jane', 'Smith', 'jane@example.com', await bcrypt.hash('password123', 10), '555-0102', '456 Oak Ave, Town'],
      ['Bob', 'Johnson', 'bob@example.com', await bcrypt.hash('password123', 10), '555-0103', '789 Pine Rd, Village'],
      ['Alice', 'Williams', 'alice@example.com', await bcrypt.hash('password123', 10), '555-0104', '321 Elm St, Suburb'],
      ['Charlie', 'Brown', 'charlie@example.com', await bcrypt.hash('password123', 10), '555-0105', '654 Maple Dr, District'],
    ];

    for (const [firstname, lastname, email, password_hash, contact_no, address] of demoUsers) {
      await pool.execute(
        `INSERT IGNORE INTO users (firstname, lastname, email, password_hash, contact_no, address) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [firstname, lastname, email, password_hash, contact_no, address]
      );
    }

    // Seed water sources
    const sources = [
      ['Municipal Supply', 'City Center', 'municipal'],
      ['Well Water', 'Rural Area', 'well'],
      ['Rainwater Harvesting', 'Residential', 'rainwater'],
      ['Borewell', 'Suburban', 'borewell'],
    ];

    for (const [source_name, location, source_type] of sources) {
      await pool.execute(
        `INSERT IGNORE INTO water_source (source_name, location, source_type) 
         VALUES (?, ?, ?)`,
        [source_name, location, source_type]
      );
    }

    // Seed conservation activities
    const activities = [
      ['Fix Leaks', 'Repair all leaking faucets and pipes', 'indoor'],
      ['Low-Flow Showerheads', 'Install water-efficient showerheads', 'indoor'],
      ['Rainwater Collection', 'Set up barrels to collect rainwater', 'outdoor'],
      ['Drought-Resistant Plants', 'Plant native, water-efficient vegetation', 'outdoor'],
      ['Smart Irrigation', 'Use timers and moisture sensors for gardens', 'outdoor'],
    ];

    for (const [activity_name, description, category] of activities) {
      await pool.execute(
        `INSERT IGNORE INTO conservation_activities (activity_name, description, category) 
         VALUES (?, ?, ?)`,
        [activity_name, description, category]
      );
    }

    // Seed smart meters (one per user)
    const [users] = await pool.execute('SELECT user_id FROM users WHERE role = "user"');
    const [waterSources] = await pool.execute('SELECT source_id FROM water_source');

    const meterTypes = ['digital', 'analog', 'smart', 'IoT-enabled'];
    for (const user of users) {
      const installDate = new Date();
      installDate.setDate(installDate.getDate() - Math.floor(Math.random() * 365)); // Random date in last year
      await pool.execute(
        `INSERT IGNORE INTO smart_meters (user_id, meter_type, status, total_usage, install_date) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          user.user_id, 
          meterTypes[Math.floor(Math.random() * meterTypes.length)], 
          'active', 
          Math.random() * 5000 + 1000, 
          installDate
        ]
      );
    }

    // Seed water usage (more comprehensive data)
    const purposes = ['showering', 'cooking', 'cleaning', 'gardening', 'washing', 'drinking', 'bathing', 'laundry'];
    for (const user of users) {
      // Generate 30 days of usage data
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        // Multiple entries per day for some days
        const entriesPerDay = i % 7 === 0 ? 3 : (i % 3 === 0 ? 2 : 1);
        for (let j = 0; j < entriesPerDay; j++) {
          await pool.execute(
            `INSERT IGNORE INTO water_usage (user_id, source_id, purpose, date, quantity_used, cost) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              user.user_id,
              waterSources[Math.floor(Math.random() * waterSources.length)].source_id,
              purposes[Math.floor(Math.random() * purposes.length)],
              date.toISOString().split('T')[0],
              Math.random() * 100 + 20,
              Math.random() * 8 + 2,
            ]
          );
        }
      }
    }

    // Seed goals (multiple goals per user)
    const goalTypes = ['reduce_consumption', 'save_money', 'conserve_water'];
    const statuses = ['active', 'completed', 'active', 'active']; // More active goals
    for (const user of users) {
      // Create 2-3 goals per user
      const numGoals = Math.floor(Math.random() * 2) + 2;
      for (let i = 0; i < numGoals; i++) {
        const daysFromNow = (i + 1) * 30; // 30, 60, 90 days
        const deadline = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
        const progress = Math.floor(Math.random() * 80) + 10; // 10-90%
        await pool.execute(
          `INSERT IGNORE INTO goals (user_id, goal_type, target_quantity, deadline, status, progress) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            user.user_id,
            goalTypes[Math.floor(Math.random() * goalTypes.length)],
            Math.floor(Math.random() * 200) + 50, // 50-250 liters
            deadline.toISOString().split('T')[0],
            statuses[Math.floor(Math.random() * statuses.length)],
            `${progress}%`,
          ]
        );
      }
    }

    // Seed alerts (various types and statuses)
    const alertTypes = ['leak', 'usage-high', 'goal-warning', 'maintenance', 'bill-alert'];
    const alertMessages = [
      'Water leak detected in kitchen sink',
      'Your water usage is 20% above average this week',
      'You are close to exceeding your monthly goal',
      'Scheduled maintenance for smart meter',
      'Your water bill is 15% higher than last month',
      'Leak detected in bathroom faucet',
      'Unusual water usage pattern detected',
      'Goal deadline approaching - 5 days remaining',
    ];
    const alertStatuses = ['reported', 'approved', 'in-progress', 'resolved', 'rejected'];
    const severities = ['low', 'medium', 'high', 'critical'];
    
    // Get admin user for some resolved alerts
    const [admins] = await pool.execute('SELECT user_id FROM users WHERE role = "admin" LIMIT 1');
    const adminId = admins.length > 0 ? admins[0].user_id : null;
    
    // Create more alerts with better distribution for charts
    for (const user of users) {
      // Create 5-8 alerts per user for better visualization
      const numAlerts = Math.floor(Math.random() * 4) + 5;
      for (let i = 0; i < numAlerts; i++) {
        const alertDate = new Date();
        alertDate.setDate(alertDate.getDate() - Math.floor(Math.random() * 60)); // Last 60 days
        
        // Better distribution: 30% reported, 20% approved, 15% in-progress, 20% resolved, 15% rejected
        let status;
        const rand = Math.random();
        if (rand < 0.30) status = 'reported';
        else if (rand < 0.50) status = 'approved';
        else if (rand < 0.65) status = 'in-progress';
        else if (rand < 0.85) status = 'resolved';
        else status = 'rejected';
        
        const hasAdminAction = ['approved', 'in-progress', 'resolved', 'rejected'].includes(status);
        const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
        const severity = severities[Math.floor(Math.random() * severities.length)];
        
        await pool.execute(
          `INSERT IGNORE INTO alerts (user_id, alert_type, message, status, severity, alert_date, admin_id, admin_comment, action_date) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user.user_id,
            alertType,
            alertMessages[Math.floor(Math.random() * alertMessages.length)],
            status,
            severity,
            alertDate.toISOString().split('T')[0],
            hasAdminAction ? adminId : null,
            hasAdminAction ? 'Admin reviewed and processed this alert' : null,
            hasAdminAction ? new Date(alertDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
          ]
        );
      }
    }
    
    // Seed user activities (users joining conservation activities)
    const [allActivities] = await pool.execute('SELECT activity_id FROM conservation_activities');
    for (const user of users) {
      // Each user joins 2-4 activities
      const numActivities = Math.floor(Math.random() * 3) + 2;
      const selectedActivities = [];
      for (let i = 0; i < numActivities && i < allActivities.length; i++) {
        let activity;
        do {
          activity = allActivities[Math.floor(Math.random() * allActivities.length)];
        } while (selectedActivities.includes(activity.activity_id));
        selectedActivities.push(activity.activity_id);
        
        const joinDate = new Date();
        joinDate.setDate(joinDate.getDate() - Math.floor(Math.random() * 60)); // Last 60 days
        await pool.execute(
          `INSERT IGNORE INTO user_activities (user_id, activity_id, participation_date) 
           VALUES (?, ?, ?)`,
          [user.user_id, activity.activity_id, joinDate.toISOString().split('T')[0]]
        );
      }
    }

    // Summary
    const [userCount] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE role = "user"');
    const [usageCount] = await pool.execute('SELECT COUNT(*) as count FROM water_usage');
    const [alertCount] = await pool.execute('SELECT COUNT(*) as count FROM alerts');
    const [goalCount] = await pool.execute('SELECT COUNT(*) as count FROM goals');
    const [meterCount] = await pool.execute('SELECT COUNT(*) as count FROM smart_meters');
    const [activityCount] = await pool.execute('SELECT COUNT(*) as count FROM user_activities');
    
    console.log('Demo data seeded successfully!\n');
    console.log('Data Summary:');
    console.log(`  - Users: ${userCount[0].count}`);
    console.log(`  - Water Usage Records: ${usageCount[0].count}`);
    console.log(`  - Alerts: ${alertCount[0].count}`);
    console.log(`  - Goals: ${goalCount[0].count}`);
    console.log(`  - Smart Meters: ${meterCount[0].count}`);
    console.log(`  - User Activities: ${activityCount[0].count}\n`);
  } catch (error) {
    console.error('Error seeding demo data:', error);
  }
}

async function runSeeds() {
  if (seedType === 'admin' || seedType === 'all') {
    await seedAdmin();
  }
  if (seedType === 'demo' || seedType === 'all') {
    await seedDemo();
  }
  
  await pool.end();
  process.exit(0);
}

runSeeds();

