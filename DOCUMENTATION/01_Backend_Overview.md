# Backend Overview - Architecture & Structure

## Backend Architecture

The backend is a Node.js/Express REST API server that handles:
- User authentication and authorization
- Database operations
- Real-time data streaming (SSE)
- Admin operations
- Data validation

---

## Technology Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MySQL (via mysql2)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Environment**: dotenv

---

## Project Structure

```
backend/
├── src/
│   ├── index.js              # Main server file
│   ├── db.js                 # Database connection pool
│   ├── migrate.js            # Migration script
│   ├── seed.js               # Seeding script
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication
│   │   └── validation.js     # Input validation
│   ├── routes/
│   │   ├── auth.js           # Authentication routes
│   │   ├── users.js          # User management
│   │   ├── alerts.js         # Alert management
│   │   ├── admin.js          # Admin operations
│   │   ├── water_usage.js    # Usage tracking
│   │   ├── goals.js          # Goals management
│   │   ├── water_sources.js  # Water sources
│   │   ├── smart_meters.js   # Smart meters
│   │   ├── conservation_activities.js  # Activities
│   │   ├── user_activities.js # User-activity junction
│   │   └── stream.js         # SSE streaming
│   └── utils/
│       └── sse.js            # SSE utility
├── migrations/               # SQL migration files
├── assets/                   # Static files (ER diagram)
├── .env                      # Environment variables
└── package.json              # Dependencies
```

---

## Key Concepts

### 1. Connection Pooling
- Uses `mysql2/promise` connection pool
- Reuses connections for better performance
- Handles concurrent requests efficiently

### 2. JWT Authentication
- Token-based authentication
- Tokens contain: user_id, email, role
- Expires after 7 days (configurable)
- Stored in Authorization header

### 3. Role-Based Access Control
- Two roles: `user` and `admin`
- Middleware checks role before allowing access
- Admin routes require `requireRole('admin')`

### 4. Input Validation
- Uses `express-validator`
- Validates all user inputs
- Returns clear error messages
- Prevents invalid data from reaching database

### 5. Error Handling
- Global error handler catches all errors
- Returns appropriate HTTP status codes
- Logs errors for debugging
- User-friendly error messages

---

## Request Flow

1. **Request arrives** → Express receives HTTP request
2. **CORS check** → Validates origin
3. **Body parsing** → Parses JSON/URL-encoded data
4. **Route matching** → Finds matching route handler
5. **Authentication** → Verifies JWT token (if protected)
6. **Authorization** → Checks user role (if required)
7. **Validation** → Validates request data
8. **Business logic** → Route handler processes request
9. **Database query** → Executes SQL queries
10. **Response** → Returns JSON response

---

## Security Features

1. **Password Hashing**: Bcrypt with 10 rounds
2. **JWT Tokens**: Secure token-based authentication
3. **SQL Injection Prevention**: Parameterized queries
4. **Input Validation**: Validates all inputs
5. **CORS**: Restricts allowed origins
6. **Role-Based Access**: Prevents unauthorized access

---

## Database Operations

### Query Pattern
```javascript
// Parameterized query (prevents SQL injection)
const [rows] = await pool.execute(
  'SELECT * FROM users WHERE email = ?',
  [email]
);

// Insert
const [result] = await pool.execute(
  'INSERT INTO users (email, password_hash) VALUES (?, ?)',
  [email, passwordHash]
);

// Update
await pool.execute(
  'UPDATE users SET firstname = ? WHERE user_id = ?',
  [firstname, userId]
);

// Delete
await pool.execute(
  'DELETE FROM users WHERE user_id = ?',
  [userId]
);
```

### Transaction Example
```javascript
const connection = await pool.getConnection();
await connection.beginTransaction();

try {
  await connection.execute('INSERT INTO ...');
  await connection.execute('UPDATE ...');
  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
}
```

---

## Environment Variables

Required in `backend/.env`:
- `DB_HOST`: MySQL host
- `DB_PORT`: MySQL port
- `DB_USER`: MySQL username
- `DB_PASSWORD`: MySQL password
- `DB_NAME`: Database name
- `JWT_SECRET`: Secret for JWT tokens
- `JWT_EXPIRES_IN`: Token expiration (e.g., "7d")
- `PORT`: Server port
- `CORS_ORIGIN`: Frontend URL

---

## API Response Format

### Success Response
```json
{
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error message",
  "errors": [ ... ]  // For validation errors
}
```

---

## Development vs Production

### Development
- Auto-reload with `node --watch`
- Detailed error messages
- CORS allows localhost

### Production
- Use `npm start` (no auto-reload)
- Hide sensitive error details
- Restrict CORS to production domain
- Use environment variables for secrets

---

## Testing Endpoints

Use tools like:
- **Postman**: API testing
- **curl**: Command line testing
- **Browser**: For GET requests
- **Frontend**: Full integration testing

Example:
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@watertracker.com","password":"admin123"}'
```

---

## Key Files Explained

- **index.js**: Server setup, middleware, routes
- **db.js**: Database connection pool
- **middleware/auth.js**: JWT authentication
- **middleware/validation.js**: Input validation
- **routes/**: All API endpoints
- **utils/sse.js**: Real-time streaming
- **migrate.js**: Database setup
- **seed.js**: Demo data creation

For detailed explanations, see:
- `02_Backend_Core_Files.md` - Core files
- `03_Backend_Middleware.md` - Middleware
- `04_Backend_Routes.md` - All routes
- `05_Backend_Utils.md` - Utilities



