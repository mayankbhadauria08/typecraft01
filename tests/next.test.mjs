// Next-version server tests: the build prompt's seven data checks at API level,
// plus validation, legacy progress and the owner page. node --test tests/next.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, startServer } from './server.mjs';
import { rebuildAll } from '../src/pipeline.js';

let env, srv, base;
before(async () => {
  env = makeEnv({ OWNER_EMAILS: 'Owner@Example.com, other@example.com' });
  srv = await startServer(env, 8796);
  base = `http://localhost:${srv.port}`;
});
after(() => srv.server.close());

const pw = 'correct horse 9';
let ip = 0;
function client() {
  let cookie = null;
  const myIp = `10.9.0.${++ip}`;
  const c = async (method, path, body) => {
    env.__ip = myIp;
    const headers = { Origin: base };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (cookie) headers.Cookie = cookie;
    const res = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    for (const sc of res.headers.getSetCookie()) cookie = /Max-Age=0/.test(sc) ? null : sc.split(';')[0];
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { json = null; }
    return { status: res.status, body: json, text, headers: res.headers };
  };
  return c;
}
async function signup(email) {
  const c = client();
  const r = await c('POST', '/api/auth/signup', { fullName: 'Learner', email, phoneNumber: '+91 98765 43210', password: pw, confirmPassword: pw });
  assert.equal(r.status, 201);
  c.user = r.body.user;
  return c;
}
async function signin(email) {
  const c = client();
  assert.equal((await c('POST', '/api/auth/login', { email, password: pw })).status, 200);
  return c;
}
let n = 0;
const id = () => `ev-${Date.now().toString(36)}-${++n}`;
const today = new Date().toISOString().slice(0, 10);
const at = (minAgo = 0) => new Date(Date.now() - minAgo * 60000).toISOString();
const step = (lessonId, s, kind, extra = {}) => ({ id: id(), type: 'step', lessonId, step: s, kind, wpm: 24, accuracy: 96, errors: 2, seconds: 45, at: at(), tz: 0, ...extra });
const run = (lessonId, extra = {}) => ({ id: id(), type: 'run', lessonId, wpm: 30, accuracy: 97, errors: 3, seconds: 240, at: at(), tz: 0, ...extra });
const send = (c, events) => c('POST', '/api/user/events', { events, today });
const stateOf = async (c) => { const r = await c('GET', `/api/user/state?today=${today}`); assert.equal(r.status, 200); const { serverTime, ...rest } = r.body; return rest; };
const scorecard = async (c, lesson) => (await c('GET', `/api/user/lessons/${lesson}`)).body;

/* 1 */
test('check 1: two steps of lesson 3 in one browser; a second browser continues at step 3 with the same scorecard', async () => {
  const a = await signup('resume@example.com');
  assert.equal((await a('PUT', '/api/user/position', { lessonId: 'l3', step: 0 })).status, 200);
  const r = await send(a, [step('l3', 0, 'watch', { wpm: 0, accuracy: 0, seconds: 5 }), step('l3', 1, 'character')]);
  assert.equal(r.status, 200);
  assert.equal(r.body.sync.accepted.length, 2);
  assert.equal((await a('PUT', '/api/user/position', { lessonId: 'l3', step: 2 })).status, 200);

  const b = await signin('resume@example.com');
  const sb = await stateOf(b);
  assert.deepEqual({ lessonId: sb.position.lessonId, step: sb.position.step }, { lessonId: 'l3', step: 2 }); // step index 2 = "Step 3 of 5"
  assert.equal(sb.lessons.l3.status, 'in_progress');
  assert.equal(sb.lessons.l3.step, 2);
  assert.deepEqual(await scorecard(b, 'l3'), await scorecard(a, 'l3'));
  assert.deepEqual(sb, await stateOf(a));
  assert.equal(sb.xp, 10); // one scored step (Watch is not scored)
});

/* 2 */
test('check 2: offline, finish a lesson, come back online: exactly one run is saved', async () => {
  const a = await signup('offline@example.com');
  // queued while offline (device times in the past), sent in order when the connection returns
  const queue = [step('l1', 0, 'watch', { wpm: 0, accuracy: 0, at: at(30) }), step('l1', 1, 'character', { at: at(29) }), step('l1', 2, 'mixed', { at: at(27) }),
    step('l1', 3, 'challenge', { at: at(26) }), run('l1', { at: at(26), wpm: 18, accuracy: 99, crown: true, data: { challenge: { wpm: 18, accuracy: 99 } } })];
  const first = await send(a, queue);
  assert.equal(first.body.sync.accepted.length, 5);
  // the answer was lost on the way back, so the browser sends the queue again
  const again = await send(a, queue);
  assert.deepEqual(again.body.sync.accepted, []);
  assert.equal(again.body.sync.duplicates.length, 5);
  const card = await scorecard(a, 'l1');
  assert.equal(card.runs.length, 1);
  assert.equal(card.lesson.attempts, 1);
  assert.equal(card.lesson.stars, 3);
  assert.equal(card.lesson.crown, true);
  assert.equal(again.body.totals.runs, 1);
  const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE user_id = ?1 AND type = 'run'").bind(a.user.id).first();
  assert.equal(n.n, 1);
});

