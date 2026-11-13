// Learning progress: lesson status, finished runs, analytics state and guest-progress import.
// Every query is scoped to the signed-in user's id taken from the session, never from the request body.
import { HttpError, json, readJson, fieldError, nowIso } from './http.js';
import { requireSession } from './session.js';
import { uuid } from './crypto.js';

// Lesson ids in teaching order. Keep in step with `lessons` in index.html
// (ids never change; the order decides which lesson comes "next").
export const LESSON_ORDER = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10', 'l11', 'l12', 'l13',
  'l14', 'l18', 'l15', 'l16', 'l17', 'l19', 'l20', 'l21', 'l22', 'l23', 'l24'];
// stages per lesson (Characters / Mixed / Words / Paragraph / 60-second test)
const STAGE_COUNT = { l1: 2, l2: 2, l3: 2, l24: 1 };
const stageCount = (id) => STAGE_COUNT[id] || 3;
const STATE_KEYS = ['keyStats', 'bigramLatency', 'errorClasses', 'streak'];

/* ---------- validation helpers ---------- */
function lessonIdOf(value) {
  if (!LESSON_ORDER.includes(value)) throw fieldError({ lessonId: 'Unknown lesson.' });
  return value;
}
function intIn(value, min, max, name) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw fieldError({ [name]: `${name} must be a number from ${min} to ${max}.` });
  return Math.round(n);
}
function eventIdOf(value) {
  if (typeof value !== 'string' || !/^[\w:-]{8,80}$/.test(value)) throw fieldError({ eventId: 'Missing or invalid event id.' });
  return value;
}
const num = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.min(Math.round(Number(v)), 1e9) : 0);

/** Rebuilds a state value from known fields only, so nothing unexpected is stored. */
function cleanState(key, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (key === 'keyStats') {
    const out = {};
    for (const [ch, s] of Object.entries(value).slice(0, 300)) {
      if (ch.length === 1 && s && typeof s === 'object') out[ch] = { attempts: num(s.attempts), errors: num(s.errors) };
    }
    return out;
  }
  if (key === 'bigramLatency') {
    const out = {};
    for (const [pair, d] of Object.entries(value).slice(0, 6000)) {
      if (pair.length === 3 && pair[1] === '>' && d && typeof d === 'object') out[pair] = { count: num(d.count), totalMs: num(d.totalMs) };
    }
    return out;
  }
  if (key === 'errorClasses') {
    return { adjacent: num(value.adjacent), transposition: num(value.transposition), omission: num(value.omission), other: num(value.other) };
  }
  if (key === 'streak') {
    if (typeof value.lastDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.lastDate)) return null;
    return { lastDate: value.lastDate, count: num(value.count) };
  }
  return null;
}

function lessonRow(r) {
  return {
    lessonId: r.lesson_id, status: r.lesson_status, completionPercentage: r.completion_percentage,
    currentStage: r.current_stage, stars: r.stars, bestWpm: r.best_wpm, bestAccuracy: r.best_accuracy,
    attempts: r.attempts, startedAt: r.started_at, completedAt: r.completed_at, lastActivityAt: r.last_activity_at,
  };
}

async function loadAll(env, userId) {
  const [lessons, state, activity] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM user_learning_progress WHERE user_id = ?1').bind(userId),
    env.DB.prepare('SELECT key, value, updated_at FROM user_state WHERE user_id = ?1').bind(userId),
    env.DB.prepare('SELECT activity_type, lesson_id, activity_data, created_at FROM user_activity WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 15').bind(userId),
  ]);
  const byLesson = {};
  for (const r of lessons.results) byLesson[r.lesson_id] = lessonRow(r);
  const st = {};
  for (const r of state.results) { try { st[r.key] = JSON.parse(r.value); } catch { /* skip a damaged value */ } }
  const recent = activity.results.map((r) => {
    let data = null; try { data = r.activity_data ? JSON.parse(r.activity_data) : null; } catch { data = null; }
    return { type: r.activity_type, lessonId: r.lesson_id, data, at: r.created_at };
  });
  return { lessons: byLesson, state: st, recent };
}

