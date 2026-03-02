# 🎯 Interview Preparation — Water Conservation & Usage Tracker DBMS

> **Project at a Glance:**
> A full-stack water conservation management system with a Node.js/Express REST API, MySQL database, React frontend, and Server-Sent Events for real-time IoT meter streaming. Tracks 3,600+ water usage records across 6 users with automated anomaly alerts, goal progress calculation, and role-based admin workflows.

---

# PART 1 — TECH STACK & ARCHITECTURE

## Q1: Walk me through your tech stack and why you chose each piece.

**Answer:**

**Backend — Node.js + Express.js**
I chose Node.js because its non-blocking, event-driven architecture is a natural fit for two key requirements: (1) handling concurrent API requests from multiple users without thread overhead, and (2) SSE streaming — where a persistent HTTP connection pushes real-time meter readings to the frontend without blocking other requests.

Express gives a minimal, unopinionated REST framework. I structured it with 12 separate route modules (auth, users, water_usage, goals, alerts, smart_meters, conservation, user_activities, dashboard, admin, stream) — each mounted at its own prefix in `app.js`. This keeps concerns separated and individually testable.

**Database — MySQL with mysql2/promise**
Water usage data is highly relational: every usage record *must* reference a valid user AND a valid water source. Relational databases enforce this through FK constraints at the engine level — no orphaned records possible. MongoDB would require application-level joins and couldn't prevent data inconsistency as cleanly.

I use `mysql2/promise` with a connection pool (10 connections) rather than single connections — this prevents the "too many connections" error under concurrent load and reuses existing connections efficiently.

**Auth — JWT + bcryptjs**
JWT (JSON Web Tokens) are stateless — the server doesn't need a session store. The token carries `{ user_id, email, role }` signed with HMAC-SHA256. Every protected endpoint verifies the signature in middleware in ~1ms, without touching the database. bcrypt with 10 salt rounds for password hashing — resistant to rainbow table attacks, deliberate slowness (≈100ms) deters brute force.

**Frontend — React 18 + Vite + TailwindCSS + Framer Motion**
React's component model naturally maps to the page structure: Dashboard, WaterUsage, Goals, Alerts are each independent components managing their own state. Vite gives sub-second Hot Module Replacement during development. TailwindCSS utility classes mean consistent spacing/colors without writing custom CSS. Framer Motion adds smooth page transitions and animated progress bars for the goals view — important for visual polish.

---

## Q2: Why not use a NoSQL database like MongoDB?

**Answer:**
The data model has strong relationships that benefit from relational constraints:

1. **Referential integrity**: `water_usage.source_id` has `ON DELETE RESTRICT` — you cannot delete a water source that has associated usage records. This prevents orphaned FK references without any application code.

2. **JOINs are natural**: The dashboard query joins water_usage + water_source + goals + alerts in a single query. In MongoDB you'd need `$lookup` aggregations or multiple round trips.

3. **ACID transactions**: When a usage record is inserted and its corresponding smart_meter total needs updating, both operations succeed or both fail — critical for data consistency.

4. **Predefined schema**: Water usage always has `user_id, source_id, date, quantity_used, cost`. There's no need for the schema flexibility MongoDB offers. The strict schema actually *helps* — the `express-validator` middleware maps directly to column types.

The only area where MongoDB might have helped is if usage records needed arbitrary key-value metadata — but that's not a requirement here.

---

## Q3: How does your application handle concurrent requests?

**Answer:**
Three levels:

1. **Connection pool**: `mysql2.createPool({ connectionLimit: 10 })` maintains up to 10 idle DB connections. When a request arrives, it grabs a connection from the pool, executes the query, and releases it back — no cold connection overhead. If all 10 are busy, requests queue until one frees.

2. **Async/await**: Every route handler is `async` with `await pool.execute(...)`. Node's event loop doesn't block waiting for MySQL — it handles other incoming requests while the DB query runs.

3. **Promise.all in dashboard**: The dashboard route fires multiple independent queries in parallel:
```js
const [usageRes, goalsRes, alertsRes] = await Promise.all([
  pool.execute('SELECT ... FROM water_usage WHERE ...'),
  pool.execute('SELECT ... FROM goals WHERE ...'),
  pool.execute('SELECT ... FROM alerts WHERE ...')
]);
```
This cuts response time from ~3 sequential queries to the time of the slowest single query.

---

# PART 2 — DATABASE DESIGN

