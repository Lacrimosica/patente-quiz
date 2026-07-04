import { useState } from "react";
import QuestionCard from "./QuestionCard";
import type { QuestionStats } from "./QuestionCard";
import { useQuestions } from "../hooks/useQuestions";
import { useTopics } from "../hooks/useTopics";
import { submitAnswer } from "../hooks/useAuth";
import type { QuestionRow, ReviewState, User } from "../../shared/types";

/** Per-user reviewed/correct/incorrect counts for a question. */
function statsFor(
  question: QuestionRow,
  freshReview: ReviewState | null
): QuestionStats {
  const timesReviewed = freshReview?.times_reviewed ?? question.times_reviewed ?? 0;
  const timesCorrect = freshReview?.times_correct ?? question.times_correct ?? 0;
  return {
    timesReviewed,
    timesCorrect,
    timesIncorrect: timesReviewed - timesCorrect,
  };
}

interface Props {
  user: User;
  onLogout: () => void;
}

export default function Quiz({ user, onLogout }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<boolean | null>(null);
  const [topic, setTopic] = useState<string | null>(null); // State to track the selected topic
  const hasAnswered = userAnswer !== null; //derived, not stored
  const [score, setScore] = useState(0); // State to track the user's score
  // Fresh review counts returned by the server after answering the current
  // question — takes precedence over the (stale) values loaded with the list.
  const [freshReview, setFreshReview] = useState<ReviewState | null>(null);
  const [jumpValue, setJumpValue] = useState(""); // "go to question N" input
  const { questions, loading, error } = useQuestions(
    topic !== null ? { topic } : {}
  );

  const { topics } = useTopics(); // Custom hook to fetch topics

  const progress = questions.length > 0
    ? Math.round((currentIndex / questions.length) * 100)
    : 0;

  const currentQuestion = questions[currentIndex];

  function handleTopicChange(value: string) {
    setTopic(value === "" ? null : value);  // "" at the DOM edge → null in state
    setCurrentIndex(0);
    setScore(0);
    setUserAnswer(null);
    setFreshReview(null);
  }

  async function handleAnswer(choice: boolean) {
    setUserAnswer(choice);
    // Persist the answer; the server is the source of truth for correctness.
    try {
      const result = await submitAnswer(currentQuestion.id, choice);
      if (result.correct) setScore((s) => s + 1);
      setFreshReview(result.reviewState); // reflect the updated counts live
    } catch {
      // Fall back to local scoring if the request fails.
      if (choice === (currentQuestion.answer === 1)) setScore((s) => s + 1);
    }
  }

  function handleNext() {
    setCurrentIndex(i => i + 1);
    setUserAnswer(null); // explicit reset — the key remount no longer does this for you
    setFreshReview(null);
  }

  // Step forward/backward by `delta` questions, clamped to the list bounds.
  function goBy(delta: number) {
    if (questions.length === 0) return;
    setCurrentIndex((i) => Math.min(Math.max(i + delta, 0), questions.length - 1));
    setUserAnswer(null);
    setFreshReview(null);
  }

  // Jump straight to a question by its position (1-based, as shown on the card).
  function handleJump(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(jumpValue, 10);
    if (!Number.isFinite(n) || questions.length === 0) return;
    const clamped = Math.min(Math.max(n, 1), questions.length);
    setCurrentIndex(clamped - 1);
    setUserAnswer(null);
    setFreshReview(null);
    setJumpValue("");
  }

  if (loading) return <p className="text-lg font-semibold p-4 rounded-lg m-auto text-gray-500" >Caricamento...</p>;
  if (error) return <p className="text-lg font-semibold p-4 rounded-lg m-auto text-red-500">Errore: {error}</p>;
  const isComplete = questions.length > 0 && currentIndex >= questions.length;

  if (isComplete) {

    {/* show results */ }
    const percent = Math.round((score / questions.length) * 100);
    return (
      <main className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Quiz completato!</h1>
        <p className="text-gray-500 mb-8">Ecco il tuo risultato</p>

        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-6xl font-bold text-green-600 mb-2">{percent}%</p>
          <p className="text-gray-600">{score} corretti su {questions.length}</p>
        </div>

        {/* restart button */}
        <button
          onClick={() => window.location.reload()}
          className="mt-6 w-full py-3 rounded-lg bg-gray-900 text-white font-medium
                   hover:bg-gray-700 transition-colors cursor-pointer"
        >
          Ricomincia
        </button>
      </main>
    );
  } else {

    return (
      <main className="max-w-xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Patente Quiz</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">{user.username}</span>
            <button
              onClick={onLogout}
              className="text-gray-500 hover:text-gray-900 cursor-pointer"
            >
              Esci
            </button>
          </div>
        </div>

        {/* progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>{currentIndex} / {questions.length}</span>
            <span>{score} corretti</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

        </div>
        <select
          value={topic ?? ""}
          onChange={(e) => handleTopicChange(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-200 bg-white px-3 py-2"
        >
          <option value="">Tutti gli argomenti</option>
          {topics.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* jump to a specific question by its position */}
        <form onSubmit={handleJump} className="mb-4 flex gap-2">
          <input
            type="number"
            min={1}
            max={questions.length}
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            placeholder={`Vai alla domanda (1–${questions.length})`}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-gray-900 text-white font-medium
                     hover:bg-gray-700 transition-colors cursor-pointer"
          >
            Vai
          </button>
        </form>

        {/* step navigation: jump by ±1 / ±10 / ±100 questions */}
        <div className="mb-4 flex items-center justify-between gap-1">
          {[-100, -10, -1].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => goBy(d)}
              disabled={currentIndex === 0}
              className="flex-1 px-2 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium
                       hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              ← {Math.abs(d)}
            </button>
          ))}
          {[1, 10, 100].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => goBy(d)}
              disabled={currentIndex >= questions.length - 1}
              className="flex-1 px-2 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium
                       hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {d} →
            </button>
          ))}
        </div>

        {/* single card */}
        <QuestionCard
          key={currentQuestion.id}
          chapter={currentQuestion.chapter}
          bookNumber={currentQuestion.number}
          sourcePage={currentQuestion.source_page}
          text={currentQuestion.question_it}
          answer={currentQuestion.answer === 1}
          userAnswer={userAnswer}
          stats={statsFor(currentQuestion, freshReview)}
          onAnswer={handleAnswer}
        />

        {/* next button — only visible after answering */}
        {hasAnswered && (
          <button
            onClick={handleNext}
            className="mt-4 w-full py-3 rounded-lg bg-gray-900 text-white font-medium
                   hover:bg-gray-700 transition-colors cursor-pointer"
          >
            {currentIndex + 1 < questions.length ? "Prossima domanda →" : "Vedi risultati →"}
          </button>
        )}
      </main>
    );
  }
}
