// The event pipeline: every write is an event with a browser-made id. Saving a
// batch saves its new events and, in the same D1 batch (one transaction), every
// total they change: lesson scores, daily totals, XP and its ledger, streak,
// quests, badges, certificates, game bests. The rules are shared/rewards-rules.js,
// the same code the browser uses, and the same code the nightly rebuild runs over
// every saved event, so the stored totals can always be checked against the events.
//
// Concurrency: user_totals.rev is a token. A batch reads the totals, works out the
// changes, then writes them only if rev is still what it read (otherwise the
// insert into pipeline_guard fails, the whole batch rolls back and is retried with
// fresh data). Counters are written as "x = x + delta" in single statements.
import '../shared/course-meta.js';
import '../shared/rewards-rules.js';
import { HttpError, nowIso } from './http.js';
import { uuid } from './crypto.js';

export const META = globalThis.TC_META;
export const RULES = globalThis.TC_RULES;
const DAY_MS = 86400000;

/* ---------------- derived tables ---------------- */
export const SPECS = {
  lesson_scores: { key: ['lesson_id'], cols: ['status', 'step', 'stars', 'crown', 'best_wpm', 'best_accuracy', 'attempts', 'last_wpm', 'last_accuracy', 'last_played', 'completed_at', 'boss_won'], add: ['attempts'] },
  daily_totals: { key: ['day'], cols: ['seconds', 'runs', 'steps', 'best_wpm', 'acc_sum', 'acc_count', 'xp', 'quests_done', 'active'], add: ['seconds', 'runs', 'steps', 'acc_sum', 'acc_count', 'xp', 'quests_done'] },
  daily_quests: { key: ['day', 'quest_id'], cols: ['progress', 'goal', 'done_at'] },
  badges: { key: ['badge_id'], cols: ['at', 'event_id'] },
  certificates: { key: ['level'], cols: ['wpm', 'accuracy', 'seconds', 'lesson_id', 'event_id', 'at'] },
  placement: { key: [], cols: ['level', 'wpm', 'accuracy', 'seconds', 'event_id', 'at'] },
  workshop_unlocks: { key: ['item_id'], cols: ['at'] },
  game_bests: { key: ['game_id'], cols: ['best', 'runs', 'best_at'], add: ['runs'] },
  daily_results: { key: ['day'], cols: ['score', 'wpm', 'accuracy', 'event_id', 'at'] },
  xp_ledger: { key: ['source', 'ref'], cols: ['xp', 'day', 'at'] },
};
const TOTAL_COLS = ['xp', 'clean_tail', 'streak_count', 'streak_best', 'streak_last', 'freezes'];
const keyOf = (t, row) => SPECS[t].key.map((k) => String(row[k])).join('|');

function same(a, b) {
  if (a == null || b == null) return a == null && b == null;
  if (typeof a === 'number' || typeof b === 'number') return Math.abs(Number(a) - Number(b)) < 1e-6;
  return String(a) === String(b);
}
const sameRow = (a, b, cols) => cols.every((c) => same(a[c], b[c]));

function upsertSql(table, mode) {
  const spec = SPECS[table];
  const all = [...spec.key, ...spec.cols];
  const sel = all.map((c) => `json_extract(value, '$.${c}')`).join(', ');
  const conflict = ['user_id', ...spec.key].join(', ');
  const upd = spec.cols.map((c) => (mode === 'delta' && (spec.add || []).includes(c) ? `${c} = ${table}.${c} + excluded.${c}` : `${c} = excluded.${c}`)).join(', ');
  return `INSERT INTO ${table} (user_id, ${all.join(', ')}) SELECT ?1, ${sel} FROM json_each(?2) WHERE 1 ORDER BY key ON CONFLICT (${conflict}) DO UPDATE SET ${upd}`;
}
function deleteSql(table) {
  const spec = SPECS[table];
  if (!spec.key.length) return `DELETE FROM ${table} WHERE user_id = ?1`;
  const cond = spec.key.map((k) => `${k} = json_extract(value, '$.${k}')`).join(' AND ');
  return `DELETE FROM ${table} WHERE user_id = ?1 AND EXISTS (SELECT 1 FROM json_each(?2) WHERE ${cond})`;
}

