import { Store } from 'express-session';
import { getDb, saveDb } from './connection';

export class SqljsSessionStore extends Store {
  constructor() {
    super();
  }

  get(sid: string, callback: (err?: any, session?: any) => void): void {
    try {
      const db = getDb();
      // Clean up expired sessions
      db.run("DELETE FROM sessions WHERE expired_at < datetime('now')");

      const stmt = db.prepare('SELECT sess FROM sessions WHERE sid = ?');
      stmt.bind([sid]);

      if (stmt.step()) {
        const row = stmt.get();
        stmt.free();
        const sess = JSON.parse(row[0] as string);
        callback(null, sess);
      } else {
        stmt.free();
        callback(null, null);
      }
    } catch (err) {
      callback(err);
    }
  }

  set(sid: string, session: any, callback?: (err?: any) => void): void {
    try {
      const db = getDb();
      const sessStr = JSON.stringify(session);
      const maxAge = session.cookie?.maxAge || 86400000; // 24h default
      const expiredAt = new Date(Date.now() + maxAge).toISOString();

      db.run(
        'INSERT OR REPLACE INTO sessions (sid, sess, expired_at) VALUES (?, ?, ?)',
        [sid, sessStr, expiredAt],
      );
      saveDb();
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    try {
      const db = getDb();
      db.run('DELETE FROM sessions WHERE sid = ?', [sid]);
      saveDb();
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }
}
