-- TypeCraft next version: events, totals, rewards, settings and the nightly check.
-- Additive only: new tables and indexes, nothing in 0001 is changed. Safe to run twice.
-- Apply with:  npx wrangler d1 migrations apply typecraft --remote
-- Every learner's row carries user_id and goes when the account is deleted.
-- Old saved progress (user_activity, user_learning_progress, user_state) is copied
-- into these tables by the Worker the first time each learner is seen (src/pipeline.js).

-- Every finished step, run, game, quest action, placement test and feedback entry.
-- id is made in the browser; the same id is never saved twice for a user.
CREATE TABLE IF NOT EXISTS events (
  rid        INTEGER PRIMARY KEY,                     -- server order
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  id         TEXT NOT NULL,
  type       TEXT NOT NULL,                           -- step | run | game | quest | placement | feedback | import
  lesson_id  TEXT,
  game_id    TEXT,
  step       INTEGER,
  kind       TEXT,                                    -- step kind: watch, character, word, paragraph, challenge, ...
  wpm        REAL,
  accuracy   REAL,
  errors     INTEGER,
  seconds    REAL,
  stars      INTEGER,
  crown      INTEGER NOT NULL DEFAULT 0,
  score      INTEGER,
  xp         INTEGER NOT NULL DEFAULT 0,              -- XP given for this event
  day        TEXT NOT NULL,                           -- learner's local date
  hour       INTEGER,                                 -- learner's local hour
  device_at  TEXT,
  server_at  TEXT NOT NULL,
  source     TEXT NOT NULL DEFAULT 'app',             -- app | legacy | import
  data       TEXT,                                    -- small JSON
  UNIQUE (user_id, id)
);
CREATE INDEX IF NOT EXISTS events_user_order ON events (user_id, rid);
CREATE INDEX IF NOT EXISTS events_user_lesson ON events (user_id, lesson_id, rid);
CREATE INDEX IF NOT EXISTS events_server_at ON events (server_at);

-- Per learner per lesson: the scorecard.
CREATE TABLE IF NOT EXISTS lesson_scores (
  user_id       TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  lesson_id     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'not_started',  -- not_started | in_progress | completed
  step          INTEGER NOT NULL DEFAULT 0,           -- step to resume at (0-based)
  stars         INTEGER NOT NULL DEFAULT 0,
  crown         INTEGER NOT NULL DEFAULT 0,
  best_wpm      REAL NOT NULL DEFAULT 0,
  best_accuracy REAL NOT NULL DEFAULT 0,
  attempts      INTEGER NOT NULL DEFAULT 0,
  last_wpm      REAL,
  last_accuracy REAL,
  last_played   TEXT,
  completed_at  TEXT,
  boss_won      INTEGER NOT NULL DEFAULT 0,
  updated_at    TEXT,
  PRIMARY KEY (user_id, lesson_id)
);

-- The lesson and step the learner is on now (latest by server time).
CREATE TABLE IF NOT EXISTS user_position (
  user_id   TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  step      INTEGER NOT NULL DEFAULT 0,
  device_at TEXT,
  server_at TEXT NOT NULL
);

-- Typing statistics, merged from small batches. stats_batches makes a resent batch count once.
CREATE TABLE IF NOT EXISTS stats_batches (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  id      TEXT NOT NULL,
  token   TEXT NOT NULL,
  at      TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE TABLE IF NOT EXISTS key_stats (
  user_id  TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  k        TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  errors   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, k)
);
CREATE TABLE IF NOT EXISTS bigram_stats (
  user_id  TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  pair     TEXT NOT NULL,
  count    INTEGER NOT NULL DEFAULT 0,
  total_ms INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, pair)
);
CREATE TABLE IF NOT EXISTS error_classes (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  cls     TEXT NOT NULL,
  n       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, cls)
);

