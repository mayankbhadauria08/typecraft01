// API tests: node --test tests/
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeEnv, startServer } from './server.mjs';

let env, srv, base, outbox;
const realFetch = globalThis.fetch;
before(async () => {
  env = makeEnv({ RESEND_API_KEY: 'test-key', EMAIL_FROM: 'TypeCraft <no-reply@example.com>' });
  outbox = [];
  // capture emails instead of sending them; everything else is a real HTTP call to the Worker
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('https://api.resend.com/')) { outbox.push(JSON.parse(init.body)); return new Response('{"id":"1"}'); }
    return realFetch(url, init);
  };
  srv = await startServer(env, 8790);
  base = `http://localhost:${srv.port}`;
});
after(() => { srv.server.close(); globalThis.fetch = realFetch; });

/** A browser stand-in: keeps its own cookie, sends JSON with the site's Origin. */
function client(ip = '10.0.0.1') {
  let cookie = null;
  const c = async (method, path, body, extraHeaders = {}) => {
    env.__ip = ip;
    const headers = { Origin: base, ...extraHeaders };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (cookie) headers.Cookie = cookie;
    const res = await realFetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    for (const sc of res.headers.getSetCookie()) {
      const [pair] = sc.split(';');
      cookie = /Max-Age=0/.test(sc) ? null : pair;
    }
    return { status: res.status, body: await res.json(), setCookie: res.headers.getSetCookie() };
  };
  c.cookie = () => cookie;
  c.setCookie = (v) => { cookie = v; };
  return c;
}
const pw = 'correct horse 9';
const signupBody = (email, extra = {}) => ({ fullName: 'Test User', email, phoneNumber: '+91 98765 43210', password: pw, confirmPassword: pw, ...extra });
let evt = 0; const eventId = () => `evt-${Date.now()}-${++evt}`;
async function complete(c, lessonId, stars = 3, extra = {}) {
  return c('POST', '/api/user/progress/lesson-complete', { lessonId, eventId: eventId(), stars, wpm: 40, accuracy: 97, errors: 2, seconds: 60, ...extra });
}
const lastLink = (kind) => { const m = outbox[outbox.length - 1].text.match(new RegExp(`#${kind}=([\\w-]+)`)); return m && m[1]; };

/* ---------------- authentication ---------------- */
test('signup creates an account and signs you in', async () => {
  const a = client();
  const r = await a('POST', '/api/auth/signup', signupBody('Alice@Example.com'));
  assert.equal(r.status, 201);
  assert.equal(r.body.user.email, 'alice@example.com');
  assert.match(r.setCookie[0], /^__Host-tc_session=[\w-]{40,};.*HttpOnly; Secure; SameSite=Lax; Max-Age=2592000/);
  const me = await a('GET', '/api/auth/me');
  assert.equal(me.body.user.email, 'alice@example.com');
  assert.equal(r.body.verificationSent, true);
});

test('passwords and session tokens are never stored in plain text', async () => {
  const a = client();
  await a('POST', '/api/auth/signup', signupBody('plain@example.com'));
  const row = await env.DB.prepare('SELECT password_hash FROM users WHERE email = ?1').bind('plain@example.com').first();
  assert.match(row.password_hash, /^pbkdf2_sha256\$100000\$/);
  assert.ok(!row.password_hash.includes(pw));
  const token = a.cookie().split('=')[1];
  const sessions = await env.DB.prepare('SELECT id FROM sessions').all();
  assert.ok(sessions.results.every((s) => s.id !== token && /^[0-9a-f]{64}$/.test(s.id)));
});

test('signup validates input on the server', async () => {
  const r = await client()('POST', '/api/auth/signup', { fullName: '', email: 'nope', phoneNumber: '12', password: 'short', confirmPassword: 'other' });
  assert.equal(r.status, 400);
  assert.deepEqual(Object.keys(r.body.error.fields).sort(), ['confirmPassword', 'email', 'fullName', 'password', 'phoneNumber']);
});

test('duplicate email is refused (case-insensitive)', async () => {
  const r = await client()('POST', '/api/auth/signup', signupBody('ALICE@example.com'));
  assert.equal(r.status, 400);
  assert.match(r.body.error.fields.email, /already exists/);
});

