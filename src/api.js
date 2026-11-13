// Next-version learner APIs: state, events, position, typing statistics,
// settings, lesson scorecards, history, guest import, export and ghost replays.
// Signed-in only; the user id always comes from the session.
import { HttpError, json, readJson, fieldError, nowIso } from './http.js';
import { requireSession } from './session.js';
import { uuid } from './crypto.js';
import { cleanState } from './progress.js';
import { META, RULES, loadStored, rowsToState, ensureUser, processEvents } from './pipeline.js';

const DAY_MS = 86400000;
const ID_RE = /^[\w:.-]{8,100}$/;

/** The learner's "today": their local date if the browser sends a sensible one, else the UTC date. */
export function todayOf(value) {
  const utc = new Date().toISOString().slice(0, 10);
  if (RULES.isDay(value) && Math.abs(Date.parse(value) - Date.parse(utc)) <= DAY_MS) return value;
  return utc;
}

/* ---------------- GET /api/user/state ---------------- */
export async function buildState(env, userId, today) {
  const DB = env.DB;
  await ensureUser(env, userId);
  const stored = await loadStored(env, userId, { questDays: [today] });
  const [pos, settings, ks, bg, ec, ghosts] = (await DB.batch([
    DB.prepare('SELECT lesson_id, step, server_at FROM user_position WHERE user_id = ?1').bind(userId),
    DB.prepare('SELECT value FROM user_settings WHERE user_id = ?1').bind(userId),
    DB.prepare('SELECT k, attempts, errors FROM key_stats WHERE user_id = ?1').bind(userId),
    DB.prepare('SELECT pair, count, total_ms FROM bigram_stats WHERE user_id = ?1').bind(userId),
    DB.prepare('SELECT cls, n FROM error_classes WHERE user_id = ?1').bind(userId),
    DB.prepare('SELECT ghost_key, score, at FROM ghost_replays WHERE user_id = ?1').bind(userId),
  ])).map((r) => r.results);
  const s = rowsToState(stored);

  const lessons = {};
  for (const id of META.ORDER) {
    lessons[id] = { status: 'not_started', step: 0, stars: 0, crown: false, bestWpm: 0, bestAccuracy: 0, attempts: 0, lastPlayed: null, lastWpm: null, lastAccuracy: null, completedAt: null };
  }
  for (const [id, L] of Object.entries(s.lessons)) {
    lessons[id] = { status: L.status, step: L.step, stars: L.stars, crown: !!L.crown, bestWpm: L.bestWpm, bestAccuracy: L.bestAccuracy,
      attempts: L.attempts, lastPlayed: L.lastPlayed, lastWpm: L.lastWpm, lastAccuracy: L.lastAccuracy, completedAt: L.completedAt };
  }
  const st = RULES.streakOf(Object.keys(s.days).filter((d) => s.days[d].active), today);
  const dq = s.quests[today] || {};
  let set = {};
  try { set = settings[0] ? JSON.parse(settings[0].value) : {}; } catch { set = {}; }
  const settingsOut = { ...RULES.DEFAULT_SETTINGS, ...set };
  const todayRow = s.days[today];
  const unlocks = new Set([...RULES.unlocksFor(s.xp), ...Object.keys(s.unlocks)]);
  const errorClasses = { adjacent: 0, transposition: 0, omission: 0, other: 0 };
  for (const r of ec) errorClasses[r.cls] = r.n;
  const rank = META.rankFor(s.xp);
  return {
    lessons,
    position: pos[0] ? { lessonId: pos[0].lesson_id, step: pos[0].step, at: pos[0].server_at } : null,
    totals: RULES.totalsOf(s),
    xp: s.xp,
    rank: { name: rank.name, min: rank.min, next: rank.next },
    streak: { count: st.current || 0, best: st.best, lastDate: st.lastDate, freezesUsedThisWeek: st.freezesUsedThisWeek || 0, freezes: st.freezes },
    today: { date: today, minutes: todayRow ? Math.round(todayRow.seconds / 60) : 0, seconds: todayRow ? todayRow.seconds : 0, goal: settingsOut.dailyGoal, xp: todayRow ? todayRow.xp : 0 },
    quests: { date: today, items: RULES.questsFor(today).map((q) => ({ id: q.id, title: q.title, unit: q.unit, goal: q.goal, progress: dq[q.id] ? dq[q.id].progress : 0, done: !!(dq[q.id] && dq[q.id].doneAt) })) },
    badges: Object.entries(s.badges).map(([id, b]) => ({ id, at: b.at })).sort((a, b) => (a.at < b.at ? -1 : 1)),
    certificates: Object.entries(s.certificates).map(([lv, c]) => ({ level: Number(lv), wpm: c.wpm, accuracy: c.accuracy, seconds: c.seconds, at: c.at, lessonId: c.lessonId })),
    unlocks: [...unlocks],
    settings: settingsOut,
    games: Object.fromEntries(Object.entries(s.games).map(([id, g]) => [id, { best: g.best, runs: g.runs }])),
    dailyChallenge: Object.entries(s.daily).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 60).map(([date, d]) => ({ date, score: d.score, wpm: d.wpm, accuracy: d.accuracy })),
    placement: s.placement ? { level: s.placement.level, wpm: s.placement.wpm, accuracy: s.placement.accuracy, at: s.placement.at } : null,
    stats: {
      keyStats: Object.fromEntries(ks.map((r) => [r.k, { attempts: r.attempts, errors: r.errors }])),
      bigramLatency: Object.fromEntries(bg.map((r) => [r.pair, { count: r.count, totalMs: r.total_ms }])),
      errorClasses,
    },
    ghosts: Object.fromEntries(ghosts.map((g) => [g.ghost_key, { score: g.score, at: g.at }])),
    serverTime: nowIso(),
  };
}

