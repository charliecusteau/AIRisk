import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import Anthropic from '@anthropic-ai/sdk';
import { get, all, run } from '../db/helpers';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  const user = get<{
    id: number;
    username: string;
    password_hash: string;
    name: string;
    role: 'admin' | 'user';
  }>('SELECT id, username, password_hash, name, role FROM users WHERE username = ?', username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  // Update last login
  run("UPDATE users SET last_login_at = datetime('now') WHERE id = ?", user.id);

  req.session.userId = user.id;
  req.session.userRole = user.role;

  req.session.save((err) => {
    if (err) {
      logger.error('Session save failed', err);
      res.status(500).json({ error: 'Login failed' });
      return;
    }
    res.json({ id: user.id, username: user.username, name: user.name, role: user.role });
  });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Session destroy failed', err);
      res.status(500).json({ error: 'Logout failed' });
      return;
    }
    res.json({ success: true });
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = get<{
    id: number;
    username: string;
    name: string;
    role: string;
  }>('SELECT id, username, name, role FROM users WHERE id = ?', req.session.userId);

  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  res.json(user);
});

// POST /api/auth/users — admin creates a new user
router.post('/users', requireAdmin, (req: Request, res: Response) => {
  const { name, username, password } = req.body;

  if (!name || !username || !password) {
    res.status(400).json({ error: 'Name, username, and password required' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const existing = get('SELECT id FROM users WHERE username = ?', username);
  if (existing) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = run(
    'INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)',
    username, hash, name, 'user',
  );

  logger.info('User created', { id: result.lastInsertRowid, username });
  res.status(201).json({ id: result.lastInsertRowid, username, name, role: 'user' });
});

// GET /api/auth/users — admin lists all users
router.get('/users', requireAdmin, (_req: Request, res: Response) => {
  const users = all('SELECT id, username, name, role, last_login_at, created_at FROM users ORDER BY created_at');
  res.json(users);
});

// DELETE /api/auth/users/:id — admin deletes a user
router.delete('/users/:id', requireAdmin, (req: Request, res: Response) => {
  const targetId = Number(req.params.id);

  if (targetId === req.session.userId) {
    res.status(400).json({ error: 'Cannot delete yourself' });
    return;
  }

  const user = get('SELECT id FROM users WHERE id = ?', targetId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  run('DELETE FROM users WHERE id = ?', targetId);
  logger.info('User deleted', { id: targetId });
  res.json({ success: true });
});

// POST /api/auth/backfill-descriptions — admin: fill missing company descriptions via Claude
router.post('/backfill-descriptions', requireAdmin, async (req: Request, res: Response) => {
  const companies = all<{ id: number; name: string; sector: string | null }>(
    "SELECT DISTINCT c.id, c.name, c.sector FROM companies c WHERE c.description IS NULL OR c.description = ''"
  );

  if (companies.length === 0) {
    res.json({ updated: 0, message: 'All companies already have descriptions' });
    return;
  }

  const client = new Anthropic();
  let updated = 0;

  for (const company of companies) {
    try {
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `In 1-2 sentences, describe what ${company.name} does as a business${company.sector ? ` (sector: ${company.sector})` : ''}. Be specific about their core product/service. Return ONLY the description text, no quotes or prefixes.`,
        }],
      });
      const text = msg.content.find(b => b.type === 'text');
      if (text && text.type === 'text') {
        run("UPDATE companies SET description = ?, updated_at = datetime('now') WHERE id = ?",
          text.text.trim(), company.id);
        updated++;
      }
    } catch (err: any) {
      logger.error(`Backfill description failed for ${company.name}`, err);
    }
  }

  res.json({ updated, total: companies.length });
});

export default router;
