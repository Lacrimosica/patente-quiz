-- Basic user management + per-user answer tracking.
-- Reverses the original "auth is a non-goal" stance (see docs/adr).

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,       -- "pbkdf2$<iters>$<saltB64>$<hashB64>"
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,       -- sha-256(rawToken); raw token lives only in the cookie
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Append-only log: one row per answer event.
CREATE TABLE IF NOT EXISTS answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id),
  chosen INTEGER NOT NULL CHECK (chosen IN (0, 1)),
  correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
  answered_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_answers_user_question ON answers(user_id, question_id);

-- review_state becomes per-user. Existing rows are seed placeholders (no real
-- progress was ever recorded), so rebuilding the table loses nothing.
DROP INDEX IF EXISTS idx_review_doubt;
DROP TABLE IF EXISTS review_state;
CREATE TABLE review_state (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id),
  doubt_flagged INTEGER NOT NULL DEFAULT 0 CHECK (doubt_flagged IN (0, 1)),
  confidence INTEGER CHECK (confidence BETWEEN 1 AND 5),
  times_reviewed INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  last_answer INTEGER CHECK (last_answer IN (0, 1)),
  last_reviewed_at TEXT,
  PRIMARY KEY (user_id, question_id)
);
CREATE INDEX idx_review_doubt ON review_state(user_id, doubt_flagged);