/* ---------------- state <-> rows ---------------- */
export function rowsToState(stored) {
  const s = RULES.emptyState();
  const T = stored.tables;
  for (const r of T.lesson_scores.values()) s.lessons[r.lesson_id] = { status: r.status, step: r.step, stars: r.stars, crown: r.crown, bestWpm: r.best_wpm, bestAccuracy: r.best_accuracy, attempts: r.attempts, lastWpm: r.last_wpm, lastAccuracy: r.last_accuracy, lastPlayed: r.last_played, completedAt: r.completed_at, bossWon: r.boss_won };
  for (const r of T.daily_totals.values()) s.days[r.day] = { seconds: r.seconds, runs: r.runs, steps: r.steps, bestWpm: r.best_wpm, accSum: r.acc_sum, accCount: r.acc_count, xp: r.xp, questsDone: r.quests_done, active: r.active };
  for (const r of T.daily_quests.values()) (s.quests[r.day] ||= {})[r.quest_id] = { progress: r.progress, goal: r.goal, doneAt: r.done_at };
  for (const r of T.badges.values()) s.badges[r.badge_id] = { at: r.at, eventId: r.event_id };
  for (const r of T.certificates.values()) s.certificates[r.level] = { wpm: r.wpm, accuracy: r.accuracy, seconds: r.seconds, lessonId: r.lesson_id, eventId: r.event_id, at: r.at };
  for (const r of T.placement.values()) s.placement = { level: r.level, wpm: r.wpm, accuracy: r.accuracy, seconds: r.seconds, eventId: r.event_id, at: r.at };
  for (const r of T.workshop_unlocks.values()) s.unlocks[r.item_id] = r.at;
  for (const r of T.game_bests.values()) s.games[r.game_id] = { best: r.best, runs: r.runs, bestAt: r.best_at };
  for (const r of T.daily_results.values()) s.daily[r.day] = { score: r.score, wpm: r.wpm, accuracy: r.accuracy, eventId: r.event_id, at: r.at };
  const t = stored.totals;
  if (t) {
    s.xp = t.xp; s.cleanTail = t.clean_tail;
    let freezes = []; try { freezes = JSON.parse(t.freezes || '[]'); } catch { freezes = []; }
    s.streak = { count: t.streak_count, best: t.streak_best, lastDate: t.streak_last, freezes };
  }
  return s;
}

export function stateToRows(s) {
  const out = Object.fromEntries(Object.keys(SPECS).map((t) => [t, new Map()]));
  const put = (t, row) => out[t].set(keyOf(t, row), row);
  for (const [id, L] of Object.entries(s.lessons)) put('lesson_scores', { lesson_id: id, status: L.status, step: L.step, stars: L.stars, crown: L.crown, best_wpm: L.bestWpm, best_accuracy: L.bestAccuracy, attempts: L.attempts, last_wpm: L.lastWpm, last_accuracy: L.lastAccuracy, last_played: L.lastPlayed, completed_at: L.completedAt, boss_won: L.bossWon });
  for (const [day, D] of Object.entries(s.days)) put('daily_totals', { day, seconds: D.seconds, runs: D.runs, steps: D.steps, best_wpm: D.bestWpm, acc_sum: D.accSum, acc_count: D.accCount, xp: D.xp, quests_done: D.questsDone, active: D.active });
  for (const [day, qs] of Object.entries(s.quests)) for (const [qid, q] of Object.entries(qs)) put('daily_quests', { day, quest_id: qid, progress: q.progress, goal: q.goal, done_at: q.doneAt });
  for (const [id, b] of Object.entries(s.badges)) put('badges', { badge_id: id, at: b.at, event_id: b.eventId });
  for (const [lv, c] of Object.entries(s.certificates)) put('certificates', { level: Number(lv), wpm: c.wpm, accuracy: c.accuracy, seconds: c.seconds, lesson_id: c.lessonId, event_id: c.eventId, at: c.at });
  if (s.placement) put('placement', { level: s.placement.level, wpm: s.placement.wpm, accuracy: s.placement.accuracy, seconds: s.placement.seconds, event_id: s.placement.eventId, at: s.placement.at });
  for (const [id, at] of Object.entries(s.unlocks)) put('workshop_unlocks', { item_id: id, at });
  for (const [id, g] of Object.entries(s.games)) put('game_bests', { game_id: id, best: g.best, runs: g.runs, best_at: g.bestAt });
  for (const [day, d] of Object.entries(s.daily)) put('daily_results', { day, score: d.score, wpm: d.wpm, accuracy: d.accuracy, event_id: d.eventId, at: d.at });
  if (s.ledger) for (const l of Object.values(s.ledger)) put('xp_ledger', { source: l.source, ref: l.ref, xp: l.xp, day: l.day, at: l.at });
  return out;
}
const totalsRow = (s) => ({ xp: s.xp, clean_tail: s.cleanTail, streak_count: s.streak.count, streak_best: s.streak.best, streak_last: s.streak.lastDate, freezes: JSON.stringify(s.streak.freezes || []) });

/** Reads the stored totals of a user. questDays limits daily_quests to those days (null = all). */
export async function loadStored(env, userId, { questDays = null, ledger = false } = {}) {
  const DB = env.DB;
  const tables = Object.keys(SPECS).filter((t) => ledger || t !== 'xp_ledger');
  const stmts = tables.map((t) => (t === 'daily_quests' && questDays
    ? DB.prepare('SELECT * FROM daily_quests WHERE user_id = ?1 AND day IN (SELECT value FROM json_each(?2))').bind(userId, JSON.stringify(questDays))
    : DB.prepare(`SELECT * FROM ${t} WHERE user_id = ?1`).bind(userId)));
  stmts.push(DB.prepare('SELECT * FROM user_totals WHERE user_id = ?1').bind(userId));
  const res = await DB.batch(stmts);
  const out = { tables: {}, totals: res[res.length - 1].results[0] || null };
  tables.forEach((t, i) => { const m = new Map(); for (const r of res[i].results) m.set(keyOf(t, r), r); out.tables[t] = m; });
  if (!ledger) out.tables.xp_ledger = new Map();
  return out;
}

