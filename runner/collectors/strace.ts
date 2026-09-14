import { posix as posixPath } from 'node:path';
import type { ExecutionProfile, Observation, Operation } from '../../src/domain/types.js';
export const COLLECTOR_VERSION = 'strace-v1';

/**
 * The working directory every traced process starts in. The runner image sets no `WORKDIR`
 * (`runner/images/Dockerfile`) and the harness passes no `-w`, so the container's initial cwd is `/`.
 * A process whose cwd cannot be tracked is held as `null` and its relative opens are reported
 * `unresolved:` rather than guessed at.
 */
export const CONTAINER_CWD = '/';

export interface ParseContext { auditId: string; profile: ExecutionProfile; evidenceReference: string; testWindows: { testId: string; start: number; end: number }[] }
interface Call { pid: string; ts: number; name: string; args: string; result: number | null; errno: string | null }
/** Per-pid resolution state. `cwd` is boxed so CLONE_FS siblings share one directory, as the kernel does. */
interface PidState { cwd: { value: string | null }; fds: Map<number, string> }

const LINE = /^(\d+)\s+(\d+\.\d+)\s+(.*)$/;
const RESUMED = /^<\.\.\. (\w+) resumed>(.*)$/;
const CALL = /^(\w+)\((.*)\)\s*=\s*(-?\d+|\?)(?:\s+(E[A-Z]+))?/s;

function parseLines(text: string): Call[] {
  const pending = new Map<string, { ts: number; body: string }>();
  const calls: Call[] = [];
  for (const raw of text.split('\n')) {
    const m = LINE.exec(raw.trim()); if (!m) continue;
    const [, pid, tsStr, body0] = m; let ts = Number(tsStr);
    let body = body0!;
    if (body.endsWith('<unfinished ...>')) { pending.set(pid!, { ts, body: body.replace(/\s*<unfinished \.\.\.>$/, '') }); continue; }
    const r = RESUMED.exec(body);
    if (r) { const p = pending.get(pid!); if (!p) continue; pending.delete(pid!); body = p.body + r[2]; ts = p.ts; }
    const c = CALL.exec(body); if (!c) continue;
    calls.push({ pid: pid!, ts, name: c[1]!, args: c[2]!, result: c[3] === '?' ? null : Number(c[3]), errno: c[4] ?? null });
  }
  return calls;
}

/**
 * strace prints C string literals with escapes. Comparing the escaped text against a canary path
 * would let `"/srv/\163ecret.json"` read as a different file from `/srv/secret.json`, so every
 * quoted argument is decoded back to the bytes the kernel actually saw before any comparison.
 */
function decodeEscapes(s: string): string {
  if (!s.includes('\\')) return s;
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch !== '\\') { out += ch; continue; }
    const n = s[++i];
    if (n === undefined) { out += '\\'; break; }
    if (n >= '0' && n <= '7') {
      let oct = n;
      while (oct.length < 3) { const d = s[i + 1]; if (d === undefined || d < '0' || d > '7') break; oct += d; i++; }
      out += String.fromCharCode(parseInt(oct, 8));
      continue;
    }
    if (n === 'x') {
      let hex = '';
      while (hex.length < 2 && /[0-9a-fA-F]/.test(s[i + 1] ?? '')) { hex += s[i + 1]; i++; }
      out += hex === '' ? 'x' : String.fromCharCode(parseInt(hex, 16));
      continue;
    }
    const simple: Record<string, string> = { n: '\n', t: '\t', r: '\r', a: '\x07', b: '\b', f: '\f', v: '\v', '"': '"', '\\': '\\', "'": "'", '0': '\0' };
    out += simple[n] ?? n;
  }
  return out;
}

