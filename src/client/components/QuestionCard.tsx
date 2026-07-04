export interface QuestionStats {
  timesReviewed: number;
  timesCorrect: number;
  timesIncorrect: number;
}

interface Props {
  chapter: number;
  bookNumber: number; // question number as printed in the book (within its chapter)
  sourcePage: number | null; // page in the book, nullable
  text: string;
  answer: boolean;
  userAnswer: boolean | null;
  favorited: boolean; // per-user "important" flag
  stats: QuestionStats;
  onAnswer: (choice: boolean) => void; // Callback to notify parent component of the user's answer
  onToggleFavorite: () => void; // Callback to flag/unflag the question as important
}

function QuestionCard({ chapter, bookNumber, sourcePage, text, answer, userAnswer, favorited, stats, onAnswer, onToggleFavorite }: Props) {

  const hasAnswered = userAnswer !== null;
  const isCorrect = userAnswer === answer; // Check if the user's answer is correct

  return (
    <div className="rounded-lg border  border-gray-200 bg-blue-50 p-6 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Cap. {chapter} · Domanda {bookNumber}
          {sourcePage !== null && ` · pag. ${sourcePage}`}
        </span>
        <div className="flex items-center gap-3">
          <QuestionStatsBadge stats={stats} />
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={favorited}
            title={favorited ? "Rimuovi dai preferiti" : "Segna come importante"}
            className={`text-lg leading-none cursor-pointer transition-colors ${
              favorited ? "text-amber-400 hover:text-amber-500" : "text-gray-300 hover:text-amber-400"
            }`}
          >
            {favorited ? "★" : "☆"}
          </button>
        </div>
      </div>
      <p className=" text-gray-900 text-base mb-4">{text}</p>

      {!hasAnswered ? (
        <div className="flex gap-3">
          <button onClick={() => onAnswer(true)} className="px-4 py-2 rounded-md border border-green-200 bg-green-800 text-sm text-white font-medium hover:bg-green-100   hover:text-green-800 cursor-pointer transition-colors">
            ✓ Vero
          </button>
          <button onClick={() => onAnswer(false)} className="px-4 py-2 rounded-md border border-red-300 bg-red-800 text-sm text-white font-medium hover:bg-red-100 hover:text-red-800 cursor-pointer transition-colors">
            ✗ Falso
          </button>
        </div>
      ) : (
        <p className={isCorrect ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
          {hasAnswered && isCorrect
            ? "Corretto!"
            : `Sbagliato. La risposta è ${answer ? "Vero" : "Falso"}.`}
        </p>
      )}
    </div>
  );
}

/** Per-user history for this question: reviewed / correct / incorrect counts. */
function QuestionStatsBadge({ stats }: { stats: QuestionStats }) {
  if (stats.timesReviewed === 0) {
    return (
      <span className="text-xs text-gray-400">Mai vista</span>
    );
  }
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500" title="Volte riviste">
        {stats.timesReviewed}× riviste
      </span>
      <span className="text-green-600 font-medium" title="Risposte corrette">
        ✓ {stats.timesCorrect}
      </span>
      <span className="text-red-600 font-medium" title="Risposte sbagliate">
        ✗ {stats.timesIncorrect}
      </span>
    </div>
  );
}

export default QuestionCard;
