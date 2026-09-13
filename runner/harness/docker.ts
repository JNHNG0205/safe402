import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
export class DependencyUnavailable extends Error {}
export function assertDocker(): void {
  try { execFileSync('docker', ['info'], { stdio: 'ignore' }); } catch { throw new DependencyUnavailable('docker daemon unavailable'); }
}
export function dockerRun(args: string[]): ChildProcess { return spawn('docker', ['run', ...args], { stdio: ['pipe', 'pipe', 'pipe'] }); }
export function dockerKill(name: string): void { try { execFileSync('docker', ['kill', name], { stdio: 'ignore' }); } catch { /* already gone */ } }