## Q4: Explain your database schema in detail.

**Answer:**
8 tables in 3NF (Third Normal Form):

**Dimension/lookup tables:**
- `users` — auth credentials (hashed), contact info, ENUM role
- `water_source` — reference table for 7 water sources (municipal, groundwater, rainwater, recycled, surface_water)
- `conservation_activities` — catalogue of 12 conservation actions

**Fact table:**
- `water_usage` — 3,640+ rows; FK to `users` (CASCADE) and `water_source` (RESTRICT); indexed on `date`, `user_id`, `source_id`

**Entity tables:**
- `smart_meters` — IoT meter per user; `total_usage` is a denormalized aggregate for fast reads
- `goals` — user-defined targets; `progress` VARCHAR stored as "72%"; auto-updated
- `alerts` — auto-generated anomaly alerts + user-reported leaks; dual FK to users (reporter + admin processor)

**Junction table:**
- `user_activities` — (`user_id`, `activity_id`) composite PK eliminates duplicates without a UNIQUE constraint

---

## Q5: Explain normalization in your schema. What normal form is it in?

**Answer:**

**1NF (First Normal Form):** ✅ All columns hold atomic values. No repeating groups.

**2NF (Second Normal Form):** ✅ Every non-key column is fully dependent on the *entire* primary key. In `user_activities`, `participation_date` depends on both `user_id` AND `activity_id` — no partial dependency.

**3NF (Third Normal Form):** ✅ No transitive dependencies. `water_usage` stores `source_id` (FK) rather than repeating `source_name`, `source_type` in every usage row. Those attributes live in `water_source` and are accessed via JOIN.

**The one intentional denormalization:** `smart_meters.total_usage` is a computed aggregate (`SUM(quantity_used)` from `water_usage`). Keeping it in the table avoids a full table scan every time the dashboard loads that widget. It's updated by the scheduler every 30 minutes — acceptable staleness for a total counter.

---

## Q6: What is the purpose of your indexes and how do they improve performance?

**Answer:**

| Index | Column | Used By |
|-------|--------|---------|
| `idx_email` on `users` | `email` | `WHERE email = ?` on every login |
| `idx_date` on `water_usage` | `date` | Stats queries: `WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)` |
| `idx_user_id` on `water_usage` | `user_id` | Every per-user data fetch |
| `idx_deadline` on `goals` | `deadline` | Scheduler: `WHERE deadline <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)` |
| `idx_status` on `alerts`, `goals` | `status` | Filtering active vs resolved records |
| Composite PK on `user_activities` | `(user_id, activity_id)` | Lookup + uniqueness enforcement in one |

Without `idx_date`, every usage stats query would do a full table scan on 3,640+ rows. With the index, MySQL jumps directly to the matching date range using a B-tree lookup — O(log n) vs O(n).

---

## Q7: How do you prevent SQL injection?

**Answer:**
All database queries use parameterized statements through `mysql2/promise`:

```js
// SAFE — parameterized
const [rows] = await pool.execute(
  'SELECT * FROM users WHERE email = ? AND password_hash IS NOT NULL',
  [email]   // mysql2 escapes this automatically
);

// NEVER do this
const query = `SELECT * FROM users WHERE email = '${email}'`;  // ❌ injection risk
```

The `?` placeholder means the user input is *never* interpolated into the SQL string. The mysql2 driver handles escaping — single quotes, backslashes, null bytes — all neutralized before the query reaches MySQL.

Additional layer: `express-validator` validates and sanitizes inputs *before* they reach the DB layer:
- `body('email').isEmail().normalizeEmail()` — rejects malformed emails
- `body('quantity_used').isFloat({ min: 0.01 })` — rejects non-numeric values

---

## Q8: Explain the foreign key constraints in your schema and design decisions.

**Answer:**

**`ON DELETE CASCADE`** used on:
- `water_usage.user_id → users.user_id` — deleting a user deletes all their usage records
- `goals.user_id`, `alerts.user_id`, `smart_meters.user_id` — same logic

Rationale: A user's data has no meaning without the user. There's no business reason to retain orphaned records.

**`ON DELETE RESTRICT`** used on:
- `water_usage.source_id → water_source.source_id` — prevent accidental deletion of water sources that have historical records

Rationale: A water source is a reference entity. If you delete "City Municipal Supply," 2,000+ usage records would lose their source context. RESTRICT forces the admin to deal with the dependency first (reassign or archive data).

