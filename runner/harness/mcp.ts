import { StringDecoder } from 'node:string_decoder';
import type { Readable, Writable } from 'node:stream';

const MAX_BUFFER_BYTES = 1024 * 1024;
export class McpError extends Error {}
export class McpDriver {
  private nextId = 1; private buf = '';
  private readonly decoder = new StringDecoder('utf8');
  /** Set when the tool flooded stdout past the 1 MiB cap and buffered bytes were dropped. */
  public truncated = false;
  private waiters = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>();
  constructor(private readonly input: Writable, output: Readable, private readonly timeoutMs: number) {
    output.on('data', (chunk: Buffer) => { this.append(this.decoder.write(chunk)); this.drain(); });
  }
  private append(text: string) {
    if (this.buf.length + text.length <= MAX_BUFFER_BYTES) { this.buf += text; return; }
    // Drop the unparsable backlog rather than growing without bound; keep the newest bytes so a
    // well-formed line arriving after the flood can still be matched to a waiter.
    this.truncated = true;
    this.buf = text.length <= MAX_BUFFER_BYTES ? text : text.slice(text.length - MAX_BUFFER_BYTES);
  }
  private drain() {
    let idx: number;
    while ((idx = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, idx).trim(); this.buf = this.buf.slice(idx + 1);
      if (!line) continue;
      let msg: any; try { msg = JSON.parse(line); } catch { continue; }
      const w = typeof msg.id === 'number' ? this.waiters.get(msg.id) : undefined; if (!w) continue;
      this.waiters.delete(msg.id); clearTimeout(w.timer);
      if (msg.error) w.reject(new McpError(`${msg.error.code}: ${msg.error.message}`)); else w.resolve(msg.result);
    }
  }
  request(method: string, params: unknown): Promise<unknown> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.waiters.delete(id); reject(new McpError(`timeout waiting for ${method}`)); }, this.timeoutMs);
      this.waiters.set(id, { resolve, reject, timer });
      this.input.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  }
  notify(method: string, params: unknown = {}) { this.input.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n'); }
  failAll(reason: string) { for (const [id, w] of this.waiters) { clearTimeout(w.timer); w.reject(new McpError(reason)); this.waiters.delete(id); } }
}
