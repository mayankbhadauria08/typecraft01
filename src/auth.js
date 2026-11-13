// Sign up, sign in, sign out, password reset and password change.
import {
  HttpError, json, readJson, clientIp, fieldError, cleanName, cleanEmail, cleanPhone, checkPassword,
  clearSessionCookie, nowIso,
} from './http.js';
import { hashPassword, verifyPassword, burnPasswordCheck, randomToken, sha256Hex, uuid } from './crypto.js';
import {
  createSession, getSession, requireSession, endSession, publicUser, hitLimit, isLimited, clearLimit, tooMany,
  emailEnabled, sendEmail, appUrl,
} from './session.js';

const HOUR = 60 * 60 * 1000;
const WRONG_LOGIN = 'Email or password is incorrect.';

function requireMatch(password, confirm, fields, key = 'confirmPassword') {
  if (password !== confirm) fields[key] = "The two passwords don't match.";
}

/* ---------- email links ---------- */
export async function sendVerificationEmail(env, request, user, newEmail = null) {
  const token = randomToken();
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO email_tokens (id, user_id, purpose, new_email, token_hash, expires_at, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  ).bind(uuid(), user.id, newEmail ? 'change' : 'verify', newEmail, await sha256Hex(token),
    new Date(Date.now() + 24 * HOUR).toISOString(), now).run();
  const link = `${appUrl(env, request)}/#verify=${token}`;
  await sendEmail(env, {
    to: newEmail || user.email,
    subject: newEmail ? 'Confirm your new TypeCraft email' : 'Confirm your TypeCraft email',
    text: `Hi ${user.fullName},\n\n` +
      (newEmail ? `To make ${newEmail} the email for your TypeCraft account, open this link:` : 'To confirm this email address for your TypeCraft account, open this link:') +
      `\n\n${link}\n\nThe link works once and expires in 24 hours. If you didn't ask for this, you can ignore this email.`,
  });
}

/* ---------- routes ---------- */
export async function signup(request, env) {
  const body = await readJson(request);
  const fields = {};
  const name = cleanName(body.fullName); if (name.error) fields.fullName = name.error;
  const email = cleanEmail(body.email); if (email.error) fields.email = email.error;
  const phone = cleanPhone(body.phoneNumber); if (phone.error) fields.phoneNumber = phone.error;
  const pw = checkPassword(body.password, { email: email.value }); if (pw) fields.password = pw;
  requireMatch(body.password, body.confirmPassword, fields);
  if (Object.keys(fields).length) throw fieldError(fields);

  if (!(await hitLimit(env, `signup-ip:${clientIp(request)}`, 10, 3600))) throw tooMany(60);

  const taken = await env.DB.prepare('SELECT 1 FROM users WHERE email = ?1').bind(email.value).first();
  const takenError = () => fieldError({ email: 'An account with this email already exists. Sign in, or reset your password.' });
  if (taken) throw takenError();

  const id = uuid();
  const now = nowIso();
  try {
    await env.DB.prepare(
      `INSERT INTO users (id, full_name, email, phone_number, password_hash, created_at, updated_at, last_login_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?6)`
    ).bind(id, name.value, email.value, phone.value, await hashPassword(body.password), now).run();
  } catch (e) {
    if (/UNIQUE/i.test(String(e && e.message))) throw takenError(); // two sign-ups for one email at once
    throw e;
  }
  const cookie = await createSession(env, id, body.remember !== false);
  const user = { id, fullName: name.value, email: email.value, phoneNumber: phone.value, emailVerified: false, createdAt: now, lastLoginAt: now };

  let verificationSent = false;
  if (emailEnabled(env)) {
    try { await sendVerificationEmail(env, request, user); verificationSent = true; } catch { /* the account still works; they can resend from the profile */ }
  }
  return json({ user, verificationSent }, 201, { 'Set-Cookie': cookie });
}