function summarize(all) {
  const rows = LESSON_ORDER.map((id) => all.lessons[id]).filter(Boolean);
  const completed = rows.filter((r) => r.status === 'completed').length;
  const inProgress = rows.filter((r) => r.status === 'in_progress').length;
  const total = LESSON_ORDER.length;
  const overall = Math.round(rows.reduce((s, r) => s + (r.status === 'completed' ? 100 : r.completionPercentage), 0) / total);
  const lastActivityAt = rows.reduce((m, r) => (r.lastActivityAt && (!m || r.lastActivityAt > m) ? r.lastActivityAt : m), null);
  const lastLesson = rows.find((r) => r.lastActivityAt === lastActivityAt) || null;

  // where to continue: the lesson you were last on, unless it's done; then the first lesson not yet completed
  const pos = all.state.position;
  let next = null;
  if (pos && LESSON_ORDER.includes(pos.lessonId) && !(all.lessons[pos.lessonId] && all.lessons[pos.lessonId].status === 'completed')) {
    next = { lessonId: pos.lessonId, stage: intOr(pos.stage, 0) };
  } else {
    const id = LESSON_ORDER.find((l) => !(all.lessons[l] && all.lessons[l].status === 'completed'));
    if (id) next = { lessonId: id, stage: all.lessons[id] ? all.lessons[id].currentStage : 0 };
  }
  return { totalLessons: total, completed, inProgress, remaining: total - completed, overallPercentage: overall,
    lastActivityAt, lastLessonId: lastLesson ? lastLesson.lessonId : null, next };
}
function intOr(v, d) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; }

/* ---------- routes ---------- */
export async function getProgress(request, env) {
  const { user } = await requireSession(env, request);
  const all = await loadAll(env, user.id);
  return json({ ...all, summary: summarize(all) });
}

export async function getSummary(request, env) {
  const { user } = await requireSession(env, request);
  const all = await loadAll(env, user.id);
  return json({ summary: summarize(all), recent: all.recent });
}

export async function getCurrent(request, env) {
  const { user } = await requireSession(env, request);
  const all = await loadAll(env, user.id);
  return json({ next: summarize(all).next, position: all.state.position || null });
}

/** Opening a lesson or moving to another stage: marks it in progress and remembers where you are. */
export async function savePosition(request, env) {
  const { user } = await requireSession(env, request);
  const body = await readJson(request);
  const lessonId = lessonIdOf(body.lessonId);
  const stage = intIn(body.stage ?? 0, 0, stageCount(lessonId) - 1, 'stage');
  const pct = Math.floor((100 * stage) / stageCount(lessonId));
  const now = nowIso();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO user_learning_progress (id, user_id, lesson_id, lesson_status, completion_percentage, current_stage,
                                           started_at, last_activity_at, created_at, updated_at)
       VALUES (?1, ?2, ?3, 'in_progress', ?4, ?5, ?6, ?6, ?6, ?6)
       ON CONFLICT (user_id, lesson_id) DO UPDATE SET
         current_stage = excluded.current_stage,
         completion_percentage = CASE WHEN lesson_status = 'completed' THEN 100
                                      ELSE MAX(completion_percentage, excluded.completion_percentage) END,
         started_at = COALESCE(started_at, excluded.started_at),
         last_activity_at = excluded.last_activity_at,
         updated_at = excluded.updated_at`
    ).bind(uuid(), user.id, lessonId, pct, stage, now),
    env.DB.prepare(
      `INSERT INTO user_state (user_id, key, value, updated_at) VALUES (?1, 'position', ?2, ?3)
       ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).bind(user.id, JSON.stringify({ lessonId, stage, at: now }), now),
  ]);
  const row = await env.DB.prepare('SELECT * FROM user_learning_progress WHERE user_id = ?1 AND lesson_id = ?2').bind(user.id, lessonId).first();
  return json({ lesson: lessonRow(row) });
}