test('login: right password works, wrong password and unknown email give the same message', async () => {
  const a = client('10.0.0.2');
  assert.equal((await a('POST', '/api/auth/login', { email: 'alice@example.com', password: pw })).status, 200);
  const wrong = await client('10.0.0.2')('POST', '/api/auth/login', { email: 'alice@example.com', password: 'wrong pass 1' });
  const unknown = await client('10.0.0.2')('POST', '/api/auth/login', { email: 'nobody@example.com', password: 'wrong pass 1' });
  assert.equal(wrong.status, 401); assert.equal(unknown.status, 401);
  assert.equal(wrong.body.error.message, unknown.body.error.message);
});

test('repeated wrong passwords are rate limited', async () => {
  const c = client('10.0.0.3');
  await c('POST', '/api/auth/signup', signupBody('limit@example.com'));
  let last;
  for (let i = 0; i < 9; i++) last = await client('10.0.0.3')('POST', '/api/auth/login', { email: 'limit@example.com', password: 'bad pass 1' });
  assert.equal(last.status, 429);
  // even the right password is refused until the window passes
  assert.equal((await client('10.0.0.3')('POST', '/api/auth/login', { email: 'limit@example.com', password: pw })).status, 429);
});

test('"remember me" off gives a browser-session cookie', async () => {
  const r = await client('10.0.0.4')('POST', '/api/auth/login', { email: 'alice@example.com', password: pw, remember: false });
  assert.equal(r.status, 200);
  assert.ok(!/Max-Age/.test(r.setCookie[0]));
});

test('logout ends the session on the server, not just the cookie', async () => {
  const a = client('10.0.0.5');
  await a('POST', '/api/auth/login', { email: 'alice@example.com', password: pw });
  const stolen = a.cookie();
  const out = await a('POST', '/api/auth/logout', {});
  assert.match(out.setCookie[0], /Max-Age=0/);
  const replay = client(); replay.setCookie(stolen);
  assert.equal((await replay('GET', '/api/auth/me')).body.user, null);
  assert.equal((await replay('GET', '/api/user/progress')).status, 401);
});

test('expired sessions are refused', async () => {
  const a = client('10.0.0.6');
  await a('POST', '/api/auth/login', { email: 'alice@example.com', password: pw });
  await env.DB.prepare("UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000Z'").run();
  assert.equal((await a('GET', '/api/user/profile')).status, 401);
});

test('session persists across "refreshes" (new requests with the same cookie)', async () => {
  const a = client('10.0.0.7');
  await a('POST', '/api/auth/login', { email: 'alice@example.com', password: pw });
  for (let i = 0; i < 3; i++) assert.equal((await a('GET', '/api/auth/me')).body.user.email, 'alice@example.com');
});

test('change password: needs the current one, signs out other devices, keeps this one', async () => {
  const laptop = client('10.0.1.1'), other = client('10.0.1.2');
  await laptop('POST', '/api/auth/signup', signupBody('changer@example.com'));
  await other('POST', '/api/auth/login', { email: 'changer@example.com', password: pw });
  const bad = await laptop('POST', '/api/auth/change-password', { currentPassword: 'nope nope 1', newPassword: 'new pass 123', confirmPassword: 'new pass 123' });
  assert.equal(bad.status, 400); assert.ok(bad.body.error.fields.currentPassword);
  const ok = await laptop('POST', '/api/auth/change-password', { currentPassword: pw, newPassword: 'new pass 123', confirmPassword: 'new pass 123' });
  assert.equal(ok.status, 200);
  assert.equal((await laptop('GET', '/api/auth/me')).body.user.email, 'changer@example.com');
  assert.equal((await other('GET', '/api/auth/me')).body.user, null);
  assert.equal((await client('10.0.1.3')('POST', '/api/auth/login', { email: 'changer@example.com', password: pw })).status, 401);
  assert.equal((await client('10.0.1.3')('POST', '/api/auth/login', { email: 'changer@example.com', password: 'new pass 123' })).status, 200);
});

