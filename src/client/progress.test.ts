import { describe, it, expect } from "vitest";
import { summarizeProgress } from "./progress.js";
import type { QuestionRow } from "../shared/types";

let seq = 0;

/**
 * Builds a QuestionRow with sensible defaults, overriding only the Review-state
 * fields a given test cares about. `answer` defaults to 1 (true).
 */
function question(overrides: Partial<QuestionRow> = {}): QuestionRow {
  seq++;
  return {
    id: `ch1-${String(seq).padStart(3, "0")}`,
    chapter: 1,
    chapter_title: "Test",
    number: seq,
    question_it: "Domanda?",
    question_en: null,
    answer: 1,
    topic: "sanctions",
    source_page: null,
    doubt_flagged: null,
    favorited: null,
    confidence: null,
    times_reviewed: null,
    times_correct: null,
    last_answer: null,
    last_reviewed_at: null,
    ...overrides,
  };
}

/** An answered question whose last answer was correct / incorrect. */
const correct = (answer = 1) =>
  question({ answer, times_reviewed: 1, last_answer: answer });
const incorrect = (answer = 1) =>
  question({ answer, times_reviewed: 1, last_answer: answer === 1 ? 0 : 1 });
const untouched = () => question({ times_reviewed: 0 });

describe("summarizeProgress", () => {
  it("reports 0% and all-unanswered for an all-untouched bank", () => {
    const summary = summarizeProgress([untouched(), untouched(), untouched()]);
    expect(summary).toEqual({
      total: 3,
      answered: 0,
      unanswered: 3,
      correct: 0,
      incorrect: 0,
      percentAnswered: 0,
    });
  });

  it("counts a mix of correct, incorrect, and untouched", () => {
    const summary = summarizeProgress([
      correct(),
      correct(),
      incorrect(),
      untouched(),
    ]);
    expect(summary).toMatchObject({
      total: 4,
      answered: 3,
      unanswered: 1,
      correct: 2,
      incorrect: 1,
      percentAnswered: 75,
    });
  });

  it("judges accuracy by the last answer, not cumulative correctness", () => {
    // Reviewed twice, was right once, but the LAST answer was wrong.
    const flipped = question({
      answer: 1,
      times_reviewed: 2,
      times_correct: 1,
      last_answer: 0,
    });
    const summary = summarizeProgress([flipped]);
    expect(summary.correct).toBe(0);
    expect(summary.incorrect).toBe(1);
    expect(summary.answered).toBe(1);
  });

  it("treats a null last_answer field via times_reviewed for answered-ness", () => {
    // times_reviewed drives answered/unanswered, independent of null review fields.
    expect(summarizeProgress([untouched()]).answered).toBe(0);
    expect(summarizeProgress([correct(0)]).answered).toBe(1);
  });

  it("returns a zeroed summary for an empty list", () => {
    expect(summarizeProgress([])).toEqual({
      total: 0,
      answered: 0,
      unanswered: 0,
      correct: 0,
      incorrect: 0,
      percentAnswered: 0,
    });
  });
});
