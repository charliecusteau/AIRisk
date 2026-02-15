import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env from project root
dotenv.config({ path: path.join(process.cwd(), '.env') });

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { errorHandler } from './middleware/errorHandler';
import { requireAuth } from './middleware/auth';
import { initDb } from './db/connection';
import { SqljsSessionStore } from './db/sessionStore';
import { logger } from './utils/logger';

import authRoutes from './routes/auth';
import assessmentRoutes from './routes/assessments';
import analysisRoutes from './routes/analysis';
import dashboardRoutes from './routes/dashboard';
import exportRoutes from './routes/export';
import portfolioRoutes from './routes/portfolio';
import newsRoutes from './routes/news';

async function main() {
  // Initialize database
  await initDb();

  const app = express();
  const PORT = process.env.PORT || 3001;

  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json());

  // Session middleware
  app.use(session({
    store: new SqljsSessionStore(),
    secret: process.env.SESSION_SECRET || 'chuck-ai-risk-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // set true if behind HTTPS proxy
    },
  }));

  // Auth routes (login is public, others have their own guards)
  app.use('/api/auth', authRoutes);

  // Health check (public)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // All other API routes require auth
  app.use('/api', requireAuth);

  app.use('/api/assessments', assessmentRoutes);
  app.use('/api/analysis', analysisRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/export', exportRoutes);
  app.use('/api/portfolio', portfolioRoutes);
  app.use('/api/news', newsRoutes);

  // Serve client static files in production
  const clientDistPath = path.join(__dirname, '../../client/dist');
  logger.info(`Looking for client files at: ${clientDistPath} (exists: ${fs.existsSync(clientDistPath)})`);
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res.json({ status: 'API is running', client: 'Client files not found. Build may have failed.' });
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
