# 💧 Water Conservation & Usage Tracker

A full-stack DBMS project for tracking household water consumption, generating smart alerts, managing conservation goals, and streaming real-time meter data.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express.js, ES Modules |
| **Database** | MySQL 8 (mysql2/promise, connection pooling) |
| **Auth** | JWT (jsonwebtoken) + bcrypt password hashing |
| **Frontend** | React 18 (Vite), TailwindCSS, Framer Motion, Axios |
| **Real-time** | Server-Sent Events (SSE) |
| **Scheduling** | node-cron (anomaly checks, meter sync) |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8 running on port 3306 (root, no password)

```bash
# 1. Install root dependencies
npm install

# 2. Backend
cd backend && npm install
# Edit .env if your MySQL password differs (DB_PASSWORD=)
node src/server.js        # runs on http://localhost:5002

# 3. Frontend (new terminal)
cd frontend && npm install
npm run dev               # runs on http://localhost:5173
```

## 🔑 Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@watertracker.com` | `Admin@123` |
| User 1 | `salim@example.com` | `Salim@123` |
| User 2 | `ayesha@example.com` | `Ayesha@123` |
| User 3 | `farhan@example.com` | `Farhan@123` |
| User 4 | `priya@example.com` | `Priya@123` |
| User 5 | `raj@example.com` | `Raj@123` |

## 🗄️ Database Setup

```bash
# Run from project root (once MySQL is running)
cd backend
node src/migrate.js   # creates all 8 tables
node src/seed.js      # inserts sample data
```

Or import `backend/migrations/00_complete_schema.sql` directly into your MySQL client.

## 📁 Project Structure

```
dbms project/
├── backend/
│   ├── src/
│   │   ├── app.js            # Express app setup, CORS, routes
│   │   ├── server.js         # HTTP server + graceful shutdown
│   │   ├── db.js             # mysql2 connection pool
│   │   ├── migrate.js        # runs SQL migration files
│   │   ├── seed.js           # inserts sample data
│   │   ├── routes/           # 12 route modules (auth, users, usage, goals…)
│   │   ├── middleware/       # JWT auth + express-validator
│   │   └── utils/            # goal progress calc, SSE, scheduler
│   └── migrations/           # 9 SQL files + complete_schema.sql
├── frontend/
│   └── src/
│       ├── pages/            # Dashboard, WaterUsage, Goals, UserPanel, Admin…
│       ├── components/       # Layout, Navbar
│       ├── hooks/            # useSSE (real-time smart meter)
│       └── utils/            # api.js (Axios), auth.js (JWT helpers)
├── DOCUMENTATION/            # 15 detailed markdown docs
├── INTERVIEW_QA.md           # Interview prep — tech stack, DB, API, system design
└── README.md
```

## 🌐 API Overview

| Prefix | Description |
|--------|-------------|
| `POST /api/auth/register` `POST /api/auth/login` | JWT auth |
| `GET/PUT /api/users/:id` | Profile management |
| `GET /api/water-sources` | Water source lookup |
| `GET/POST/PUT/DELETE /api/water-usage` | Usage CRUD + `/stats` |
| `GET/POST/PUT/DELETE /api/goals` | Goal CRUD + `/progress` |
| `GET/POST /api/alerts` + `PUT /:id/status` | Alert management |
| `GET /api/smart-meters` | IoT meter data |
| `GET /api/dashboard` | Aggregated stats + predictions |
| `GET /api/admin/*` | Admin-only endpoints |
| `GET /api/stream/meters` | SSE real-time stream |

## ✨ Key Features

- **Role-based access control** — admin vs regular user gatekeeping on every route
- **Auto anomaly detection** — alert generated when today's usage ≥ 150% of 30-day average  
- **Goal progress engine** — auto-recalculates progress on every usage insert/update/delete
- **Smart meter sync** — `total_usage` updated after each water record; real-time via SSE
- **Scheduled jobs** — anomaly checks (6h), meter sync (30m), goal risk check (daily)
- **Prediction engine** — next-week/month forecasts based on trend analysis

## 📚 Documentation

See [`DOCUMENTATION/`](./DOCUMENTATION/00_INDEX.md) for 15 detailed docs covering backend, frontend, database schema, and API endpoints.

See [`INTERVIEW_QA.md`](./INTERVIEW_QA.md) for detailed Q&A covering all aspects of the project for technical interviews.

## 🗃️ Database Schema (8 Tables)

```
users ──< water_usage >── water_source
  │
  ├──< smart_meters
  ├──< goals
  ├──< alerts
  └──< user_activities >── conservation_activities
```
