import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import alertRoutes from './routes/alerts.js';
import adminRoutes from './routes/admin.js';
import waterSourceRoutes from './routes/water_sources.js';
import waterUsageRoutes from './routes/water_usage.js';
import conservationActivityRoutes from './routes/conservation_activities.js';
import userActivityRoutes from './routes/user_activities.js';
import smartMeterRoutes from './routes/smart_meters.js';
import goalRoutes from './routes/goals.js';
import streamRoutes from './routes/stream.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (for ER diagram image)
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Water Tracker API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/water-sources', waterSourceRoutes);
app.use('/api/water-usage', waterUsageRoutes);
app.use('/api/conservation-activities', conservationActivityRoutes);
app.use('/api/user-activities', userActivityRoutes);
app.use('/api/smart-meters', smartMeterRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/stream', streamRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Note: Server startup moved to src/server.js to prevent multiple instances
// This file is kept for reference but is not used by package.json scripts

