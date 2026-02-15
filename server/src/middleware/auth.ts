import { Request, Response, NextFunction } from 'express';

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    userId: number;
    userRole: 'admin' | 'user';
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (req.session.userRole !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