export async function getState(request, env) {
  const { user } = await requireSession(env, request);
  const today = todayOf(new URL(request.url).searchParams.get('today'));
  return json(await buildState(env, user.id, today));
}

/* ---------------- POST /api/user/events ---------------- */
export async function postEvents(request, env) {
  const { user } = await requireSession(env, request);
  const body = await readJson(request, 512 * 1024);
  if (!Array.isArray(body.events)) throw fieldError({ events: 'Send the events as a list.' });
  if (body.events.length > 100) throw new HttpError(400, 'too_many_events', 'Send at most 100 events at a time.');
  const r = await processEvents(env, user.id, body.events);
  const state = await buildState(env, user.id, todayOf(body.today));
  return json({ ...state, sync: { accepted: r.accepted, duplicates: r.duplicates, rejected: r.rejected }, awarded: r.awarded });
}

/* ---------------- PUT /api/user/position ---------------- */
export async function putPosition(request, env) {
  const { user } = await requireSession(env, request);
  const body = await readJson(request);
  if (!META.BY_ID[body.lessonId]) throw fieldError({ lessonId: 'Unknown lesson.' });
  const step = body.step == null ? 0 : body.step;
  if (!Number.isInteger(step) || step < 0 || step > 9) throw fieldError({ step: 'step must be a step number from 0 to 9.' });
  const at = typeof body.at === 'string' && Number.isFinite(Date.parse(body.at)) ? new Date(Date.parse(body.at)).toISOString() : null;
  await ensureUser(env, user.id);
  const now = nowIso();
  const DB = env.DB;
  await DB.batch([
    DB.prepare(`INSERT INTO user_position (user_id, lesson_id, step, device_at, server_at) VALUES (?1, ?2, ?3, ?4, ?5)
                ON CONFLICT (user_id) DO UPDATE SET lesson_id = excluded.lesson_id, step = excluded.step, device_at = excluded.device_at, server_at = excluded.server_at`)
      .bind(user.id, body.lessonId, step, at, now),
    DB.prepare(`INSERT INTO lesson_scores (user_id, lesson_id, status, step, updated_at) VALUES (?1, ?2, 'in_progress', ?3, ?4)
                ON CONFLICT (user_id, lesson_id) DO UPDATE SET status = CASE WHEN lesson_scores.status = 'not_started' THEN 'in_progress' ELSE lesson_scores.status END,
                step = excluded.step, updated_at = excluded.updated_at`).bind(user.id, body.lessonId, step, now),
    // a new revision: an event batch working from older totals starts again
    DB.prepare('UPDATE user_totals SET rev = ?2 WHERE user_id = ?1').bind(user.id, uuid()),
  ]);
  const row = await DB.prepare('SELECT status, step, stars, crown, best_wpm, best_accuracy, attempts, last_played FROM lesson_scores WHERE user_id = ?1 AND lesson_id = ?2').bind(user.id, body.lessonId).first();
  return json({ position: { lessonId: body.lessonId, step, at: now },
    lesson: { status: row.status, step: row.step, stars: row.stars, crown: !!row.crown, bestWpm: row.best_wpm, bestAccuracy: row.best_accuracy, attempts: row.attempts, lastPlayed: row.last_played } });
}