/* ---------------- event validation ---------------- */
const TYPES = ['step', 'run', 'game', 'quest', 'placement', 'feedback'];
const KINDS = ['watch', 'character', 'mixed', 'word', 'paragraph', 'challenge', 'timed', 'sprint', 'boss', 'intro', 'lock', 'exam'];
const ID_RE = /^[\w:.-]{8,100}$/;
const bad = (code, message) => ({ error: { code, message } });
const round1 = (n) => Math.round(n * 10) / 10;
function numField(raw, name, min, max, { required = false, int = false, def = 0 } = {}) {
  const v = raw[name];
  if (v == null || v === '') return required ? { err: `${name} is required.` } : { v: def };
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < min || n > max) return { err: `${name} must be a number from ${min} to ${max}.` };
  return { v: int ? Math.round(n) : round1(n) };
}
const dayNum = (d) => Math.round(Date.parse(d + 'T00:00:00Z') / DAY_MS);

/** Checks one event from the browser and returns { event } or { error:{code,message} }. Nothing unchecked is kept. */
export function normalizeEvent(raw, now, { legacy = false } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return bad('bad_event', 'Each event must be an object.');
  if (typeof raw.id !== 'string' || !ID_RE.test(raw.id)) return bad('bad_id', 'Missing or invalid event id.');
  if (!TYPES.includes(raw.type)) return bad('bad_type', 'Unknown event type.');
  const type = raw.type;
  const nowMs = Date.parse(now);
  const t = raw.at == null ? nowMs : Date.parse(raw.at);
  if (!Number.isFinite(t) || t > nowMs + DAY_MS || t < nowMs - 400 * DAY_MS) return bad('bad_time', 'The event time is not sensible.');
  let tz = null;
  if (raw.tz != null) { tz = Number(raw.tz); if (!Number.isInteger(tz) || Math.abs(tz) > 840) return bad('bad_tz', 'tz must be minutes from UTC (-840 to 840).'); }
  const local = new Date(t + (tz || 0) * 60000);
  let day = local.toISOString().slice(0, 10);
  if (RULES.isDay(raw.day) && Math.abs(dayNum(raw.day) - dayNum(new Date(t).toISOString().slice(0, 10))) <= 1) day = raw.day;
  const e = { id: raw.id, type, lessonId: null, gameId: null, step: null, kind: null, wpm: 0, accuracy: 0, errors: 0, seconds: 0,
    stars: null, crown: 0, score: null, xpClaim: 0, data: {}, day, hour: tz == null ? null : local.getUTCHours(), at: new Date(t).toISOString(),
    legacy: !!legacy, source: legacy ? 'legacy' : 'app' };

  if (type === 'step' || type === 'run') {
    if (!META.BY_ID[raw.lessonId]) return bad('bad_lesson', 'Unknown lesson.');
    e.lessonId = raw.lessonId;
  } else if (type === 'placement' && raw.lessonId != null) return bad('bad_lesson', 'A placement test has no lesson.');
  if (type === 'game') {
    if (!RULES.GAMES.includes(raw.gameId)) return bad('bad_game', 'Unknown game.');
    e.gameId = raw.gameId;
  }
  if (raw.step != null) {
    if (typeof raw.step === 'string' && KINDS.includes(raw.step)) e.kind = raw.step;
    else if (Number.isInteger(raw.step) && raw.step >= 0 && raw.step <= 9) e.step = raw.step;
    else return bad('bad_step', 'step must be a step number from 0 to 9.');
  }
  if (raw.kind != null) { if (!KINDS.includes(raw.kind)) return bad('bad_step', 'Unknown step kind.'); e.kind = raw.kind; }
  if (type === 'step' && e.step == null && e.kind == null) return bad('bad_step', 'A step event needs its step.');

  const typing = type === 'step' || type === 'run' || type === 'placement';
  const checks = [
    ['wpm', numField(raw, 'wpm', 0, 400, { required: typing && !(e.kind === 'watch' || e.kind === 'intro') })],
    ['accuracy', numField(raw, 'accuracy', 0, 100, { required: typing && !(e.kind === 'watch' || e.kind === 'intro') })],
    ['errors', numField(raw, 'errors', 0, 100000, { int: true })],
    ['seconds', numField(raw, 'seconds', 0, type === 'placement' ? 900 : 7200)],
  ];
  if (raw.stars != null) checks.push(['stars', numField(raw, 'stars', 0, 3, { int: true })]);
  if (type === 'game') {
    checks.push(['score', numField(raw, 'score', 0, 10000000, { int: true, required: true })]);
    checks.push(['xpClaim', numField({ xpClaim: raw.xp }, 'xpClaim', 0, RULES.XP.gameMax, { int: true })]);
  }
  for (const [k, r] of checks) { if (r.err) return bad('bad_number', r.err); e[k] = r.v; }
  if (raw.stars == null) e.stars = null;
  if (!legacy && (type === 'step' || type === 'run') && e.wpm > 0 && e.seconds <= 0) return bad('bad_number', 'seconds must be more than 0 when there is a speed.');
  if (raw.crown != null && typeof raw.crown !== 'boolean') return bad('bad_crown', 'crown must be true or false.');
  e.crown = raw.crown === true ? 1 : 0;

  if (raw.data != null) {
    if (typeof raw.data !== 'object' || Array.isArray(raw.data)) return bad('bad_data', 'data must be an object.');
    const text = JSON.stringify(raw.data);
    if (text.length > (type === 'feedback' ? 6000 : 2048)) return bad('too_large', 'The event data is too large.');
    e.data = JSON.parse(text);
  }
  if (type === 'game') e.data.xpClaim = e.xpClaim;
  if (type === 'feedback') {
    const txt = typeof e.data.text === 'string' ? e.data.text.trim() : '';
    if (!txt || txt.length > 4000) return bad('bad_feedback', 'Feedback needs some text (at most 4,000 characters).');
    e.feedback = { text: txt, kind: typeof e.data.kind === 'string' ? e.data.kind.slice(0, 40) : null,
      rating: Number.isInteger(e.data.rating) && e.data.rating >= 0 && e.data.rating <= 5 ? e.data.rating : null,
      page: typeof e.data.page === 'string' ? e.data.page.slice(0, 80) : null };
    e.data = { kind: e.feedback.kind, rating: e.feedback.rating };
  }
  if (type === 'quest' && (typeof e.data.action !== 'string' || !/^[\w-]{1,40}$/.test(e.data.action))) return bad('bad_quest', 'A quest event needs data.action.');
  if (raw.ghost != null) {
    if (type !== 'game') return bad('bad_ghost', 'Only a game run can carry a ghost replay.');
    const g = raw.ghost;
    if (!g || typeof g !== 'object' || typeof g.key !== 'string' || !/^[\w:.-]{1,40}$/.test(g.key)) return bad('bad_ghost', 'Invalid ghost replay.');
    const replay = JSON.stringify(g.replay ?? null);
    if (replay.length > 20480) return bad('too_large', 'A ghost replay can be at most 20 KB.');
    const sc = Number(g.score ?? (e.wpm || e.score));
    e.ghost = { key: g.key, replay, score: Number.isFinite(sc) ? sc : 0 };
  }
  if (legacy) e.data.legacy = 1;
  return { event: e };
}

