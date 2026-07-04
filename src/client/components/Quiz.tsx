import { useState } from "react";
import QuestionCard from "./QuestionCard";
import { useQuestions } from "../hooks/useQuestions";
import { useTopics } from "../hooks/useTopics";
import { submitAnswer } from "../hooks/useAuth";
import type { User } from "../../shared/types";

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
  }

  async function handleAnswer(choice: boolean) {
    setUserAnswer(choice);
    // Persist the answer; the server is the source of truth for correctness.
    try {
      const result = await submitAnswer(currentQuestion.id, choice);
      if (result.correct) setScore((s) => s + 1);
    } catch {
      // Fall back to local scoring if the request fails.
      if (choice === (currentQuestion.answer === 1)) setScore((s) => s + 1);
    }
  }

  function handleNext() {
    setCurrentIndex(i => i + 1);
    setUserAnswer(null); // explicit reset — the key remount no longer does this for you
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

        {/* single card */}
        <QuestionCard
          key={currentQuestion.id}
          number={currentIndex + 1}
          text={currentQuestion.question_it}
          answer={currentQuestion.answer === 1}
          userAnswer={userAnswer}
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
