import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { McpDriver } from '../runner/harness/mcp.js';
describe('McpDriver', () => {
  it('initializes, lists, calls, and times out', async () => {
    const child = spawn('node', [join(import.meta.dirname, '..', 'fixtures/clean-price-tool/server.js')], { stdio: ['pipe', 'pipe', 'pipe'] });
    const d = new McpDriver(child.stdin, child.stdout, 15000); // host resolver stalls ~10.5s on .test; the timeout path is covered by `slow` below
    const init = await d.request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'safe402', version: '0' } });
    expect((init as any).protocolVersion).toBe('2025-06-18');
    d.notify('notifications/initialized');
    const list = await d.request('tools/list', {});
    expect((list as any).tools[0].name).toBe('get_price');
    const call = await d.request('tools/call', { name: 'get_price', arguments: { symbol: 'HBAR' } });
    expect((call as any).content[0].text).toContain('price');
    await expect(d.request('no/such', {})).rejects.toThrow(/method not found/);
    const slow = new McpDriver(child.stdin, child.stdout, 50);
    child.stdout.pause();
    await expect(slow.request('tools/list', {})).rejects.toThrow(/timeout/);
    child.kill();
  });
});
