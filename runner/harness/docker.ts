import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
export class DependencyUnavailable extends Error {}
export function assertDocker(): void {
  try { execFileSync('docker', ['info'], { stdio: 'ignore' }); } catch { throw new DependencyUnavailable('docker daemon unavailable'); }
}
export function dockerRun(args: string[]): ChildProcess { return spawn('docker', ['run', ...args], { stdio: ['pipe', 'pipe', 'pipe'] }); }
export function dockerKill(name: string): void { try { execFileSync('docker', ['kill', name], { stdio: 'ignore' }); } catch { /* already gone */ } }
/** True when the volume is gone. `-f` succeeds on a missing volume but fails on one still in use. */
export function dockerVolumeRm(volume: string): boolean {
  try { execFileSync('docker', ['volume', 'rm', '-f', volume], { stdio: 'ignore' }); return true; } catch { return false; }
}
/** A tool container's `--rm` teardown can still hold the volume; retry briefly rather than leak it. */
export async function dockerVolumeRmRetry(volume: string, attempts = 5, delayMs = 200): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    if (dockerVolumeRm(volume)) return true;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return dockerVolumeRm(volume);
}
/**
 * Copy the trace out of the tool's root-only volume with a trusted container, after the tool is
 * gone. The shell string is a constant; nothing untrusted is interpolated into it. `head -c` stops
 * one byte past the host-side 64 MiB cap, so a tool that spins syscalls for the whole deadline
 * cannot fill the VM or the host disk - the extra byte still trips the caller's size check.
 * On native Linux the extracted file lands root-owned (the helper runs as root); the harness only
 * reads it, so no chown is needed.
 */
export function dockerExtractTrace(volume: string, hostDir: string, image: string): void {
  try {
    execFileSync('docker', ['run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
      '-v', `${volume}:/obs:ro`, '-v', `${hostDir}:/out`, image, 'sh', '-c', 'head -c 67108865 /obs/trace.log > /out/trace.log'], { stdio: 'ignore' });
  } catch { /* no trace to extract; the caller reports a missing collector */ }
}
