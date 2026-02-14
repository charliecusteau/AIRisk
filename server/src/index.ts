import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env from project root
dotenv.config({ path: path.join(process.cwd(), '.env') });

import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { initDb } from './db/connection';
import { logger } from './utils/logger';

import assessmentRoutes from './routes/assessments';
import analysisRoutes from './routes/analysis';
import dashboardRoutes from './routes/dashboard';
import exportRoutes from './routes/export';
import batchRoutes from './routes/batch';

async function main() {
  // Initialize database
  await initDb();

  const app = express();
  const PORT = process.env.PORT || 3001;

  app.use(cors());
  app.use(express.json());

  // Routes
  app.use('/api/assessments', assessmentRoutes);
  app.use('/api/analysis', analysisRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/export', exportRoutes);
  app.use('/api/batch-analysis', batchRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Serve client static files in production
  const clientDistPath = path.join(__dirname, '../../client/dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  // Error handler
  app.use(errorHandler);

  app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
