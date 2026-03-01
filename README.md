# Water Conservation and Usage Tracker

A full-stack web application for tracking water usage, managing conservation activities, setting goals, and reporting leaks. Built with React (Vite), Node.js/Express, and MySQL.

## Project Overview

This system helps users monitor their water consumption, participate in conservation activities, set reduction goals, and report water leaks. Administrators can manage alerts, approve/reject leak reports, and monitor system-wide statistics.

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, Framer Motion, Chart.js
- **Backend**: Node.js, Express, MySQL2
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Server-Sent Events (SSE) for smart meter data
- **Database**: MySQL

## Prerequisites

- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Quick Start

### For VS Code Users

See [VS_CODE_SETUP.md](./VS_CODE_SETUP.md) for detailed VS Code instructions.

### Quick Commands

```bash
# 1. Install all dependencies
npm install
cd backend && npm install && cd ../frontend && npm install

# 2. Setup .env files (edit with your MySQL password)
cd backend && cp .env.example .env && cd ../frontend && cp .env.example .env

# 3. Setup database (one time)
cd backend && npm run migrate && npm run seed && cd ..

# 4. Start everything with ONE command!
npm run dev
```

Then open: http://localhost:5173

**Login Credentials:**
- Admin: `admin@watertracker.com` / `admin123`
- Demo User: `john@example.com` / `password123`

---

## Code Documentation

For detailed explanation of all code files, architecture, and implementation, see [CODE_EXPLANATION.md](./CODE_EXPLANATION.md)

## Setup Instructions

### 1. Database Setup

1. Start your MySQL server
2. Create a database user (or use root):
   ```sql
   CREATE USER 'wateruser'@'localhost' IDENTIFIED BY 'waterpass';
   GRANT ALL PRIVILEGES ON *.* TO 'wateruser'@'localhost';
   FLUSH PRIVILEGES;
   ```

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=wateruser
   DB_PASSWORD=waterpass
   DB_NAME=watertracker
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRES_IN=7d
   PORT=5000
   CORS_ORIGIN=http://localhost:5173
   ```

5. Run migrations to create database and tables:
   ```bash
   npm run migrate
   ```

6. Seed the database with admin user and demo data:
   ```bash
   npm run seed
   ```

   **Default Admin Credentials:**
   - Email: `admin@watertracker.com`
   - Password: `admin123`
   
   ⚠️ **Please change the admin password after first login!**

7. Start the backend server:
   ```bash
   npm run dev
   ```

   The backend will run on `http://localhost:5000`

### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` if needed:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will run on `http://localhost:5173`

### 4. ER Diagram Image

Place your ER diagram image in `backend/assets/schema digram.jpg` (or update the path in `AdminPanel.jsx`). The image will be served at `/assets/schema digram.jpg` and displayed in the Admin Panel.

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Users

- `GET /api/users` - Get all users (admin) or current user
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile

### Alerts

- `GET /api/alerts` - Get alerts (user's own or all if admin)
- `GET /api/alerts/:id` - Get alert by ID
- `POST /api/alerts` - Create new alert (leak report)
- `PUT /api/alerts/:id` - Update alert

### Admin

- `GET /api/admin/alerts` - Get all alerts with admin info
- `GET /api/admin/stats` - Get admin dashboard statistics
- `POST /api/admin/alerts/:id/approve` - Approve alert
- `POST /api/admin/alerts/:id/reject` - Reject alert
- `POST /api/admin/alerts/:id/in-progress` - Mark alert as in-progress
- `POST /api/admin/alerts/:id/resolve` - Resolve alert

### Water Sources

- `GET /api/water-sources` - Get all water sources
- `GET /api/water-sources/:id` - Get water source by ID
- `POST /api/water-sources` - Create water source (admin)
- `PUT /api/water-sources/:id` - Update water source (admin)
- `DELETE /api/water-sources/:id` - Delete water source (admin)

### Water Usage

- `GET /api/water-usage` - Get water usage records
- `GET /api/water-usage/stats` - Get usage statistics
- `GET /api/water-usage/:id` - Get usage record by ID
- `POST /api/water-usage` - Create usage record
- `PUT /api/water-usage/:id` - Update usage record
- `DELETE /api/water-usage/:id` - Delete usage record

### Conservation Activities

- `GET /api/conservation-activities` - Get all activities
- `GET /api/conservation-activities/:id` - Get activity by ID
- `POST /api/conservation-activities` - Create activity (admin)
- `PUT /api/conservation-activities/:id` - Update activity (admin)
- `DELETE /api/conservation-activities/:id` - Delete activity (admin)

### User Activities

- `GET /api/user-activities` - Get user activities
- `POST /api/user-activities` - Join conservation activity
- `DELETE /api/user-activities` - Leave activity

### Smart Meters

- `GET /api/smart-meters` - Get smart meters
- `GET /api/smart-meters/:id` - Get meter by ID
- `POST /api/smart-meters` - Create meter (admin)
- `PUT /api/smart-meters/:id` - Update meter
- `DELETE /api/smart-meters/:id` - Delete meter (admin)

### Goals

- `GET /api/goals` - Get goals
- `GET /api/goals/:id` - Get goal by ID
- `POST /api/goals` - Create goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal

### Real-time Streaming

- `GET /api/stream/meters` - SSE endpoint for real-time smart meter data

## Example API Requests

### Register User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstname": "John",
    "lastname": "Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@watertracker.com",
    "password": "admin123"
  }'
