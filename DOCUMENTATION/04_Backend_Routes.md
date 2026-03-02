# Backend Routes - Detailed Explanation

## Overview
All API routes are organized in separate files under `backend/src/routes/`. Each route file handles a specific resource.

---

## 1. `backend/src/routes/auth.js` - Authentication Routes

**Purpose**: Handles user registration and login.

### POST `/api/auth/register`

**Code**:
```javascript
router.post('/register', validateRegister, async (req, res) => {
  const { firstname, lastname, email, password, contact_no, address } = req.body;
  
  // Check if user exists
  const [existing] = await pool.execute(
    'SELECT user_id FROM users WHERE email = ?',
    [email]
  );
  
  if (existing.length > 0) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  
  // Hash password with bcrypt (10 rounds)
  const password_hash = await bcrypt.hash(password, 10);
  
  // Insert user
  const [result] = await pool.execute(
    `INSERT INTO users (firstname, lastname, email, password_hash, contact_no, address) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [firstname, lastname, email, password_hash, contact_no || null, address || null]
  );
  
  // Generate JWT token
  const token = jwt.sign(
    { user_id: result.insertId, email, role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  
  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: { user_id: result.insertId, firstname, lastname, email, role: 'user' }
  });
});
```

**Flow**:
1. Validates input (via middleware)
2. Checks if email already exists
3. Hashes password with bcrypt
4. Inserts user into database
5. Generates JWT token
6. Returns token and user data

### POST `/api/auth/login`

**Code**:
```javascript
router.post('/login', validateLogin, async (req, res) => {
  const { email, password } = req.body;
  
  // Find user by email
  const [users] = await pool.execute(
    'SELECT user_id, email, password_hash, firstname, lastname, role FROM users WHERE email = ?',
    [email]
  );
  
  if (users.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const user = users[0];
  
  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Generate JWT
  const token = jwt.sign(
    { user_id: user.user_id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  
  res.json({ message: 'Login successful', token, user });
});
```

**Flow**:
1. Validates input
2. Finds user by email
3. Compares password with bcrypt
4. Generates JWT token
5. Returns token and user data

---

## 2. `backend/src/routes/users.js` - User Management

**Purpose**: Handles user profile operations.

### GET `/api/users`
- **Admin**: Returns all users
- **User**: Returns own profile only

### GET `/api/users/:id`
- Returns specific user by ID
- Users can only view their own profile (unless admin)

### PUT `/api/users/:id`
- Updates user profile
- Users can only update their own profile (unless admin)

---

## 3. `backend/src/routes/alerts.js` - Alert Management

**Purpose**: Handles water leak reports and alerts.

### GET `/api/alerts`
- Returns all alerts for current user
- Admin can see all alerts

### POST `/api/alerts`
- Creates new alert (leak report)
- Requires: alert_type, message, user_id, severity

### GET `/api/alerts/:id`
- Returns specific alert details

### PUT `/api/alerts/:id`
- Updates alert (user can update their own)

---

## 4. `backend/src/routes/admin.js` - Admin Operations

**Purpose**: Admin-only operations for managing alerts.

**All routes require**: `authenticate` + `requireRole('admin')`

### POST `/api/admin/alerts/:id/approve`
- Approves an alert
- Sets status to 'approved'
- Records admin_id and comment

### POST `/api/admin/alerts/:id/reject`
- Rejects an alert
- Sets status to 'rejected'

### POST `/api/admin/alerts/:id/in-progress`
- Marks alert as 'in-progress'

### POST `/api/admin/alerts/:id/resolve`
- Resolves an alert
- Sets status to 'resolved'

### GET `/api/admin/alerts`
- Returns all alerts with user and admin info

### GET `/api/admin/stats`
- Returns dashboard statistics:
  - Total users
  - Total alerts
  - Pending alerts
  - Total usage
  - Active meters
  - Goals, activities, etc.

---

## 5. `backend/src/routes/water_usage.js` - Water Usage Tracking

**Purpose**: Tracks water consumption.

### GET `/api/water-usage`
- Returns usage records
- User: Own records only
- Admin: All records

### GET `/api/water-usage/stats`
- Returns statistics:
  - Daily usage
  - Weekly usage
  - Monthly usage
  - Predictions

### POST `/api/water-usage`
- Creates new usage record
- Requires: user_id, source_id, purpose, date, quantity_used, cost

### PUT `/api/water-usage/:id`
- Updates usage record

### DELETE `/api/water-usage/:id`
- Deletes usage record

---

## 6. `backend/src/routes/goals.js` - Goals Management

**Purpose**: Manages conservation goals.

### GET `/api/goals`
- Returns all goals for current user

### POST `/api/goals`
- Creates new goal
- Requires: user_id, goal_type, target_quantity, deadline

### PUT `/api/goals/:id`
- Updates goal

### DELETE `/api/goals/:id`
- Deletes goal

---

## 7. `backend/src/routes/stream.js` - Real-time Streaming

**Purpose**: Server-Sent Events for real-time meter data.

### GET `/api/stream/meters`
- SSE endpoint for smart meter readings
- Token passed as query parameter (SSE doesn't support headers)
- Streams data every 2-3 seconds
- Simulates real-time meter updates

**Code Flow**:
1. Verifies JWT token
2. Sets SSE headers
3. Sends initial connection message
4. Sends meter data every 2-3 seconds
5. Cleans up on client disconnect

---

## Route Pattern

All protected routes follow this pattern:
```javascript
router.use(authenticate);  // Require authentication
// or
router.use(authenticate);
router.use(requireRole('admin'));  // Require admin role
```

**Benefits**:
- Consistent authentication
- Reusable middleware
- Clear authorization rules



