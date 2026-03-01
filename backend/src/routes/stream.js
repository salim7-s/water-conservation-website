import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { setupSSE } from '../utils/sse.js';

dotenv.config();

const router = express.Router();

/**
 * GET /api/stream/meters
 * Server-Sent Events endpoint for real-time smart meter data
 * Note: SSE doesn't support custom headers, so token is passed as query param
 */
router.get('/meters', (req, res) => {
  try {
    const token = req.query.token || req.headers.authorization?.substring(7);
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      setupSSE(req, res);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'SSE setup failed' });
  }
});

export default router;