/* ---------------- forgot / reset password ---------------- */
test('forgot password: same answer for known and unknown emails; email only sent for real accounts', async () => {
  const before = outbox.length;
  const known = await client('10.0.2.1')('POST', '/api/auth/forgot-password', { email: 'alice@example.com' });
  await Promise.all(srv.pending);
  const unknown = await client('10.0.2.1')('POST', '/api/auth/forgot-password', { email: 'ghost@example.com' });
  await Promise.all(srv.pending);
  assert.equal(known.status, 200); assert.equal(unknown.status, 200);
  assert.equal(known.body.message, unknown.body.message);
  assert.equal(outbox.length, before + 1);
  assert.deepEqual(outbox[outbox.length - 1].to, ['alice@example.com']);
});

test('reset link: works once, ends all sessions, then the new password signs in', async () => {
  const signedIn = client('10.0.2.2');
  await signedIn('POST', '/api/auth/login', { email: 'alice@example.com', password: pw });
  await client('10.0.2.2')('POST', '/api/auth/forgot-password', { email: 'alice@example.com' });
  await Promise.all(srv.pending);
  const token = lastLink('reset');
  const stored = await env.DB.prepare('SELECT token_hash FROM password_reset_tokens WHERE used_at IS NULL').first();
  assert.notEqual(stored.token_hash, token); // only the hash is stored
  const mismatch = await client()('POST', '/api/auth/reset-password', { token, password: 'brand new 42', confirmPassword: 'different 42' });
  assert.equal(mismatch.status, 400);
  const ok = await client()('POST', '/api/auth/reset-password', { token, password: 'brand new 42', confirmPassword: 'brand new 42' });
  assert.equal(ok.status, 200);
  const reuse = await client()('POST', '/api/auth/reset-password', { token, password: 'other new 42', confirmPassword: 'other new 42' });
  assert.equal(reuse.status, 400); assert.equal(reuse.body.error.code, 'invalid_token');
  assert.equal((await signedIn('GET', '/api/auth/me')).body.user, null);
  assert.equal((await client('10.0.2.3')('POST', '/api/auth/login', { email: 'alice@example.com', password: 'brand new 42' })).status, 200);
});

test('invalid and expired reset tokens are refused', async () => {
  assert.equal((await client()('POST', '/api/auth/reset-password', { token: 'made-up-token', password: 'brand new 42', confirmPassword: 'brand new 42' })).status, 400);
  await client('10.0.2.4')('POST', '/api/auth/forgot-password', { email: 'plain@example.com' });
  await Promise.all(srv.pending);
  const token = lastLink('reset');
  await env.DB.prepare("UPDATE password_reset_tokens SET expires_at = '2000-01-01T00:00:00.000Z'").run();
  const r = await client()('POST', '/api/auth/reset-password', { token, password: 'brand new 42', confirmPassword: 'brand new 42' });
  assert.equal(r.status, 400); assert.equal(r.body.error.code, 'invalid_token');
});

test('forgot password says so plainly when email is not configured (no fake sending)', async () => {
  const saved = env.RESEND_API_KEY; delete env.RESEND_API_KEY;
  const r = await client()('POST', '/api/auth/forgot-password', { email: 'alice@example.com' });
  env.RESEND_API_KEY = saved;
  assert.equal(r.status, 503); assert.equal(r.body.error.code, 'email_not_configured');
});

/* ---------------- profile ---------------- */
test('profile: view, update name and phone, changes persist after signing out and in', async () => {
  const p = client('10.0.3.1');
  await p('POST', '/api/auth/signup', signupBody('profile@example.com'));
  const view = await p('GET', '/api/user/profile');
  assert.equal(view.body.user.fullName, 'Test User'); assert.ok(view.body.user.createdAt);
  const bad = await p('PUT', '/api/user/profile', { fullName: '', phoneNumber: 'abc' });
  assert.equal(bad.status, 400);
  const up = await p('PUT', '/api/user/profile', { fullName: 'Mohit B', phoneNumber: '+91 90000 11111' });
  assert.equal(up.body.user.fullName, 'Mohit B');
  await p('POST', '/api/auth/logout', {});
  const again = client('10.0.3.1');
  await again('POST', '/api/auth/login', { email: 'profile@example.com', password: pw });
  const v2 = await again('GET', '/api/user/profile');
  assert.equal(v2.body.user.fullName, 'Mohit B'); assert.equal(v2.body.user.phoneNumber, '+91 90000 11111');
});