/** A finished run. Idempotent: the same eventId is only ever counted once, however often it is retried. */
export async function completeLesson(request, env) {
  const { user } = await requireSession(env, request);
  const body = await readJson(request);
  const lessonId = lessonIdOf(body.lessonId);
  const eventId = eventIdOf(body.eventId);
  const stars = intIn(body.stars, 0, 3, 'stars');
  const wpm = intIn(body.wpm, 0, 400, 'wpm');
  const accuracy = intIn(body.accuracy, 0, 100, 'accuracy');
  const errors = intIn(body.errors ?? 0, 0, 100000, 'errors');
  const seconds = intIn(body.seconds ?? 0, 0, 36000, 'seconds');
  const n = stageCount(lessonId);
  const failedPct = Math.floor((100 * (n - 1)) / n); // every stage done, but under 80% accuracy
  const activityId = uuid();
  const now = nowIso();

  // One transaction: the run is recorded, and the lesson row updated only if this
  // run's activity row was actually inserted (i.e. it isn't a retry of a saved run).
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO user_activity (id, user_id, activity_type, lesson_id, activity_data, client_event_id, created_at)
       VALUES (?1, ?2, 'lesson_completed', ?3, ?4, ?5, ?6)
       ON CONFLICT (user_id, client_event_id) DO NOTHING`
    ).bind(activityId, user.id, lessonId, JSON.stringify({ stars, wpm, accuracy, errors, seconds }), eventId, now),
    env.DB.prepare(
      `INSERT INTO user_learning_progress (id, user_id, lesson_id, lesson_status, completion_percentage, current_stage,
                                           stars, best_wpm, best_accuracy, attempts, started_at, completed_at,
                                           last_activity_at, created_at, updated_at)
       SELECT ?1, ?2, ?3, CASE WHEN ?4 >= 1 THEN 'completed' ELSE 'in_progress' END,
              CASE WHEN ?4 >= 1 THEN 100 ELSE ?7 END, 0, ?4, ?5, ?6, 1, ?8,
              CASE WHEN ?4 >= 1 THEN ?8 END, ?8, ?8, ?8
        WHERE EXISTS (SELECT 1 FROM user_activity WHERE id = ?9)
       ON CONFLICT (user_id, lesson_id) DO UPDATE SET
         lesson_status = CASE WHEN lesson_status = 'completed' OR excluded.stars >= 1 THEN 'completed' ELSE 'in_progress' END,
         completion_percentage = CASE WHEN lesson_status = 'completed' OR excluded.stars >= 1 THEN 100
                                      ELSE MAX(completion_percentage, excluded.completion_percentage) END,
         current_stage = 0,
         stars = MAX(stars, excluded.stars),
         best_wpm = MAX(best_wpm, excluded.best_wpm),
         best_accuracy = MAX(best_accuracy, excluded.best_accuracy),
         attempts = attempts + 1,
         started_at = COALESCE(started_at, excluded.started_at),
         completed_at = COALESCE(completed_at, excluded.completed_at),
         last_activity_at = excluded.last_activity_at,
         updated_at = excluded.updated_at`
    ).bind(uuid(), user.id, lessonId, stars, wpm, accuracy, failedPct, now, activityId),
  ]);
  const row = await env.DB.prepare('SELECT * FROM user_learning_progress WHERE user_id = ?1 AND lesson_id = ?2').bind(user.id, lessonId).first();
  const fresh = !!(await env.DB.prepare('SELECT 1 FROM user_activity WHERE id = ?1').bind(activityId).first());
  return json({ lesson: row ? lessonRow(row) : null, duplicate: !fresh });
}

/** Per-key accuracy, rhythm, coach tallies and streak. Only the keys sent are replaced. */
export async function saveState(request, env) {
  const { user } = await requireSession(env, request);
  const body = await readJson(request, 512 * 1024);
  const now = nowIso();
  const stmts = [];
  for (const key of STATE_KEYS) {
    if (!(key in body)) continue;
    const clean = cleanState(key, body[key]);
    if (!clean) throw fieldError({ [key]: `Invalid ${key}.` });
    stmts.push(env.DB.prepare(
      `INSERT INTO user_state (user_id, key, value, updated_at) VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).bind(user.id, key, JSON.stringify(clean), now));
  }
  if (!stmts.length) throw new HttpError(400, 'nothing_to_save', 'Nothing to save.');
  await env.DB.batch(stmts);
  return json({ savedAt: now });
}

/**
 * Adds progress made as a guest (in this browser's storage) to the account.
 * Never lowers anything: best scores and stars are kept, completed stays completed.
 * importId is derived from the guest data, so importing the same data twice does nothing.
 */
