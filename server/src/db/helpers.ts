import { getDb, saveDb } from './connection';

let inTransaction = false;

// Helper to run a query that modifies data (INSERT, UPDATE, DELETE)
export function run(sql: string, ...params: unknown[]): { lastInsertRowid: number; changes: number } {
  const db = getDb();
  db.run(sql, params as any[]);

  const lastId = db.exec('SELECT last_insert_rowid() as id');
  const lastInsertRowid = lastId.length > 0 ? (lastId[0].values[0][0] as number) : 0;

  const changesResult = db.exec('SELECT changes() as c');
  const changes = changesResult.length > 0 ? (changesResult[0].values[0][0] as number) : 0;

  if (!inTransaction) {
    saveDb();
  }
  return { lastInsertRowid, changes };
}

// Helper to query a single row
export function get<T = any>(sql: string, ...params: unknown[]): T | undefined {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params as any[]);

  if (stmt.step()) {
    const columns = stmt.getColumnNames();
    const values = stmt.get();
    stmt.free();

    const row: any = {};
    columns.forEach((col: string, i: number) => {
      row[col] = values[i];
    });
    return row as T;
  }

  stmt.free();
  return undefined;
}

// Helper to query multiple rows
export function all<T = any>(sql: string, ...params: unknown[]): T[] {
  const db = getDb();
  const result = db.exec(sql, params as any[]);

  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    return obj as T;
  });
}

// Run multiple statements in a transaction
export function transaction<T>(fn: () => T): T {
  const db = getDb();
  inTransaction = true;
  db.run('BEGIN TRANSACTION');
  try {
    const result = fn();
    db.run('COMMIT');
    inTransaction = false;
    saveDb();
    return result;
  } catch (err) {
    db.run('ROLLBACK');
    inTransaction = false;
    throw err;
  }
}
