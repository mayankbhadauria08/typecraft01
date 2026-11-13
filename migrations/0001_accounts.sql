-- TypeCraft accounts, sessions and learning progress.
-- Additive only: creates new tables, never drops or rewrites data, and is safe to run twice.
-- Apply with:  npx wrangler d1 migrations apply typecraft --remote
-- Timestamps are ISO-8601 UTC strings (e.g. 2026-11-14T09:30:00.000Z).

-- One row per account. Profile details (name, phone) live here too: a
-- separate user_profiles table would only duplicate these columns.
CREATE TABLE IF NOT EXISTS users (
  id                  TEXT PRIMARY KEY,               -- random UUID
  full_name           TEXT NOT NULL,
  email               TEXT NOT NULL,                  -- always stored lower-case
  phone_number        TEXT NOT NULL,
  password_hash       TEXT NOT NULL,                  -- PBKDF2-SHA256, never plaintext
  email_verified      INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0, 1)),
  account_status      TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'disabled')),
  password_changed_at TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  last_login_at       TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);

-- Server-side sessions. The cookie holds a random token; only its SHA-256 is stored.
CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,                      -- SHA-256 hex of the session token
  user_id      TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  persistent   INTEGER NOT NULL DEFAULT 1,            -- 1 = "remember me" (30 days), 0 = browser session
  created_at   TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires ON sessions (expires_at);

-- Forgot-password links: hashed, single-use, expire after 1 hour.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS password_reset_tokens_user ON password_reset_tokens (user_id);

-- Email verification and email-change links: hashed, single-use, expire after 24 hours.
CREATE TABLE IF NOT EXISTS email_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  purpose    TEXT NOT NULL CHECK (purpose IN ('verify', 'change')),
  new_email  TEXT,                                    -- only for purpose = 'change'
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS email_tokens_user ON email_tokens (user_id);

-- One row per user per lesson. TypeCraft has a single course, so there is no course_id.
-- A lesson is 'completed' once every stage has been finished with at least 80% accuracy
-- (1 star), the same rule the dashboard already used for "cleared". It never goes back.
CREATE TABLE IF NOT EXISTS user_learning_progress (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  lesson_id             TEXT NOT NULL,
  lesson_status         TEXT NOT NULL DEFAULT 'in_progress' CHECK (lesson_status IN ('not_started', 'in_progress', 'completed')),
  completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  current_stage         INTEGER NOT NULL DEFAULT 0,  -- stage to resume at (0 = Characters)
  stars                 INTEGER NOT NULL DEFAULT 0 CHECK (stars BETWEEN 0 AND 3),
  best_wpm              INTEGER NOT NULL DEFAULT 0,
  best_accuracy         INTEGER NOT NULL DEFAULT 0,
  attempts              INTEGER NOT NULL DEFAULT 0,  -- finished runs
  started_at            TEXT,
  completed_at          TEXT,
  last_activity_at      TEXT,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  UNIQUE (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS user_learning_progress_recent ON user_learning_progress (user_id, last_activity_at);

-- History of finished runs and other meaningful events. client_event_id makes
-- retried saves idempotent: the same event can never be recorded twice.
CREATE TABLE IF NOT EXISTS user_activity (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  activity_type   TEXT NOT NULL,                      -- lesson_completed | guest_import
  lesson_id       TEXT,
  activity_data   TEXT,                               -- JSON: wpm, accuracy, errors, seconds, stars
  client_event_id TEXT,
  created_at      TEXT NOT NULL,
  UNIQUE (user_id, client_event_id)
);
CREATE INDEX IF NOT EXISTS user_activity_recent ON user_activity (user_id, created_at);

-- The rest of the learning state the app keeps per user, one JSON value per key:
-- keyStats (per-key accuracy), bigramLatency (rhythm), errorClasses (coach),
-- streak, and position (the lesson and stage you were last on).
CREATE TABLE IF NOT EXISTS user_state (
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  key        TEXT NOT NULL CHECK (key IN ('keyStats', 'bigramLatency', 'errorClasses', 'streak', 'position')),
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, key)
);

-- Fixed-window counters for rate limiting sign-in, sign-up and email sending.
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,                      -- unix seconds
  count        INTEGER NOT NULL
);