**`ON DELETE SET NULL`** used on:
- `alerts.admin_id → users.user_id` — if an admin's account is deleted, their alerts audit trail is kept, admin_id becomes NULL

Rationale: Audit trails must be preserved. We need to know an alert was processed even if the admin who did it is no longer in the system.

---

## Q9: Write a SQL query to get each user's average daily water usage for the last 30 days.

**Answer:**
```sql
SELECT
    u.user_id,
    u.firstname,
    u.lastname,
    ROUND(AVG(daily_total), 2) AS avg_daily_usage_litres
FROM users u
JOIN (
    SELECT
        user_id,
        date,
        SUM(quantity_used) AS daily_total
    FROM water_usage
    WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    GROUP BY user_id, date
) daily ON daily.user_id = u.user_id
GROUP BY u.user_id, u.firstname, u.lastname
ORDER BY avg_daily_usage_litres DESC;
```

This first aggregates usage per user per day (inner query), then averages those daily totals — important distinction! Averaging raw rows would weight days with more records differently.

---

## Q10: How does the anomaly detection work at the SQL level?

**Answer:**
Two queries run after every water usage INSERT:

```sql
-- Step 1: 30-day average for this user
SELECT AVG(daily_sum) AS avg_usage FROM (
    SELECT SUM(quantity_used) AS daily_sum
    FROM water_usage
    WHERE user_id = ?
    AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    AND date < CURDATE()
    GROUP BY date
) sub;

-- Step 2: Today's total
SELECT SUM(quantity_used) AS today_usage
FROM water_usage
WHERE user_id = ? AND date = CURDATE();
```

In Node.js:
```js
if (todayUsage >= avg30Day * 1.5) {
  // Check if alert already exists today to avoid duplicates
  const [existing] = await pool.execute(
    'SELECT alert_id FROM alerts WHERE user_id = ? AND alert_type = ? AND alert_date = CURDATE()',
    [userId, 'high_usage']
  );
  if (!existing.length) {
    await pool.execute('INSERT INTO alerts ...', [...]);
  }
}
```

The 1.5× threshold (150% of average) is intentionally conservative — reduces false positives for genuinely high-use days like hosting events.

---

# PART 3 — BACKEND / API

## Q11: How does JWT authentication work in your API?

**Answer:**

**Step 1 — Login:** User POSTs email/password → bcrypt.compare() → if match, `jwt.sign({ user_id, email, role }, JWT_SECRET, { expiresIn: '7d' })` → return token

**Step 2 — Request:** Client stores token in localStorage, attaches `Authorization: Bearer <token>` to every request (added by Axios request interceptor)

**Step 3 — Middleware:** Every protected route goes through `authenticate.js`:
```js
export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    // req.user = { user_id: 2, email: 'salim@...', role: 'user', iat, exp }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

**What makes it stateless:** The server never stores tokens. All user info needed for authorization is *inside* the token — `req.user.role`, `req.user.user_id`. No DB lookup required for auth.

**Security consideration:** Tokens expire in 7 days. Logout clears localStorage client-side (token still valid server-side until expiry — this is a known JWT tradeoff; production fix = Redis token blacklist).

---

## Q12: How is role-based access control implemented?

**Answer:**
Three-tier RBAC:

**Tier 1 — Middleware (route level):**
```js
// In routes/users.js
router.get('/', authenticate, isAdmin, getAllUsers);   // admin only
router.get('/:id', authenticate, getUser);             // any authenticated user
```

**Tier 2 — Ownership check (resource level):**
```js
// Inside getUser handler
if (req.user.role !== 'admin' && req.user.user_id !== parseInt(req.params.id)) {
  return res.status(403).json({ error: 'Access denied' });
}
```

**Tier 3 — Data scoping (query level):**
```js
// Admin sees all, user sees only their own
const whereClause = req.user.role === 'admin'
  ? 'WHERE 1=1'
  : 'WHERE user_id = ?';
