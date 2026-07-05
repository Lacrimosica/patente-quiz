-- Per-user "favorite / important" flag on a question.
-- Mirrors doubt_flagged: a per-user marker the learner sets to bookmark a
-- question they want to revisit. Shared question content stays in `questions`.

ALTER TABLE review_state
  ADD COLUMN favorited INTEGER NOT NULL DEFAULT 0 CHECK (favorited IN (0, 1));

CREATE INDEX IF NOT EXISTS idx_review_favorited ON review_state(user_id, favorited);
