# Water Conservation & Usage Tracker — Documentation Index

**Last Updated:** March 2026 | **Port:** Backend `5002` | **Frontend** `5173`

## 📋 Table of Contents

| # | File | Description |
|---|------|-------------|
| 00 | [This file](./00_INDEX.md) | Index & project overview |
| 01 | [Backend Overview](./01_Backend_Overview.md) | Architecture, dependencies, folder structure |
| 02 | [Backend Core Files](./02_Backend_Core_Files.md) | `app.js`, `server.js`, `db.js` |
| 03 | [Backend Middleware](./03_Backend_Middleware.md) | `authenticate.js`, `validation.js` |
| 04 | [Backend Routes](./04_Backend_Routes.md) | All 12 route modules |
| 05 | [Backend Utils](./05_Backend_Utils.md) | Scheduler, SSE, goal calculator |
| 06 | [Frontend Overview](./06_Frontend_Overview.md) | React architecture, folder structure |
| 07 | [Frontend Core Files](./07_Frontend_Core_Files.md) | `App.jsx`, `main.jsx`, routing |
| 08 | [Frontend Components](./08_Frontend_Components.md) | `Layout.jsx`, `Navbar.jsx` |
| 09 | [Frontend Pages](./09_Frontend_Pages.md) | All 8 page components |
| 10 | [Frontend Utils & Hooks](./10_Frontend_Utils_Hooks.md) | `api.js`, `auth.js`, `useSSE.js` |
| 11 | [Database Schema](./11_Database_Schema.md) | All 8 tables, FKs, indexes |
| 12 | [API Endpoints](./12_API_Endpoints.md) | All 40+ endpoints with request/response |
| 13 | [Setup Guide](./13_Setup_Guide.md) | Step-by-step run instructions |
| 14 | [Environment Variables](./14_Environment_Variables.md) | `.env` reference |

---

## 🔧 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js | 18+ | Backend JS runtime |
| Framework | Express.js | 4.x | REST API, routing, middleware |
| Database | MySQL | 8.0 | Relational data storage |
| DB Driver | mysql2 | 3.x | Async DB connection pool |
| Auth | jsonwebtoken | 9.x | JWT signing/verification |
| Passwords | bcryptjs | 2.x | Password hashing (salt rounds 10) |
| Validation | express-validator | 7.x | Input sanitisation |
| Scheduling | node-cron | 3.x | Periodic background jobs |
| Frontend | React | 18.x | Component-based UI |
| Build | Vite | 5.x | Fast dev server + bundler |
| Styling | TailwindCSS | 3.x | Utility-first CSS |
| Animation | Framer Motion | 10.x | UI transitions |
| HTTP Client | Axios | 1.x | Frontend API calls |

---

## 🚀 Quick Start

```bash
# 1. Start MySQL (XAMPP or native)
# 2. Backend
cd backend && npm install && node src/server.js   # http://localhost:5002

# 3. Frontend (new terminal)
cd frontend && npm install && npm run dev          # http://localhost:5173
```

