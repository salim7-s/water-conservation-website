// src/server.js
import app from './app.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeScheduler } from './utils/scheduler.js';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 5000;

let server; // guard so we don't try to start twice in the same process

function startServer() {
  if (server) return; // safety guard

  server = app.listen(PORT, () => {
    console.log(`Server started — pid=${process.pid} listening on http://localhost:${PORT}`);

    // Initialize scheduler for automatic tasks
    try {
      initializeScheduler();
    } catch (error) {
      console.error('Failed to initialize scheduler:', error);
    }
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} already in use. Exiting (pid=${process.pid}).`);
      // give a short delay so logs flush, then exit
      setTimeout(() => process.exit(1), 100);
      return;
    }
    console.error('Server error:', err);
    process.exit(1);
  });

  // graceful shutdown handlers
  const shutdown = (signal) => {
    console.log(`Received ${signal} — shutting down server pid=${process.pid}`);
    if (!server) return process.exit(0);
    server.close(() => process.exit(0));
    // force exit if it takes too long
    setTimeout(() => process.exit(1), 5000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    shutdown('uncaughtException');
  });
}

// Only start when this file is run directly, not when imported.
if (process.argv[1] && process.argv[1].endsWith(path.join('src', 'server.js'))) {
  startServer();
}

export default app;