/* 3 */
test('check 3: the same batch of events sent twice changes no total', async () => {
  const a = await signup('twice@example.com');
  const batch = [step('l2', 1, 'character'), run('l2', { accuracy: 100, wpm: 26 }), { id: id(), type: 'game', gameId: 'storm', score: 1500, xp: 35, seconds: 90, at: at() },
    { id: id(), type: 'quest', data: { action: 'drill' }, at: at() }, { id: id(), type: 'placement', wpm: 28, accuracy: 93, seconds: 120, at: at() }];
  const r1 = await send(a, batch);
  assert.equal(r1.body.sync.accepted.length, 5);
  const s1 = await stateOf(a);
  const r2 = await send(a, batch);
  assert.equal(r2.body.sync.duplicates.length, 5);
  assert.deepEqual(await stateOf(a), s1);
  assert.deepEqual(r2.body.awarded, { xp: 0, badges: [], quests: [], certificates: [], unlocks: [], rankUp: null });
  assert.equal(s1.placement.level, 3);
  assert.equal(s1.games.storm.best, 1500);
  assert.ok(s1.badges.some((b) => b.id === 'storm_1000'));
  assert.ok(s1.badges.some((b) => b.id === 'clean_sheet'));
});

/* 4 */
test('check 4: two browsers at the same time: nothing is lost and the best result wins', async () => {
  await signup('twodevices@example.com');
  const a = await signin('twodevices@example.com');
  const b = await signin('twodevices@example.com');
  const runsA = [32, 35, 31, 40, 33].map((w) => [run('l4', { wpm: w, accuracy: 93 })]);
  const runsB = [28, 45, 30, 29, 27].map((w) => [run('l4', { wpm: w, accuracy: 99 })]);
  const results = await Promise.all([...runsA.map((x) => send(a, x)), ...runsB.map((x) => send(b, x))]);
  for (const r of results) assert.equal(r.status, 200, JSON.stringify(r.body));
  const s = await stateOf(a);
  assert.equal(s.lessons.l4.attempts, 10);
  assert.equal(s.lessons.l4.bestWpm, 45);
  assert.equal(s.lessons.l4.bestAccuracy, 99);
  assert.equal(s.lessons.l4.stars, 3);
  assert.equal(s.totals.runs, 10);
  assert.deepEqual(await stateOf(b), s);
  // position: the most recent by server time
  await a('PUT', '/api/user/position', { lessonId: 'l5', step: 1 });
  await b('PUT', '/api/user/position', { lessonId: 'l6', step: 3 });
  assert.equal((await stateOf(a)).position.lessonId, 'l6');
});

/* 5 */
test('check 5: a guest with progress signs up: every star and best speed arrives once', async () => {
  const a = await signup('guest@example.com');
  const guest = { importId: 'guest-0123456789abcdef', progress: { l1: { stars: 2, bestWpm: 25, bestAcc: 95 }, l7: { stars: 3, bestWpm: 31, bestAcc: 99 }, l2: { stars: 0, bestWpm: 5, bestAcc: 50 }, bogus: { stars: 3 } },
    state: { keyStats: { f: { attempts: 40, errors: 2 } }, streak: { lastDate: today, count: 2 } } };
  const r = await a('POST', '/api/user/import', guest);
  assert.equal(r.status, 200);
  assert.equal(r.body.imported, true);
  assert.equal(r.body.lessonsImported, 3);
  const s1 = await stateOf(a);
  assert.equal(s1.lessons.l1.stars, 2); assert.equal(s1.lessons.l1.bestWpm, 25);
  assert.equal(s1.lessons.l7.stars, 3); assert.equal(s1.lessons.l7.bestAccuracy, 99);
  assert.equal(s1.lessons.l2.status, 'in_progress');
  assert.equal(s1.lessons.l1.attempts, 0);
  assert.equal(s1.totals.stars, 5);
  assert.equal(s1.xp, 100); // 20 per star earned for the first time
  assert.equal(s1.streak.count, 2);
  assert.equal(s1.stats.keyStats.f.attempts, 40);
  // the same import again, and again through today's route: nothing changes
  assert.equal((await a('POST', '/api/user/import', guest)).body.imported, false);
  await a('POST', '/api/user/progress/import', guest);
  assert.deepEqual(await stateOf(a), s1);
  // a later snapshot of the same browser (new id): the better result per lesson, still no double XP
  await a('POST', '/api/user/import', { ...guest, importId: 'guest-fedcba9876543210', progress: { l1: { stars: 3, bestWpm: 22, bestAcc: 98 } } });
  const s2 = await stateOf(a);
  assert.equal(s2.lessons.l1.stars, 3); assert.equal(s2.lessons.l1.bestWpm, 25); assert.equal(s2.xp, 120);
});

