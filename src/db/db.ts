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

export function openDb(path: string): DatabaseSyncType {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  db.exec(readFileSync(join(import.meta.dirname, 'schema.sql'), 'utf8'));
  return db;
}