test('email change only happens after the new address confirms it', async () => {
  const p = client('10.0.3.2');
  await p('POST', '/api/auth/signup', signupBody('old@example.com'));
  assert.equal((await p('PUT', '/api/user/profile', { fullName: 'X', phoneNumber: '+1 555 000 1234', email: 'sneaky@example.com' })).status, 400);
  const req = await p('POST', '/api/user/email-change', { newEmail: 'new@example.com', password: pw });
  assert.equal(req.status, 200);
  assert.equal((await p('GET', '/api/user/profile')).body.user.email, 'old@example.com');
  assert.deepEqual(outbox[outbox.length - 1].to, ['new@example.com']);
  const token = lastLink('verify');
  assert.equal((await client()('POST', '/api/auth/verify-email', { token })).status, 200);
  const after = (await p('GET', '/api/user/profile')).body.user;
  assert.equal(after.email, 'new@example.com'); assert.equal(after.emailVerified, true);
});

/* ---------------- security ---------------- */
test('CSRF: writes from another origin or as a form post are refused', async () => {
  const a = client('10.0.4.1');
  await a('POST', '/api/auth/signup', signupBody('csrf@example.com'));
  const cross = await a('PUT', '/api/user/profile', { fullName: 'Evil', phoneNumber: '+1 555 000 1234' }, { Origin: 'https://evil.example' });
  assert.equal(cross.status, 403);
  const res = await realFetch(base + '/api/user/profile', { method: 'PUT', headers: { Cookie: a.cookie(), 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'fullName=Evil' });
  assert.equal(res.status, 415);
  assert.equal((await a('GET', '/api/user/profile')).body.user.fullName, 'Test User');
});

test('private endpoints require a session', async () => {
  const anon = client();
  for (const [m, p] of [['GET', '/api/user/profile'], ['GET', '/api/user/progress'], ['PUT', '/api/user/profile'], ['POST', '/api/user/progress/lesson-complete'], ['PUT', '/api/user/progress/state'], ['POST', '/api/auth/change-password']]) {
    const r = await anon(m, p, m === 'GET' ? undefined : {});
    assert.equal(r.status, 401, `${m} ${p}`);
  }
});

test('a user_id sent by the client is ignored: progress always goes to the signed-in user', async () => {
  const a = client('10.0.4.2'), b = client('10.0.4.3');
  const ua = (await a('POST', '/api/auth/signup', signupBody('idor-a@example.com'))).body.user;
  await b('POST', '/api/auth/signup', signupBody('idor-b@example.com'));
  await complete(b, 'l1', 3, { userId: ua.id, user_id: ua.id });
  await b('PUT', '/api/user/profile', { fullName: 'B', phoneNumber: '+1 555 000 1234', userId: ua.id, id: ua.id });
  assert.deepEqual(Object.keys((await a('GET', '/api/user/progress')).body.lessons), []);
  assert.equal((await a('GET', '/api/user/profile')).body.user.fullName, 'Test User');
});

/* ---------------- learning progress ---------------- */
test('scenario: complete lessons 1-4, sign out, sign back in: 1-4 completed, next is lesson 5', async () => {
  const a = client('10.0.5.1');
  await a('POST', '/api/auth/signup', signupBody('learner-a@example.com'));
  for (const id of ['l1', 'l2', 'l3', 'l4']) {
    await a('POST', '/api/user/progress/lesson-start', { lessonId: id, stage: 0 });
    assert.equal((await complete(a, id)).status, 200);
  }
  await a('POST', '/api/auth/logout', {});
  const again = client('10.0.5.2'); // another browser / device
  await again('POST', '/api/auth/login', { email: 'learner-a@example.com', password: pw });
  const p = (await again('GET', '/api/user/progress')).body;
  for (const id of ['l1', 'l2', 'l3', 'l4']) assert.equal(p.lessons[id].status, 'completed', id);
  assert.equal(p.summary.completed, 4);
  assert.deepEqual(p.summary.next, { lessonId: 'l5', stage: 0 });
  // complete lesson 5, "refresh", still there
  await again('POST', '/api/user/progress/lesson-start', { lessonId: 'l5', stage: 0 });
  await complete(again, 'l5');
  const refreshed = (await again('GET', '/api/user/progress')).body;
  assert.equal(refreshed.lessons.l5.status, 'completed');
  assert.equal(refreshed.summary.completed, 5);
  assert.equal(refreshed.summary.next.lessonId, 'l6');
});

test('opening a lesson marks it in progress, never completed; the stage you were on is resumed', async () => {
  const a = client('10.0.5.3');
  await a('POST', '/api/auth/signup', signupBody('resume@example.com'));
  await a('POST', '/api/user/progress/lesson-start', { lessonId: 'l7', stage: 0 });
  await a('PUT', '/api/user/progress/position', { lessonId: 'l7', stage: 2 });
  const p = (await a('GET', '/api/user/progress')).body;
  assert.equal(p.lessons.l7.status, 'in_progress');
  assert.equal(p.lessons.l7.completionPercentage, 66);
  assert.deepEqual(p.summary.next, { lessonId: 'l7', stage: 2 });
  assert.equal(p.summary.inProgress, 1);
});

test('a run under 80% accuracy (0 stars) does not complete the lesson; a later pass does, and it never goes back', async () => {
  const a = client('10.0.5.4');
  await a('POST', '/api/auth/signup', signupBody('strict@example.com'));
  assert.equal((await complete(a, 'l8', 0, { accuracy: 60 })).body.lesson.status, 'in_progress');
  assert.equal((await complete(a, 'l8', 2, { wpm: 55 })).body.lesson.status, 'completed');
  const worse = (await complete(a, 'l8', 0, { wpm: 20, accuracy: 50 })).body.lesson;
  assert.equal(worse.status, 'completed'); assert.equal(worse.stars, 2); assert.equal(worse.bestWpm, 55); assert.equal(worse.attempts, 3);
});

test('retried saves are idempotent: the same run is never counted twice', async () => {
  const a = client('10.0.5.5');
  await a('POST', '/api/auth/signup', signupBody('retry@example.com'));
  const body = { lessonId: 'l9', eventId: 'evt-fixed-retry-1', stars: 3, wpm: 30, accuracy: 99, errors: 0, seconds: 50 };
  const first = await a('POST', '/api/user/progress/lesson-complete', body);
  const second = await a('POST', '/api/user/progress/lesson-complete', body);
  assert.equal(first.body.duplicate, false); assert.equal(second.body.duplicate, true);
  assert.equal(second.body.lesson.attempts, 1);
  const runs = await env.DB.prepare("SELECT COUNT(*) AS n FROM user_activity WHERE client_event_id = 'evt-fixed-retry-1'").first();
  assert.equal(runs.n, 1);
});

test('simultaneous saves from two devices are all counted, best scores kept', async () => {
  const a = client('10.0.5.6');
  await a('POST', '/api/auth/signup', signupBody('concurrent@example.com'));
  const desktop = client('10.0.5.7');
  await desktop('POST', '/api/auth/login', { email: 'concurrent@example.com', password: pw });
  await Promise.all([complete(a, 'l10', 1, { wpm: 20 }), complete(desktop, 'l10', 3, { wpm: 45 }), complete(a, 'l10', 2, { wpm: 30 })]);
  const l = (await a('GET', '/api/user/progress')).body.lessons.l10;
  assert.equal(l.attempts, 3); assert.equal(l.stars, 3); assert.equal(l.bestWpm, 45);
});

test('analytics state saves and loads; bad input is refused', async () => {
  const a = client('10.0.5.8');
  await a('POST', '/api/auth/signup', signupBody('state@example.com'));
  const state = { keyStats: { f: { attempts: 10, errors: 1 } }, bigramLatency: { 'f>j': { count: 3, totalMs: 600 } }, errorClasses: { adjacent: 1, transposition: 0, omission: 2, other: 0 }, streak: { lastDate: '2026-11-13', count: 3 } };
  assert.equal((await a('PUT', '/api/user/progress/state', state)).status, 200);
  assert.deepEqual((await a('GET', '/api/user/progress')).body.state.keyStats, state.keyStats);
  assert.equal((await a('PUT', '/api/user/progress/state', { streak: { lastDate: 'yesterday', count: 1 } })).status, 400);
  assert.equal((await a('POST', '/api/user/progress/lesson-complete', { lessonId: 'l99', eventId: eventId(), stars: 1, wpm: 1, accuracy: 1 })).status, 400);
  assert.equal((await a('POST', '/api/user/progress/lesson-complete', { lessonId: 'l1', eventId: eventId(), stars: 9, wpm: 1, accuracy: 1 })).status, 400);
});

/* ---------------- multiple users ---------------- */
test('scenario: A does 4 lessons, B does 2; each keeps exactly their own', async () => {
  const A = client('10.0.6.1');
  await A('POST', '/api/auth/signup', signupBody('user-a@example.com'));
  for (const id of ['l1', 'l2', 'l3', 'l4']) await complete(A, id);
  await A('POST', '/api/auth/logout', {});
  const B = client('10.0.6.2');
  await B('POST', '/api/auth/signup', signupBody('user-b@example.com'));
  for (const id of ['l1', 'l2']) await complete(B, id);
  await B('POST', '/api/auth/logout', {});
  const A2 = client('10.0.6.3');
  await A2('POST', '/api/auth/login', { email: 'user-a@example.com', password: pw });
  const pa = (await A2('GET', '/api/user/progress')).body;
  assert.equal(pa.summary.completed, 4); assert.equal(pa.summary.next.lessonId, 'l5');
  const B2 = client('10.0.6.4');
  await B2('POST', '/api/auth/login', { email: 'user-b@example.com', password: pw });
  const pb = (await B2('GET', '/api/user/progress')).body;
  assert.equal(pb.summary.completed, 2); assert.equal(pb.summary.next.lessonId, 'l3');
  assert.deepEqual(Object.keys(pb.lessons).sort(), ['l1', 'l2']);
});

/* ---------------- guest import ---------------- */
test('guest progress import: adds, never lowers, and only once', async () => {
  const a = client('10.0.7.1');
  await a('POST', '/api/auth/signup', signupBody('import@example.com'));
  await complete(a, 'l4', 3, { wpm: 60 });
  const guest = { importId: 'guest-abc12345', progress: { l1: { stars: 2, bestWpm: 25, bestAcc: 95 }, l4: { stars: 1, bestWpm: 10, bestAcc: 81 }, l2: { stars: 0, bestWpm: 5, bestAcc: 50 }, bogus: { stars: 3 } },
    state: { keyStats: { f: { attempts: 4, errors: 1 } }, streak: { lastDate: '2026-11-12', count: 9 } } };
  const r = await a('POST', '/api/user/progress/import', guest);
  assert.equal(r.body.imported, true); assert.equal(r.body.lessons, 3);
  const again = await a('POST', '/api/user/progress/import', guest);
  assert.equal(again.body.imported, false);
  const p = (await a('GET', '/api/user/progress')).body;
  assert.equal(p.lessons.l1.status, 'completed');
  assert.equal(p.lessons.l2.status, 'in_progress');
  assert.equal(p.lessons.l4.stars, 3); assert.equal(p.lessons.l4.bestWpm, 60); // not lowered
  assert.deepEqual(p.state.keyStats.f, { attempts: 4, errors: 1 });
  assert.equal(p.state.streak.count, 9);
});

/* ---------------- account deletion ---------------- */
test('deleting the account removes all of its data', async () => {
  const a = client('10.0.8.1');
  const u = (await a('POST', '/api/auth/signup', signupBody('delete-me@example.com'))).body.user;
  await complete(a, 'l1');
  await a('PUT', '/api/user/progress/state', { streak: { lastDate: '2026-11-13', count: 1 } });
  assert.equal((await a('POST', '/api/user/delete', { password: 'wrong pass 1' })).status, 400);
  assert.equal((await a('POST', '/api/user/delete', { password: pw })).status, 200);
  for (const t of ['users', 'sessions', 'user_learning_progress', 'user_activity', 'user_state']) {
    const col = t === 'users' ? 'id' : 'user_id';
    const n = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE ${col} = ?1`).bind(u.id).first();
    assert.equal(n.n, 0, t);
  }
  assert.equal((await client('10.0.8.2')('POST', '/api/auth/login', { email: 'delete-me@example.com', password: pw })).status, 401);
});

/* ---------------- deployment safety ---------------- */
test('without a database the Worker still serves the app, and accounts report themselves unavailable', async () => {
  const { default: worker } = await import('../src/index.js');
  const noDb = { ASSETS: env.ASSETS };
  const page = await worker.fetch(new Request(`${base}/`), noDb, {}); // guest app
  assert.equal(page.status, 200);
  const me = await worker.fetch(new Request(`${base}/api/auth/me`), noDb, {});
  assert.equal(me.status, 503);
  assert.equal((await me.json()).error.code, 'database_not_configured');
});

test('database connected but tables missing: a clear 503, not a crash', async () => {
  const { default: worker } = await import('../src/index.js');
  const { D1Shim } = await import('./d1-shim.mjs');
  const empty = { ASSETS: env.ASSETS, DB: new D1Shim() };
  const me = await worker.fetch(new Request(`${base}/api/auth/me`, { headers: { Cookie: '__Host-tc_session=abc' } }), empty, {});
  assert.equal(me.status, 503);
  assert.equal((await me.json()).error.code, 'database_not_migrated');
});

test('the setup SQL can be run twice without harm', async () => {
  const { D1Shim } = await import('./d1-shim.mjs');
  const db = new D1Shim();
  db.applyMigrations(new URL('../migrations', import.meta.url).pathname);
  await db.prepare("INSERT INTO rate_limits (key, window_start, count) VALUES ('k', 1, 1)").run();
  db.applyMigrations(new URL('../migrations', import.meta.url).pathname);
  assert.equal((await db.prepare('SELECT count FROM rate_limits WHERE key = ?1').bind('k').first()).count, 1);
});

/* ---------------- the sign-in gate ---------------- */
test('signed out, every way to the app gets the sign-in page; signed in, the app', async () => {
  const anon = async (p) => { const r = await realFetch(base + p, { redirect: 'manual' }); return { status: r.status, loc: r.headers.get('location'), cache: r.headers.get('cache-control'), body: await r.text() }; };
  const home = await anon('/');
  assert.equal(home.status, 200);
  assert.match(home.body, /<title>Sign in · TypeCraft<\/title>/);
  assert.ok(!home.body.includes('const lessons ='), 'the app must not be sent to a signed-out browser');
  assert.match(home.cache, /no-store/);
  assert.equal((await anon('/index.html')).status, 302);
  assert.match((await anon('/login')).body, /Sign in · TypeCraft/);

  const a = client('10.0.9.1');
  await a('POST', '/api/auth/signup', signupBody('gate@example.com'));
  const app = await realFetch(base + '/', { headers: { Cookie: a.cookie() } });
  assert.match(await app.text(), /const lessons =/);
  const loginWhileIn = await realFetch(base + '/login', { headers: { Cookie: a.cookie() }, redirect: 'manual' });
  assert.equal(loginWhileIn.status, 302); assert.equal(new URL(loginWhileIn.headers.get('location')).pathname, '/');
  await a('POST', '/api/auth/logout', {});
  const after = await realFetch(base + '/', { headers: { Cookie: a.cookie() || '' } });
  assert.match(await after.text(), /Sign in · TypeCraft/);
});

test('without a database the app is served as before (guest mode)', async () => {
  const { default: worker } = await import('../src/index.js');
  const res = await worker.fetch(new Request(`${base}/`), { ASSETS: env.ASSETS }, {});
  assert.match(await res.text(), /const lessons =/);
});
