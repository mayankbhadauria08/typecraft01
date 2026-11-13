// A small stand-in for Cloudflare D1, built on Node's built-in SQLite, so the
// Worker can be tested without wrangler. It mirrors the D1 calls the Worker
// uses: prepare().bind().first()/all()/run() and batch() (one transaction).
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

class Statement {
  constructor(db, sql, params = []) { this.db = db; this.sql = sql; this.params = params; }
  bind(...params) {
    for (const p of params) if (p === undefined) throw new Error('D1_TYPE_ERROR: undefined bound');
    return new Statement(this.db, this.sql, params);
  }
  _stmt() { return this.db.prepare(this.sql); }
  async first(col) { const row = this._stmt().get(...this.params); if (!row) return null; return col ? row[col] : { ...row }; }
  async all() { return { results: this._stmt().all(...this.params).map((r) => ({ ...r })), success: true, meta: {} }; }
  async run() {
    const st = this._stmt();
    if (/\bRETURNING\b/i.test(this.sql)) { const rows = st.all(...this.params); return { results: rows, success: true, meta: { changes: rows.length } }; }
    const r = st.run(...this.params);
    return { results: [], success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
  _exec() {
    const st = this._stmt();
    if (/^\s*(SELECT|WITH)\b/i.test(this.sql) || /\bRETURNING\b/i.test(this.sql)) return { results: st.all(...this.params).map((r) => ({ ...r })), success: true, meta: {} };
    const r = st.run(...this.params);
    return { results: [], success: true, meta: { changes: Number(r.changes) } };
  }
}

export class D1Shim {
  constructor(file = ':memory:') {
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA foreign_keys = ON;'); // D1 enforces foreign keys
  }
  prepare(sql) { return new Statement(this.db, sql); }
  async batch(stmts) {
    this.db.exec('BEGIN');
    try { const out = stmts.map((s) => s._exec()); this.db.exec('COMMIT'); return out; }
    catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  async exec(sql) { this.db.exec(sql); }
  applyMigrations(dir) {
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) this.db.exec(readFileSync(`${dir}/${f}`, 'utf8'));
  }
}
