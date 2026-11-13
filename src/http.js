// Responses, cookies, request checks and input validation shared by every route.

export class HttpError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

const API_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

export function json(data, status = 200, extraHeaders = {}) {
  const headers = new Headers(API_HEADERS);
  for (const [k, v] of Object.entries(extraHeaders)) {
    if (Array.isArray(v)) v.forEach((one) => headers.append(k, one));
    else headers.set(k, v);
  }
  return new Response(JSON.stringify({ ok: status < 400, ...data }), { status, headers });
}

export function errorResponse(err) {
  if (err instanceof HttpError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.fields) body.error.fields = err.fields;
    return json(body, err.status);
  }
  // Never log request bodies, passwords, tokens or emails: only what failed.
  console.error('unhandled error:', err && err.name, err && err.message);
  return json({ error: { code: 'server_error', message: 'Something went wrong on our side. Please try again.' } }, 500);
}

/* ---------- cookies ---------- */
// __Host- cookies must be Secure, Path=/ and have no Domain: they can't be set
// or overwritten by any other site or subdomain. Browsers treat
// http://localhost as secure, so this also works with `wrangler dev`.
export const SESSION_COOKIE = '__Host-tc_session';

export function readCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export function sessionCookie(token, maxAgeSeconds /* null = until the browser closes */) {
  let c = `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax`;
  if (maxAgeSeconds != null) c += `; Max-Age=${Math.floor(maxAgeSeconds)}`;
  return c;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

/* ---------- request checks ---------- */
// CSRF protection for cookie-authenticated writes: a cross-site page can't send
// a JSON body without a CORS preflight (which this API never approves), and the
// Origin / Sec-Fetch-Site headers must say the request came from this site.
export function assertSameOriginWrite(request) {
  const type = (request.headers.get('Content-Type') || '').toLowerCase();
  if (!type.startsWith('application/json')) {
    throw new HttpError(415, 'bad_content_type', 'Requests must be sent as JSON.');
  }
  const origin = request.headers.get('Origin');
  const self = new URL(request.url).origin;
  if (origin && origin !== self) throw new HttpError(403, 'bad_origin', 'Request refused.');
  const site = request.headers.get('Sec-Fetch-Site');
  if (!origin && site && site !== 'same-origin' && site !== 'none') throw new HttpError(403, 'bad_origin', 'Request refused.');
}

export async function readJson(request, maxBytes = 256 * 1024) {
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, 'too_large', 'That request is too large.');
  if (!text) return {};
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('not an object');
    return data;
  } catch {
    throw new HttpError(400, 'bad_json', 'The request could not be read.');
  }
}

export function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'local';
}

/* ---------- validation ---------- */
export function fieldError(fields) {
  const first = Object.values(fields)[0];
  return new HttpError(400, 'invalid_input', first, fields);
}

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

export function cleanName(value) {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!name) return { error: 'Enter your name.' };
  if (name.length > 100) return { error: 'Keep your name under 100 characters.' };
  if (CONTROL_CHARS.test(name)) return { error: 'Your name contains characters that are not allowed.' };
  return { value: name };
}

export function cleanEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!email) return { error: 'Enter your email address.' };
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address.' };
  return { value: email };
}

export function cleanPhone(value) {
  const phone = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!phone) return { error: 'Enter your phone number.' };
  const digits = phone.replace(/\D/g, '');
  if (!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
    return { error: 'Enter a valid phone number (7–15 digits, optionally starting with +).' };
  }
  return { value: phone };
}

export function checkPassword(password, { email } = {}) {
  if (typeof password !== 'string' || password.length < 8) return 'Use at least 8 characters.';
  if (password.length > 128) return 'Keep your password under 128 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Use at least one letter and one number.';
  if (email && password.toLowerCase() === email.toLowerCase()) return "Your password can't be your email address.";
  return null;
}

export function nowIso() {
  return new Date().toISOString();
}
