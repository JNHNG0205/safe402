import { spawn } from 'node:child_process';
import { PassThrough } from 'node:stream';
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
  it('caps the output buffer and keeps working after a flood', async () => {
    const input = new PassThrough(); const output = new PassThrough();
    const d = new McpDriver(input, output, 2000);
    const pending = d.request('tools/list', {});
    output.write('x'.repeat(2 * 1024 * 1024)); // a 2 MiB line that will never terminate
    await new Promise((r) => setImmediate(r));
    expect(d.truncated).toBe(true);
    output.write(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { tools: [] } }) + '\n');
    await expect(pending).resolves.toEqual({ tools: [] });
  });
});
