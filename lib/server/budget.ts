import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { MAX_CALL_MICRO_USD, type ModelResponse } from './model';
const LIMIT = 8_000_000;
export function initializeBudget(path: string) {
  if (existsSync(path))
    throw new Error('Ledger already exists; it will never be reset.');
  const db = new DatabaseSync(path);
  try {
    db.exec(
      'PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; CREATE TABLE metadata (version INTEGER NOT NULL); INSERT INTO metadata VALUES (1); CREATE TABLE charges (id TEXT PRIMARY KEY, reserved INTEGER NOT NULL CHECK(reserved > 0), charged INTEGER, status TEXT NOT NULL, created TEXT NOT NULL);',
    );
  } finally {
    db.close();
  }
}
export class Budget {
  constructor(private path: string) {}
  private open() {
    if (!existsSync(this.path))
      throw new Error(
        'Budget ledger is missing. Run npm run budget:init before live analysis.',
      );
    const db = new DatabaseSync(this.path);
    db.exec('PRAGMA busy_timeout=3000; PRAGMA synchronous=FULL;');
    try {
      const row = db.prepare('SELECT version FROM metadata').get();
      if (row?.version !== 1) throw new Error('Unknown ledger version.');
      return db;
    } catch (error) {
      db.close();
      throw error;
    }
  }
  reserve() {
    const db = this.open();
    try {
      db.exec('BEGIN IMMEDIATE');
      const row = db
        .prepare(
          'SELECT COALESCE(SUM(COALESCE(charged,reserved)),0) AS total FROM charges',
        )
        .get();
      const total = Number(row?.total);
      if (
        !Number.isSafeInteger(total) ||
        total < 0 ||
        total + MAX_CALL_MICRO_USD > LIMIT
      )
        throw new Error(
          'Application budget reached. The $2 validation reserve remains separate.',
        );
      const id = randomUUID();
      db.prepare("INSERT INTO charges VALUES (?,?,NULL,'reserved',?)").run(
        id,
        MAX_CALL_MICRO_USD,
        new Date().toISOString(),
      );
      db.exec('COMMIT');
      return id;
    } catch (error) {
      if (db.isTransaction) db.exec('ROLLBACK');
      throw error;
    } finally {
      db.close();
    }
  }
  settle(id: string, usage?: ModelResponse['usage']) {
    const valid =
      usage &&
      Number.isSafeInteger(usage.inputTokens) &&
      Number.isSafeInteger(usage.outputTokens) &&
      usage.inputTokens >= 0 &&
      usage.outputTokens >= 0;
    return this.record(
      id,
      valid
        ? Math.ceil(usage.inputTokens * 0.25 + usage.outputTokens * 1.5)
        : MAX_CALL_MICRO_USD,
      !!valid,
    );
  }
  settleSearch(id: string) {
    // Brave Web Search: $5 / 1,000 requests. Never assume account credits.
    return this.record(id, 5_000, true);
  }
  private record(id: string, charge: number, valid: boolean) {
    const db = this.open();
    try {
      const result = db
        .prepare(
          "UPDATE charges SET charged=?,status=? WHERE id=? AND status='reserved'",
        )
        .run(charge, valid ? 'measured' : 'unknown', id);
      if (result.changes !== 1)
        throw new Error('Reservation was not available for reconciliation.');
      return charge / 1_000_000;
    } finally {
      db.close();
    }
  }
  total() {
    const db = this.open();
    try {
      return (
        Number(
          db
            .prepare(
              'SELECT COALESCE(SUM(COALESCE(charged,reserved)),0) AS total FROM charges',
            )
            .get()?.total,
        ) / 1_000_000
      );
    } finally {
      db.close();
    }
  }
}