/** An event as stored, turned back into the shape the rules read (for the rebuild). */
export function rowToEvent(r) {
  let data = {};
  try { data = r.data ? JSON.parse(r.data) : {}; } catch { data = {}; }
  return { id: r.id, type: r.type, lessonId: r.lesson_id, gameId: r.game_id, step: r.step, kind: r.kind, wpm: r.wpm || 0,
    accuracy: r.accuracy || 0, errors: r.errors || 0, seconds: r.seconds || 0, stars: r.stars, crown: r.crown, score: r.score,
    xpClaim: data.xpClaim || 0, data, day: r.day, hour: r.hour, at: r.device_at || r.server_at,
    legacy: r.source === 'legacy' && r.type === 'run', source: r.source };
}
const eventRow = (e, serverAt) => ({ id: e.id, type: e.type, lesson_id: e.lessonId, game_id: e.gameId, step: e.step, kind: e.kind,
  wpm: e.wpm, accuracy: e.accuracy, errors: e.errors, seconds: e.seconds, stars: e.stars, crown: e.crown ? 1 : 0, score: e.score,
  xp: e.xp || 0, day: e.day, hour: e.hour, device_at: e.at, server_at: serverAt, source: e.source || 'app',
  data: e.data && Object.keys(e.data).length ? JSON.stringify(e.data) : null });
const EVENT_COLS = ['id', 'type', 'lesson_id', 'game_id', 'step', 'kind', 'wpm', 'accuracy', 'errors', 'seconds', 'stars', 'crown', 'score', 'xp', 'day', 'hour', 'device_at', 'server_at', 'source', 'data'];
const INSERT_EVENTS = `INSERT INTO events (user_id, ${EVENT_COLS.join(', ')}) SELECT ?1, ${EVENT_COLS.map((c) => `json_extract(value, '$.${c}')`).join(', ')} FROM json_each(?2) WHERE 1 ORDER BY key`;

/* ---------------- first visit: copy old saved progress ---------------- */
/**
 * Makes sure the user has a user_totals row. The first time, old saved progress
 * (user_activity runs, user_learning_progress bests, user_state streak, position
 * and key statistics) is copied in as events, and every total is built from them.
 */