/* ---------------- POST /api/user/stats ---------------- */
/** Adds counts (not totals) to the learner's typing statistics. A batch id counts once. */
export async function saveStats(env, userId, id, body) {
  const DB = env.DB;
  const ks = body.keyStats != null ? cleanState('keyStats', body.keyStats) : {};
  const bl = body.bigramLatency != null ? cleanState('bigramLatency', body.bigramLatency) : {};
  const ec = body.errorClasses != null ? cleanState('errorClasses', body.errorClasses) : {};
  if (ks == null || bl == null || ec == null) throw fieldError({ stats: 'Invalid typing statistics.' });
  if (Object.keys(bl).length > 3000) throw new HttpError(413, 'too_large', 'Send at most 3,000 key pairs at a time.');
  await ensureUser(env, userId);
  const token = uuid();
  const gate = 'AND EXISTS (SELECT 1 FROM stats_batches WHERE user_id = ?1 AND id = ?3 AND token = ?4)';
  await DB.batch([
    DB.prepare('INSERT INTO stats_batches (user_id, id, token, at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (user_id, id) DO NOTHING').bind(userId, id, token, nowIso()),
    DB.prepare(`INSERT INTO key_stats (user_id, k, attempts, errors) SELECT ?1, key, json_extract(value, '$.attempts'), json_extract(value, '$.errors') FROM json_each(?2) WHERE 1 ${gate}
                ON CONFLICT (user_id, k) DO UPDATE SET attempts = attempts + excluded.attempts, errors = errors + excluded.errors`).bind(userId, JSON.stringify(ks), id, token),
    DB.prepare(`INSERT INTO bigram_stats (user_id, pair, count, total_ms) SELECT ?1, key, json_extract(value, '$.count'), json_extract(value, '$.totalMs') FROM json_each(?2) WHERE 1 ${gate}
                ON CONFLICT (user_id, pair) DO UPDATE SET count = count + excluded.count, total_ms = total_ms + excluded.total_ms`).bind(userId, JSON.stringify(bl), id, token),
    DB.prepare(`INSERT INTO error_classes (user_id, cls, n) SELECT ?1, key, value FROM json_each(?2) WHERE value > 0 ${gate}
                ON CONFLICT (user_id, cls) DO UPDATE SET n = n + excluded.n`).bind(userId, JSON.stringify(ec), id, token),
  ]);
  const row = await DB.prepare('SELECT token FROM stats_batches WHERE user_id = ?1 AND id = ?2').bind(userId, id).first();
  return row && row.token === token;
}

export async function postStats(request, env) {
  const { user } = await requireSession(env, request);
  const body = await readJson(request, 512 * 1024);
  if (typeof body.id !== 'string' || !ID_RE.test(body.id)) throw fieldError({ id: 'Missing or invalid batch id.' });
  const saved = await saveStats(env, user.id, body.id, body);
  return json({ saved, duplicate: !saved });
}

