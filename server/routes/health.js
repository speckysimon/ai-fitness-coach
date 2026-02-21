import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.11.1',
    checks: {}
  };

  try {
    // Check main database connectivity
    const mainDbPath = process.env.DATABASE_PATH || path.join(__dirname, '../fitness-coach.db');
    const mainDb = new Database(mainDbPath, { readonly: true });
    mainDb.prepare('SELECT 1').get();
    mainDb.close();
    health.checks.mainDatabase = 'connected';
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.mainDatabase = `error: ${error.message}`;
  }

  try {
    // Check admin database connectivity
    const adminDbPath = path.join(__dirname, '../fitness-coach-admin.db');
    const adminDb = new Database(adminDbPath, { readonly: true });
    adminDb.prepare('SELECT 1').get();
    adminDb.close();
    health.checks.adminDatabase = 'connected';
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.adminDatabase = `error: ${error.message}`;
  }

  // Check environment
  health.checks.nodeEnv = process.env.NODE_ENV || 'development';
  health.checks.port = process.env.PORT || 5001;

  // Return appropriate status code
  const statusCode = health.status === 'healthy' ? 200 : 500;
  res.status(statusCode).json(health);
});

export default router;