export async function ensureUser(env, userId) {
  const DB = env.DB;
  if (await DB.prepare('SELECT 1 FROM user_totals WHERE user_id = ?1').bind(userId).first()) return;
  const now = nowIso();
  const stmts = [
    DB.prepare(`INSERT OR IGNORE INTO events (user_id, id, type, lesson_id, wpm, accuracy, errors, seconds, stars, crown, xp, day, hour, device_at, server_at, source, data)
      SELECT user_id, client_event_id, 'run', lesson_id, COALESCE(json_extract(activity_data, '$.wpm'), 0), COALESCE(json_extract(activity_data, '$.accuracy'), 0),
             COALESCE(json_extract(activity_data, '$.errors'), 0), COALESCE(json_extract(activity_data, '$.seconds'), 0), json_extract(activity_data, '$.stars'), 0, 0,
             substr(created_at, 1, 10), NULL, created_at, created_at, 'legacy', '{"legacy":1}'
        FROM user_activity WHERE user_id = ?1 AND activity_type = 'lesson_completed' AND client_event_id IS NOT NULL AND lesson_id IS NOT NULL
       ORDER BY created_at`).bind(userId),
    DB.prepare(`INSERT OR IGNORE INTO events (user_id, id, type, lesson_id, wpm, accuracy, errors, seconds, stars, crown, xp, day, device_at, server_at, source, data)
      SELECT user_id, 'legacy-progress-' || lesson_id, 'import', lesson_id, best_wpm, best_accuracy, 0, 0, stars, 0, 0,
             substr(COALESCE(completed_at, last_activity_at, created_at), 1, 10), COALESCE(completed_at, last_activity_at, created_at), ?2, 'legacy', '{"legacy":1}'
        FROM user_learning_progress WHERE user_id = ?1 AND (stars > 0 OR best_wpm > 0) ORDER BY lesson_id`).bind(userId, now),
    DB.prepare(`INSERT OR IGNORE INTO user_position (user_id, lesson_id, step, device_at, server_at)
      SELECT user_id, json_extract(value, '$.lessonId'), CASE WHEN json_extract(value, '$.lessonId') = 'l24' THEN 0 ELSE COALESCE(json_extract(value, '$.stage'), 0) + 1 END,
             json_extract(value, '$.at'), updated_at
        FROM user_state WHERE user_id = ?1 AND key = 'position' AND json_extract(value, '$.lessonId') IS NOT NULL`).bind(userId),
    DB.prepare(`INSERT OR IGNORE INTO key_stats (user_id, k, attempts, errors)
      SELECT s.user_id, j.key, COALESCE(json_extract(j.value, '$.attempts'), 0), COALESCE(json_extract(j.value, '$.errors'), 0)
        FROM user_state s, json_each(s.value) j WHERE s.user_id = ?1 AND s.key = 'keyStats'`).bind(userId),
    DB.prepare(`INSERT OR IGNORE INTO bigram_stats (user_id, pair, count, total_ms)
      SELECT s.user_id, j.key, COALESCE(json_extract(j.value, '$.count'), 0), COALESCE(json_extract(j.value, '$.totalMs'), 0)
        FROM user_state s, json_each(s.value) j WHERE s.user_id = ?1 AND s.key = 'bigramLatency'`).bind(userId),
    DB.prepare(`INSERT OR IGNORE INTO error_classes (user_id, cls, n)
      SELECT s.user_id, j.key, COALESCE(j.value, 0) FROM user_state s, json_each(s.value) j
       WHERE s.user_id = ?1 AND s.key = 'errorClasses' AND j.key IN ('adjacent', 'transposition', 'omission', 'other')`).bind(userId),
  ];
  // the old streak {lastDate, count} becomes one "practised" mark per day
  const st = await DB.prepare("SELECT value FROM user_state WHERE user_id = ?1 AND key = 'streak'").bind(userId).first();
  if (st) {
    let v = null; try { v = JSON.parse(st.value); } catch { v = null; }
    if (v && RULES.isDay(v.lastDate) && v.count > 0) {
      const days = [];
      for (let i = Math.min(400, Math.floor(v.count)) - 1; i >= 0; i--) days.push(RULES.addDays(v.lastDate, -i));
      const rows = days.map((d) => ({ id: 'legacy-streak-' + d, type: 'import', day: d, device_at: d + 'T12:00:00.000Z', server_at: now, source: 'legacy', data: '{"legacy":1}', crown: 0, xp: 0 }));
      stmts.push(DB.prepare(`INSERT OR IGNORE INTO events (user_id, ${EVENT_COLS.join(', ')}) SELECT ?1, ${EVENT_COLS.map((c) => `json_extract(value, '$.${c}')`).join(', ')} FROM json_each(?2) WHERE 1 ORDER BY key`).bind(userId, JSON.stringify(rows)));
    }
  }
  await DB.batch(stmts);
  await rebuildUser(env, userId, { init: true });
}

/* ---------------- one batch of events ---------------- */
// another batch for the same learner got there first: wait a little (with jitter) and start again
const backoff = (attempt) => new Promise((r) => setTimeout(r, Math.random() * 15 * 2 ** Math.min(attempt, 5)));
const retryable = (e) => /pipeline_guard|UNIQUE constraint failed: events|UNIQUE constraint failed: user_totals/i.test(String(e && e.message));

export async function countRejects(env, userId, codes, now = nowIso()) {
  if (!codes.length) return;
  const counts = {};
  for (const c of codes) counts[c] = (counts[c] || 0) + 1;
  const day = now.slice(0, 10);
  await env.DB.batch(Object.entries(counts).map(([reason, n]) => env.DB.prepare(
    'INSERT INTO event_rejects (user_id, day, reason, n) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (user_id, day, reason) DO UPDATE SET n = n + excluded.n'
  ).bind(userId, day, reason, n)));
}

function guardStatements(env, userId, oldRev, newRev, before, after, now) {
  const DB = env.DB;
  const t = totalsRow(after);
  return [
    DB.prepare(`UPDATE user_totals SET rev = ?2, xp = xp + ?4, clean_tail = ?5, streak_count = ?6, streak_best = ?7, streak_last = ?8, freezes = ?9, updated_at = ?10
                 WHERE user_id = ?1 AND rev = ?3`).bind(userId, newRev, oldRev, after.xp - before.xp, t.clean_tail, t.streak_count, t.streak_best, t.streak_last, t.freezes, now),
    DB.prepare('INSERT INTO pipeline_guard (ok) SELECT NULL WHERE NOT EXISTS (SELECT 1 FROM user_totals WHERE user_id = ?1 AND rev = ?2)').bind(userId, newRev),
  ];
}

