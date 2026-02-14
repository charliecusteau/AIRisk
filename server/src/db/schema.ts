import { Database as SqlJsDatabase } from 'sql.js';

export function initSchema(db: SqlJsDatabase): void {
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

  db.run('CREATE INDEX IF NOT EXISTS idx_assessments_company_id ON assessments(company_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_domain_scores_assessment_id ON domain_scores(assessment_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_assessment_history_assessment_id ON assessment_history(assessment_id)');

  // Migration: add domain_summaries column to existing databases
  try {
    db.run('ALTER TABLE assessments ADD COLUMN domain_summaries TEXT');
  } catch (_e) {
    // Column already exists — ignore
  }
}
