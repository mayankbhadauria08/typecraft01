// Local test server: runs the Worker's fetch() with the D1 stand-in and serves
// index.html the way Workers static assets would. For tests only.
//   node tests/server.mjs [port]
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import worker from '../src/index.js';
import { D1Shim } from './d1-shim.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function makeEnv(extra = {}) {
  const DB = new D1Shim();
  DB.applyMigrations(path.join(root, 'migrations'));
  const ASSETS = { fetch: async (req) => {
    const p = new URL(req.url).pathname;
    if (p === '/' || p === '/index.html') return new Response(readFileSync(path.join(root, 'index.html')), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    if (p === '/admin') return new Response(readFileSync(path.join(root, 'admin.html')), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    if (p === '/admin.html') return new Response(null, { status: 307, headers: { Location: '/admin' } });
    return new Response('Not found', { status: 404 });
  } };
  return { DB, ASSETS, EMAIL_FROM: '', ...extra };
}

export function startServer(env, port = 8788) {
  const pending = [];
  const ctx = { waitUntil: (p) => pending.push(p) };
  const server = http.createServer(async (req, res) => {
    if (req.url === '/__test/outbox' && globalThis.__outbox) { // test-only: the emails the Worker "sent"
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(globalThis.__outbox)); return;
    }
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (!k.startsWith(':')) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
    if (env.__ip) headers.set('CF-Connecting-IP', env.__ip);
    const request = new Request(`http://localhost:${port}${req.url}`, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
    const response = await worker.fetch(request, env, ctx);
    const out = {};
    response.headers.forEach((v, k) => { if (k !== 'set-cookie') out[k] = v; });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) out['set-cookie'] = cookies;
    res.writeHead(response.status, out);
    res.end(Buffer.from(await response.arrayBuffer()));
  });
  return new Promise((resolve) => server.listen(port, () => resolve({ server, port, pending })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] || 8788);
  const env = makeEnv();
  // optional: capture "sent" emails instead of calling Resend
  if (process.env.CAPTURE_EMAIL) {
    env.RESEND_API_KEY = 'test'; env.EMAIL_FROM = 'TypeCraft <test@example.com>';
    const realFetch = globalThis.fetch;
    globalThis.__outbox = [];
    globalThis.fetch = async (url, init) => {
      if (String(url).startsWith('https://api.resend.com/')) { globalThis.__outbox.push(JSON.parse(init.body)); return new Response('{"id":"x"}', { status: 200 }); }
      return realFetch(url, init);
    };
  }
  await startServer(env, port);
  console.log(`listening on http://localhost:${port}`);
}
