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
  confidence: number | null;
  times_reviewed: number | null;
  times_correct: number | null;
  last_reviewed_at: string | null;
}