export async function login(request, env) {
  const body = await readJson(request);
  const email = cleanEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  if (email.error || !password) throw fieldError(email.error ? { email: email.error } : { password: 'Enter your password.' });

  if (!(await hitLimit(env, `login-ip:${clientIp(request)}`, 30, 900))) throw tooMany(15);
  const failKey = `login-fail:${email.value}`;
  if (await isLimited(env, failKey, 8, 900)) throw tooMany(15);

  const row = await env.DB.prepare(
    'SELECT id, full_name, email, phone_number, email_verified, created_at, password_hash, account_status FROM users WHERE email = ?1'
  ).bind(email.value).first();
  const ok = row ? await verifyPassword(password, row.password_hash) : (await burnPasswordCheck(password), false);
  if (!ok) {
    await hitLimit(env, failKey, 8, 900);
    throw new HttpError(401, 'wrong_credentials', WRONG_LOGIN);
  }
  if (row.account_status !== 'active') throw new HttpError(403, 'account_disabled', 'This account has been disabled.');

  await clearLimit(env, failKey);
  await endSession(env, request); // a fresh session id on every sign-in
  const now = nowIso();
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET last_login_at = ?2 WHERE id = ?1').bind(row.id, now),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1 AND expires_at <= ?2').bind(row.id, now),
  ]);
  const cookie = await createSession(env, row.id, body.remember !== false);
  return json({ user: publicUser({ ...row, last_login_at: now }) }, 200, { 'Set-Cookie': cookie });
}

export async function logout(request, env) {
  await endSession(env, request);
  return json({}, 200, { 'Set-Cookie': clearSessionCookie() });
}

export async function logoutEverywhere(request, env) {
  const { user } = await requireSession(env, request);
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(user.id).run();
  return json({}, 200, { 'Set-Cookie': clearSessionCookie() });
}

export async function me(request, env) {
  const s = await getSession(env, request);
  const headers = s && s.setCookie ? { 'Set-Cookie': s.setCookie } : {};
  return json({ user: s ? s.user : null, emailEnabled: emailEnabled(env) }, 200, headers);
}

export async function forgotPassword(request, env, ctx) {
  const body = await readJson(request);
  const email = cleanEmail(body.email);
  if (email.error) throw fieldError({ email: email.error });
  // Said the same way for every address, so it never reveals whether an account exists.
  if (!emailEnabled(env)) throw new HttpError(503, 'email_not_configured', "Password reset emails aren't set up for this site yet.");
  if (!(await hitLimit(env, `forgot-ip:${clientIp(request)}`, 10, 3600))) throw tooMany(60);

  const message = "If an account uses that email, we've sent it a link to reset the password. The link expires in 1 hour.";
  if (!(await hitLimit(env, `forgot-email:${email.value}`, 3, 3600))) return json({ message });

  const user = await env.DB.prepare("SELECT id, full_name FROM users WHERE email = ?1 AND account_status = 'active'").bind(email.value).first();
  if (user) {
    const token = randomToken();
    const now = nowIso();
    await env.DB.batch([
      // only the newest link works
      env.DB.prepare('UPDATE password_reset_tokens SET used_at = ?2 WHERE user_id = ?1 AND used_at IS NULL').bind(user.id, now),
      env.DB.prepare('INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5)')
        .bind(uuid(), user.id, await sha256Hex(token), new Date(Date.now() + HOUR).toISOString(), now),
    ]);
    const link = `${appUrl(env, request)}/#reset=${token}`;
    // sent in the background so the response takes the same time whether or not the account exists
    const send = sendEmail(env, {
      to: email.value,
      subject: 'Reset your TypeCraft password',
      text: `Hi ${user.full_name},\n\nSomeone (hopefully you) asked to reset the password for your TypeCraft account. To choose a new password, open this link:\n\n${link}\n\nThe link works once and expires in 1 hour. If you didn't ask for this, ignore this email; your password stays the same.`,
    }).catch(() => {});
    if (ctx && ctx.waitUntil) ctx.waitUntil(send); else await send;
  }
  return json({ message });
}

