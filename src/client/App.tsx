import { useState } from "react";
import QuestionCard from "./components/QuestionCard";
import { useQuestions } from "./hooks/useQuestions";

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<boolean | null>(null);
  const hasAnswered = userAnswer !== null; //derived, not stored
  const [score, setScore] = useState(0); // State to track the user's score
  const { questions, loading, error } = useQuestions();


  const progress = questions.length > 0
    ? Math.round((currentIndex / questions.length) * 100)
    : 0;

  const currentQuestion = questions[currentIndex];


  function handleAnswer(choice: boolean) {
    setUserAnswer(choice);
    if (choice === (currentQuestion.answer === 1)) setScore(s => s + 1);
  }

  function handleNext() {
    setCurrentIndex(i => i + 1);
    setUserAnswer(null); // explicit reset — the key remount no longer does this for you
  }

  if (loading) return <p className="text-lg font-semibold p-4 rounded-lg m-auto text-gray-500" >Caricamento...</p>;
  if (error) return <p className="text-lg font-semibold p-4 rounded-lg m-auto text-red-500">Errore: {error}</p>;
  const isComplete = questions.length > 0 && currentIndex >= questions.length;

  if (isComplete) {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <main className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Quiz completato!</h1>
        <p className="text-gray-500 mb-8">Ecco il tuo risultato</p>

        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-6xl font-bold text-green-600 mb-2">{percent}%</p>
          <p className="text-gray-600">{score} corretti su {questions.length}</p>
        </div>

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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Patente Quiz</h1>

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
