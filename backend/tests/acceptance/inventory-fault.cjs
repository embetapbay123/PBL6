// Test-only proxy: every successful response comes from real M1. No fabricated stock ledger.
const http = require('node:http');
const { createHash, timingSafeEqual } = require('node:crypto');
const key = process.env.ACCEPTANCE_CONTROL_KEY || '';
if (process.env.PBL6_ACCEPTANCE_ISOLATED !== '1' || !/^pbl6-acceptance-[a-f0-9]{12}$/.test(process.env.ACCEPTANCE_RUN_ID || '') || key.length < 32) {
  throw new Error('ACCEPTANCE_ISOLATION_REQUIRED');
}
const commands = new Set(['/internal/inventory/reserve', '/internal/inventory/consume',
  '/internal/inventory/release', '/internal/inventory/restock']);
let fault = null;
const calls = [];
function allowed(request) {
  const candidate = Buffer.from(String(request.headers['x-acceptance-key'] || ''));
  const expected = Buffer.from(key);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
function json(response, status, value) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(value));
}
http.createServer(async (request, response) => {
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 1024 * 1024) { json(response, 413, {}); return; }
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks);
    if (request.url === '/__control') {
      if (!allowed(request)) { json(response, 403, {}); return; }
      if (request.method === 'POST') {
        const input = JSON.parse(raw.toString());
        if (input.fault && (!commands.has(input.fault.path) || !['reject', 'lose-ack'].includes(input.fault.mode))) {
          json(response, 422, {}); return;
        }
        fault = input.fault;
      }
      json(response, 200, { calls }); return;
    }
    const body = raw.length ? JSON.parse(raw.toString()) : {};
    const record = commands.has(request.url) ? {
      path: request.url, operation_id: body.operation_id,
      payload_sha256: createHash('sha256').update(raw).digest('hex'),
      correlation_id: request.headers['x-correlation-id'], outcome: 'FORWARDED',
    } : null;
    if (record) calls.push(record);
    const match = fault && fault.path === request.url && (!fault.order_id || fault.order_id === body.order_id);
    if (match && fault.mode === 'reject') {
      record.outcome = 'REJECTED';
      json(response, 503, { code: 'ACCEPTANCE_FAULT', message: 'Controlled inventory outage', details: [] }); return;
    }
    const headers = { ...request.headers, host: 'm1:3101' };
    delete headers['x-acceptance-key'];
    const upstream = http.request({ hostname: 'm1', port: 3101, method: request.method,
      path: request.url, headers, timeout: 5000 }, incoming => {
      const parts = [];
      incoming.on('data', chunk => parts.push(chunk));
      incoming.on('end', () => {
        if (match && fault?.mode === 'lose-ack' && incoming.statusCode < 300) {
          record.outcome = 'REAL_EFFECT_ACK_LOST';
          fault = { ...fault, mode: 'reject' }; // Hold retries until the assertion observes recovery.
          response.destroy(); return;
        }
        if (record) record.status = incoming.statusCode;
        response.writeHead(incoming.statusCode, incoming.headers);
        response.end(Buffer.concat(parts));
      });
    });
    upstream.on('timeout', () => upstream.destroy());
    upstream.on('error', () => { if (!response.destroyed) json(response, 503, { code: 'UPSTREAM_UNAVAILABLE' }); });
    upstream.end(raw);
  } catch { if (!response.destroyed) json(response, 500, { code: 'ACCEPTANCE_PROXY_ERROR' }); }
}).listen(3111, '0.0.0.0');