function firstQuoted(args: string): string | null { const m = /"((?:[^"\\]|\\.)*)"/.exec(args); return m ? decodeEscapes(m[1]!) : null; }
function flagsAfterQuoted(args: string): string {
  const m = /"(?:[^"\\]|\\.)*"\s*,\s*([^,]*)/.exec(args);
  return m ? m[1]!.trim() : '';
}
function inetTarget(args: string): { ip: string; port: number } | null {
  const port = /sin6?_port=htons\((\d+)\)/.exec(args); const v4 = /inet_addr\("([^"]+)"\)/.exec(args); const v6 = /inet_pton\(AF_INET6, "([^"]+)"/.exec(args);
  if (!port || !(v4 || v6)) return null; return { ip: (v4 ?? v6)![1]!, port: Number(port[1]) };
}
const isLoopback = (ip: string) => ip.startsWith('127.') || ip === '::1';

/** `null` base means the directory is unknown, so the result is unknown too — never a guess. */
function resolveAgainst(base: string | null, p: string): string | null {
  if (p.startsWith('/')) return posixPath.normalize(p);
  if (base === null) return null;
  return posixPath.normalize(posixPath.join(base, p));
}

export function parseStrace(text: string, ctx: ParseContext): { observations: Observation[]; baselineOpens: number } {
  const calls = parseLines(text);
  const observations: Observation[] = []; let baselineOpens = 0; let seq = 0; let sawInitialExec = false;
  const canaries = ctx.profile.canaries.map((c) => posixPath.normalize(c.path));
  const states = new Map<string, PidState>();
  const stateOf = (pid: string): PidState => {
    let s = states.get(pid);
    if (!s) { s = { cwd: { value: CONTAINER_CWD }, fds: new Map() }; states.set(pid, s); }
    return s;
  };
  const testFor = (ts: number) => ctx.testWindows.find((w) => ts >= w.start && ts < w.end)?.testId ?? 'untracked';
  const push = (c: Call, capability: Observation['capability'], operation: Operation, target: string, permitted: boolean, completed: boolean) => {
    observations.push({ schemaVersion: '1.0', auditId: ctx.auditId, sequence: ++seq, testId: testFor(c.ts), sourceType: 'RUNTIME', capability, operation, target,
      attempted: true, permitted, completed, collectorVersion: COLLECTOR_VERSION, evidenceReference: ctx.evidenceReference, timestamp: Math.floor(c.ts) });
  };
  for (const c of calls) {
    const ok = c.result !== null && c.result >= 0;
    if (c.name === 'clone' || c.name === 'clone3' || c.name === 'fork' || c.name === 'vfork') {
      // The child inherits the parent's cwd and fd table at creation; CLONE_FS / CLONE_FILES keep
      // them shared afterwards, so a thread that chdirs moves its siblings too.
      if (!ok || c.result === null || c.result <= 0) continue;
      const parent = stateOf(c.pid);
      states.set(String(c.result), {
        cwd: /\bCLONE_FS\b/.test(c.args) ? parent.cwd : { value: parent.cwd.value },
        fds: /\bCLONE_FILES\b/.test(c.args) ? parent.fds : new Map(parent.fds),
      });
      continue;
    }
    if (c.name === 'chdir') {
      if (!ok) continue;
      const s = stateOf(c.pid); const p = firstQuoted(c.args);
      s.cwd.value = p === null ? null : resolveAgainst(s.cwd.value, p);
      continue;
    }
    if (c.name === 'fchdir') {
      if (!ok) continue;
      const s = stateOf(c.pid); const m = /^\s*(-?\d+)/.exec(c.args);
      s.cwd.value = m ? s.fds.get(Number(m[1])) ?? null : null;
      continue;
    }
    if (c.name === 'openat' || c.name === 'open') {
      const s = stateOf(c.pid);
      let dirfd = 'AT_FDCWD'; let rest = c.args;
      if (c.name === 'openat') {
        const comma = c.args.indexOf(',');
        dirfd = (comma < 0 ? c.args : c.args.slice(0, comma)).trim();
        rest = comma < 0 ? '' : c.args.slice(comma + 1);
      }
      const path = firstQuoted(rest); if (path === null) continue;
      const write = /O_WRONLY|O_RDWR|O_CREAT|O_TRUNC/.test(flagsAfterQuoted(rest));
      const denied = c.errno === 'EACCES' || c.errno === 'EPERM' || c.errno === 'EROFS';
      const atCwd = dirfd === 'AT_FDCWD' || dirfd === '-100';
      const absolute = path.startsWith('/');
      let resolved: string | null;
      if (absolute) resolved = posixPath.normalize(path);
      else if (atCwd) resolved = resolveAgainst(s.cwd.value, path);
      else resolved = /^-?\d+$/.test(dirfd) ? resolveAgainst(s.fds.get(Number(dirfd)) ?? null, path) : null;
      // Every successful open is remembered: a later openat(fd, "...") may use it as a directory fd,
      // and strace does not say which opens were directories unless O_DIRECTORY was passed.
      if (ok && resolved !== null && c.result !== null) s.fds.set(c.result, resolved);
      // Fail-closed backstop: only a plain absolute AT_FDCWD open may ever be dismissed as baseline
      // noise. A relative path, or any dirfd-relative open, is evidence or it is `unresolved:` —
      // never silently discarded, because discarding it is how a chdir'd credential read gets an ALLOW.
      if (resolved === null) { push(c, 'FILESYSTEM', write ? 'WRITE' : 'READ', `unresolved:${path}`, ok || !denied, ok); continue; }
      const isCanaryOrHome = resolved.startsWith('/home/tool/') || canaries.includes(resolved);
      if (!write && !isCanaryOrHome) { if (absolute && atCwd) baselineOpens++; continue; }
      push(c, 'FILESYSTEM', write ? 'WRITE' : 'READ', resolved, ok || !denied, ok);
      continue;
    }
    if (c.name === 'connect' || c.name === 'sendto') {
      if (c.args.includes('AF_UNIX')) continue;
      const t = inetTarget(c.args); if (!t) continue;
      const permitted = ok || c.errno === 'EINPROGRESS';
      if (isLoopback(t.ip) && t.port === 53) push(c, 'NETWORK', 'DNS', 'unresolved', permitted, ok);
      else if (!isLoopback(t.ip)) push(c, 'NETWORK', 'CONNECT', `${t.ip}:${t.port}`, permitted, ok);
      continue;
    }
    if (c.name === 'execve') {
      if (!sawInitialExec) { sawInitialExec = true; continue; }
      const prog = firstQuoted(c.args) ?? 'unknown';
      push(c, 'PROCESS', 'SPAWN', prog, ok || c.errno !== 'EACCES', ok);
    }
  }
  return { observations, baselineOpens };
}
