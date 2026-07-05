/**
 * Pure derivation of a learner's accumulated progress from the question list
 * returned by `GET /api/questions` (which carries the per-user Review state).
 *
 * "Answered" means the question has been reviewed at least once
 * (`times_reviewed > 0`). Accuracy is judged by the *last* answer
 * (`last_answer` vs `answer`), matching how per-question stats are already
 * presented on the quiz card.
 */
import type { QuestionRow } from "../shared/types";

type AnsweredStatus = "unanswered" | "correct" | "incorrect";

/** Classify a single question by its last answer. Internal to this module. */
function statusOf(q: QuestionRow): AnsweredStatus {
  if ((q.times_reviewed ?? 0) === 0) return "unanswered";
  return q.last_answer === q.answer ? "correct" : "incorrect";
}

/** Aggregate progress across a set of questions. */
export interface ProgressSummary {
  total: number;
  answered: number;
  unanswered: number;
  correct: number;
  incorrect: number;
  /** Percentage of questions answered at least once, rounded to an integer. */
  percentAnswered: number;
}

export function summarizeProgress(questions: QuestionRow[]): ProgressSummary {
  let answered = 0;
  let correct = 0;
  let incorrect = 0;

  for (const q of questions) {
    const status = statusOf(q);
    if (status === "unanswered") continue;
    answered++;
    if (status === "correct") correct++;
    else incorrect++;
  }

  const total = questions.length;
  return {
    total,
    answered,
    unanswered: total - answered,
    correct,
    incorrect,
    percentAnswered: total === 0 ? 0 : Math.round((answered / total) * 100),
  };
}