export async function resetPassword(request, env) {
  const body = await readJson(request);
  const token = typeof body.token === 'string' ? body.token : '';
  const invalid = new HttpError(400, 'invalid_token', 'This reset link is invalid, already used, or expired. Request a new one.');
  if (!token || token.length > 100) throw invalid;

  const row = await env.DB.prepare(
    `SELECT t.id AS token_id, t.expires_at, t.used_at, u.id, u.email FROM password_reset_tokens t
       JOIN users u ON u.id = t.user_id WHERE t.token_hash = ?1`
  ).bind(await sha256Hex(token)).first();
  if (!row || row.used_at || Date.parse(row.expires_at) <= Date.now()) throw invalid;

  const fields = {};
  const pw = checkPassword(body.password, { email: row.email }); if (pw) fields.password = pw;
  requireMatch(body.password, body.confirmPassword, fields);
  if (Object.keys(fields).length) throw fieldError(fields);

  const now = nowIso();
  // claim the token first: if two requests race, only one gets changes = 1
  const claim = await env.DB.prepare('UPDATE password_reset_tokens SET used_at = ?2 WHERE id = ?1 AND used_at IS NULL').bind(row.token_id, now).run();
  if (!claim.meta || claim.meta.changes !== 1) throw invalid;

  await env.DB.batch([
    // a reset link proves the person reads this inbox, so the email counts as verified
    env.DB.prepare('UPDATE users SET password_hash = ?2, password_changed_at = ?3, updated_at = ?3, email_verified = 1 WHERE id = ?1')
      .bind(row.id, await hashPassword(body.password), now),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(row.id),
    env.DB.prepare('UPDATE password_reset_tokens SET used_at = ?2 WHERE user_id = ?1 AND used_at IS NULL').bind(row.id, now),
    env.DB.prepare('DELETE FROM rate_limits WHERE key = ?1').bind(`login-fail:${row.email}`),
  ]);
  return json({ message: 'Your password has been changed. Sign in with your new password.' }, 200, { 'Set-Cookie': clearSessionCookie() });
}

export async function changePassword(request, env) {
  const { user } = await requireSession(env, request);
  const body = await readJson(request);
  if (!(await hitLimit(env, `pw-change:${user.id}`, 10, 3600))) throw tooMany(60);

  const row = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?1').bind(user.id).first();
  if (!(await verifyPassword(String(body.currentPassword || ''), row.password_hash))) {
    throw fieldError({ currentPassword: "That isn't your current password." });
  }
  const fields = {};
  const pw = checkPassword(body.newPassword, { email: user.email }); if (pw) fields.newPassword = pw;
  else if (body.newPassword === body.currentPassword) fields.newPassword = 'Choose a password different from your current one.';
  requireMatch(body.newPassword, body.confirmPassword, fields);
  if (Object.keys(fields).length) throw fieldError(fields);

  const now = nowIso();
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash = ?2, password_changed_at = ?3, updated_at = ?3 WHERE id = ?1')
      .bind(user.id, await hashPassword(body.newPassword), now),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(user.id), // signs out every other device
  ]);
  const cookie = await createSession(env, user.id, true); // and keeps this one signed in, with a new session id
  return json({ message: 'Password changed. Other devices have been signed out.' }, 200, { 'Set-Cookie': cookie });
}

export async function verifyEmail(request, env) {
  const body = await readJson(request);
  const token = typeof body.token === 'string' ? body.token : '';
  const invalid = new HttpError(400, 'invalid_token', 'This confirmation link is invalid, already used, or expired.');
  if (!token || token.length > 100) throw invalid;
  const row = await env.DB.prepare('SELECT id, user_id, purpose, new_email, expires_at, used_at FROM email_tokens WHERE token_hash = ?1')
    .bind(await sha256Hex(token)).first();
  if (!row || row.used_at || Date.parse(row.expires_at) <= Date.now()) throw invalid;

  const now = nowIso();
  const claim = await env.DB.prepare('UPDATE email_tokens SET used_at = ?2 WHERE id = ?1 AND used_at IS NULL').bind(row.id, now).run();
  if (!claim.meta || claim.meta.changes !== 1) throw invalid;

  if (row.purpose === 'verify') {
    await env.DB.prepare('UPDATE users SET email_verified = 1, updated_at = ?2 WHERE id = ?1').bind(row.user_id, now).run();
    return json({ message: 'Email confirmed.' });
  }
  try {
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET email = ?2, email_verified = 1, updated_at = ?3 WHERE id = ?1').bind(row.user_id, row.new_email, now),
      env.DB.prepare("UPDATE email_tokens SET used_at = ?2 WHERE user_id = ?1 AND purpose = 'change' AND used_at IS NULL").bind(row.user_id, now),
    ]);
  } catch (e) {
    if (/UNIQUE/i.test(String(e && e.message))) throw new HttpError(409, 'email_taken', 'Another account started using that email in the meantime.');
    throw e;
  }
  return json({ message: `Your email is now ${row.new_email}.` });
}

export async function resendVerification(request, env) {
  const { user } = await requireSession(env, request);
  if (user.emailVerified) return json({ message: 'Your email is already confirmed.' });
  if (!(await hitLimit(env, `verify-send:${user.id}`, 3, 3600))) throw tooMany(60);
  await sendVerificationEmail(env, request, user);
  return json({ message: `We've sent a confirmation link to ${user.email}.` });
}
