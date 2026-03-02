# Backend Core Files - Detailed Explanation

## 1. `backend/src/index.js` - Main Server File

**Purpose**: Entry point for the Express server, sets up middleware and routes.

### Code Breakdown

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
```

**Imports**:
- `express`: Web framework for Node.js
- `cors`: Cross-Origin Resource Sharing middleware
- `dotenv`: Loads environment variables from `.env` file
- `path` & `fileURLToPath`: For handling file paths in ES modules

```javascript
const app = express();
const PORT = process.env.PORT || 5000;
```

**Server Setup**:
- Creates Express application instance
- Sets port from environment variable or defaults to 5000

```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
```

**CORS Configuration**:
- Allows requests from frontend origin
- Enables credentials (cookies, authorization headers)

```javascript
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

**Body Parsing Middleware**:
- `express.json()`: Parses JSON request bodies
- `express.urlencoded()`: Parses URL-encoded form data

```javascript
app.use('/assets', express.static(path.join(__dirname, '../assets')));
```

**Static Files**:
- Serves ER diagram and other static assets from `/assets` directory

```javascript
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Water Tracker API is running' });
});
```

**Health Check Endpoint**:
- Simple endpoint to verify server is running
- Returns status OK

```javascript
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
// ... other routes
```

**Route Registration**:
- Mounts all API route handlers
- Each route file handles specific resource endpoints

```javascript
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});
```

**404 Handler**:
- Catches all unmatched routes
- Returns 404 error

```javascript
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
```

**Error Handler**:
- Global error handler
- Logs errors and returns 500 status

---

## 2. `backend/src/db.js` - Database Connection

**Purpose**: Creates and manages MySQL database connection pool.

### Code Breakdown

```javascript
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();
```

**Imports**:
- `mysql2/promise`: MySQL client with Promise support
- `dotenv`: Loads environment variables

```javascript
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'watertracker',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
```

**Connection Pool Configuration**:
- `host`: Database server address
- `port`: MySQL port (default 3306)
- `user`: Database username
- `password`: Database password
- `database`: Database name
- `waitForConnections`: Wait for available connection if pool is full
- `connectionLimit`: Maximum number of connections (10)
- `queueLimit`: Maximum queue size (0 = unlimited)

**Why Connection Pool?**
- Reuses connections instead of creating new ones
- Improves performance and resource management
- Handles concurrent requests efficiently

```javascript
pool.getConnection()
  .then(connection => {
    console.log('Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('Database connection error:', err.message);
  });
```

**Connection Test**:
- Gets a connection from pool
- Logs success or error
- Releases connection back to pool

```javascript
export default pool;
```

**Export**:
- Exports pool for use in other files
- All database queries use this pool instance

---

## Usage Example

```javascript
// In any route file
import pool from '../db.js';

// Execute query
const [rows] = await pool.execute('SELECT * FROM users WHERE user_id = ?', [userId]);
```

**Benefits**:
- Automatic connection management
- Query parameterization prevents SQL injection
- Promise-based (async/await support)
- Efficient resource usage

---

## Key Points

1. **Connection Pooling**: Reuses connections for better performance
2. **Environment Variables**: All sensitive data comes from `.env` file
3. **Error Handling**: Catches and logs connection errors
4. **Promise-based**: Uses async/await for cleaner code
5. **Security**: Uses parameterized queries to prevent SQL injection



