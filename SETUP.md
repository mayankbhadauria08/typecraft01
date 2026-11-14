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

## 5. Upgrade the database for the next version (migration 0002)

The next version saves every run, step and game as an event and works out every total (stars, best speed, XP, rank, streak, quests, badges) from them. Its tables come from [`migrations/0002_next.sql`](migrations/0002_next.sql). It only adds tables and indexes: nothing that exists today is changed or deleted, and it is safe to run twice. Run it **before** deploying the next version, and only after you have approved it.

**With Node (recommended):**

```sh
npx wrangler d1 migrations apply typecraft --remote
```

Wrangler lists the migrations it will apply and asks before it changes anything. If 0001 was run by hand in the console, Wrangler may offer to apply it again too; that is harmless (it only creates tables that don't exist yet).

**Without Node, in the D1 console** (Storage & Databases → D1 → typecraft → Console). The console breaks on `--` comments, so paste this single line instead of the file, then click **Execute**:

```sql
CREATE TABLE IF NOT EXISTS events (rid INTEGER PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE, id TEXT NOT NULL, type TEXT NOT NULL, lesson_id TEXT, game_id TEXT, step INTEGER, kind TEXT, wpm REAL, accuracy REAL, errors INTEGER, seconds REAL, stars INTEGER, crown INTEGER NOT NULL DEFAULT 0, score INTEGER, xp INTEGER NOT NULL DEFAULT 0, day TEXT NOT NULL, hour INTEGER, device_at TEXT, server_at TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'app', data TEXT, UNIQUE (user_id, id)); CREATE INDEX IF NOT EXISTS events_user_order ON events (user_id, rid); CREATE INDEX IF NOT EXISTS events_user_lesson ON events (user_id, lesson_id, rid); CREATE INDEX IF NOT EXISTS events_server_at ON events (server_at); CREATE TABLE IF NOT EXISTS lesson_scores (user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE, lesson_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'not_started', step INTEGER NOT NULL DEFAULT 0, stars INTEGER NOT NULL DEFAULT 0, crown INTEGER NOT NULL DEFAULT 0, best_wpm REAL NOT NULL DEFAULT 0, best_accuracy REAL NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0, last_wpm REAL, last_accuracy REAL, last_played TEXT, completed_at TEXT, boss_won INTEGER NOT NULL DEFAULT 0, updated_at TEXT, PRIMARY KEY (user_id, lesson_id)); CREATE TABLE IF NOT EXISTS user_position (user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE, lesson_id TEXT NOT NULL, step INTEGER NOT NULL DEFAULT 0, device_at TEXT, server_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS stats_batches (user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE, id TEXT NOT NULL, token TEXT NOT NULL, at TEXT NOT NULL, PRIMARY KEY (user_id, id)); CREATE TABLE IF NOT EXISTS key_stats (user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE, k TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, errors INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, k)); CREATE TABLE IF NOT EXISTS bigram_stats (user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE, pair TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, total_ms INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, pair)); CREATE TABLE IF NOT EXISTS error_classes (user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE, cls TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, cls)); CREATE TABLE IF NOT EXISTS daily_totals (user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE, day TEXT NOT NULL, seconds REAL NOT NULL DEFAULT 0, runs INTEGER NOT NULL DEFAULT 0, steps INTEGER NOT NULL DEFAULT 0, best_wpm REAL NOT NULL DEFAULT 0, acc_sum REAL NOT NULL DEFAULT 0, acc_count INTEGER NOT NULL DEFAULT 0, xp INTEGER NOT NULL DEFAULT 0, quests_done INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, day)); CREATE TABLE IF NOT EXISTS user_totals (user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE, rev TEXT NOT NULL, xp INTEGER NOT NULL DEFAULT 0, clean_tail INTEGER NOT NULL DEFAULT 0, streak_count INTEGER NOT NULL DEFAULT 0, streak_best INTEGER NOT NULL DEFAULT 0, streak_last TEXT, freezes TEXT NOT NULL DEFAULT '[]', updated_at TEXT, rebuilt_at TEXT); CREATE TABLE IF NOT EXISTS pipeline_guard (ok INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS xp_ledger (user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE, source TEXT NOT NULL, ref TEXT NOT NULL, xp INTEGER NOT NULL, day TEXT NOT NULL, at TEXT NOT NULL, PRIMARY KEY (user_id, source, ref)); CREATE TABLE IF NOT EXISTS daily_quests (user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE, day TEXT NOT NULL, quest_id TEXT NOT NULL, progress INTEGER NOT NULL DEFAULT 0, goal INTEGER NOT NULL, done_at TEXT, PRIMARY KEY (user_id, day, quest_id)); CREATE TABLE IF NOT EXISTS badges (user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE, badge_id TEXT NOT NULL, at TEXT NOT NULL, event_id TEXT, PRIMARY KEY (user_id, badge_id)); CREATE TABLE IF NOT EXISTS certificates (user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE, level INTEGER NOT NULL, wpm REAL NOT NULL, accuracy REAL NOT NULL, seconds REAL NOT NULL, lesson_id TEXT, event_id TEXT, at TEXT NOT NULL, PRIMARY KEY (user_id, level)); CREATE TABLE IF NOT EXISTS placement (user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE, level INTEGER NOT NULL, wpm REAL NOT NULL, accuracy REAL NOT NULL, seconds REAL NOT NULL, event_id TEXT, at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS user_settings (user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE, value TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS workshop_unlocks (user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE, item_id TEXT NOT NULL, at TEXT NOT NULL, PRIMARY KEY (user_id, item_id)); CREATE TABLE IF NOT EXISTS game_bests (user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE, game_id TEXT NOT NULL, best INTEGER NOT NULL DEFAULT 0, runs INTEGER NOT NULL DEFAULT 0, best_at TEXT, PRIMARY KEY (user_id, game_id)); CREATE TABLE IF NOT EXISTS ghost_replays (user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE, ghost_key TEXT NOT NULL, score REAL NOT NULL, replay TEXT NOT NULL CHECK (length(replay) <= 20480), at TEXT NOT NULL, PRIMARY KEY (user_id, ghost_key)); CREATE TABLE IF NOT EXISTS daily_results (user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE, day TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0, wpm REAL NOT NULL DEFAULT 0, accuracy REAL NOT NULL DEFAULT 0, event_id TEXT, at TEXT NOT NULL, PRIMARY KEY (user_id, day)); CREATE TABLE IF NOT EXISTS feedback (user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE, id TEXT NOT NULL, kind TEXT, rating INTEGER, text TEXT NOT NULL, page TEXT, at TEXT NOT NULL, PRIMARY KEY (user_id, id)); CREATE INDEX IF NOT EXISTS feedback_at ON feedback (at); CREATE TABLE IF NOT EXISTS guest_imports (user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE, import_id TEXT NOT NULL, lessons INTEGER NOT NULL DEFAULT 0, at TEXT NOT NULL, PRIMARY KEY (user_id, import_id)); CREATE TABLE IF NOT EXISTS event_rejects (user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE, day TEXT NOT NULL, reason TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, day, reason)); CREATE INDEX IF NOT EXISTS event_rejects_day ON event_rejects (day); CREATE TABLE IF NOT EXISTS rebuild_runs (id INTEGER PRIMARY KEY, started_at TEXT NOT NULL, finished_at TEXT, users INTEGER NOT NULL DEFAULT 0, differences INTEGER NOT NULL DEFAULT 0, errors INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS rebuild_diffs (run_id INTEGER NOT NULL, user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE, table_name TEXT NOT NULL, row_key TEXT NOT NULL, stored TEXT, rebuilt TEXT, at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS rebuild_diffs_user ON rebuild_diffs (user_id); CREATE INDEX IF NOT EXISTS rebuild_diffs_run ON rebuild_diffs (run_id);
```

To check it worked: `SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;` now also lists `events`, `lesson_scores`, `daily_totals`, `user_totals`, `xp_ledger`, `badges` and the rest (33 tables in all).

Existing accounts need nothing else: the first time a learner is seen after the upgrade, their saved runs, stars, best speeds, streak, key statistics and position are copied into the new tables automatically, and the old tables are left as they are.

### The owner's health page

`/admin` shows learners, active learners and runs today, refused or failed events, and the differences found by the nightly check (that number should be zero). Only the emails in the `OWNER_EMAILS` secret can open it; everyone else gets "Not found".

In Cloudflare: **Workers & Pages → typecraft01 → Settings → Variables and Secrets → Add**, type **Secret**, name `OWNER_EMAILS`, value your TypeCraft sign-in email (several are separated by commas). Or: `npx wrangler secret put OWNER_EMAILS`.

### The nightly check

The Cron Trigger in `wrangler.jsonc` (21:17 UTC) cleans up expired sessions and then rebuilds every learner's totals from their saved events, compares them with the stored totals, corrects any difference and records it (`rebuild_runs`, `rebuild_diffs`). On the Workers Free plan a scheduled run gets very little CPU time; if the health page shows the rebuild as unfinished or with errors, the Paid plan's longer limit is the fix.

## Command-line alternative (if you install Node later)

```sh
npx wrangler login
npx wrangler d1 create typecraft                          # prints the database_id for wrangler.jsonc
npx wrangler d1 migrations apply typecraft --remote       # creates the tables (0001, then 0002)
npx wrangler secret put OWNER_EMAILS                      # who may open /admin
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put EMAIL_FROM
npx wrangler deploy                                       # or push to main and let Workers Builds deploy
```

Local development (Node 22.13 or newer):

```sh
npx wrangler d1 migrations apply typecraft --local
npx wrangler dev                                          # http://localhost:8787 with a local D1
node --test tests/api.test.mjs tests/next.test.mjs        # API tests, no wrangler needed
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
| `src/pipeline.js`, `src/api.js`, `src/admin.js` | Next version: the event pipeline and nightly rebuild; the learner APIs; the owner's health numbers and `/admin`. |
| `shared/rewards-rules.js` | Badges, daily quests, XP, streak freezes, certificates and Workshop unlocks: one set of rules for the browser and the server. |
| `admin.html` | The owner's health page (served by the Worker to `OWNER_EMAILS` only). |
| `migrations/` | The database tables (`0001_accounts.sql`, `0002_next.sql`). |
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
| `GET /api/user/state` | Next version: everything the app needs at start (every lesson's scorecard, position, totals, XP and rank, streak, today's quests, badges, certificates, unlocks, settings, game bests, placement, typing statistics). `?today=YYYY-MM-DD` is the learner's local date |
| `POST /api/user/events` | `{events:[…], today}`, at most 100. Each event has a browser-made `id`; ids already saved are ignored; invalid events are refused one by one (`sync.rejected`) and the rest saved. Answers with fresh state, `sync` and `awarded` |
| `PUT /api/user/position` | `{lessonId, step}`: the lesson and step just opened or finished (latest by server time wins) |
| `POST /api/user/stats` | `{id, keyStats, bigramLatency, errorClasses}`: counts to add (not totals); each batch id counts once |
| `PUT /api/user/settings` | Theme, effects, sound, daily goal, finger guide, and Workshop items in use (only unlocked ones) |
| `GET /api/user/lessons/:id` | One lesson's scorecard and every run |
| `GET /api/user/history` | Daily totals (`?from=&to=`, default the last 400 days) |
| `POST /api/user/import` | Guest progress: today's format or `events:[…]`; each import id once, the better result per lesson |
| `GET /api/user/export` | All of the learner's data as a JSON download |
| `POST /api/user/reset` | Clears the learner's progress (body `{ "confirm": "RESET" }`); the account stays |
| `GET /api/user/ghosts/:key` | A saved Ghost Race replay |
| `GET /api/admin/health` | Owner only (`OWNER_EMAILS`) |

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

### How progress is saved in the next version

- **Every write is an event** with an id made in the browser: `{ id, type:'step'|'run'|'game'|'quest'|'placement'|'feedback', at, tz, lessonId?, step?, kind?, gameId?, wpm, accuracy, errors, seconds, stars?, crown?, score?, xp? (games, 0–50), data?, ghost? }`. `tz` is minutes east of UTC (`-new Date().getTimezoneOffset()`); it decides the learner's local day (streak, quests, calendar) and hour (Early Bird, Night Owl). `step` is the 0-based index into the lesson's steps.
- **The server checks every number** (speed 0–400, accuracy 0–100, seconds 0–7,200, a lesson id from `shared/course-meta.js`, a known game, game XP 0–50) and works out stars and crowns itself; a claim is never more than the numbers allow.
- **One transaction per batch:** the new events, then lesson scores, daily totals, XP and its ledger, streak, quests, badges, certificates and game bests, with the rules in `shared/rewards-rules.js`. Counters are added in single statements. If two devices save at the same moment, the later batch starts again from the fresh totals, so nothing is lost and the best result per lesson wins.
- **Today's routes keep working.** A run saved through `/api/user/progress/lesson-complete` is also saved as an event with the same id, so the old and new apps never count it twice; runs of lessons 1–24 from the new app also update the old lesson table.
- **Every night** the totals are rebuilt from the events and compared with the stored ones (see step 5).