```

### Create Leak Report

```bash
curl -X POST http://localhost:5000/api/alerts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": 1,
    "alert_type": "leak",
    "message": "Water leak in kitchen sink",
    "location": "Kitchen",
    "severity": "high"
  }'
```

### Admin Approve Alert

```bash
curl -X POST http://localhost:5000/api/admin/alerts/1/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "comment": "Leak verified, sending technician"
  }'
```

### Connect to SSE Stream

```bash
curl -N http://localhost:5000/api/stream/meters \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Features

### User Features

- **Dashboard**: View daily, weekly, and monthly water usage statistics
- **Usage Tracking**: Record and view water usage by source and purpose
- **Goals Management**: Set and track water conservation goals
- **Leak Reporting**: Report water leaks with location and severity
- **Conservation Activities**: Join and participate in conservation activities
- **Real-time Meters**: View live smart meter readings via SSE
- **Usage Predictions**: See predicted usage for next week and month

### Admin Features

- **Alert Management**: Approve, reject, mark in-progress, or resolve alerts
- **Admin Comments**: Add comments when processing alerts
- **System Statistics**: View total users, alerts, meters, and usage
- **Database Schema**: View ER diagram in admin panel
- **Full CRUD**: Manage all entities (water sources, activities, meters, etc.)

## Security Considerations

⚠️ **For Production Deployment:**

1. **Change JWT Secret**: Use a strong, randomly generated secret
2. **Enable HTTPS**: Use SSL/TLS certificates
3. **Rate Limiting**: Implement rate limiting on API endpoints
4. **Input Validation**: All inputs are validated, but review for your use case
5. **Database Backups**: Set up regular automated backups
6. **Environment Variables**: Never commit `.env` files
7. **Password Hashing**: Already using bcrypt with salt rounds
8. **CORS**: Restrict CORS origins in production
9. **SQL Injection**: Using parameterized queries (mysql2)
10. **Timeseries Database**: Consider InfluxDB or TimescaleDB for high-frequency meter data

## Project Structure

```
.
├── backend/
│   ├── migrations/          # SQL migration files
│   ├── seeds/               # Seed scripts
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── middleware/      # Auth, validation middleware
│   │   ├── utils/           # Utilities (SSE, etc.)
│   │   ├── db.js            # Database connection
│   │   └── index.js         # Express app entry
│   ├── assets/              # Static files (ER diagram)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Utilities (API, auth)
│   │   └── App.jsx         # Main app component
│   └── package.json
└── README.md
```

## Troubleshooting

### Database Connection Issues

- Verify MySQL is running: `mysql -u root -p`
- Check `.env` credentials match your MySQL setup
- Ensure database `watertracker` exists (created by migrations)

### Port Already in Use

- Backend: Change `PORT` in `.env` or kill process on port 5000
- Frontend: Change port in `vite.config.js`

### CORS Errors

- Ensure `CORS_ORIGIN` in backend `.env` matches frontend URL
- Default: `http://localhost:5173`

### SSE Not Working

- Check browser console for connection errors
- Verify token is being sent (check Network tab)
- Ensure backend SSE endpoint is accessible

## License

ISC

## Support

For issues or questions, please check the code comments or create an issue in the repository.
