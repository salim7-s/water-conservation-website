# Setup Guide — Water Conservation Tracker

## Prerequisites

| Requirement | Minimum Version | Check |
|-------------|----------------|-------|
| Node.js | 18.x | `node --version` |
| npm | 9.x | `npm --version` |
| MySQL | 8.0 | running on port 3306 |

---

## Step 1: Clone / Open Project

```bash
cd "D:\WORKSPACE\dbms project"
```

---

## Step 2: Start MySQL

**Option A — XAMPP:**
```bash
C:\xampp\mysql_start.bat
# OR open XAMPP Control Panel → Start MySQL
```

**Option B — Windows Service:**
```powershell
Start-Service MySQL80   # (requires admin)
```

Verify MySQL is running:
```bash
netstat -ano | findstr 3306
# Should show: TCP  0.0.0.0:3306  LISTENING
```

---

## Step 3: Configure Environment

**`backend/.env`** (already configured for XAMPP):
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=          # empty for XAMPP; set your password if different
DB_NAME=watertracker

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

PORT=5002
CORS_ORIGIN=http://localhost:5173
```

**`frontend/.env`:**
```env
VITE_API_URL=http://localhost:5002/api
```

---

## Step 4: Install Dependencies

```bash
# Root (concurrent dev runner)
npm install

# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

---

## Step 5: Setup Database

```bash
cd backend

# Option A: Run migrations (creates all tables)
node src/migrate.js

# Option B: Import complete schema directly (XAMPP mysql client)
# Use phpMyAdmin → Import → select backend/migrations/00_complete_schema.sql

# Seed with sample data
node src/seed.js
```

> The database `watertracker` is auto-created by `migrate.js` if it doesn't exist.

---

## Step 6: Start Servers

**Terminal 1 — Backend:**
```bash
cd "D:\WORKSPACE\dbms project\backend"
node src/server.js
# Output: Server started — pid=XXXXX listening http://localhost:5002
#         Database connected successfully
```

**Terminal 2 — Frontend:**
```bash
cd "D:\WORKSPACE\dbms project\frontend"
npm run dev
# Output: ➜  Local: http://localhost:5173/
```

---

## Step 7: Access the App

| URL | What you see |
|-----|-------------|
| http://localhost:5173 | React frontend (login page) |
| http://localhost:5002/api/health | Backend health check |
| http://localhost/phpmyadmin | phpMyAdmin (if XAMPP) |

**Login with:**
- Admin: `admin@watertracker.com` / `Admin@123`
- User: `salim@example.com` / `Salim@123`

---

## Common Issues

### `ECONNREFUSED` on port 3306
MySQL is not running. Start XAMPP MySQL or the MySQL80 Windows service.

### `Access denied for user 'root'@'localhost'`
DB password mismatch. XAMPP uses no password — ensure `DB_PASSWORD=` (empty) in `.env`.

### `ER_NO_SUCH_TABLE`
Migrations haven't run. Execute `node src/migrate.js`.

### Frontend shows blank page / 404 after login
Backend may not be started. Confirm `node src/server.js` is running on port 5002.

### Port 5002 already in use
```powershell
# Find and kill the process
netstat -ano | findstr 5002
taskkill /PID <PID> /F
```

---

## Running in Development vs Production

| | Development | Production |
|---|---|---|
| Backend | `node src/server.js` | `pm2 start src/server.js` |
| Frontend | `npm run dev` | `npm run build` → serve `dist/` |
| DB | Local MySQL | Cloud (PlanetScale / RDS) |
| JWT Secret | Dev key | Long random string (32+ chars) |
| CORS_ORIGIN | localhost:5173 | Your domain |
