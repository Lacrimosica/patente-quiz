export interface RawQuestion {
  number: number;
  question_it: string;
  question_en?: string;
  answer: boolean;
  topic?: string;
  source_page?: number;
}

export interface RawChapter {
  chapter: number;
  chapterTitle: string;
  questions: RawQuestion[];
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
  favorited: number | null;
  confidence: number | null;
  times_reviewed: number | null;
  times_correct: number | null;
  last_answer: number | null;
  last_reviewed_at: string | null;
}

/** Public user shape — never carries password_hash. */
export interface User {
  id: string;
  username: string;
  created_at?: string;
}

/** Per-user aggregate stats for one question. */
export interface ReviewState {
  doubt_flagged: number;
  favorited: number;
  confidence: number | null;
  times_reviewed: number;
  times_correct: number;
  last_answer: number | null;
  last_reviewed_at: string | null;
}

/** Response to POST /api/answers. */
export interface AnswerResult {
  correct: boolean;
  answer: number;
  reviewState: ReviewState;
}