-- Per learner per local day: calendar, charts and streak.
CREATE TABLE IF NOT EXISTS daily_totals (
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day         TEXT NOT NULL,
  seconds     REAL NOT NULL DEFAULT 0,
  runs        INTEGER NOT NULL DEFAULT 0,
  steps       INTEGER NOT NULL DEFAULT 0,
  best_wpm    REAL NOT NULL DEFAULT 0,
  acc_sum     REAL NOT NULL DEFAULT 0,
  acc_count   INTEGER NOT NULL DEFAULT 0,
  xp          INTEGER NOT NULL DEFAULT 0,
  quests_done INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

-- Per learner: XP, streak with freezes, and a revision token that keeps two
-- simultaneous event batches from working on the same totals.
CREATE TABLE IF NOT EXISTS user_totals (
  user_id       TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  rev           TEXT NOT NULL,
  xp            INTEGER NOT NULL DEFAULT 0,
  clean_tail    INTEGER NOT NULL DEFAULT 0,
  streak_count  INTEGER NOT NULL DEFAULT 0,
  streak_best   INTEGER NOT NULL DEFAULT 0,
  streak_last   TEXT,
  freezes       TEXT NOT NULL DEFAULT '[]',
  updated_at    TEXT,
  rebuilt_at    TEXT
);
-- Never holds a row: inserting into it is how an event batch stops when another got there first.
CREATE TABLE IF NOT EXISTS pipeline_guard (ok INTEGER NOT NULL);

-- Every XP award: source 'event' (ref = event id) or 'quest' (ref = day:questId).
CREATE TABLE IF NOT EXISTS xp_ledger (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  source  TEXT NOT NULL,
  ref     TEXT NOT NULL,
  xp      INTEGER NOT NULL,
  day     TEXT NOT NULL,
  at      TEXT NOT NULL,
  PRIMARY KEY (user_id, source, ref)
);

CREATE TABLE IF NOT EXISTS daily_quests (
  user_id  TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day      TEXT NOT NULL,
  quest_id TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  goal     INTEGER NOT NULL,
  done_at  TEXT,
  PRIMARY KEY (user_id, day, quest_id)
);

CREATE TABLE IF NOT EXISTS badges (
  user_id  TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  at       TEXT NOT NULL,
  event_id TEXT,
  PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS certificates (
  user_id   TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  level     INTEGER NOT NULL,                         -- 20, 30, 40, 50, 60
  wpm       REAL NOT NULL,
  accuracy  REAL NOT NULL,
  seconds   REAL NOT NULL,
  lesson_id TEXT,
  event_id  TEXT,
  at        TEXT NOT NULL,
  PRIMARY KEY (user_id, level)
);

CREATE TABLE IF NOT EXISTS placement (
  user_id  TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  level    INTEGER NOT NULL,
  wpm      REAL NOT NULL,
  accuracy REAL NOT NULL,
  seconds  REAL NOT NULL,
  event_id TEXT,
  at       TEXT NOT NULL
);

-- Settings and what is in use from the Workshop (one JSON object), and what is unlocked.
CREATE TABLE IF NOT EXISTS user_settings (
  user_id    TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workshop_unlocks (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  at      TEXT NOT NULL,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS game_bests (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  best    INTEGER NOT NULL DEFAULT 0,
  runs    INTEGER NOT NULL DEFAULT 0,
  best_at TEXT,
  PRIMARY KEY (user_id, game_id)
);
-- Ghost Race: key timings of the best run per passage length, at most 20 KB each.
CREATE TABLE IF NOT EXISTS ghost_replays (
  user_id   TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  ghost_key TEXT NOT NULL,
  score     REAL NOT NULL,
  replay    TEXT NOT NULL CHECK (length(replay) <= 20480),
  at        TEXT NOT NULL,
  PRIMARY KEY (user_id, ghost_key)
);
-- Daily Challenge: the first finished run of each day.
CREATE TABLE IF NOT EXISTS daily_results (
  user_id  TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day      TEXT NOT NULL,
  score    INTEGER NOT NULL DEFAULT 0,
  wpm      REAL NOT NULL DEFAULT 0,
  accuracy REAL NOT NULL DEFAULT 0,
  event_id TEXT,
  at       TEXT NOT NULL,
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS feedback (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  id      TEXT NOT NULL,
  kind    TEXT,
  rating  INTEGER,
  text    TEXT NOT NULL,
  page    TEXT,
  at      TEXT NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS feedback_at ON feedback (at);

-- Guest progress added to an account: each import id once.
CREATE TABLE IF NOT EXISTS guest_imports (
  user_id   TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  import_id TEXT NOT NULL,
  lessons   INTEGER NOT NULL DEFAULT 0,
  at        TEXT NOT NULL,
  PRIMARY KEY (user_id, import_id)
);

-- Events the server refused or could not save, counted per learner per day (owner health page).
CREATE TABLE IF NOT EXISTS event_rejects (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day     TEXT NOT NULL,
  reason  TEXT NOT NULL,
  n       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, reason)
);
CREATE INDEX IF NOT EXISTS event_rejects_day ON event_rejects (day);

-- Nightly rebuild: one row per run, and every difference it found and fixed.
CREATE TABLE IF NOT EXISTS rebuild_runs (
  id          INTEGER PRIMARY KEY,
  started_at  TEXT NOT NULL,
  finished_at TEXT,
  users       INTEGER NOT NULL DEFAULT 0,
  differences INTEGER NOT NULL DEFAULT 0,
  errors      INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS rebuild_diffs (
  run_id     INTEGER NOT NULL,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  row_key    TEXT NOT NULL,
  stored     TEXT,
  rebuilt    TEXT,
  at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS rebuild_diffs_user ON rebuild_diffs (user_id);
CREATE INDEX IF NOT EXISTS rebuild_diffs_run ON rebuild_diffs (run_id);