test("today's lesson-complete route and the new events never count a run twice", async () => {
  const a = await signup('oldroute@example.com');
  const eventId = 'evt-legacy-000001';
  const body = { lessonId: 'l8', eventId, stars: 2, wpm: 33, accuracy: 94, errors: 4, seconds: 70 };
  assert.equal((await a('POST', '/api/user/progress/lesson-complete', body)).status, 200);
  assert.equal((await a('POST', '/api/user/progress/lesson-complete', body)).body.duplicate, true);
  const r = await send(a, [{ id: eventId, type: 'run', lessonId: 'l8', wpm: 33, accuracy: 94, errors: 4, seconds: 70, at: at() }]);
  assert.deepEqual(r.body.sync.duplicates, [eventId]);
  assert.equal(r.body.lessons.l8.attempts, 1);
  // a new-app run of an old lesson also shows in the old route's numbers
  await send(a, [run('l8', { wpm: 41, accuracy: 99 })]);
  const old = (await a('GET', '/api/user/progress')).body.lessons.l8;
  assert.equal(old.attempts, 2); assert.equal(old.bestWpm, 41); assert.equal(old.stars, 3);
});

test('progress saved before this version is carried over the first time the learner is seen', async () => {
  const a = await signup('legacy@example.com');
  const u = a.user.id;
  const t = '2026-10-10T08:00:00.000Z';
  // what today's server stores, written directly (as if before the upgrade)
  await env.DB.batch([
    env.DB.prepare("INSERT INTO user_learning_progress (id, user_id, lesson_id, lesson_status, completion_percentage, current_stage, stars, best_wpm, best_accuracy, attempts, created_at, updated_at, completed_at) VALUES ('p1', ?1, 'l1', 'completed', 100, 0, 3, 28, 98, 2, ?2, ?2, ?2)").bind(u, t),
    env.DB.prepare("INSERT INTO user_learning_progress (id, user_id, lesson_id, lesson_status, completion_percentage, current_stage, stars, best_wpm, best_accuracy, attempts, created_at, updated_at, completed_at) VALUES ('p2', ?1, 'l2', 'completed', 100, 0, 1, 15, 85, 0, ?2, ?2, ?2)").bind(u, t),
    env.DB.prepare("INSERT INTO user_activity (id, user_id, activity_type, lesson_id, activity_data, client_event_id, created_at) VALUES ('a1', ?1, 'lesson_completed', 'l1', '{\"stars\":2,\"wpm\":24,\"accuracy\":95,\"errors\":3,\"seconds\":60}', 'old-run-0001', '2026-10-09T08:00:00.000Z')").bind(u),
    env.DB.prepare("INSERT INTO user_activity (id, user_id, activity_type, lesson_id, activity_data, client_event_id, created_at) VALUES ('a2', ?1, 'lesson_completed', 'l1', '{\"stars\":3,\"wpm\":28,\"accuracy\":98,\"errors\":1,\"seconds\":55}', 'old-run-0002', ?2)").bind(u, t),
    env.DB.prepare("INSERT INTO user_state (user_id, key, value, updated_at) VALUES (?1, 'streak', ?2, ?3)").bind(u, JSON.stringify({ lastDate: today, count: 4 }), t),
    env.DB.prepare("INSERT INTO user_state (user_id, key, value, updated_at) VALUES (?1, 'keyStats', ?2, ?3)").bind(u, JSON.stringify({ j: { attempts: 9, errors: 1 } }), t),
    env.DB.prepare("INSERT INTO user_state (user_id, key, value, updated_at) VALUES (?1, 'position', ?2, ?3)").bind(u, JSON.stringify({ lessonId: 'l3', stage: 1 }), t),
  ]);
  const s = await stateOf(a);
  assert.equal(s.lessons.l1.stars, 3); assert.equal(s.lessons.l1.bestWpm, 28); assert.equal(s.lessons.l1.attempts, 2);
  assert.equal(s.lessons.l2.stars, 1); assert.equal(s.lessons.l2.status, 'completed');
  assert.equal(s.streak.count, 4);
  assert.equal(s.stats.keyStats.j.attempts, 9);
  assert.equal(s.position.lessonId, 'l3');
  // an old run sent again through today's route is not counted twice
  await a('POST', '/api/user/progress/lesson-complete', { lessonId: 'l1', eventId: 'old-run-0002', stars: 3, wpm: 28, accuracy: 98, errors: 1, seconds: 55 });
  assert.equal((await stateOf(a)).lessons.l1.attempts, 2);
});

