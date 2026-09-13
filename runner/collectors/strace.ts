import type { ExecutionProfile, Observation, Operation } from '../../src/domain/types.js';
export const COLLECTOR_VERSION = 'strace-v1';

export interface ParseContext { auditId: string; profile: ExecutionProfile; evidenceReference: string; testWindows: { testId: string; start: number; end: number }[] }
interface Call { pid: string; ts: number; name: string; args: string; result: number | null; errno: string | null }

const LINE = /^(\d+)\s+(\d+\.\d+)\s+(.*)$/;
const RESUMED = /^<\.\.\. (\w+) resumed>(.*)$/;
const CALL = /^(\w+)\((.*)\)\s*=\s*(-?\d+|\?)(?:\s+(E[A-Z]+))?/s;

function parseLines(text: string): Call[] {
  const pending = new Map<string, { ts: number; body: string }>();
  const calls: Call[] = [];
  for (const raw of text.split('\n')) {
    const m = LINE.exec(raw.trim()); if (!m) continue;
    const [, pid, tsStr, body0] = m; const ts = Number(tsStr);
    let body = body0!;
    if (body.endsWith('<unfinished ...>')) { pending.set(pid!, { ts, body: body.replace(/\s*<unfinished \.\.\.>$/, '') }); continue; }
    const r = RESUMED.exec(body);
    if (r) { const p = pending.get(pid!); if (!p) continue; pending.delete(pid!); body = p.body + r[2]; }
    const c = CALL.exec(body); if (!c) continue;
    calls.push({ pid: pid!, ts, name: c[1]!, args: c[2]!, result: c[3] === '?' ? null : Number(c[3]), errno: c[4] ?? null });
  }
  return calls;
}

function firstQuoted(args: string): string | null { const m = /"((?:[^"\\]|\\.)*)"/.exec(args); return m ? m[1]! : null; }
function inetTarget(args: string): { ip: string; port: number } | null {
  const port = /sin6?_port=htons\((\d+)\)/.exec(args); const v4 = /inet_addr\("([^"]+)"\)/.exec(args); const v6 = /inet_pton\(AF_INET6, "([^"]+)"/.exec(args);
  if (!port || !(v4 || v6)) return null; return { ip: (v4 ?? v6)![1]!, port: Number(port[1]) };
}
const isLoopback = (ip: string) => ip.startsWith('127.') || ip === '::1';

export function parseStrace(text: string, ctx: ParseContext): { observations: Observation[]; baselineOpens: number } {
  const calls = parseLines(text);
  const observations: Observation[] = []; let baselineOpens = 0; let seq = 0; let sawInitialExec = false;
  const testFor = (ts: number) => ctx.testWindows.find((w) => ts >= w.start && ts < w.end)?.testId ?? 'untracked';
  const push = (c: Call, capability: Observation['capability'], operation: Operation, target: string, permitted: boolean, completed: boolean) => {
    observations.push({ schemaVersion: '1.0', auditId: ctx.auditId, sequence: ++seq, testId: testFor(c.ts), sourceType: 'RUNTIME', capability, operation, target,
      attempted: true, permitted, completed, collectorVersion: COLLECTOR_VERSION, evidenceReference: ctx.evidenceReference, timestamp: Math.floor(c.ts) });
  };
  for (const c of calls) {
    const ok = c.result !== null && c.result >= 0;
    if (c.name === 'openat' || c.name === 'open') {
      const path = firstQuoted(c.name === 'openat' ? c.args.replace(/^[^,]*,\s*/, '') : c.args); if (!path) continue;
      const write = /O_WRONLY|O_RDWR|O_CREAT|O_TRUNC/.test(c.args);
      const denied = c.errno === 'EACCES' || c.errno === 'EPERM' || c.errno === 'EROFS';
      if (!write && !path.startsWith('/home/tool')) { baselineOpens++; continue; }
      push(c, 'FILESYSTEM', write ? 'WRITE' : 'READ', path, ok || !denied, ok);
    } else if (c.name === 'connect' || c.name === 'sendto') {
      if (c.args.includes('AF_UNIX')) continue;
      const t = inetTarget(c.args); if (!t) continue;
      const permitted = ok || c.errno === 'EINPROGRESS';
      if (isLoopback(t.ip) && t.port === 53) push(c, 'NETWORK', 'DNS', 'unresolved', permitted, ok);
      else if (!isLoopback(t.ip)) push(c, 'NETWORK', 'CONNECT', `${t.ip}:${t.port}`, permitted, ok);
    } else if (c.name === 'execve') {
      if (!sawInitialExec) { sawInitialExec = true; continue; }
      const prog = firstQuoted(c.args) ?? 'unknown';
      push(c, 'PROCESS', 'SPAWN', prog, ok || c.errno !== 'EACCES', ok);
    }
  }
  return { observations, baselineOpens };
}
