import { hostname } from 'node:os';
import { loadConfig } from '../src/config.js';
import { openDb } from '../src/db/db.js';
import { JobRepo } from '../src/jobs/repo.js';
import { runWorkerOnce } from './pipeline.js';

const config = loadConfig();
const ctx = { repo: new JobRepo(openDb(config.dbPath)), config, owner: `${hostname()}-${process.pid}` };
console.error(`[worker] ${ctx.owner} started, db=${config.dbPath}`);
const loop = async () => { try { if (!(await runWorkerOnce(ctx))) await new Promise((r) => setTimeout(r, 500)); } catch (e) { console.error('[worker] error', (e as Error).message); } setImmediate(loop); };
void loop();
