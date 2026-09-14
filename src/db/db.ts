import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';

// vite/vitest 5.4.21 mis-resolves the bare `node:sqlite` specifier during
// test transforms (strips the `node:` prefix and tries to load a package
// named `sqlite`), so the constructor is loaded via createRequire at
// runtime while the type import above stays static for typechecking.
const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');

/**
 * Ordered schema migrations. Index `i` moves the database from `user_version` `i` to `i + 1`, so
 * `SCHEMA_VERSION` is simply the array length. Never rewrite or reorder an entry that has shipped:
 * append a new one. Migration 1 is the original `schema.sql`, written with `IF NOT EXISTS`, so a
 * database created before versions were stamped is adopted unchanged and simply gets `user_version = 1`.
 */
const MIGRATIONS: ((db: DatabaseSyncType) => void)[] = [
  (db) => db.exec(readFileSync(join(import.meta.dirname, 'schema.sql'), 'utf8')),
];
export const SCHEMA_VERSION = MIGRATIONS.length;

export function openDb(path: string): DatabaseSyncType {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  const current = Number((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version);
  // A database from a newer build may hold columns and constraints this code does not know about.
  // Guessing at it risks silent data loss, so fail closed instead.
  if (current > SCHEMA_VERSION) {
    db.close();
    throw new Error(`database schema version ${current} is newer than this build (${SCHEMA_VERSION}); upgrade Safe402`);
  }
  for (let v = current; v < SCHEMA_VERSION; v++) {
    MIGRATIONS[v]!(db);
    // PRAGMA user_version takes no bound parameter; v is a loop index, never external input.
    db.exec(`PRAGMA user_version = ${v + 1}`);
  }
  return db;
}
