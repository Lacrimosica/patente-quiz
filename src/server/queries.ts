import type {
  QuestionRow,
  ReviewState,
  User,
} from "../shared/types.js";

export type { QuestionRow };

export interface QuestionFilters {
  chapter?: number;
  topic?: string;
  doubtOnly?: boolean;
}

/** Internal user row — carries password_hash, never returned to clients. */
interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
}

export async function createUser(
  db: D1Database,
  user: { id: string; username: string; passwordHash: string; createdAt: string }
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)"
    )
    .bind(user.id, user.username, user.passwordHash, user.createdAt)
    .run();
}

export async function getUserByUsername(
  db: D1Database,
  username: string
): Promise<UserRow | null> {
  const row = await db
    .prepare(
      "SELECT id, username, password_hash, created_at FROM users WHERE username = ?"
    )
    .bind(username)
    .first<UserRow>();
  return row ?? null;
}

export async function createSession(
  db: D1Database,
  session: { tokenHash: string; userId: string; createdAt: string; expiresAt: string }
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
    )
    .bind(session.tokenHash, session.userId, session.createdAt, session.expiresAt)
    .run();
}

/** Returns the session's user if the token is valid and unexpired. */
export async function getSessionUser(
  db: D1Database,
  tokenHash: string
): Promise<User | null> {
  const row = await db
    .prepare(
      `SELECT u.id, u.username, u.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
    )
    .bind(tokenHash, new Date().toISOString())
    .first<User>();
  return row ?? null;
}

export async function deleteSession(
  db: D1Database,
  tokenHash: string
): Promise<void> {
  await db
    .prepare("DELETE FROM sessions WHERE token_hash = ?")
    .bind(tokenHash)
    .run();
}

/**
 * Records an answer atomically: appends to the answers log and upserts the
 * per-user review_state aggregate. Returns the updated review state.
 */
export async function recordAnswer(
  db: D1Database,
  input: {
    userId: string;
    questionId: string;
    chosen: number;
    correct: number;
    answeredAt: string;
  }
): Promise<ReviewState> {
  const { userId, questionId, chosen, correct, answeredAt } = input;
  await db.batch([
    db
      .prepare(
        `INSERT INTO answers (user_id, question_id, chosen, correct, answered_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(userId, questionId, chosen, correct, answeredAt),
    db
      .prepare(
        `INSERT INTO review_state
           (user_id, question_id, times_reviewed, times_correct, last_answer, last_reviewed_at)
         VALUES (?, ?, 1, ?, ?, ?)
         ON CONFLICT(user_id, question_id) DO UPDATE SET
           times_reviewed = times_reviewed + 1,
           times_correct = times_correct + excluded.times_correct,
           last_answer = excluded.last_answer,
           last_reviewed_at = excluded.last_reviewed_at`
      )
      .bind(userId, questionId, correct, chosen, answeredAt),
  ]);

  const state = await db
    .prepare(
      `SELECT doubt_flagged, confidence, times_reviewed, times_correct,
              last_answer, last_reviewed_at
       FROM review_state WHERE user_id = ? AND question_id = ?`
    )
    .bind(userId, questionId)
    .first<ReviewState>();
  // Row is guaranteed to exist after the upsert above.
  return state!;
}


export async function listTopics(db: D1Database): Promise<string[]> {
  const result = await db
    .prepare("SELECT DISTINCT topic FROM questions ORDER BY topic ASC")
    .all<{ topic: string }>();
  return result.results.map((row) => row.topic);
}

export async function listQuestions(
  db: D1Database,
  userId: string,
  filters: QuestionFilters = {}
): Promise<QuestionRow[]> {
  // The per-user review_state join comes first so its bind param leads.
  const params: (string | number)[] = [userId];
  const conditions: string[] = [];

  if (filters.chapter !== undefined) {
    conditions.push("q.chapter = ?");
    params.push(filters.chapter);
  }
  if (filters.topic !== undefined) {
    conditions.push("q.topic = ?");
    params.push(filters.topic);
  }
  if (filters.doubtOnly) {
    conditions.push("rs.doubt_flagged = 1");
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT
      q.id, q.chapter, q.chapter_title, q.number,
      q.question_it, q.question_en, q.answer, q.topic, q.source_page,
      rs.doubt_flagged, rs.confidence, rs.times_reviewed,
      rs.times_correct, rs.last_answer, rs.last_reviewed_at
    FROM questions q
    LEFT JOIN review_state rs ON rs.question_id = q.id AND rs.user_id = ?
    ${where}
    ORDER BY rs.last_reviewed_at ASC NULLS FIRST
  `;

  const result = await db.prepare(sql).bind(...params).all<QuestionRow>();
  return result.results;
}

export async function getQuestion(
  db: D1Database,
  userId: string,
  id: string
): Promise<QuestionRow | null> {
  const result = await db
    .prepare(
      `SELECT
        q.id, q.chapter, q.chapter_title, q.number,
        q.question_it, q.question_en, q.answer, q.topic, q.source_page,
        rs.doubt_flagged, rs.confidence, rs.times_reviewed,
        rs.times_correct, rs.last_answer, rs.last_reviewed_at
      FROM questions q
      LEFT JOIN review_state rs ON rs.question_id = q.id AND rs.user_id = ?
      WHERE q.id = ?`
    )
    .bind(userId, id)
    .first<QuestionRow>();
  return result ?? null;
}
