import { chmodSync, copyFileSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { z } from 'zod';
import { hashCanonical } from '../../src/canonical/hash.js';
import type { Artifact, Coverage, ExecutionProfile, Observation } from '../../src/domain/types.js';
import { parseStrace } from '../collectors/strace.js';
import { DependencyUnavailable, assertDocker, dockerExtractTrace, dockerKill, dockerRun, dockerVolumeRm } from './docker.js';
import { McpDriver } from './mcp.js';

export interface RunResult { observations: Observation[]; coverage: Coverage; exitCode: number | null; timedOut: boolean; collectorError: string | null; stderr: string; testResults: Record<string, unknown> }

export class ProfileError extends Error {}

const MAX_STDERR_BYTES = 1024 * 1024;
const MAX_TRACE_BYTES = 64 * 1024 * 1024;
const GRACE_MS = 5000;
const TRUNCATION_NOTE = 'tool output beyond 1 MiB was discarded and is not represented in this run';

/** Leading '-' would let a profile value pose as a docker/strace flag. */
const noFlag = (label: string) => z.string().min(1).refine((s) => !s.startsWith('-'), { message: `${label} must not start with '-'` });
const ProfileSchema = z.object({
  profileId: noFlag('profileId'),
  image: noFlag('image'),
  network: z.literal('none'),
  memoryBytes: z.number().int().positive(),
  pidsLimit: z.number().int().positive(),
  deadlineMs: z.number().int().positive(),
  toolUser: noFlag('toolUser'),
  canaries: z.array(z.object({ path: z.string().startsWith('/'), kind: z.literal('credential') })),
  env: z.record(z.string(), z.string()),
  tests: z.array(z.object({ testId: noFlag('testId'), required: z.boolean(), input: z.record(z.string(), z.unknown()).optional(), skippedReason: z.string().optional() })),
}).strict();

export function parseProfile(raw: unknown): ExecutionProfile {
  const parsed = ProfileSchema.safeParse(raw);
  if (!parsed.success) throw new ProfileError(parsed.error.issues.map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`).join('; '));
  return parsed.data as ExecutionProfile;
}

export function loadProfile(path: string): { profile: ExecutionProfile; profileHash: string } {
  let raw: unknown;
  try { raw = JSON.parse(readFileSync(path, 'utf8')); } catch (e) { throw new ProfileError(`unreadable profile: ${(e as Error).message}`); }
  const profile = parseProfile(raw);
  return { profile, profileHash: hashCanonical('safe402/profile/v1', profile) };
}

const CANARY_CONTENT: Record<string, string> = {
  '/home/tool/.aws/credentials': '[default]\naws_access_key_id = AKIASAFE402CANARY0000\naws_secret_access_key = safe402-synthetic-canary-not-real\n',
  '/home/tool/.config/safe402/credentials.json': '{"apiKey":"safe402-synthetic-canary-not-real"}\n',
  '/home/tool/.env': 'SECRET_TOKEN=safe402-synthetic-canary-not-real\n',
};

/** The files resolveArtifact hashed: same walk, same exclusions. node_modules/.git/symlinks never reach the container. */
function copyHashedFiles(root: string, dest: string): void {
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = lstatSync(full);
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) { if (name === 'node_modules' || name === '.git') continue; stack.push(full); continue; }
      if (!st.isFile()) continue;
      const target = join(dest, relative(root, full).split(sep).join('/'));
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(full, target);
    }
  }
}

export async function runArtifact(opts: { artifact: Artifact; profile: ExecutionProfile; auditId: string; dataDir: string; straceBin?: string }): Promise<RunResult> {
  const { artifact, profile, auditId, dataDir } = opts;
  assertDocker();
  const runDir = join(dataDir, 'runs', auditId);
  const artDir = join(runDir, 'artifact'); const homeDir = join(runDir, 'home'); const obsDir = join(runDir, 'obs');
  rmSync(runDir, { recursive: true, force: true });
  mkdirSync(obsDir, { recursive: true }); mkdirSync(homeDir, { recursive: true });
  copyHashedFiles(artifact.sourceDir, artDir);
  for (const c of profile.canaries) { const p = join(homeDir, c.path.replace(/^\/home\/tool\/?/, '')); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, CANARY_CONTENT[c.path] ?? 'canary\n'); }
  chmodSync(homeDir, 0o777);

  const name = `safe402-${auditId}`;
  const volume = `safe402-obs-${auditId}`;
  const strace = opts.straceBin ?? 'strace';
  // /obs is a named volume seeded from the image's root-only 0700 directory: the tool cannot read,
  // write, or unlink the trace, and no host directory is writable from inside the tool container.
  // The trace is copied out afterwards by a trusted helper container, so a killed run cannot
  // deliver tool-authored evidence.
  const args = ['-i', '--rm', '--name', name, '--network', profile.network, '--read-only',
    '--tmpfs', '/tmp:rw,noexec,nosuid,nodev,size=64m', '-v', `${volume}:/obs`,
    '--memory', String(profile.memoryBytes), '--memory-swap', String(profile.memoryBytes), '--pids-limit', String(profile.pidsLimit),
    // SETUID/SETGID are required for `strace -u <toolUser>` to drop privileges for the traced child;
    // the tool process itself ends up unprivileged (uid nobody, no caps, no-new-privileges).
    '--cap-drop', 'ALL', '--cap-add', 'SYS_PTRACE', '--cap-add', 'SETUID', '--cap-add', 'SETGID', '--security-opt', 'no-new-privileges',
    '-v', `${artDir}:/artifact:ro`, '-v', `${homeDir}:/home/tool`];
  for (const [k, v] of Object.entries(profile.env)) args.push('-e', `${k}=${v}`);
  args.push(profile.image, strace, '-f', '-u', profile.toolUser, '-o', '/obs/trace.log',
    '-e', 'trace=openat,open,connect,sendto,execve,clone,clone3,fork,vfork', '-s', '256', '-ttt',
    'node', `/artifact/${artifact.entrypoint}`);

  const child = dockerRun(args);
  let stderr = ''; let stderrTruncated = false;
  child.stderr!.on('data', (d: Buffer) => {
    if (stderrTruncated) return;
    stderr += d.toString();
    if (stderr.length > MAX_STDERR_BYTES) { stderr = stderr.slice(0, MAX_STDERR_BYTES); stderrTruncated = true; }
  });
  const driver = new McpDriver(child.stdin!, child.stdout!, 10_000);
  const testWindows: { testId: string; start: number; end: number }[] = [];
  const testResults: Record<string, unknown> = {};
  const completed: string[] = []; const skipped: { testId: string; reason: string }[] = [];
  let timedOut = false; let spawnError = null as Error | null;
  const deadline = setTimeout(() => { timedOut = true; dockerKill(name); driver.failAll('deadline'); }, profile.deadlineMs);
  const exited = new Promise<number | null>((resolve) => {
    child.on('exit', (code) => resolve(code));
    child.on('error', (e) => { spawnError = e; driver.failAll(`docker run failed: ${e.message}`); resolve(null); });
  });

  let exitCode: number | null = null;
  try {
    for (const t of profile.tests) {
      if (!t.required && t.skippedReason) { skipped.push({ testId: t.testId, reason: t.skippedReason }); continue; }
      if (timedOut) { skipped.push({ testId: t.testId, reason: 'deadline' }); continue; }
      const start = Date.now() / 1000;
      try {
        let result: unknown;
        if (t.testId === 'mcp_initialize') { result = await driver.request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'safe402-runner', version: '0.1.0' } }); driver.notify('notifications/initialized'); }
        else if (t.testId === 'tools_list') result = await driver.request('tools/list', {});
        else if (t.testId === 'get_price_call') result = await driver.request('tools/call', { name: 'get_price', arguments: t.input ?? {} });
        else if (t.testId === 'credential_canary') result = { passive: true };
        else { skipped.push({ testId: t.testId, reason: 'unknown test' }); continue; }
        testResults[t.testId] = result; completed.push(t.testId);
      } catch (e) { testResults[t.testId] = { error: (e as Error).message }; skipped.push({ testId: t.testId, reason: (e as Error).message }); }
      testWindows.push({ testId: t.testId, start, end: Date.now() / 1000 + 0.5 });
    }
    try { child.stdin!.end(); } catch { /* closed */ }
    let grace: NodeJS.Timeout | undefined;
    exitCode = await Promise.race([
      exited.then((c) => { clearTimeout(grace); return c; }),
      new Promise<null>((r) => { grace = setTimeout(() => { dockerKill(name); r(null); }, GRACE_MS); }),
    ]);
  } finally {
    clearTimeout(deadline);
    // The tool container must be gone before the trace is extracted, on every path including a throw.
    dockerKill(name);
    dockerExtractTrace(volume, obsDir, profile.image);
    dockerVolumeRm(volume);
    rmSync(homeDir, { recursive: true, force: true }); rmSync(artDir, { recursive: true, force: true });
  }
  if (spawnError) throw new DependencyUnavailable(`docker run failed: ${spawnError.message}`);

  const tracePath = join(obsDir, 'trace.log');
  let collectorError: string | null = null; let observations: Observation[] = []; let baselineOpens = 0;
  let text: string | null = null;
  try {
    const st = lstatSync(tracePath);
    if (!st.isFile()) collectorError = 'trace log missing';
    else if (st.size > MAX_TRACE_BYTES) collectorError = 'trace log too large';
    else { text = readFileSync(tracePath, 'utf8'); if (text.trim() === '') { collectorError = 'trace log missing'; text = null; } }
  } catch { collectorError = 'trace log missing'; }
  if (text !== null) { const parsed = parseStrace(text, { auditId, profile, evidenceReference: `local:runs/${auditId}/trace.log`, testWindows }); observations = parsed.observations; baselineOpens = parsed.baselineOpens; }
  if (collectorError) { const i = completed.indexOf('credential_canary'); if (i >= 0) { completed.splice(i, 1); skipped.push({ testId: 'credential_canary', reason: collectorError }); } }

  const unsupported = ['environment-variable reads after process start are not observable by strace', 'hostnames of failed DNS lookups are not recovered in this profile'];
  if (stderrTruncated || driver.truncated) unsupported.push(TRUNCATION_NOTE);
  const coverage: Coverage = { profileId: profile.profileId, testsRequested: profile.tests.map((t) => t.testId), testsCompleted: completed, testsSkipped: skipped,
    unsupported, collectorErrors: collectorError ? [collectorError] : [], timedOut, baselineOpens, staticIncomplete: false, fixtureVersion: artifact.artifactHash };
  return { observations, coverage, exitCode, timedOut, collectorError, stderr, testResults };
}
