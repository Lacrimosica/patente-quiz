import { summarizeProgress } from "../progress";
import type { QuestionRow } from "../../shared/types";

interface Props {
  username: string;
  questions: QuestionRow[];
  onStart: () => void;
  onLogout: () => void;
}

/**
 * Pre-quiz menu: greets the learner with their accumulated progress across the
 * whole Question bank, then lets them start the quiz. The visual question map
 * is added on top of this in a follow-up.
 */
export default function Menu({ username, questions, onStart, onLogout }: Props) {
  const summary = summarizeProgress(questions);

  return (
    <main className="max-w-xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Patente Quiz</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">{username}</span>
          <button
            onClick={onLogout}
            className="text-gray-500 hover:text-gray-900 cursor-pointer"
          >
            Esci
          </button>
        </div>
      </div>

      {/* headline: percentage of the bank answered at least once */}
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm mb-4">
        <p className="text-6xl font-bold text-green-600 mb-2">
          {summary.percentAnswered}%
        </p>
        <p className="text-gray-600">
          {summary.answered} di {summary.total} domande viste
        </p>
      </div>

      {/* breakdown tiles */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatTile label="Corrette" value={summary.correct} tone="green" />
        <StatTile label="Sbagliate" value={summary.incorrect} tone="red" />
        <StatTile label="Mai viste" value={summary.unanswered} tone="gray" />
      </div>

      <button
        onClick={onStart}
        disabled={summary.total === 0}
        className="w-full py-3 rounded-lg bg-gray-900 text-white font-medium
                 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed
                 transition-colors cursor-pointer"
      >
        Inizia il quiz →
      </button>
    </main>
  );
}

const TONES = {
  green: "text-green-600",
  red: "text-red-600",
  gray: "text-gray-500",
} as const;

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm">
      <p className={`text-2xl font-bold ${TONES[tone]}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
