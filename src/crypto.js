// Password hashing and random tokens, using only the Web Crypto API built into Workers.

const enc = new TextEncoder();

// Workers caps PBKDF2 at 100,000 iterations; with a random 16-byte salt per
// password this is the strongest password hash available without a WASM build.
const PBKDF2_ITERATIONS = 100000;

function toBase64(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function fromBase64(str) {
  const s = atob(str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
function toHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Returns "pbkdf2_sha256$<iterations>$<salt b64>$<hash b64>". */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password, stored) {
  const parts = typeof stored === 'string' ? stored.split('$') : [];
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') return false;
  const iterations = parseInt(parts[1], 10);
  if (!(iterations > 0 && iterations <= PBKDF2_ITERATIONS)) return false;
  const actual = await pbkdf2(password, fromBase64(parts[2]), iterations);
  return constantTimeEqual(actual, fromBase64(parts[3]));
}

// Used when no account matches, so a wrong email takes as long as a wrong password.
let dummyHash = null;
export async function burnPasswordCheck(password) {
  if (!dummyHash) dummyHash = await hashPassword('timing-equaliser-1');
  await verifyPassword(String(password || ''), dummyHash);
}

/** 32 random bytes as URL-safe text: used for session, reset and email tokens. */
export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** What the database stores in place of a token: its SHA-256, hex-encoded. */
export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return toHex(new Uint8Array(digest));
}

export function uuid() {
  return crypto.randomUUID();
}