/** Writes the rows that changed between two states: counters as deltas, the rest as values. */
function deltaWrites(env, userId, before, after) {
  const a = stateToRows(before), b = stateToRows(after);
  const stmts = [];
  for (const t of Object.keys(SPECS)) {
    if (t === 'xp_ledger') continue;
    const spec = SPECS[t];
    const rows = [];
    for (const [k, row] of b[t]) {
      const old = a[t].get(k);
      if (old && sameRow(old, row, spec.cols)) continue;
      const out = { ...row };
      for (const c of spec.add || []) out[c] = row[c] - ((old && old[c]) || 0);
      rows.push(out);
    }
    if (rows.length) stmts.push(env.DB.prepare(upsertSql(t, 'delta')).bind(userId, JSON.stringify(rows)));
  }
  return stmts;
}

/** Keeps the old lesson table (read by the old app's routes) in step with new runs of lessons l1-l24. */
function legacyMirror(env, userId, events, now) {
  const by = {};
  for (const e of events) {
    if (e.type !== 'run' || e.legacy || !/^l([1-9]|1\d|2[0-4])$/.test(e.lessonId)) continue;
    const m = by[e.lessonId] || (by[e.lessonId] = { lesson_id: e.lessonId, stars: 0, best_wpm: 0, best_accuracy: 0, attempts: 0 });
    m.stars = Math.max(m.stars, e.stars || 0); m.best_wpm = Math.max(m.best_wpm, Math.round(e.wpm)); m.best_accuracy = Math.max(m.best_accuracy, Math.round(e.accuracy)); m.attempts++;
  }
  const rows = Object.values(by);
  if (!rows.length) return [];
  return [env.DB.prepare(
    `INSERT INTO user_learning_progress (id, user_id, lesson_id, lesson_status, completion_percentage, current_stage, stars, best_wpm, best_accuracy, attempts,
                                         started_at, completed_at, last_activity_at, created_at, updated_at)
     SELECT lower(hex(randomblob(16))), ?1, json_extract(value, '$.lesson_id'),
            CASE WHEN json_extract(value, '$.stars') >= 1 THEN 'completed' ELSE 'in_progress' END,
            CASE WHEN json_extract(value, '$.stars') >= 1 THEN 100 ELSE 0 END, 0,
            json_extract(value, '$.stars'), json_extract(value, '$.best_wpm'), json_extract(value, '$.best_accuracy'), json_extract(value, '$.attempts'),
            ?3, CASE WHEN json_extract(value, '$.stars') >= 1 THEN ?3 END, ?3, ?3, ?3
       FROM json_each(?2) WHERE 1
     ON CONFLICT (user_id, lesson_id) DO UPDATE SET
       lesson_status = CASE WHEN lesson_status = 'completed' OR excluded.stars >= 1 THEN 'completed' ELSE lesson_status END,
       completion_percentage = CASE WHEN lesson_status = 'completed' OR excluded.stars >= 1 THEN 100 ELSE completion_percentage END,
       current_stage = 0, stars = MAX(stars, excluded.stars), best_wpm = MAX(best_wpm, excluded.best_wpm),
       best_accuracy = MAX(best_accuracy, excluded.best_accuracy), attempts = attempts + excluded.attempts,
       completed_at = COALESCE(completed_at, excluded.completed_at), last_activity_at = excluded.last_activity_at, updated_at = excluded.updated_at`
  ).bind(userId, JSON.stringify(rows), now)];
}

/**
 * Saves a batch of events for a user. raw: events from the browser (or, with
 * internal:true, events made by the server). Returns { accepted, duplicates,
 * rejected, awarded }. extra(): more statements to run in the same transaction.
 */
