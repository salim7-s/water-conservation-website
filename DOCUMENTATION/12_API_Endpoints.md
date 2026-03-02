# API Endpoints — Complete Reference

**Base URL:** `http://localhost:5002/api`
**Auth Header:** `Authorization: Bearer <JWT_TOKEN>`

All protected routes require the auth header unless marked `[public]`.

---

## Authentication — `/api/auth`

### `POST /api/auth/register` [public]
Create a new user account.

**Request:**
```json
{
  "firstname": "Salim",
  "lastname": "Khan",
  "email": "salim@example.com",
  "password": "Salim@123",
  "contact_no": "9000000002",
  "address": "12 MG Road, Hyderabad"
}
```

**Response 201:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGci...",
  "user": { "user_id": 2, "email": "salim@example.com", "role": "user" }
}
```

**Errors:** `400` (validation fail), `409` (email already exists)

---

### `POST /api/auth/login` [public]
Authenticate and receive JWT.

**Request:**
```json
{ "email": "salim@example.com", "password": "Salim@123" }
```

**Response 200:**
```json
{
  "token": "eyJhbGci...",
  "user": { "user_id": 2, "firstname": "Salim", "role": "user" }
}
```

**Errors:** `400` (missing fields), `401` (wrong password), `404` (user not found)

---

## Users — `/api/users`

### `GET /api/users` [admin only]
Get all users.

### `GET /api/users/:id`
Get user by ID. Users can only fetch their own; admins can fetch any.

**Response 200:**
```json
{
  "user_id": 2, "firstname": "Salim", "lastname": "Khan",
  "email": "salim@example.com", "role": "user",
  "contact_no": "9000000002", "address": "12 MG Road"
}
```

### `PUT /api/users/:id`
Update user profile. Users can only update their own.

**Request:** `{ "firstname": "Updated", "contact_no": "...", "address": "..." }`

### `DELETE /api/users/:id` [admin only]
Delete user and all related data (CASCADE).

---

## Water Sources — `/api/water-sources`

### `GET /api/water-sources`
Get all sources. Used to populate dropdowns.

**Response 200:** `[{ "source_id": 1, "source_name": "City Municipal Supply", "source_type": "municipal" }, ...]`

### `GET /api/water-sources/:id`
Get single source.

### `POST /api/water-sources` [admin only]
Create new water source.

**Request:** `{ "source_name": "New River", "location": "East district", "source_type": "surface_water" }`

### `PUT /api/water-sources/:id` [admin only]
Update source.

### `DELETE /api/water-sources/:id` [admin only]
Delete source. **Will fail if usage records reference this source** (RESTRICT FK).

---

## Water Usage — `/api/water-usage`

### `GET /api/water-usage`
Get all usage records for current user. Admin gets all users.

**Response 200:** Array of usage records, newest first.

### `GET /api/water-usage/stats`
Aggregated statistics for current user.

**Response 200:**
```json
{
  "daily":    { "quantity": 45.2, "cost": 2.26 },
  "weekly":   { "quantity": 269.2, "cost": 13.70 },
  "monthly":  { "quantity": 1309.4, "cost": 65.47 },
  "predictions": {
    "nextWeek":  { "estimated": 280 },
    "nextMonth": { "estimated": 1350 }
  },
  "trends": { "trend": "decreasing", "trendPercentage": 12.5 }
}
```

### `GET /api/water-usage/:id`
Get single usage record.

### `POST /api/water-usage`
Create new usage record. **Triggers goal progress recalculation + anomaly check.**

**Request:**
```json
{
  "user_id": 2,
  "source_id": 1,
  "purpose": "drinking",
  "date": "2026-03-03",
  "quantity_used": 45.5,
  "cost": 2.25
}
```
Note: `source_id` is optional — defaults to 1 if not provided.

**Response 201:** `{ "message": "...", "usage": { "usage_id": 3641, ... } }`

### `PUT /api/water-usage/:id`
Update record. Re-triggers goal progress + anomaly detection.

### `DELETE /api/water-usage/:id`
Delete record. Re-triggers goal progress recalculation.

---

## Goals — `/api/goals`

### `GET /api/goals`
All goals for current user.

**Response:** `[{ "goal_id": 1, "goal_type": "reduce_monthly", "progress": "72%", "status": "active", ... }]`

### `GET /api/goals/:id`
Single goal.

### `GET /api/goals/:id/progress`
Recalculate and return current progress.

### `POST /api/goals`
Create goal. **Progress auto-initialised to 0%.**

**Request:**
```json
{
  "user_id": 2,
  "goal_type": "reduce_consumption",
  "target_quantity": 400,
  "deadline": "2026-04-01",
  "status": "active",
  "progress": "0%"
}
```

### `PUT /api/goals/:id`
Update goal.

### `POST /api/goals/:id/recalculate`
Force-recalculate goal progress from usage history.

### `POST /api/goals/recalculate-all`
Recalculate all active goals for authenticated user.

### `DELETE /api/goals/:id`
Delete goal.

---

## Alerts — `/api/alerts`

### `GET /api/alerts`
User's own alerts. Admins get all users' alerts.

### `GET /api/alerts/:id`
Single alert.

### `POST /api/alerts`
Create alert (user leak report or system-generated).

**Request:**
```json
{
  "user_id": 2,
  "alert_type": "leak_report",
  "message": "Burst pipe in kitchen",
  "location": "12 MG Road, Kitchen",
  "severity": "high"
}
```

### `PUT /api/alerts/:id`
Update alert content.

### `PUT /api/alerts/:id/status`
Update alert status.

**Request:** `{ "status": "resolved", "admin_comment": "Repair team dispatched" }`

### `GET /api/alerts/check-anomalies` [admin]
Trigger manual anomaly detection for all users.

---

## Smart Meters — `/api/smart-meters`

### `GET /api/smart-meters`
User's meters. Admins see all.

### `GET /api/smart-meters/:id`
Single meter with stats.

### `POST /api/smart-meters` [admin]
Install meter.

**Request:** `{ "user_id": 2, "meter_type": "residential", "status": "active", "install_date": "2026-01-01" }`

### `PUT /api/smart-meters/:id`
Update meter.

### `DELETE /api/smart-meters/:id` [admin]
Remove meter.

### `GET /api/smart-meters/:id/sync`
Sync total_usage from usage records.

### `GET /api/smart-meters/:id/readings?days=7`
Usage readings for last N days.

---

## Conservation — `/api/conservation-activities`

### `GET /api/conservation-activities`
All 12 activities with categories.

### `GET /api/conservation-activities/:id`
Single activity.

### `POST /api/conservation-activities` [admin]
Create activity.

### `PUT /api/conservation-activities/:id` [admin]
Update activity.

### `DELETE /api/conservation-activities/:id` [admin]
Delete activity.

---

## User Activities — `/api/user-activities`

### `GET /api/user-activities`
Activities current user has joined with dates.

### `POST /api/user-activities`
Join an activity.

**Request:** `{ "user_id": 2, "activity_id": 3 }`

**Error 409** if already joined.

### `DELETE /api/user-activities`
Leave an activity.

**Request:** `{ "user_id": 2, "activity_id": 3 }`

---

## Dashboard — `/api/dashboard`

### `GET /api/dashboard`
Full aggregated data for authenticated user.

**Response:**
```json
{
  "usage": { "daily": {...}, "weekly": {...}, "monthly": {...} },
  "goals": [ { "goal_id": 1, "progress": "72%", ... } ],
  "alerts": [ { "alert_id": 1, "alert_type": "high_usage", ... } ],
  "predictions": { "nextWeek": {...}, "nextMonth": {...} },
  "activities": [ { "activity_name": "Fix Leaky Faucets", ... } ],
  "meters": [ { "meter_id": 1, "total_usage": 24500, ... } ]
}
```

### `GET /api/dashboard/summary`
Key metrics summary (counts, totals).

### `GET /api/dashboard/predictions`
Usage forecasts for next week and month.

---

## Admin — `/api/admin` [admin only]

### `GET /api/admin/stats`
System-wide stats.

**Response:**
```json
{
  "totalUsers": 6,
  "totalAlerts": 9,
  "activeMeters": 5,
  "totalUsageToday": 850,
  "alertsByStatus": { "active": 5, "resolved": 3, "reported": 1 },
  "alertsByType": { "high_usage": 4, "goal_at_risk": 3, "leak_report": 2 }
}
```

### `GET /api/admin/alerts`
All alerts across all users.

### `POST /api/admin/alerts/:id/approve`
Approve and optionally comment on an alert.

**Request:** `{ "comment": "Technician dispatched" }`

---

## Real-time Stream — `/api/stream`

### `GET /api/stream/meters?token=<JWT>`
Server-Sent Events endpoint. SSE doesn't support custom headers, so JWT passed as query param.

**Client usage:**
```js
const es = new EventSource(`/api/stream/meters?token=${token}`);
es.onmessage = (e) => setMeterData(JSON.parse(e.data));
```

**Events pushed every 30 seconds:**
```json
{ "meter_id": 1, "total_usage": 24532, "status": "active", "timestamp": "2026-03-03T01:30:00Z" }
```

---

## HTTP Status Code Reference

| Code | Meaning | When used |
|------|---------|-----------|
| 200 | OK | GET, PUT, DELETE success |
| 201 | Created | POST (resource created) |
| 400 | Bad Request | Validation errors (express-validator) |
| 401 | Unauthorized | Missing or invalid JWT |
| 403 | Forbidden | Valid JWT but insufficient role |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate (email, activity join) |
| 500 | Server Error | Unhandled exception |