export async function importGuest(request, env) {
  const { user } = await requireSession(env, request);
  const body = await readJson(request, 512 * 1024);
  const importId = eventIdOf(body.importId);
  const done = await env.DB.prepare('SELECT 1 FROM user_activity WHERE user_id = ?1 AND client_event_id = ?2').bind(user.id, importId).first();
  if (done) return json({ imported: false, reason: 'already_imported' });

  const now = nowIso();
  const stmts = [];
  const guest = body.progress && typeof body.progress === 'object' ? body.progress : {};
  let lessonsImported = 0;
  for (const [lessonId, p] of Object.entries(guest)) {
    if (!LESSON_ORDER.includes(lessonId) || !p || typeof p !== 'object') continue;
    const stars = Math.min(3, num(p.stars)), wpm = Math.min(400, num(p.bestWpm)), acc = Math.min(100, num(p.bestAcc));
    lessonsImported++;
    stmts.push(env.DB.prepare(
      `INSERT INTO user_learning_progress (id, user_id, lesson_id, lesson_status, completion_percentage, current_stage,
                                           stars, best_wpm, best_accuracy, attempts, started_at, completed_at,
                                           last_activity_at, created_at, updated_at)
       VALUES (?1, ?2, ?3, CASE WHEN ?4 >= 1 THEN 'completed' ELSE 'in_progress' END, CASE WHEN ?4 >= 1 THEN 100 ELSE 0 END,
               0, ?4, ?5, ?6, 0, ?7, CASE WHEN ?4 >= 1 THEN ?7 END, ?7, ?7, ?7)
       ON CONFLICT (user_id, lesson_id) DO UPDATE SET
         lesson_status = CASE WHEN lesson_status = 'completed' OR excluded.stars >= 1 THEN 'completed' ELSE lesson_status END,
         completion_percentage = CASE WHEN lesson_status = 'completed' OR excluded.stars >= 1 THEN 100 ELSE completion_percentage END,
         stars = MAX(stars, excluded.stars),
         best_wpm = MAX(best_wpm, excluded.best_wpm),
         best_accuracy = MAX(best_accuracy, excluded.best_accuracy),
         completed_at = COALESCE(completed_at, excluded.completed_at),
         updated_at = excluded.updated_at`
    ).bind(uuid(), user.id, lessonId, stars, wpm, acc, now));
  }

  // analytics: add the guest's counts to the account's
  const current = {};
  const rows = await env.DB.prepare('SELECT key, value FROM user_state WHERE user_id = ?1').bind(user.id).all();
  for (const r of rows.results) { try { current[r.key] = JSON.parse(r.value); } catch { /* ignore */ } }
  const gs = body.state && typeof body.state === 'object' ? body.state : {};
  const merged = {};
  const ks = cleanState('keyStats', gs.keyStats);
  if (ks) { const out = { ...(current.keyStats || {}) }; for (const [c, s] of Object.entries(ks)) { const o = out[c] || { attempts: 0, errors: 0 }; out[c] = { attempts: o.attempts + s.attempts, errors: o.errors + s.errors }; } merged.keyStats = out; }
  const bl = cleanState('bigramLatency', gs.bigramLatency);
  if (bl) { const out = { ...(current.bigramLatency || {}) }; for (const [k, d] of Object.entries(bl)) { const o = out[k] || { count: 0, totalMs: 0 }; out[k] = { count: o.count + d.count, totalMs: o.totalMs + d.totalMs }; } merged.bigramLatency = out; }
  const ec = cleanState('errorClasses', gs.errorClasses);
  if (ec) { const o = current.errorClasses || {}; merged.errorClasses = Object.fromEntries(Object.entries(ec).map(([k, v]) => [k, v + num(o[k])])); }
  const sk = cleanState('streak', gs.streak);
  if (sk) { const o = current.streak; merged.streak = !o || sk.lastDate > o.lastDate || (sk.lastDate === o.lastDate && sk.count > o.count) ? sk : o; }
  for (const [key, value] of Object.entries(merged)) {
    stmts.push(env.DB.prepare(
      `INSERT INTO user_state (user_id, key, value, updated_at) VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).bind(user.id, key, JSON.stringify(value), now));
  }
  // recorded last, in the same transaction: a second concurrent import fails on the unique key and changes nothing
  stmts.push(env.DB.prepare(
    `INSERT INTO user_activity (id, user_id, activity_type, lesson_id, activity_data, client_event_id, created_at)
     VALUES (?1, ?2, 'guest_import', NULL, ?3, ?4, ?5)`
  ).bind(uuid(), user.id, JSON.stringify({ lessons: lessonsImported }), importId, now));
  try {
    await env.DB.batch(stmts);
  } catch (e) {
    if (/UNIQUE/i.test(String(e && e.message))) return json({ imported: false, reason: 'already_imported' });
    throw e;
  }
  return json({ imported: true, lessons: lessonsImported });
}