export async function processEvents(env, userId, raw, { legacy = false, internal = false, extra = null } = {}) {
  const DB = env.DB;
  const now = nowIso();
  const rejected = [], duplicates = [], valid = [];
  const seen = new Set();
  for (const r of raw) {
    const n = internal ? { event: r } : normalizeEvent(r, now, { legacy });
    if (n.error) { rejected.push({ id: r && typeof r.id === 'string' ? r.id.slice(0, 100) : null, ...n.error }); continue; }
    if (seen.has(n.event.id)) { duplicates.push(n.event.id); continue; }
    seen.add(n.event.id); valid.push(n.event);
  }
  if (rejected.length) await countRejects(env, userId, rejected.map((r) => r.code), now);
  await ensureUser(env, userId);
  const awarded = { xp: 0, badges: [], quests: [], certificates: [], unlocks: [], rankUp: null };
  if (!valid.length && !extra) return { accepted: [], duplicates, rejected, awarded };

  for (let attempt = 0; attempt < 8; attempt++) {
    const have = new Set((await DB.prepare('SELECT id FROM events WHERE user_id = ?1 AND id IN (SELECT value FROM json_each(?2))')
      .bind(userId, JSON.stringify(valid.map((e) => e.id))).all()).results.map((r) => r.id));
    const fresh = valid.filter((e) => !have.has(e.id)).map((e) => ({ ...e, data: { ...e.data } }));
    const dups = [...duplicates, ...valid.filter((e) => have.has(e.id)).map((e) => e.id)];
    if (!fresh.length && !extra) return { accepted: [], duplicates: dups, rejected, awarded };

    const stored = await loadStored(env, userId, { questDays: [...new Set(fresh.map((e) => e.day))] });
    if (!stored.totals) { await ensureUser(env, userId); continue; }
    const before = rowsToState(stored);
    const after = structuredClone(before);
    const ledger = [];
    const got = { xp: 0, badges: [], quests: [], certificates: [], unlocks: [], rankUp: null };
    for (const e of fresh) {
      const out = RULES.apply(after, e);
      ledger.push(...out.ledger);
      got.xp += out.xp; got.badges.push(...out.badges); got.quests.push(...out.quests.map((q) => ({ id: q, day: e.day })));
      got.certificates.push(...out.certificates); got.unlocks.push(...out.unlocks);
    }
    const r0 = META.rankFor(before.xp), r1 = META.rankFor(after.xp);
    if (r1.name !== r0.name) got.rankUp = { from: r0.name, to: r1.name };

    const newRev = uuid();
    const stmts = [...guardStatements(env, userId, stored.totals.rev, newRev, before, after, now)];
    if (fresh.length) stmts.push(DB.prepare(INSERT_EVENTS).bind(userId, JSON.stringify(fresh.map((e) => eventRow(e, now)))));
    stmts.push(...deltaWrites(env, userId, before, after));
    if (ledger.length) stmts.push(DB.prepare(upsertSql('xp_ledger', 'set')).bind(userId, JSON.stringify(ledger)));
    stmts.push(...legacyMirror(env, userId, fresh, now));
    for (const e of fresh) {
      if (e.ghost) stmts.push(DB.prepare(
        `INSERT INTO ghost_replays (user_id, ghost_key, score, replay, at) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT (user_id, ghost_key) DO UPDATE SET score = excluded.score, replay = excluded.replay, at = excluded.at WHERE excluded.score > ghost_replays.score`
      ).bind(userId, e.ghost.key, e.ghost.score, e.ghost.replay, e.at));
      if (e.feedback) stmts.push(DB.prepare(
        'INSERT INTO feedback (user_id, id, kind, rating, text, page, at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ON CONFLICT (user_id, id) DO NOTHING'
      ).bind(userId, e.id, e.feedback.kind, e.feedback.rating, e.feedback.text, e.feedback.page, e.at));
    }
    if (extra) stmts.push(...extra());
    try {
      await DB.batch(stmts);
      return { accepted: fresh.map((e) => e.id), duplicates: dups, rejected, awarded: got };
    } catch (err) {
      if (!retryable(err)) throw err;
      await backoff(attempt);
    }
  }
  await countRejects(env, userId, ['busy'], now);
  throw new HttpError(503, 'busy', 'Your progress is being saved from another device. Please try again in a moment.');
}

/* ---------------- rebuild: every total again from the saved events ---------------- */
/**
 * Rebuilds a user's totals from their events and compares them with what is
 * stored. With init, the totals are created (nothing is counted as a difference).
 * Otherwise every difference is corrected and returned.
 */
