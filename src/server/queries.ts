export interface QuestionFilters {
  chapter?: number;
  topic?: string;
  doubtOnly?: boolean;
}

export interface QuestionRow {
  id: string;
  chapter: number;
  chapter_title: string;
  number: number;
  question_it: string;
  question_en: string | null;
  answer: number;
  topic: string | null;
  source_page: number | null;
  doubt_flagged: number | null;
  confidence: number | null;
  times_reviewed: number | null;
  times_correct: number | null;
  last_reviewed_at: string | null;
}

export async function listQuestions(
  db: D1Database,
  filters: QuestionFilters = {}
): Promise<QuestionRow[]> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

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
      rs.times_correct, rs.last_reviewed_at
    FROM questions q
    LEFT JOIN review_state rs ON rs.question_id = q.id
    ${where}
    ORDER BY rs.last_reviewed_at ASC NULLS FIRST
  `;

  const stmt =
    params.length > 0 ? db.prepare(sql).bind(...params) : db.prepare(sql);
  const result = await stmt.all<QuestionRow>();
  return result.results;
}

export async function getQuestion(
  db: D1Database,
  id: string
): Promise<QuestionRow | null> {
  const result = await db
    .prepare(
      `SELECT
        q.id, q.chapter, q.chapter_title, q.number,
        q.question_it, q.question_en, q.answer, q.topic, q.source_page,
        rs.doubt_flagged, rs.confidence, rs.times_reviewed,
        rs.times_correct, rs.last_reviewed_at
      FROM questions q
      LEFT JOIN review_state rs ON rs.question_id = q.id
      WHERE q.id = ?`
    )
    .bind(id)
    .first<QuestionRow>();
  return result ?? null;
}
