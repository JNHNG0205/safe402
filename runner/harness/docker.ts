import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
export class DependencyUnavailable extends Error {}
export function assertDocker(): void {
  try { execFileSync('docker', ['info'], { stdio: 'ignore' }); } catch { throw new DependencyUnavailable('docker daemon unavailable'); }
}
export function dockerRun(args: string[]): ChildProcess { return spawn('docker', ['run', ...args], { stdio: ['pipe', 'pipe', 'pipe'] }); }
export function dockerKill(name: string): void { try { execFileSync('docker', ['kill', name], { stdio: 'ignore' }); } catch { /* already gone */ } }
export function dockerVolumeRm(volume: string): void { try { execFileSync('docker', ['volume', 'rm', '-f', volume], { stdio: 'ignore' }); } catch { /* already gone */ } }
/**
 * Copy the trace out of the tool's root-only volume with a trusted container, after the tool is
 * gone. The shell string is a constant; nothing untrusted is interpolated into it.
 */
export function dockerExtractTrace(volume: string, hostDir: string, image: string): void {
  try {
    execFileSync('docker', ['run', '--rm', '-v', `${volume}:/obs:ro`, '-v', `${hostDir}:/out`, image, 'sh', '-c', 'cat /obs/trace.log > /out/trace.log'], { stdio: 'ignore' });
  } catch { /* no trace to extract; the caller reports a missing collector */ }
}
