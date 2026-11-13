// TypeCraft Worker: serves index.html as a static asset and handles /api/* for
// accounts and progress. Static files never reach this code (see wrangler.jsonc).
import { HttpError, json, errorResponse, assertSameOriginWrite } from './http.js';
import * as auth from './auth.js';
import * as account from './account.js';
import * as progress from './progress.js';

const ROUTES = {
  'GET /api/auth/me': auth.me,
  'POST /api/auth/signup': auth.signup,
  'POST /api/auth/login': auth.login,
  'POST /api/auth/logout': auth.logout,
  'POST /api/auth/logout-all': auth.logoutEverywhere,
  'POST /api/auth/forgot-password': auth.forgotPassword,
  'POST /api/auth/reset-password': auth.resetPassword,
  'POST /api/auth/change-password': auth.changePassword,
  'POST /api/auth/verify-email': auth.verifyEmail,
  'POST /api/auth/resend-verification': auth.resendVerification,

  'GET /api/user/profile': account.getProfile,
  'PUT /api/user/profile': account.updateProfile,
  'POST /api/user/email-change': account.requestEmailChange,
  'POST /api/user/delete': account.deleteAccount,

  'GET /api/user/progress': progress.getProgress,
  'GET /api/user/progress/summary': progress.getSummary,
  'GET /api/user/progress/current': progress.getCurrent,
  'POST /api/user/progress/lesson-start': progress.savePosition,
  'PUT /api/user/progress/position': progress.savePosition,
  'POST /api/user/progress/lesson-complete': progress.completeLesson,
  'PUT /api/user/progress/state': progress.saveState,
  'POST /api/user/progress/import': progress.importGuest,
};

async function handleApi(request, env, ctx) {
  const { pathname } = new URL(request.url);
  const handler = ROUTES[`${request.method} ${pathname}`];
  if (!handler) {
    const known = Object.keys(ROUTES).some((r) => r.endsWith(` ${pathname}`));
    throw new HttpError(known ? 405 : 404, known ? 'method_not_allowed' : 'not_found', known ? 'Method not allowed.' : 'Not found.');
  }
  if (!env.DB) throw new HttpError(503, 'database_not_configured', "Accounts aren't available yet: the site's database isn't connected.");
  if (request.method !== 'GET') assertSameOriginWrite(request);
  return handler(request, env, ctx);
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, ctx);
      } catch (err) {
        if (/no such table/i.test(String(err && err.message))) {
          return errorResponse(new HttpError(503, 'database_not_migrated', "Accounts aren't available yet: the database's tables haven't been created (SETUP.md, step 1)."));
        }
        return errorResponse(err);
      }
    }
    return env.ASSETS.fetch(request);
  },

  // Daily clean-up: expired sessions and links, and old rate-limit windows.
  // Learning history (user_activity) is kept until the account is deleted.
  async scheduled(event, env) {
    if (!env.DB) return;
    const now = new Date().toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?1').bind(now),
      env.DB.prepare('DELETE FROM password_reset_tokens WHERE expires_at <= ?1').bind(weekAgo),
      env.DB.prepare('DELETE FROM email_tokens WHERE expires_at <= ?1').bind(weekAgo),
      env.DB.prepare('DELETE FROM rate_limits WHERE window_start < ?1').bind(Math.floor(Date.now() / 1000) - 24 * 3600),
    ]);
  },
};