/* ---------------- PUT /api/user/settings ---------------- */
const SETTING_CHECKS = {
  bg: (v) => RULES.THEMES.includes(v),
  effects: (v) => ['full', 'light', 'off'].includes(v),
  sound: (v) => ['on', 'low', 'off'].includes(v),
  dailyGoal: (v) => [5, 10, 15, 20].includes(v),
  fingerGuide: (v) => typeof v === 'boolean',
  keycaps: (v) => typeof v === 'string', ink: (v) => typeof v === 'string', paper: (v) => typeof v === 'string', keySound: (v) => typeof v === 'string',
};
export async function putSettings(request, env) {
  const { user } = await requireSession(env, request);
  const body = await readJson(request);
  await ensureUser(env, user.id);
  const totals = await env.DB.prepare('SELECT xp FROM user_totals WHERE user_id = ?1').bind(user.id).first();
  const unlocked = RULES.unlocksFor(totals ? totals.xp : 0);
  const clean = {}, fields = {};
  for (const [k, v] of Object.entries(body)) {
    if (!SETTING_CHECKS[k]) continue;
    if (!SETTING_CHECKS[k](v)) { fields[k] = `Invalid ${k}.`; continue; }
    if (['keycaps', 'ink', 'paper', 'keySound'].includes(k)) {
      const item = `${k}:${v}`;
      if (!RULES.WORKSHOP.some((w) => w.id === item)) { fields[k] = `Unknown ${k}.`; continue; }
      if (!unlocked.includes(item)) { fields[k] = 'That is not unlocked yet.'; continue; }
    }
    clean[k] = v;
  }
  if (Object.keys(fields).length) throw fieldError(fields);
  if (!Object.keys(clean).length) throw new HttpError(400, 'nothing_to_save', 'Nothing to save.');
  const now = nowIso();
  await env.DB.prepare(`INSERT INTO user_settings (user_id, value, updated_at) VALUES (?1, ?2, ?3)
                        ON CONFLICT (user_id) DO UPDATE SET value = json_patch(user_settings.value, excluded.value), updated_at = excluded.updated_at`)
    .bind(user.id, JSON.stringify(clean), now).run();
  const row = await env.DB.prepare('SELECT value FROM user_settings WHERE user_id = ?1').bind(user.id).first();
  return json({ settings: { ...RULES.DEFAULT_SETTINGS, ...JSON.parse(row.value) }, savedAt: now });
}

/* ---------------- GET /api/user/lessons/:id ---------------- */
export async function getLesson(request, env, ctx, params) {
  const { user } = await requireSession(env, request);
  const meta = META.BY_ID[params.id];
  if (!meta) throw new HttpError(404, 'not_found', 'Unknown lesson.');
  await ensureUser(env, user.id);
  const [row, runs] = (await env.DB.batch([
    env.DB.prepare('SELECT * FROM lesson_scores WHERE user_id = ?1 AND lesson_id = ?2').bind(user.id, params.id),
    env.DB.prepare(`SELECT id, device_at, server_at, wpm, accuracy, errors, seconds, stars, crown, xp FROM events
                     WHERE user_id = ?1 AND lesson_id = ?2 AND type = 'run' ORDER BY rid LIMIT 2000`).bind(user.id, params.id),
  ])).map((r) => r.results);
  const r = row[0];
  const list = runs.map((e) => ({ id: e.id, at: e.device_at || e.server_at, wpm: e.wpm, accuracy: e.accuracy, errors: e.errors, seconds: e.seconds, stars: e.stars, crown: !!e.crown, xp: e.xp }));
  const last = list[list.length - 1] || null;
  return json({
    lesson: { id: meta.id, n: meta.n, title: meta.title, level: meta.level, unit: meta.unit, kind: meta.kind,
      status: r ? r.status : 'not_started', step: r ? r.step : 0, stars: r ? r.stars : 0, crown: !!(r && r.crown),
      bestWpm: r ? r.best_wpm : 0, bestAccuracy: r ? r.best_accuracy : 0, attempts: r ? r.attempts : 0,
      lastPlayed: r ? r.last_played : null, last: last && { wpm: last.wpm, accuracy: last.accuracy, at: last.at }, completedAt: r ? r.completed_at : null },
    runs: list,
  });
}

