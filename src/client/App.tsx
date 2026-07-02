import { useEffect, useState } from "react";
import QuestionCard from "./components/QuestionCard";
import type { QuestionRow } from "../shared/types";

export default function App() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState(0); // State to track the user's score
  const [answered, setAnswered] = useState(0); // State to track the number of answered questions

  const progress = questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0; // Calculate progress percentage

  const allAnswered = questions.length > 0 && answered === questions.length;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/questions");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: QuestionRow[] = await res.json();
        setQuestions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);


  function handleAnswer(correct: boolean) {
    if (correct) setScore(s => s + 1); // Increment score if the answer is correct
    setAnswered(a => a + 1); // Increment the number of answered questions
  }

  if (loading) return <p className="text-lg font-semibold p-4 rounded-lg m-auto text-gray-500" >Caricamento...</p>;
  if (error) return <p className="text-lg font-semibold p-4 rounded-lg m-auto text-red-500">Errore: {error}</p>;
  // if (allAnswered) {
  //   const percent = Math.round((score / questions.length) * 100);
  //   return (
  //     <main className="max-w-xl mx-auto px-4 py-10">
  //       <h1 className="text-2xl font-bold text-gray-900 mb-1">Quiz completato!</h1>
  //       <p className="text-gray-500 mb-8">Ecco il tuo risultato</p>

  //       <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
  //         <p className="text-6xl font-bold text-green-600 mb-2">{percent}%</p>
  //         <p className="text-gray-600">
  //           {score} corretti su {questions.length}
  //         </p>
  //       </div>

  //       <button
  //         onClick={() => window.location.reload()}
  //         className="mt-6 w-full py-3 rounded-lg bg-gray-900 text-white font-medium
  //                  hover:bg-gray-700 transition-colors cursor-pointer"
  //       >
  //         Ricomincia
  //       </button>
  //     </main>
  //   );
  // } else {
    return (
      <main className="bg-blue-100 max-w-xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Patente Quiz</h1>

        <div className="mb-5">
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>{answered} / {questions.length} risposti</span>
            <span>{score} corretti</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>



        {questions.map((q, index) => (
          <QuestionCard
            key={q.id}
            number={index + 1}
            text={q.question_it}
            answer={q.answer === 1}
            onAnswer={handleAnswer}
          />
        ))}
      </main>
    );
  // }
}