test('every number is checked: bad events are refused and counted, the rest are saved', async () => {
  const a = await signup('checks@example.com');
  const good = run('l5');
  const r = await send(a, [
    good,
    run('l5', { wpm: 401 }), run('l5', { accuracy: 101 }), run('l5', { seconds: -1 }), run('l5', { seconds: 99999 }), run('nope'),
    { id: id(), type: 'game', gameId: 'pacman', score: 1 }, { id: id(), type: 'game', gameId: 'storm', score: 1, xp: 51 },
    { id: 'x', type: 'run', lessonId: 'l1', wpm: 1, accuracy: 1, seconds: 1 }, { id: id(), type: 'hack' }, run('l5', { wpm: 'fast' }),
    run('l5', { at: '2099-01-01T00:00:00Z' }), run('l5', { stars: 4 }),
  ]);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.sync.accepted, [good.id]);
  assert.equal(r.body.sync.rejected.length, 12);
  // claimed stars are never more than the accuracy allows
  const r2 = await send(a, [run('l6', { accuracy: 85, stars: 3, crown: true })]);
  assert.equal(r2.body.lessons.l6.stars, 1); assert.equal(r2.body.lessons.l6.crown, false);
  assert.equal((await a('POST', '/api/user/events', { events: Array.from({ length: 101 }, () => run('l1')) })).status, 400);
  const rej = await env.DB.prepare('SELECT SUM(n) AS n FROM event_rejects WHERE user_id = ?1').bind(a.user.id).first();
  assert.equal(rej.n, 12);
});