const params = req.user.role === 'admin' ? [] : [req.user.user_id];
```

This creates defense-in-depth: even if RBAC middleware were bypassed, the query still scopes data to the authenticated user.

---

## Q13: Explain the goal progress calculation logic.

**Answer:**
`calculateGoalProgress.js` runs after every usage INSERT, UPDATE, or DELETE:

```js
async function calculateGoalProgress(userId, pool) {
  // Get all active goals for this user
  const [goals] = await pool.execute(
    'SELECT * FROM goals WHERE user_id = ? AND status = "active"',
    [userId]
  );

  for (const goal of goals) {
    // Total usage from goal creation date to deadline
    const [usageRows] = await pool.execute(`
      SELECT SUM(quantity_used) as total
      FROM water_usage
      WHERE user_id = ?
      AND date BETWEEN ? AND ?
    `, [userId, goal.created_at.split('T')[0], goal.deadline]);

    const usage = usageRows[0].total || 0;
    const progressPct = Math.min(100, (usage / goal.target_quantity) * 100);
    const progressStr = `${Math.round(progressPct)}%`;

    // Determine new status
    const isDeadlinePassed = new Date(goal.deadline) < new Date();
    const newStatus = progressPct >= 100 ? 'completed'
                    : isDeadlinePassed ? 'failed'
                    : 'active';

    await pool.execute(
      'UPDATE goals SET progress = ?, status = ?, updated_at = NOW() WHERE goal_id = ?',
      [progressStr, newStatus, goal.goal_id]
    );
  }
}
```

This is "pull-based" progress — calculated on demand when usage changes, not on a timer. Ensures the goal widget always reflects the effect of the latest usage edit immediately.

---

## Q14: How does the SSE (Server-Sent Events) streaming work?

**Answer:**

**Why SSE over WebSockets?**
Smart meter data flows in one direction: server → client. SSE is purpose-built for this. It uses a plain HTTP connection, auto-reconnects natively, and is simpler to implement than WebSockets.

**Server setup (`sse.js`):**
```js
const clients = new Map(); // clientId → response object

export function setupSSE(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const clientId = Date.now();
  clients.set(clientId, res);

  // Send initial data immediately
  res.write(`data: ${JSON.stringify({ status: 'connected' })}\n\n`);

  // Remove client when connection closes
  req.on('close', () => clients.delete(clientId));
}

