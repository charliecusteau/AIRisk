import { Database as SqlJsDatabase } from 'sql.js';
import bcrypt from 'bcryptjs';

export function initSchema(db: SqlJsDatabase): void {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Migration: rename email → username in users table
  try {
    db.run('ALTER TABLE users RENAME COLUMN email TO username');
  } catch (_e) {
    // Column already renamed or doesn't exist
  }

  // Sessions table
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expired_at TEXT NOT NULL
    )
  `);
  db.run('CREATE INDEX IF NOT EXISTS idx_sessions_expired ON sessions(expired_at)');

  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      sector TEXT,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'analyzing', 'completed', 'error')),
      narrative TEXT,
      domain1_rating TEXT CHECK(domain1_rating IN ('high', 'medium', 'low')),
      domain2_rating TEXT CHECK(domain2_rating IN ('high', 'medium', 'low')),
      domain3_rating TEXT CHECK(domain3_rating IN ('high', 'medium', 'low')),
      domain4_rating TEXT CHECK(domain4_rating IN ('high', 'medium', 'low')),
      domain5_rating TEXT CHECK(domain5_rating IN ('high', 'medium', 'low')),
      composite_score REAL,
      composite_rating TEXT,
      ai_model TEXT,
      user_modified INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      domain_summaries TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS domain_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assessment_id INTEGER NOT NULL,
      domain_number INTEGER NOT NULL,
      question_key TEXT NOT NULL,
      question_text TEXT NOT NULL,
      ai_rating TEXT NOT NULL CHECK(ai_rating IN ('high', 'medium', 'low')),
      ai_reasoning TEXT NOT NULL,
      ai_confidence TEXT NOT NULL DEFAULT 'medium' CHECK(ai_confidence IN ('high', 'medium', 'low')),
      user_rating TEXT CHECK(user_rating IN ('high', 'medium', 'low')),
      user_reasoning TEXT,
      effective_rating TEXT NOT NULL CHECK(effective_rating IN ('high', 'medium', 'low')),
      FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS assessment_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assessment_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      field_changed TEXT,
      old_value TEXT,
      new_value TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS portfolio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assessment_id INTEGER NOT NULL UNIQUE,
      weight REAL NOT NULL DEFAULT 0,
      added_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_assessments_company_id ON assessments(company_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_domain_scores_assessment_id ON domain_scores(assessment_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_assessment_history_assessment_id ON assessment_history(assessment_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_portfolio_assessment_id ON portfolio(assessment_id)');

  db.run(`
    CREATE TABLE IF NOT EXISTS news_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      headline TEXT NOT NULL,
      source TEXT,
      source_url TEXT,
      published_date TEXT,
      summary TEXT NOT NULL,
      competitor TEXT,
      competitor_type TEXT,
      relevance_score INTEGER NOT NULL DEFAULT 0,
      scanned_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS news_alert_impacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id INTEGER NOT NULL,
      portfolio_id INTEGER NOT NULL,
      impact_explanation TEXT NOT NULL,
      FOREIGN KEY (alert_id) REFERENCES news_alerts(id) ON DELETE CASCADE,
      FOREIGN KEY (portfolio_id) REFERENCES portfolio(id) ON DELETE CASCADE
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_news_alerts_scanned_at ON news_alerts(scanned_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_news_alert_impacts_alert_id ON news_alert_impacts(alert_id)');

  // Migration: add domain_summaries column to existing databases
  try {
    db.run('ALTER TABLE assessments ADD COLUMN domain_summaries TEXT');
  } catch (_e) {
    // Column already exists — ignore
  }

  // Migration: add user_id to assessments
  try {
    db.run('ALTER TABLE assessments ADD COLUMN user_id INTEGER REFERENCES users(id)');
  } catch (_e) {
    // Column already exists
  }

  // Migration: add user_id to portfolio
  try {
    db.run('ALTER TABLE portfolio ADD COLUMN user_id INTEGER REFERENCES users(id)');
  } catch (_e) {
    // Column already exists
  }

  // Migration: add user_id to news_alerts
  try {
    db.run('ALTER TABLE news_alerts ADD COLUMN user_id INTEGER REFERENCES users(id)');
  } catch (_e) {
    // Column already exists
  }

  db.run('CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON portfolio(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_news_alerts_user_id ON news_alerts(user_id)');

  // Migration: fix old admin username from email to short name
  try {
    db.run("UPDATE users SET username = 'admin' WHERE username = 'admin@chuck.local'");
  } catch (_e) {
    // ignore
  }

  // Seed default admin user if no users exist
  const userCount = db.exec('SELECT COUNT(*) as count FROM users');
  const count = userCount.length > 0 ? (userCount[0].values[0][0] as number) : 0;
  if (count === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.run(
      "INSERT INTO users (username, password_hash, name, role) VALUES ('admin', ?, 'Admin', 'admin')",
      [hash],
    );
  }
}