/* ---------------- GET /api/user/history ---------------- */
export async function getHistory(request, env) {
  const { user } = await requireSession(env, request);
  const q = new URL(request.url).searchParams;
  const to = RULES.isDay(q.get('to')) ? q.get('to') : todayOf(q.get('today'));
  const from = RULES.isDay(q.get('from')) ? q.get('from') : RULES.addDays(to, -400);
  await ensureUser(env, user.id);
  const rows = (await env.DB.prepare('SELECT * FROM daily_totals WHERE user_id = ?1 AND day >= ?2 AND day <= ?3 ORDER BY day').bind(user.id, from, to).all()).results;
  return json({ from, to, days: rows.map((d) => ({ date: d.day, minutes: Math.round(d.seconds / 60), seconds: d.seconds, runs: d.runs, steps: d.steps,
    bestWpm: d.best_wpm, avgAccuracy: d.acc_count ? Math.round((d.acc_sum / d.acc_count) * 10) / 10 : null, xp: d.xp, questsDone: d.quests_done, active: !!d.active })) });
}

/* ---------------- POST /api/user/import ---------------- */
const clampNum = (v, max) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n * 10) / 10, max) : 0; };
/**
 * Adds a guest's browser progress to the account. Accepts today's format
 * { importId, progress:{ l1:{stars,bestWpm,bestAcc} }, state:{keyStats,bigramLatency,errorClasses,streak} }
 * and, from the new app, events:[…] (the guest's own runs with their ids).
 * Each lesson's result arrives as an import event: the better result per lesson
 * is kept, and the same import id is never added twice.
 */
export async function importCore(env, userId, body, today) {
  const importId = body.importId;
  if (typeof importId !== 'string' || !ID_RE.test(importId)) throw fieldError({ importId: 'Missing or invalid import id.' });
  await ensureUser(env, userId);
  if (await env.DB.prepare('SELECT 1 FROM guest_imports WHERE user_id = ?1 AND import_id = ?2').bind(userId, importId).first()) {
    return { imported: false, reason: 'already_imported' };
  }
  const now = nowIso();
  let rejected = [];
  // the guest's own events (new app): saved like any other, each id once
  if (Array.isArray(body.events)) {
    const list = body.events.slice(0, 2000);
    for (let i = 0; i < list.length; i += 100) rejected = rejected.concat((await processEvents(env, userId, list.slice(i, i + 100))).rejected);
  }
  const base = { type: 'import', gameId: null, step: null, kind: null, errors: 0, seconds: 0, score: null, xpClaim: 0, hour: null, legacy: false, source: 'import' };
  const evs = [];
  const progress = body.progress && typeof body.progress === 'object' && !Array.isArray(body.progress) ? body.progress : {};
  for (const [lessonId, p] of Object.entries(progress)) {
    if (!META.BY_ID[lessonId] || !p || typeof p !== 'object') continue;
    const stars = Math.min(3, Math.floor(clampNum(p.stars, 3)));
    const wpm = clampNum(p.bestWpm, 400), accuracy = clampNum(p.bestAcc ?? p.bestAccuracy, 100);
    if (!stars && !wpm && !accuracy) continue;
    evs.push({ ...base, id: `${importId}:${lessonId}`, lessonId, wpm, accuracy, stars, crown: p.crown === true ? 1 : 0, data: { imported: 1 }, day: today, at: now });
  }
  const lessons = evs.length;
  const sk = body.state && body.state.streak;
  if (sk && RULES.isDay(sk.lastDate) && sk.lastDate <= today && Number(sk.count) > 0) {
    for (let i = Math.min(400, Math.floor(Number(sk.count))) - 1; i >= 0; i--) {
      const d = RULES.addDays(sk.lastDate, -i);
      evs.push({ ...base, id: `${importId}:day:${d}`, lessonId: null, wpm: 0, accuracy: 0, stars: null, crown: 0, data: { imported: 1 }, day: d, at: d + 'T12:00:00.000Z' });
    }
  }
  await processEvents(env, userId, evs, { internal: true, extra: () => [
    env.DB.prepare('INSERT INTO guest_imports (user_id, import_id, lessons, at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (user_id, import_id) DO NOTHING').bind(userId, importId, lessons, now),
  ] });
  const st = body.state && typeof body.state === 'object' ? body.state : {};
  const stats = {};
  for (const k of ['keyStats', 'bigramLatency', 'errorClasses']) if (st[k] && typeof st[k] === 'object' && Object.keys(st[k]).length) stats[k] = st[k];
  if (Object.keys(stats).length) { try { await saveStats(env, userId, `${importId}:stats`, stats); } catch { /* bad stats never block the progress */ } }
  return { imported: true, lessonsImported: lessons, rejected };
}

