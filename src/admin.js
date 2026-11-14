// Owner-only health numbers and the admin page. Owners are the emails listed in
// the OWNER_EMAILS secret (comma-separated). Everyone else gets "not found".
import { HttpError, json, nowIso } from './http.js';
import { getSession, requireSession } from './session.js';

export function isOwner(env, email) {
  const list = String(env.OWNER_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(String(email).toLowerCase());
}

export async function getHealth(request, env) {
  const { user } = await requireSession(env, request);
  if (!isOwner(env, user.email)) throw new HttpError(404, 'not_found', 'Not found.');
  const DB = env.DB;
  const now = nowIso();
  const today = now.slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const res = await DB.batch([
    DB.prepare('SELECT COUNT(*) AS n FROM users').bind(),
    DB.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM events WHERE server_at >= ?1').bind(today),
    DB.prepare("SELECT COUNT(*) AS n FROM events WHERE server_at >= ?1 AND type IN ('run', 'game')").bind(today),
    DB.prepare('SELECT COUNT(*) AS n FROM events WHERE server_at >= ?1').bind(today),
    DB.prepare("SELECT COALESCE(SUM(CASE WHEN reason = 'busy' THEN 0 ELSE n END), 0) AS rejected, COALESCE(SUM(CASE WHEN reason = 'busy' THEN n ELSE 0 END), 0) AS failed FROM event_rejects WHERE day = ?1").bind(today),
    DB.prepare("SELECT COALESCE(SUM(CASE WHEN reason = 'busy' THEN 0 ELSE n END), 0) AS rejected, COALESCE(SUM(CASE WHEN reason = 'busy' THEN n ELSE 0 END), 0) AS failed FROM event_rejects WHERE day >= ?1").bind(weekAgo),
    DB.prepare('SELECT reason, SUM(n) AS n FROM event_rejects WHERE day >= ?1 GROUP BY reason ORDER BY n DESC').bind(weekAgo),
    DB.prepare('SELECT * FROM rebuild_runs ORDER BY id DESC LIMIT 1').bind(),
    DB.prepare('SELECT COUNT(*) AS n FROM feedback WHERE at >= ?1').bind(weekAgo),
  ]);
  const one = (i) => res[i].results[0] || {};
  const last = res[7].results[0] || null;
  let lastDiffs = [];
  if (last) {
    lastDiffs = (await DB.prepare('SELECT table_name, COUNT(*) AS n FROM rebuild_diffs WHERE run_id = ?1 GROUP BY table_name ORDER BY n DESC').bind(last.id).all()).results;
  }
  return json({
    at: now,
    learners: one(0).n,
    activeToday: one(1).n,
    runsToday: one(2).n,
    eventsToday: one(3).n,
    rejectedToday: one(4).rejected, failedToday: one(4).failed,
    rejected7d: one(5).rejected, failed7d: one(5).failed,
    rejectReasons7d: res[6].results,
    feedback7d: one(8).n,
    lastRebuild: last ? { at: last.started_at, finishedAt: last.finished_at, users: last.users, differences: last.differences, errors: last.errors, byTable: lastDiffs } : null,
  });
}

/** /admin and /admin.html: the page itself, only for owners. */
export async function serveAdminPage(request, env) {
  const notFound = () => new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  if (!env.DB) return notFound();
  let s = null;
  try { s = await getSession(env, request); } catch { s = null; }
  if (!s || !isOwner(env, s.user.email)) return notFound();
  const url = new URL(request.url);
  let res = await env.ASSETS.fetch(new Request(new URL('/admin', url), { headers: request.headers }));
  if (res.status >= 300 && res.status < 400) res = await env.ASSETS.fetch(new Request(new URL('/admin.html', url), { headers: request.headers }));
  const headers = new Headers(res.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Robots-Tag', 'noindex');
  return new Response(res.body, { status: res.status, headers });
}
