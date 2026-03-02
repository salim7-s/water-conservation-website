# Backend Utilities - Detailed Explanation

## 1. `backend/src/utils/sse.js` - Server-Sent Events

**Purpose**: Streams real-time smart meter data to clients.

### Code Breakdown

```javascript
async function getSimulatedMeterData() {
  // Fetch actual meters from database
  const [meters] = await pool.execute(
    `SELECT meter_id, user_id, meter_type, status, total_usage, install_date 
     FROM smart_meters 
     WHERE status = 'active' 
     LIMIT 10`
  );

  // Simulate real-time updates with small random variations
  const simulatedData = meters.map(meter => ({
    meter_id: meter.meter_id,
    user_id: meter.user_id,
    total_usage: meter.total_usage + (Math.random() * 0.5 - 0.25), // ±0.25 variation
    status: meter.status,
    last_update: new Date().toISOString(),
  }));

  return {
    ts: new Date().toISOString(),
    meters: simulatedData,
  };
}
```

**How it works**:
1. Fetches active meters from database
2. Adds small random variations to simulate real-time updates
3. Returns timestamp and meter data

### `setupSSE` Function

```javascript
export function setupSSE(req, res) {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE stream started' })}\n\n`);

  // Send data every 2-3 seconds
  const interval = setInterval(async () => {
    const data = await getSimulatedMeterData();
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }, 2000 + Math.random() * 1000);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
}
```

**SSE Headers**:
- `Content-Type: text/event-stream`: Tells browser this is SSE
- `Cache-Control: no-cache`: Prevents caching
- `Connection: keep-alive`: Keeps connection open
- `Access-Control-Allow-Origin: *`: Allows CORS

**Data Format**:
- Each message: `data: {json}\n\n`
- Double newline (`\n\n`) indicates end of message

**Cleanup**:
- Clears interval when client disconnects
- Prevents memory leaks

---

## 2. `backend/src/migrate.js` - Database Migration Script

**Purpose**: Runs SQL migration files to set up database schema.

### Code Breakdown

```javascript
async function runMigrations() {
  // Connect without database first
  connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'rootpassword',
  });

  // Create database if not exists
  await connection.query('CREATE DATABASE IF NOT EXISTS watertracker');
  await connection.query('USE watertracker');

  // Get all SQL files
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  // Execute each migration file
  for (const file of files) {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Parse SQL statements
    const statements = sql.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Execute each statement
    for (const statement of statements) {
      try {
        await connection.query(statement);
      } catch (err) {
        if (err.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log('Table already exists (skipping)');
        } else {
          throw err;
        }
      }
    }
  }
}
```

**How it works**:
1. Connects to MySQL (without database)
2. Creates database if not exists
3. Reads all `.sql` files from migrations folder
4. Executes them in order (sorted by filename)
5. Handles existing tables gracefully

**Migration Files**:
- `001_create_database.sql` - Database creation (skipped, already done)
- `002_create_users.sql` - Users table
- `003_create_water_source.sql` - Water sources table
- ... and so on

---

## 3. `backend/src/seed.js` - Database Seeding Script

**Purpose**: Populates database with initial data (admin user, demo data).

### Code Breakdown

```javascript
async function seedAdmin() {
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

  // Create admin user
  await pool.execute(
    `INSERT INTO users (firstname, lastname, email, password_hash, role) 
     VALUES (?, ?, ?, ?, ?)`,
    ['Admin', 'User', adminEmail, hashedPassword, 'admin']
  );
}
```

**Seeds**:
1. **Admin User**: Creates admin account
2. **Demo Users**: Creates 5 demo users
3. **Water Sources**: Creates 4 water sources
4. **Activities**: Creates 5 conservation activities
5. **Smart Meters**: Creates meters for each user
6. **Water Usage**: Creates 30 days of usage data per user
7. **Goals**: Creates 2-3 goals per user
8. **Alerts**: Creates 5-8 alerts per user with various statuses
9. **User Activities**: Links users to activities

**Usage**:
```bash
npm run seed          # Seeds admin + demo data
npm run seed:admin    # Seeds only admin
npm run seed:demo     # Seeds only demo data
```

---

## Key Points

1. **SSE**: Provides real-time updates without WebSockets
2. **Migrations**: Version-controlled database schema
3. **Seeding**: Populates database with test data
4. **Error Handling**: Gracefully handles existing data
5. **Modularity**: Each utility has single responsibility



