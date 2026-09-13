import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { hashCanonical } from '../../src/canonical/hash.js';
import type { Artifact, Coverage, ExecutionProfile, Observation } from '../../src/domain/types.js';
import { parseStrace } from '../collectors/strace.js';
import { assertDocker, dockerKill, dockerRun } from './docker.js';
import { McpDriver } from './mcp.js';

export interface RunResult { observations: Observation[]; coverage: Coverage; exitCode: number | null; timedOut: boolean; collectorError: string | null; stderr: string; testResults: Record<string, unknown> }

export function loadProfile(path: string): { profile: ExecutionProfile; profileHash: string } {
  const profile = JSON.parse(readFileSync(path, 'utf8')) as ExecutionProfile;
  return { profile, profileHash: hashCanonical('safe402/profile/v1', profile) };
}

const CANARY_CONTENT: Record<string, string> = {
  '/home/tool/.aws/credentials': '[default]\naws_access_key_id = AKIASAFE402CANARY0000\naws_secret_access_key = safe402-synthetic-canary-not-real\n',
  '/home/tool/.config/safe402/credentials.json': '{"apiKey":"safe402-synthetic-canary-not-real"}\n',
  '/home/tool/.env': 'SECRET_TOKEN=safe402-synthetic-canary-not-real\n',
};

export async function runArtifact(opts: { artifact: Artifact; profile: ExecutionProfile; auditId: string; dataDir: string; straceBin?: string }): Promise<RunResult> {
  const { artifact, profile, auditId, dataDir } = opts;
  assertDocker();
  const runDir = join(dataDir, 'runs', auditId);
  const artDir = join(runDir, 'artifact'); const homeDir = join(runDir, 'home'); const obsDir = join(runDir, 'obs');
  rmSync(runDir, { recursive: true, force: true });
  mkdirSync(obsDir, { recursive: true }); mkdirSync(homeDir, { recursive: true });
  cpSync(artifact.sourceDir, artDir, { recursive: true });
  for (const c of profile.canaries) { const p = join(homeDir, c.path.replace(/^\/home\/tool\/?/, '')); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, CANARY_CONTENT[c.path] ?? 'canary\n'); }
  chmodSync(homeDir, 0o777);

  const name = `safe402-${auditId}`;
  const strace = opts.straceBin ?? 'strace';
  const args = ['-i', '--rm', '--name', name, '--network', profile.network, '--read-only', '--tmpfs', '/tmp', '--memory', String(profile.memoryBytes), '--pids-limit', String(profile.pidsLimit),
    // SETUID/SETGID are required for `strace -u <toolUser>` to drop privileges for the traced child;
    // the tool process itself ends up unprivileged (uid nobody, no caps, no-new-privileges).
    '--cap-drop', 'ALL', '--cap-add', 'SYS_PTRACE', '--cap-add', 'SETUID', '--cap-add', 'SETGID', '--security-opt', 'no-new-privileges',
    '-v', `${artDir}:/artifact:ro`, '-v', `${homeDir}:/home/tool`, '-v', `${obsDir}:/obs`];
  for (const [k, v] of Object.entries(profile.env)) args.push('-e', `${k}=${v}`);
  args.push(profile.image, strace, '-f', '-u', profile.toolUser, '-o', '/obs/trace.log', '-e', 'trace=openat,open,connect,sendto,execve,clone,clone3,fork,vfork', '-s', '256', '-ttt', 'node', `/artifact/${artifact.entrypoint}`);

  const child = dockerRun(args);
  let stderr = ''; child.stderr!.on('data', (d) => { stderr += d.toString(); });
  const driver = new McpDriver(child.stdin!, child.stdout!, 10_000);
  const testWindows: { testId: string; start: number; end: number }[] = [];
  const testResults: Record<string, unknown> = {};
  const completed: string[] = []; const skipped: { testId: string; reason: string }[] = [];
  let timedOut = false;
  const deadline = setTimeout(() => { timedOut = true; dockerKill(name); driver.failAll('deadline'); }, profile.deadlineMs);
  const exited = new Promise<number | null>((resolve) => child.on('exit', (code) => resolve(code)));

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
  const exitCode = await Promise.race([exited, new Promise<null>((r) => setTimeout(() => { dockerKill(name); r(null); }, 5000))]);
  clearTimeout(deadline);

  const tracePath = join(obsDir, 'trace.log');
  let collectorError: string | null = null; let observations: Observation[] = []; let baselineOpens = 0;
  if (!existsSync(tracePath) || readFileSync(tracePath, 'utf8').trim() === '') collectorError = 'trace log missing';
  else { const parsed = parseStrace(readFileSync(tracePath, 'utf8'), { auditId, profile, evidenceReference: `local:runs/${auditId}/trace.log`, testWindows }); observations = parsed.observations; baselineOpens = parsed.baselineOpens; }
  if (collectorError) { const i = completed.indexOf('credential_canary'); if (i >= 0) { completed.splice(i, 1); skipped.push({ testId: 'credential_canary', reason: collectorError }); } }

  rmSync(homeDir, { recursive: true, force: true }); rmSync(artDir, { recursive: true, force: true });
  const coverage: Coverage = { profileId: profile.profileId, testsRequested: profile.tests.map((t) => t.testId), testsCompleted: completed, testsSkipped: skipped,
    unsupported: ['environment-variable reads after process start are not observable by strace', 'hostnames of failed DNS lookups are not recovered in this profile'],
    collectorErrors: collectorError ? [collectorError] : [], timedOut, baselineOpens, staticIncomplete: false, fixtureVersion: artifact.artifactHash };
  return { observations, coverage, exitCode, timedOut, collectorError, stderr, testResults };
}