test('stats batches merge once; settings check what is unlocked; history and export', async () => {
  const a = await signup('stats@example.com');
  const batch = { id: 'stats-batch-0001', keyStats: { a: { attempts: 10, errors: 1 } }, bigramLatency: { 'a>s': { count: 2, totalMs: 300 } }, errorClasses: { adjacent: 1 } };
  assert.equal((await a('POST', '/api/user/stats', batch)).body.saved, true);
  assert.equal((await a('POST', '/api/user/stats', batch)).body.saved, false);
  await a('POST', '/api/user/stats', { ...batch, id: 'stats-batch-0002' });
  const s = await stateOf(a);
  assert.deepEqual(s.stats.keyStats.a, { attempts: 20, errors: 2 });
  assert.deepEqual(s.stats.bigramLatency['a>s'], { count: 4, totalMs: 600 });
  assert.equal(s.stats.errorClasses.adjacent, 2);
  assert.equal((await a('PUT', '/api/user/settings', { keycaps: 'ivory' })).status, 400);
  assert.equal((await a('PUT', '/api/user/settings', { bg: 'disco' })).status, 400);
  const ok = await a('PUT', '/api/user/settings', { bg: 'ocean', effects: 'light', dailyGoal: 20 });
  assert.equal(ok.body.settings.bg, 'ocean');
  await a('PUT', '/api/user/settings', { fingerGuide: false });
  const st = await stateOf(a);
  assert.equal(st.settings.bg, 'ocean'); assert.equal(st.settings.fingerGuide, false); assert.equal(st.today.goal, 20);
  await send(a, [run('l1')]);
  const h = await a('GET', `/api/user/history?today=${today}`);
  assert.equal(h.body.days.length, 1); assert.equal(h.body.days[0].runs, 1);
  const ex = await a('GET', '/api/user/export');
  assert.match(ex.headers.get('content-disposition'), /attachment; filename="typecraft-export-/);
  assert.equal(ex.body.events.length, 1);
  assert.equal(ex.body.user_settings.length, 1);
  assert.ok(!JSON.stringify(ex.body).includes('password'));
});

test('owner health page and numbers are for owners only', async () => {
  const learner = await signup('notowner@example.com');
  assert.equal((await learner('GET', '/api/admin/health')).status, 404);
  assert.equal((await learner('GET', '/admin')).status, 404);
  assert.equal((await client()('GET', '/admin.html')).status, 404);
  const owner = await signup('owner@example.com');
  const h = await owner('GET', '/api/admin/health');
  assert.equal(h.status, 200);
  assert.ok(h.body.learners >= 2);
  assert.ok(h.body.runsToday >= 1);
  assert.ok(h.body.rejectedToday >= 12);
  const page = await owner('GET', '/admin');
  assert.equal(page.status, 200);
  assert.match(page.text, /How the saving is going/);
  assert.equal((await owner('GET', '/admin.html')).status, 200);
});

/* 6 */
test('check 6: the nightly rebuild finds zero differences; a damaged total is found, fixed and logged', async () => {
  const clean = await rebuildAll(env);
  assert.equal(clean.errors, 0);
  assert.equal(clean.differences, 0, JSON.stringify((await env.DB.prepare('SELECT * FROM rebuild_diffs WHERE run_id = ?1').bind(clean.runId).all()).results));
  await env.DB.prepare("UPDATE lesson_scores SET attempts = attempts + 5 WHERE lesson_id = 'l4'").run();
  await env.DB.prepare('UPDATE user_totals SET xp = xp + 1').run();
  const dirty = await rebuildAll(env);
  assert.ok(dirty.differences >= 2);
  const logged = await env.DB.prepare('SELECT COUNT(*) AS n FROM rebuild_diffs WHERE run_id = ?1').bind(dirty.runId).first();
  assert.equal(logged.n, dirty.differences);
  assert.equal((await rebuildAll(env)).differences, 0);
  const b = await signin('twodevices@example.com');
  assert.equal((await stateOf(b)).lessons.l4.attempts, 10);
});

/* 7 */
test('check 7: deleting the account leaves no row for that user in any table', async () => {
  const a = await signup('gone@example.com');
  await send(a, [step('l3', 1, 'character'), run('l3', { accuracy: 100 }), { id: id(), type: 'game', gameId: 'ghost', score: 50, xp: 10, ghost: { key: 'p60', replay: [1, 2, 3] }, at: at() },
    { id: id(), type: 'feedback', data: { text: 'Lovely', rating: 5 }, at: at() }, run('l99')]);
  await a('PUT', '/api/user/position', { lessonId: 'l3', step: 2 });
  await a('POST', '/api/user/stats', { id: 'stats-gone-0001', keyStats: { a: { attempts: 1, errors: 0 } } });
  await a('PUT', '/api/user/settings', { bg: 'neon' });
  await a('POST', '/api/user/import', { importId: 'guest-gone-00000001', progress: { l1: { stars: 1, bestWpm: 9, bestAcc: 81 } } });
  await rebuildAll(env);
  await env.DB.prepare("INSERT INTO rebuild_diffs (run_id, user_id, table_name, row_key, at) VALUES (0, ?1, 'x', 'y', 'z')").bind(a.user.id).run();
  assert.equal((await a('GET', `/api/user/ghosts/p60`)).body.ghost.replay.length, 3);
  assert.equal((await a('POST', '/api/user/delete', { password: pw })).status, 200);
  const tables = (await env.DB.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()).results.map((r) => r.name);
  let checked = 0;
  for (const t of tables) {
    const cols = (await env.DB.prepare(`PRAGMA table_info(${t})`).all()).results.map((c) => c.name);
    const col = t === 'users' ? 'id' : cols.includes('user_id') ? 'user_id' : null;
    if (!col) continue;
    checked++;
    const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE ${col} = ?1`).bind(a.user.id).first();
    assert.equal(r.n, 0, t);
  }
  assert.ok(checked >= 30);
});

test('the migrations can be run twice without harm', async () => {
  const { D1Shim } = await import('./d1-shim.mjs');
  const db = new D1Shim();
  const dir = new URL('../migrations', import.meta.url).pathname;
  db.applyMigrations(dir);
  db.applyMigrations(dir);
  assert.ok(await db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'events'").first());
});

test('reset: needs RESET; clears progress, keeps the account', async () => {
  const a = await signup('reset@example.com');
  await send(a, [run('l1')]);
  assert.ok((await stateOf(a)).xp > 0);
  assert.equal((await a('POST', '/api/user/reset', { confirm: 'reset' })).status, 400);
  const r = await a('POST', '/api/user/reset', { confirm: 'RESET', today });
  assert.equal(r.status, 200);
  assert.equal(r.body.xp, 0);
  assert.notEqual(r.body.lessons.l1 && r.body.lessons.l1.status, 'completed');
  const b = await signin('reset@example.com');
  assert.equal((await stateOf(b)).xp, 0);
});