**Login credentials that are seeded in the database:**

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@watertracker.com` | `Admin@123` |
| User | `salim@example.com` | `Salim@123` |
| User | `ayesha@example.com` | `Ayesha@123` |
| User | `farhan@example.com` | `Farhan@123` |
| User | `priya@example.com` | `Priya@123` |
| User | `raj@example.com` | `Raj@123` |

---

## 📁 Project Structure

```
dbms project/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Express app: CORS, routes, error handler
│   │   ├── server.js               # HTTP server, graceful shutdown
│   │   ├── db.js                   # mysql2 connection pool (DB_PASSWORD ?? '')
│   │   ├── migrate.js              # Runs SQL migration files in order
│   │   ├── seed.js                 # Inserts default/sample data
│   │   ├── routes/
│   │   │   ├── auth.js             # POST /register, POST /login
│   │   │   ├── users.js            # CRUD /users/:id
│   │   │   ├── water_sources.js    # CRUD /water-sources
│   │   │   ├── water_usage.js      # CRUD /water-usage + /stats
│   │   │   ├── goals.js            # CRUD /goals + /progress + /recalculate
│   │   │   ├── alerts.js           # CRUD /alerts + /check-anomalies
│   │   │   ├── smart_meters.js     # CRUD /smart-meters + /sync + /readings
│   │   │   ├── conservation.js     # CRUD /conservation-activities
│   │   │   ├── user_activities.js  # POST/DELETE /user-activities
│   │   │   ├── dashboard.js        # GET /dashboard + /summary + /predictions
│   │   │   ├── admin.js            # GET /admin/stats + /admin/alerts
│   │   │   └── stream.js           # GET /stream/meters (SSE)
│   │   ├── middleware/
│   │   │   ├── authenticate.js     # JWT verification → req.user
│   │   │   └── validation.js       # express-validator rule sets
│   │   └── utils/
│   │       ├── scheduler.js        # node-cron: meter sync, anomaly check, goal check
│   │       ├── sse.js              # SSE setup, client registry, broadcast
│   │       └── calculateGoalProgress.js  # Auto-progress after usage changes
│   ├── migrations/
│   │   ├── 00_complete_schema.sql  # Single-file all-tables schema
│   │   ├── 001_create_database.sql
│   │   ├── 002_create_users.sql
│   │   ├── 003_create_water_source.sql
│   │   ├── 004_create_smart_meters.sql
│   │   ├── 005_create_water_usage.sql
│   │   ├── 006_create_conservation_activities.sql
│   │   ├── 007_create_user_activities.sql
│   │   ├── 008_create_goals.sql
│   │   └── 009_create_alerts.sql
│   └── .env                        # DB creds, JWT secret, PORT, CORS
├── frontend/
│   └── src/
│       ├── App.jsx                 # Router: protected routes, login redirect
│       ├── main.jsx                # React entry, mounts <App />
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Dashboard.jsx       # Stats, charts, SSE meter widget
│       │   ├── WaterUsage.jsx      # Usage table, CRUD form, filters
│       │   ├── Goals.jsx           # Goals cards, progress bars
│       │   ├── UserPanel.jsx       # Alerts + report leak form
│       │   ├── AdminPanel.jsx      # Admin-only: all users, all alerts, charts
│       │   └── Homepage.jsx        # Public landing page
│       ├── components/
│       │   ├── Layout.jsx          # Page wrapper with Navbar
│       │   └── Navbar.jsx          # Navigation links + logout
│       ├── hooks/
│       │   └── useSSE.js           # EventSource hook for real-time meter data
│       └── utils/
│           ├── api.js              # Axios instance + auth + 401 interceptors
│           └── auth.js             # getUser / getToken / setAuth / clearAuth
├── DOCUMENTATION/                  # This folder (15 docs)
├── INTERVIEW_QA.md                 # Detailed interview preparation
└── README.md                       # Project overview + quick start
```

---

## ✨ Feature Summary

| Feature | Details |
|---------|---------|
| Authentication | JWT + bcrypt, role-based (user/admin) |
| Water Usage CRUD | Add, edit, delete records with source, purpose, quantity, cost |
| Usage Statistics | Daily / weekly / monthly totals, trend analysis, predictions |
| Goals | Create targets, auto-calculates progress % after every usage change |
| Anomaly Alerts | Auto-triggered when today's usage ≥ 150% of 30-day average |
| Leak Reports | User-submitted alerts, admin approval workflow |
| Conservation Activities | Catalogue of 12 activities, users can join/leave |
| Smart Meters | Per-user IoT meter with auto-synced totals |
| Real-time SSE | Live meter data streaming to dashboard |
| Admin Panel | System-wide stats, user list, all alerts with charts |
| Scheduled Jobs | Meter sync (30m), anomaly check (6h), goal risk check (daily 9AM) |
| Prediction Engine | Next-week / next-month usage forecasts from trend regression |
