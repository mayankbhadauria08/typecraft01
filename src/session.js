// Server-managed sessions, rate limiting and email delivery.
import { HttpError, readCookie, sessionCookie, SESSION_COOKIE, nowIso } from './http.js';
import { randomToken, sha256Hex } from './crypto.js';

const DAY = 24 * 60 * 60 * 1000;
const REMEMBER_MS = 30 * DAY;       // "remember me": 30 days, renewed while you keep using it
const BROWSER_SESSION_MS = 12 * 60 * 60 * 1000; // otherwise: until the browser closes, at most 12 hours
const RENEW_WHEN_LEFT_MS = 15 * DAY;
const TOUCH_EVERY_MS = 10 * 60 * 1000;

/* ---------- sessions ---------- */
export async function createSession(env, userId, persistent) {
  const token = randomToken();
  const now = Date.now();
  const expires = new Date(now + (persistent ? REMEMBER_MS : BROWSER_SESSION_MS)).toISOString();
  await env.DB.prepare(
    'INSERT INTO sessions (id, user_id, persistent, created_at, last_seen_at, expires_at) VALUES (?1, ?2, ?3, ?4, ?4, ?5)'
  ).bind(await sha256Hex(token), userId, persistent ? 1 : 0, new Date(now).toISOString(), expires).run();
  return sessionCookie(token, persistent ? REMEMBER_MS / 1000 : null);
}

/** The signed-in user for this request, or null. Also renews long sessions as they are used. */
export async function getSession(env, request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token || token.length > 100) return null;
  const id = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT s.id AS session_id, s.persistent, s.last_seen_at, s.expires_at,
            u.id, u.full_name, u.email, u.phone_number, u.email_verified, u.created_at, u.last_login_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ?1 AND s.expires_at > ?2 AND u.account_status = 'active'`
  ).bind(id, nowIso()).first();
  if (!row) return null;

  const now = Date.now();
  let setCookie = null;
  if (row.persistent && Date.parse(row.expires_at) - now < RENEW_WHEN_LEFT_MS) {
    await env.DB.prepare('UPDATE sessions SET expires_at = ?2, last_seen_at = ?3 WHERE id = ?1')
      .bind(id, new Date(now + REMEMBER_MS).toISOString(), new Date(now).toISOString()).run();
    setCookie = sessionCookie(token, REMEMBER_MS / 1000);
  } else if (now - Date.parse(row.last_seen_at) > TOUCH_EVERY_MS) {
    await env.DB.prepare('UPDATE sessions SET last_seen_at = ?2 WHERE id = ?1').bind(id, new Date(now).toISOString()).run();
  }
  return { sessionId: id, user: publicUser(row), setCookie };
}

export async function requireSession(env, request) {
  const s = await getSession(env, request);
  if (!s) throw new HttpError(401, 'not_signed_in', 'Your session has ended. Please sign in again.');
  return s;
}

export async function endSession(env, request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (token && token.length <= 100) {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(await sha256Hex(token)).run();
  }
}

export function publicUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phoneNumber: row.phone_number,
    emailVerified: !!row.email_verified,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

/* ---------- rate limiting (fixed windows in D1) ---------- */
/** Counts one attempt; returns false once `limit` attempts happened inside the window. */
export async function hitLimit(env, key, limit, windowSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    `INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)
     ON CONFLICT (key) DO UPDATE SET
       count        = CASE WHEN rate_limits.window_start <= ?2 - ?3 THEN 1  ELSE rate_limits.count + 1 END,
       window_start = CASE WHEN rate_limits.window_start <= ?2 - ?3 THEN ?2 ELSE rate_limits.window_start END
     RETURNING count`
  ).bind(key, now, windowSeconds).first();
  return row.count <= limit;
}

/** True if the key has already used up its window, without counting this check. */
export async function isLimited(env, key, limit, windowSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare('SELECT window_start, count FROM rate_limits WHERE key = ?1').bind(key).first();
  return !!row && row.window_start > now - windowSeconds && row.count >= limit;
}

export async function clearLimit(env, key) {
  await env.DB.prepare('DELETE FROM rate_limits WHERE key = ?1').bind(key).run();
}

export function tooMany(minutes) {
  return new HttpError(429, 'rate_limited', `Too many attempts. Please wait ${minutes} minutes and try again.`);
}

/* ---------- email (Resend) ---------- */
export function emailEnabled(env) {
  return !!(env.RESEND_API_KEY && env.EMAIL_FROM);
}

export function appUrl(env, request) {
  return (env.APP_URL || new URL(request.url).origin).replace(/\/+$/, '');
}

export async function sendEmail(env, { to, subject, text }) {
  if (!emailEnabled(env)) {
    throw new HttpError(503, 'email_not_configured', "Email sending isn't set up for this site yet, so no email could be sent.");
  }
  const html = text
    .split('\n\n')
    .map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/(https?:\/\/\S+)/g, '<a href="$1">$1</a>').replace(/\n/g, '<br>')}</p>`)
    .join('');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text, html }),
  });
  if (!res.ok) {
    console.error('email provider rejected a message:', res.status);
    throw new HttpError(502, 'email_failed', "We couldn't send the email just now. Please try again in a few minutes.");
  }
}
