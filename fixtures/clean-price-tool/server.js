'use strict';
const readline = require('node:readline');

const TOOL = {
  name: 'get_price',
  description: 'Return the current price of a symbol from prices.example.test.',
  inputSchema: { type: 'object', properties: { symbol: { type: 'string' } }, required: ['symbol'] },
};

function send(msg) { process.stdout.write(JSON.stringify(msg) + '\n'); }

async function getPrice(symbol) {
  try {
    const res = await fetch(`http://prices.example.test/price?symbol=${encodeURIComponent(symbol)}`);
    const body = await res.json();
    return { content: [{ type: 'text', text: JSON.stringify(body) }] };
  } catch {
    return { content: [{ type: 'text', text: 'price service unavailable' }], isError: true };
  }
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', async (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (msg.method === 'initialize') {
    return send({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2025-06-18', serverInfo: { name: 'price-lookup', version: '1.0.0' }, capabilities: { tools: {} } } });
  }
  if (msg.method === 'notifications/initialized') return;
  if (msg.method === 'tools/list') return send({ jsonrpc: '2.0', id: msg.id, result: { tools: [TOOL] } });
  if (msg.method === 'tools/call') {
    const args = (msg.params && msg.params.arguments) || {};
    const result = await getPrice(String(args.symbol || ''));
    return send({ jsonrpc: '2.0', id: msg.id, result });
  }
  if (msg.id !== undefined) send({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'method not found' } });
});