export function broadcast(data) {
  clients.forEach(res => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}
```

**Scheduler calls `broadcast()` every 30 minutes** after syncing meter totals.

**Client (`useSSE.js` hook):**
```js
const fullUrl = `${apiUrl}/stream/meters?token=${token}`;
const eventSource = new EventSource(fullUrl);
eventSource.onmessage = (e) => setData(JSON.parse(e.data));
```

Token in query param because SSE's `EventSource` API doesn't support custom headers.

---

## Q15: How does your scheduler work?

**Answer:**
`scheduler.js` uses `node-cron` (cron syntax):

```js
// Every 30 minutes — sync smart meter totals
cron.schedule('*/30 * * * *', async () => {
  await pool.execute(`
    UPDATE smart_meters sm
    JOIN (
      SELECT user_id, SUM(quantity_used) AS total
      FROM water_usage GROUP BY user_id
    ) agg ON sm.user_id = agg.user_id
    SET sm.total_usage = agg.total
  `);
  broadcast({ type: 'meter_update', timestamp: new Date() });
});

// Every 6 hours — anomaly detection for all users
cron.schedule('0 */6 * * *', async () => {
  const [users] = await pool.execute('SELECT user_id FROM users WHERE role = "user"');
  for (const { user_id } of users) {
    await checkAnomaly(user_id, pool);  // same logic as post-insert check
  }
});

// Daily at 9:00 AM — goal risk alerts
cron.schedule('0 9 * * *', async () => {
  await pool.execute(`
    INSERT INTO alerts (user_id, alert_type, status, message, severity)
    SELECT user_id, 'goal_at_risk', 'active',
      CONCAT('Goal deadline in ', DATEDIFF(deadline, CURDATE()), ' days — only at ', progress),
      'high'
    FROM goals
    WHERE status = 'active'
    AND deadline <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    AND CAST(REPLACE(progress, '%', '') AS DECIMAL) < 50
  `);
});
```

---

## Q16: How is error handling structured in the API?

**Answer:**
Three layers of error handling:

**Layer 1 — Input Validation (before DB):**
```js
// middleware/validation.js
export const validateWaterUsage = [
  body('quantity_used').isFloat({ min: 0.01 }).withMessage('Must be > 0'),
  body('date').isISO8601().withMessage('Invalid date format'),
  handleValidationErrors,  // returns 400 with error array if validation fails
];
```

**Layer 2 — Route-level try/catch:**
```js
router.post('/', authenticate, validateWaterUsage, async (req, res) => {
  try {
    // ... DB operations
    res.status(201).json({ message: 'Created', usage: newRecord });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Already exists' });
    }
    console.error('Water usage POST error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Layer 3 — Global error handler in `app.js`:**
```js
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ error: 'Something went wrong', message: err.message });
});
```

**Non-critical operations** (anomaly check, smart meter sync after usage insert) are wrapped in their own try/catch so a secondary operation failure doesn't fail the primary response:
```js
// Don't let anomaly check failure break the usage insert
try { await checkAnomaly(userId, pool); } catch (e) { console.error(e); }
```

---

# PART 4 — FRONTEND

## Q17: How does the Axios instance work and what do the interceptors do?

**Answer:**
```js
// utils/api.js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5002/api',
  headers: { 'Content-Type': 'application/json' },
});

// REQUEST interceptor — attach JWT to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// RESPONSE interceptor — handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';  // force re-login
    }
    return Promise.reject(error);
  }
);
```

**Benefits:**
- No need to manually add `Authorization` header in every API call
- 401 handling is centralized — token expiry redirects to login automatically from any page
- `baseURL` means all calls are relative: `api.get('/goals')` not `api.get('http://localhost:5002/api/goals')`

---

## Q18: How do you manage authentication state in React?

**Answer:**
Intentionally kept simple (no Redux) using localStorage helpers:

```js
// utils/auth.js
export const getUser  = () => JSON.parse(localStorage.getItem('user') || 'null');
export const getToken = () => localStorage.getItem('token');
export const setAuth  = (token, user) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};
export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};
```

**In App.jsx — protected route pattern:**
```jsx
function PrivateRoute({ children }) {
  const token = getToken();
  return token ? children : <Navigate to="/login" replace />;
}

// Routes
<Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
<Route path="/login" element={<Login />} />
```

**Tradeoff:** localStorage is vulnerable to XSS. Production-grade alternative: httpOnly cookies (not accessible via JavaScript). For this project, the tradeoff is acceptable since all API calls require a valid JWT anyway — the token is just for client-side routing.

---

## Q19: How does the Dashboard avoid rendering with incomplete data?

**Answer:**
Using `Promise.all` + a loading state:

```jsx
const [loading, setLoading] = useState(true);
const [stats, setStats] = useState(null);

useEffect(() => {
  const fetchAll = async () => {
    try {
      const [statsRes, goalsRes, alertsRes] = await Promise.all([
        api.get('/water-usage/stats'),
        api.get('/goals'),
        api.get('/alerts'),
      ]);
      setStats(statsRes.data);
      setGoals(goalsRes.data);
      setAlerts(alertsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);  // Always hide spinner, even on error
    }
  };
  fetchAll();
}, []);

if (loading) return <Spinner />;
```

All three API calls fire *simultaneously* (parallel, not sequential). State is only updated after all resolve. The `finally` block guarantees the spinner goes away even if one call fails — preventing infinite loading states.

---

# PART 5 — SYSTEM DESIGN

## Q20: How would you scale this to 1 million users?

**Answer:**

**Database layer:**
- Add **read replicas** for SELECT-heavy endpoints (stats, dashboard) — writes go to primary, reads distributed across replicas
- **Partition** `water_usage` by date range (year-month) or by user_id hash — reduces table scan scope
- Add **Redis** for dashboard cache (TTL 5 mins) — avoids re-running expensive aggregations for every page load
- Consider migrating stats aggregation to a **data warehouse** (ClickHouse / BigQuery) for analytics queries

**API layer:**
- **PM2 cluster mode** or **Kubernetes** to run multiple Node.js processes on separate CPU cores (Node is single-threaded — 1 process per core)
- **Load balancer** (nginx / AWS ALB) to distribute traffic across instances
- **Rate limiting** (express-rate-limit) on auth endpoints: 5 login attempts per IP per 15 minutes

**SSE / Real-time:**
- Move SSE to a pub/sub broker: **Redis pub/sub** or **AWS SNS**. Currently `clients` Map lives in one process — with multiple Node instances they'd each have separate Maps. Redis centralizes the subscriber registry.

**Auth:**
- JWT is already horizontally scalable (stateless) ✅
- Add **token refresh flow** with short-lived access tokens (15min) + long-lived refresh tokens (30 days) for better security

**Database connection:**
- Move from per-app pool to **PgBouncer/ProxySQL** — centralized connection pooler shared across all Node instances

---

## Q21: What security improvements would you make for production?

**Answer:**

| Current | Production-Grade |
|---------|-----------------|
| JWT in localStorage (XSS risk) | httpOnly cookies (JS can't read) |
| No rate limiting | express-rate-limit + Redis store on /auth routes |
| JWT_SECRET in .env | Environment variable from AWS Secrets Manager / Vault |
| HTTP (local dev) | HTTPS with TLS certificate |
| No input length limits | VARCHAR limits enforced at API + DB level |
| Generic error messages | Detailed internally logged, generic to client |
| No CSRF protection | CSRF token for cookie-based auth |
| No request logging | Morgan + structured logging (Winston) to CloudWatch |

---

# PART 6 — BEHAVIORAL

## Q22: What was the most complex bug you debugged in this project?

**Answer:**
The database connection failure. The symptom was `ECONNREFUSED` — the API couldn't connect to MySQL.

**Investigation:**
- `netstat -ano | findstr 3306` — no listener on port 3306 → MySQL service wasn't running
- MySQL 8.0 Windows service (`MySQL80`) was stopped. `Start-Service` failed with permission error
- Found XAMPP MySQL as alternative → started with `C:\xampp\mysql_start.bat`
- But migrations still failed: "Access denied for user `root@localhost` (using password: YES)"

**The actual bug:** In `db.js`:
```js
// BUGGY
password: process.env.DB_PASSWORD || 'rootpassword'
```
`DB_PASSWORD=` in `.env` sets `process.env.DB_PASSWORD` to `""` (empty string). JavaScript's `||` evaluates empty string as **falsy**, so it fell back to `'rootpassword'` — sending the wrong password to MySQL.

**Fix:**
```js
// FIXED — nullish coalescing
password: process.env.DB_PASSWORD ?? ''
```
`??` only falls back for `null` or `undefined` — NOT for empty string. Now empty string password correctly connects to XAMPP's passwordless root.

**Learning:** `||` and `??` behave differently for falsy-but-valid values like empty strings, `0`, `false`. Use `??` for config defaults.

---

## Q23: Explain a design decision you're proud of and why.

**Answer:**
The choice to use a **composite primary key** `(user_id, activity_id)` in the `user_activities` junction table instead of a surrogate auto-increment key.

Most developers default to adding a surrogate PK (`user_activity_id INT AUTO_INCREMENT`). But for a junction table, the composite key is strictly better:

1. **Uniqueness** is built into the PK — no separate `UNIQUE (user_id, activity_id)` constraint needed
2. **Clustered index** on `(user_id, activity_id)` means lookups by user_id are physically sorted on disk — extremely fast for `SELECT * WHERE user_id = ?`
3. **Smaller storage** — no extra integer column, no extra index file

The tradeoff: no single-column reference (no `user_activity_id` to use as FK elsewhere). But since nothing else references a specific activity-participation record, this is irrelevant here.

---

## Q24: What would you add to this project if you had two more weeks?

**Answer:**

**Week 1 — Core robustness:**
1. **Unit tests** (Jest) for `calculateGoalProgress.js` — critical business logic with edge cases (deadline today, 0 usage days, target of 0)
2. **Integration tests** for auth flow (register → login → protected route → 401 on expiry)
3. **Rate limiting** on `/api/auth/register` and `/api/auth/login` (express-rate-limit)
4. **Refresh token flow** — short-lived JWT (15min) + refresh token in httpOnly cookie

**Week 2 — Features:**
1. **CSV/PDF export** of usage history — high value for users presenting to landlords or utility companies
2. **Usage comparison** — "how does your consumption compare to similar households?"
3. **Email notifications** — nodemailer sends alert emails instead of just in-app notifications
4. **TypeScript** migration for backend — catches type errors that currently only surface at runtime

---

## Q25: How do you explain this project on your resume in one bullet?

**Answer:**
> "Built a full-stack Water Conservation Tracker (Node.js/Express + MySQL + React) with JWT auth, role-based access control, automated anomaly detection alerts, goal progress auto-calculation, and real-time smart meter streaming via Server-Sent Events — backed by 3,600+ seeded records across a normalized 8-table schema."

**Resume keywords to highlight:**
- Full-stack development, REST API, Node.js, Express, MySQL, React, Vite
- JWT authentication, bcrypt, RBAC (role-based access control)
- Database design, normalization, foreign keys, indexing, parameterized queries
- Real-time streaming (SSE, EventSource), scheduled jobs (cron)
- Anomaly detection, data analysis, automated alerting
