/**
 * Server-Sent Events (SSE) utility for streaming smart meter data
 * Simulates real-time meter readings every 2-3 seconds
 */

import pool from '../db.js';

/**
 * Generate simulated smart meter data
 */
async function getSimulatedMeterData() {
  try {
    // Fetch actual meters from database
    const [meters] = await pool.execute(
      `SELECT meter_id, user_id, meter_type, status, total_usage, install_date 
       FROM smart_meters 
       WHERE status = 'active' 
       LIMIT 10`
    );

    // Simulate real-time updates with small random variations
    const simulatedData = meters.map(meter => ({
      meter_id: meter.meter_id,
      user_id: meter.user_id,
      total_usage: meter.total_usage + (Math.random() * 0.5 - 0.25), // ±0.25 variation
      status: meter.status,
      last_update: new Date().toISOString(),
    }));

    return {
      ts: new Date().toISOString(),
      meters: simulatedData,
    };
  } catch (error) {
    console.error('Error generating meter data:', error);
    return {
      ts: new Date().toISOString(),
      meters: [],
    };
  }
}

/**
 * SSE handler for smart meter streaming
 */
export function setupSSE(req, res) {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE stream started' })}\n\n`);

  // Send data every 2-3 seconds
  const interval = setInterval(async () => {
    try {
      const data = await getSimulatedMeterData();
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('SSE error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    }
  }, 2000 + Math.random() * 1000); // Random interval between 2-3 seconds

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
}