export async function rebuildUser(env, userId, { init = false, runId = null } = {}) {
  const DB = env.DB;
  for (let attempt = 0; attempt < 4; attempt++) {
    const stored = await loadStored(env, userId, { ledger: true });
    if (!init && !stored.totals) { await ensureUser(env, userId); return []; }
    if (init && stored.totals) return [];
    const s = RULES.emptyState();
    s.ledger = {};
    const evFix = [];
    let after = 0;
    for (;;) {
      const page = (await DB.prepare('SELECT * FROM events WHERE user_id = ?1 AND rid > ?2 ORDER BY rid LIMIT 500').bind(userId, after).all()).results;
      for (const row of page) {
        const e = rowToEvent(row);
        const out = RULES.apply(s, e);
        for (const l of out.ledger) s.ledger[l.source + '|' + l.ref] = l;
        if (!same(row.xp, e.xp) || !same(row.stars, e.stars) || !same(row.crown, e.crown ? 1 : 0)) {
          evFix.push({ rid: row.rid, id: row.id, xp: e.xp, stars: e.stars, crown: e.crown ? 1 : 0, old: { xp: row.xp, stars: row.stars, crown: row.crown } });
        }
      }
      if (page.length < 500) break;
      after = page[page.length - 1].rid;
    }
    const want = stateToRows(s);
    // lesson rows keep their position (status in progress / not started, and step), which is not an event
    for (const [k, old] of stored.tables.lesson_scores) {
      const w = want.lesson_scores.get(k);
      if (!w) want.lesson_scores.set(k, { lesson_id: old.lesson_id, status: old.status === 'completed' ? 'in_progress' : old.status, step: old.step, stars: 0, crown: 0, best_wpm: 0, best_accuracy: 0, attempts: 0, last_wpm: null, last_accuracy: null, last_played: null, completed_at: null, boss_won: 0 });
      else { w.step = old.step; if (w.status !== 'completed') w.status = w.status === 'in_progress' || old.status !== 'not_started' ? 'in_progress' : 'not_started'; }
    }
    const now = nowIso();
    const diffs = [];
    const stmts = [];
    const newRev = uuid();
    const tw = totalsRow(s);
    if (init) {
      stmts.push(DB.prepare(`INSERT INTO user_totals (user_id, rev, xp, clean_tail, streak_count, streak_best, streak_last, freezes, updated_at, rebuilt_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)`).bind(userId, newRev, tw.xp, tw.clean_tail, tw.streak_count, tw.streak_best, tw.streak_last, tw.freezes, now));
    } else {
      const ts = stored.totals;
      for (const c of TOTAL_COLS) if (!same(ts[c], tw[c])) diffs.push({ table: 'user_totals', key: c, stored: ts[c], rebuilt: tw[c] });
      stmts.push(DB.prepare(`UPDATE user_totals SET rev = ?2, xp = ?4, clean_tail = ?5, streak_count = ?6, streak_best = ?7, streak_last = ?8, freezes = ?9, rebuilt_at = ?10
                              WHERE user_id = ?1 AND rev = ?3`).bind(userId, newRev, ts.rev, tw.xp, tw.clean_tail, tw.streak_count, tw.streak_best, tw.streak_last, tw.freezes, now));
      stmts.push(DB.prepare('INSERT INTO pipeline_guard (ok) SELECT NULL WHERE NOT EXISTS (SELECT 1 FROM user_totals WHERE user_id = ?1 AND rev = ?2)').bind(userId, newRev));
    }
    for (const t of Object.keys(SPECS)) {
      const spec = SPECS[t];
      const have = stored.tables[t];
      const fix = [], gone = [];
      for (const [k, row] of want[t]) {
        const old = have.get(k);
        if (old && sameRow(old, row, spec.cols)) continue;
        fix.push(row);
        diffs.push({ table: t, key: k, stored: old ? pick(old, spec.cols) : null, rebuilt: pick(row, spec.cols) });
      }
      for (const [k, old] of have) if (!want[t].has(k)) { gone.push(old); diffs.push({ table: t, key: k, stored: pick(old, spec.cols), rebuilt: null }); }
      if (fix.length) stmts.push(DB.prepare(upsertSql(t, 'set')).bind(userId, JSON.stringify(fix)));
      if (gone.length) stmts.push(DB.prepare(deleteSql(t)).bind(userId, JSON.stringify(gone)));
    }
    if (evFix.length) {
      stmts.push(DB.prepare(`UPDATE events SET
          xp = (SELECT json_extract(value, '$.xp') FROM json_each(?2) WHERE json_extract(value, '$.rid') = events.rid),
          stars = (SELECT json_extract(value, '$.stars') FROM json_each(?2) WHERE json_extract(value, '$.rid') = events.rid),
          crown = (SELECT json_extract(value, '$.crown') FROM json_each(?2) WHERE json_extract(value, '$.rid') = events.rid)
        WHERE user_id = ?1 AND rid IN (SELECT json_extract(value, '$.rid') FROM json_each(?2))`).bind(userId, JSON.stringify(evFix.map(({ rid, xp, stars, crown }) => ({ rid, xp, stars, crown })))));
      for (const f of evFix) diffs.push({ table: 'events', key: f.id, stored: f.old, rebuilt: { xp: f.xp, stars: f.stars, crown: f.crown } });
    }
    if (!init && diffs.length && runId != null) {
      stmts.push(DB.prepare(`INSERT INTO rebuild_diffs (run_id, user_id, table_name, row_key, stored, rebuilt, at)
        SELECT ?1, ?2, json_extract(value, '$.table'), json_extract(value, '$.key'), json_extract(value, '$.stored'), json_extract(value, '$.rebuilt'), ?3 FROM json_each(?4)`)
        .bind(runId, userId, now, JSON.stringify(diffs.slice(0, 200).map((d) => ({ table: d.table, key: d.key, stored: JSON.stringify(d.stored), rebuilt: JSON.stringify(d.rebuilt) })))));
    }
    try {
      await DB.batch(stmts);
      return init ? [] : diffs;
    } catch (err) {
      if (!retryable(err)) throw err;
    }
  }
  throw new HttpError(503, 'busy', 'Could not rebuild the totals just now.');
}
const pick = (row, cols) => Object.fromEntries(cols.map((c) => [c, row[c] ?? null]));

/** The nightly job: every user, a page at a time. Returns the run's summary. */
export async function rebuildAll(env, { pageSize = 100 } = {}) {
  const DB = env.DB;
  const started = nowIso();
  const run = await DB.prepare('INSERT INTO rebuild_runs (started_at) VALUES (?1) RETURNING id').bind(started).first();
  const runId = run.id;
  let users = 0, differences = 0, errors = 0, last = '';
  for (;;) {
    const page = (await DB.prepare('SELECT id FROM users WHERE id > ?1 ORDER BY id LIMIT ?2').bind(last, pageSize).all()).results;
    for (const u of page) {
      try { differences += (await rebuildUser(env, u.id, { runId })).length; }
      catch (err) { errors++; console.error('rebuild failed for a user:', err && err.message); }
      users++;
    }
    if (page.length < pageSize) break;
    last = page[page.length - 1].id;
  }
  await DB.prepare('UPDATE rebuild_runs SET finished_at = ?2, users = ?3, differences = ?4, errors = ?5 WHERE id = ?1')
    .bind(runId, nowIso(), users, differences, errors).run();
  return { runId, users, differences, errors };
}
