# Setting up accounts (Cloudflare D1)

TypeCraft works without any of this: until the database is connected, the site behaves exactly as before, saving progress in the browser and showing no sign-in button. These steps turn on accounts. You need about 20–30 minutes and a browser; no Node or Git is required.

## 1. Create the database and its tables

1. In the [Cloudflare dashboard](https://dash.cloudflare.com), open **Storage & Databases → D1 SQL Database → Create**.
2. Name it **`typecraft`** (exactly). Leave the location on automatic. Click **Create**.
3. On the database's page, copy the **Database ID** (a long code like `3f2a…-…`). You need it in step 2.
4. Open the database's **Console** tab. Paste the whole contents of [`migrations/0001_accounts.sql`](migrations/0001_accounts.sql) and click **Execute**.
   - It only creates tables. It's safe to run again if you're unsure whether it worked.
   - To check it worked, run `SELECT name FROM sqlite_master WHERE type = 'table';`. You should see `users`, `sessions`, `password_reset_tokens`, `email_tokens`, `user_learning_progress`, `user_activity`, `user_state` and `rate_limits`.

## 2. Connect the Worker to the database

The connection lives in `wrangler.jsonc`, because every deploy from GitHub uses that file. (A binding added only in the dashboard would be removed by the next deploy.)

Either send the Database ID to Claude, or edit it yourself:

1. On GitHub, open `wrangler.jsonc` and click the pencil (**Edit**).
2. In the 8 lines under `ACCOUNTS DATABASE`, delete the `// ` at the start of each line.
3. Replace `PASTE_YOUR_D1_DATABASE_ID_HERE` with your Database ID, then commit.

Once that change is on `main`, Cloudflare's Workers Builds redeploys the site automatically within a minute or two. You can watch it in the dashboard under **Workers & Pages → typecraft01 → Deployments**.

## 3. Check it

Open https://typecraft01.mayankbhadauria08.workers.dev. A **sign in** button now appears at the right of the header.

1. Create your account. If this browser has guest progress, TypeCraft offers to add it to your account. Nothing in this browser is deleted.
2. Finish a lesson, then open the site in a different browser (or a private window) and sign in. The lesson shows as completed, and **Continue** takes you to the next one.

## 4. Email (optional, for "Forgot password" and changing your email)

Without email, sign-up, sign-in, profile, change password and progress all work. "Forgot password" and "Change email" say plainly that email isn't set up; they never pretend to send anything. **Set this up before you need it:** without it, a forgotten password can't be reset from the site.

TypeCraft sends email through [Resend](https://resend.com):

1. Sign up at resend.com **with the email address you use for TypeCraft**, then create an **API key** (permission: *Sending access*).
2. In Cloudflare: **Workers & Pages → typecraft01 → Settings → Variables and Secrets → Add**, and add these as type **Secret**:

| Name | Value |
|---|---|
| `RESEND_API_KEY` | the API key from Resend (starts with `re_`) |
| `EMAIL_FROM` | `TypeCraft <onboarding@resend.dev>` |
| `APP_URL` *(optional)* | `https://typecraft01.mayankbhadauria08.workers.dev` (the address used in email links; if not set, the site's own address is used) |

Saving a secret applies it right away. Secrets are kept across deploys and never appear in the code.

`onboarding@resend.dev` can only send to the email address of your own Resend account, which is all you need when TypeCraft is just for you. To send to anyone else, add and verify a domain you own in Resend, then set `EMAIL_FROM` to an address on it, such as `TypeCraft <no-reply@yourdomain.com>`.

## Command-line alternative (if you install Node later)

```sh
npx wrangler login
npx wrangler d1 create typecraft                          # prints the database_id for wrangler.jsonc
npx wrangler d1 migrations apply typecraft --remote       # creates the tables
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put EMAIL_FROM
npx wrangler deploy                                       # or push to main and let Workers Builds deploy
```

Local development (Node 22.13 or newer):

```sh
npx wrangler d1 migrations apply typecraft --local
npx wrangler dev                                          # http://localhost:8787 with a local D1
node --test tests/api.test.mjs                            # API tests, no wrangler needed
node tests/server.mjs 8788                                # the Worker on http://localhost:8788 with an in-memory database
```

For local email testing, create a file `.dev.vars` (it is git-ignored) containing `RESEND_API_KEY=…` and `EMAIL_FROM=…`.

## How it fits together

| Path | What it is |
|---|---|
| `index.html` | The whole app, as before. Accounts are section 13 of its script. |
| `src/index.js` | The Worker: `/api/*` routes, plus a daily clean-up of expired sessions and links. Everything else is served straight from `index.html`. |
| `src/auth.js`, `src/account.js`, `src/progress.js` | Sign-in and passwords; profile and account deletion; learning progress. |
| `src/session.js`, `src/http.js`, `src/crypto.js` | Sessions, rate limits, email, request checks, validation, password hashing. |
| `migrations/` | The database tables (`0001_accounts.sql`). |
| `tests/` | API tests and a local test server. `tests/d1-shim.mjs` stands in for D1 using Node's built-in SQLite. |
| `wrangler.jsonc`, `.assetsignore`, `_headers` | Worker config; files kept private; security headers. |

### API

All responses are JSON: `{ "ok": true, … }` or `{ "ok": false, "error": { "code", "message", "fields"? } }`.

| Method & path | Purpose |
|---|---|
| `GET /api/auth/me` | Signed-in user (or `null`), and whether email is set up |
| `POST /api/auth/signup` | Create an account and sign in |
| `POST /api/auth/login` · `POST /api/auth/logout` · `POST /api/auth/logout-all` | Sign in; sign out here; sign out everywhere |
| `POST /api/auth/forgot-password` · `POST /api/auth/reset-password` | Email a reset link; set a new password with it |
| `POST /api/auth/change-password` | Change password (needs the current one) |
| `POST /api/auth/verify-email` · `POST /api/auth/resend-verification` | Confirm an email link; send a new one |
| `GET /api/user/profile` · `PUT /api/user/profile` | Read; update name and phone |
| `POST /api/user/email-change` | Email a link that changes the address once opened |
| `POST /api/user/delete` | Delete the account and all of its data (needs the password) |
| `GET /api/user/progress` | Every lesson's status, analytics state, recent runs, summary |
| `GET /api/user/progress/summary` · `GET /api/user/progress/current` | Dashboard numbers; where to continue |
| `POST /api/user/progress/lesson-start` · `PUT /api/user/progress/position` | Mark a lesson in progress and remember the stage |
| `POST /api/user/progress/lesson-complete` | Record a finished run (idempotent by `eventId`) |
| `PUT /api/user/progress/state` | Per-key accuracy, rhythm, coach tallies, streak |
| `POST /api/user/progress/import` | Add guest progress to the account (once; never lowers anything) |

### Security

- **Passwords:** PBKDF2-SHA256 with 100,000 iterations (the most Workers allows) and a random salt per password. Never stored or logged in plain text.
- **Sessions:** a random 256-bit token in a `__Host-` cookie (HttpOnly, Secure, SameSite=Lax). Only its SHA-256 is stored. Sessions last 30 days with "keep me signed in" (renewed while you use the site), otherwise until the browser closes (12 hours at most). Each sign-in gets a new session; changing or resetting the password ends all others.
- **CSRF:** every write must be JSON from the site's own origin.
- **Rate limits:** sign-in (30 tries per 15 minutes per IP; 8 wrong passwords per 15 minutes per account), sign-up, reset emails and password changes.
- **No account enumeration on sign-in or forgot-password:** the same message for unknown emails and wrong passwords. (Sign-up has to say when an email is already registered; it is rate-limited.)
- **Reset and email links:** 256-bit random, stored hashed, single-use, expire in 1 hour (reset) or 24 hours (email). The token is taken out of the address bar as soon as the page reads it.
- **Data isolation:** every query uses the user id from the verified session; ids sent by the browser are ignored.
- **Data handling:** parameterised SQL only. Deleting an account removes all of its data.

### How progress is saved

- **Guests:** progress stays in the browser (`typingMaster*` keys), exactly as before.
- **Signed in:** D1 is the source of truth.
  - Opening a lesson or changing stage saves your position. Finishing a run is sent at once. Per-key stats and the streak are sent 2 seconds after they change.
  - Saves wait in a queue in the browser until the server confirms them, retrying with back-off when offline. The header shows *saving… / saved / unable to sync — retrying*.
  - Every run carries its own id, so a retry is never counted twice.
- **Lesson status:**
  - A lesson is **completed** once every stage is finished with at least 80% accuracy (1 star), the rule the dashboard already used. It never goes back.
  - Opening a lesson only marks it **in progress**.
  - Best WPM, accuracy and stars only ever go up.