export async function postImport(request, env) {
  const { user } = await requireSession(env, request);
  const body = await readJson(request, 1024 * 1024);
  const today = todayOf(body.today);
  const r = await importCore(env, user.id, body, today);
  return json({ ...r, ...(await buildState(env, user.id, today)) });
}

/* ---------------- GET /api/user/export ---------------- */
const EXPORT_TABLES = ['lesson_scores', 'user_position', 'daily_totals', 'xp_ledger', 'daily_quests', 'badges', 'certificates', 'placement',
  'user_settings', 'workshop_unlocks', 'game_bests', 'ghost_replays', 'daily_results', 'feedback', 'key_stats', 'bigram_stats', 'error_classes',
  'guest_imports', 'user_learning_progress', 'user_activity', 'user_state'];
export async function getExport(request, env) {
  const { user } = await requireSession(env, request);
  await ensureUser(env, user.id);
  const DB = env.DB;
  const res = await DB.batch([
    DB.prepare('SELECT xp, clean_tail, streak_count, streak_best, streak_last, freezes, updated_at FROM user_totals WHERE user_id = ?1').bind(user.id),
    ...EXPORT_TABLES.map((t) => DB.prepare(`SELECT * FROM ${t} WHERE user_id = ?1`).bind(user.id)),
  ]);
  const events = [];
  let after = 0;
  for (;;) {
    const page = (await DB.prepare('SELECT * FROM events WHERE user_id = ?1 AND rid > ?2 ORDER BY rid LIMIT 1000').bind(user.id, after).all()).results;
    for (const e of page) { const { rid, user_id: _u, ...rest } = e; let data = null; try { data = e.data ? JSON.parse(e.data) : null; } catch { data = e.data; } events.push({ ...rest, data }); }
    if (page.length < 1000) break;
    after = page[page.length - 1].rid;
  }
  const strip = (rows) => rows.map(({ user_id: _u, ...rest }) => rest);
  const out = { exportedAt: nowIso(), format: 'typecraft-export-1', profile: user, totals: res[0].results[0] || null, events };
  EXPORT_TABLES.forEach((t, i) => { out[t] = strip(res[i + 1].results); });
  return json(out, 200, { 'Content-Disposition': `attachment; filename="typecraft-export-${nowIso().slice(0, 10)}.json"` });
}

/* ---------------- GET /api/user/ghosts/:key ---------------- */
export async function getGhost(request, env, ctx, params) {
  const { user } = await requireSession(env, request);
  if (!/^[\w:.-]{1,40}$/.test(params.key)) throw new HttpError(404, 'not_found', 'Not found.');
  const g = await env.DB.prepare('SELECT ghost_key, score, replay, at FROM ghost_replays WHERE user_id = ?1 AND ghost_key = ?2').bind(user.id, params.key).first();
  let replay = null; if (g) { try { replay = JSON.parse(g.replay); } catch { replay = null; } }
  return json({ ghost: g ? { key: g.ghost_key, score: g.score, replay, at: g.at } : null });
}

