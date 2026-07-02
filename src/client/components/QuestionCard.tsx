// src/client/components/QuestionCard.tsx

import { useState } from "react";

interface Props {
  number: number;
  text: string;
  answer: boolean;
  onAnswer: (correct: boolean) => void; // Callback to notify parent component of the user's answer
}

function QuestionCard({ number, text, answer, onAnswer }: Props) {
  const [userAnswer, setUserAnswer] = useState<boolean | null>(null);

  const hasAnswered = userAnswer !== null; // Check if the user has answered the question
  const isCorrect = userAnswer === answer; // Check if the user's answer is correct

  function handleClick(choice: boolean) {
    setUserAnswer(choice); // Set the user's answer
    onAnswer(choice === answer); // Notify parent component of the user's answer
  }

  return (
    <div className="rounded-lg border  border-gray-200 bg-blue-50 p-6 mb-4 shadow-sm">
           <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
        Domanda {number}
      </span>
      <p className=" text-gray-900 text-base mb-4">{text}</p>

      {!hasAnswered ? (
        <div className="flex gap-3">
          <button onClick={() => handleClick(true)} className="px-4 py-2 rounded-md border border-green-200 bg-green-800 text-sm text-white font-medium hover:bg-green-100   hover:text-green-800 cursor-pointer transition-colors">
            ✓ Vero
          </button>
          <button onClick={() => handleClick(false)} className="px-4 py-2 rounded-md border border-red-300 bg-red-800 text-sm text-white font-medium hover:bg-red-100 hover:text-red-800 cursor-pointer transition-colors">
            ✗ Falso
          </button>
        </div>
      ) : (
        <p className={isCorrect ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
          {isCorrect
            ? "Corretto!"
            : `Sbagliato. La risposta è ${answer ? "Vero" : "Falso"}.`}
        </p>
      )}
    </div>
  );
}

export default QuestionCard;