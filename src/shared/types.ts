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
