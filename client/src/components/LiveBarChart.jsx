import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function LiveBarChart({
  results = [],
  totalVotes = 0,
  isPresenter = false,
  correctAnswer = null,
  showCorrectAnswer = false
}) {
  if (!results || results.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400">
        <p className="text-sm">No options configured</p>
      </div>
    );
  }

  const maxPercentage = Math.max(...results.map((r) => r.percentage || 0));

  return (
    <div className="space-y-3.5 w-full">
      {results.map((item, idx) => {
        const isCorrect = showCorrectAnswer && Boolean(correctAnswer) && item.option === correctAnswer;
        const isWinner = !showCorrectAnswer && totalVotes > 0 && item.percentage === maxPercentage && item.count > 0;

        return (
          <div key={idx} className="relative group">
            {/* Header row: Option text + percentage / vote count */}
            <div className="flex items-center justify-between mb-1.5 text-slate-800">
              <span className={`flex items-center gap-2 font-medium ${isPresenter ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'} ${isCorrect ? 'text-emerald-900 font-bold' : ''}`}>
                {isCorrect ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Correct</span>
                  </span>
                ) : isWinner && totalVotes > 1 ? (
                  <CheckCircle2 className={`text-brand-500 shrink-0 ${isPresenter ? 'w-5 h-5' : 'w-4 h-4'}`} />
                ) : null}
                <span>{item.option}</span>
              </span>
              <span className={`font-bold tabular-nums flex items-center gap-2 text-slate-600 ${isPresenter ? 'text-lg' : 'text-sm'}`}>
                <span className="text-slate-400 font-normal text-xs">({item.count})</span>
                <span className={isCorrect ? 'text-emerald-700 font-extrabold' : isWinner ? 'text-brand-600 font-extrabold' : ''}>
                  {item.percentage}%
                </span>
              </span>
            </div>

            {/* Progress bar background container */}
            <div className={`w-full bg-slate-100 rounded-xl overflow-hidden ${isPresenter ? 'h-7 sm:h-9' : 'h-5 sm:h-6'} ${isCorrect ? 'ring-2 ring-emerald-400/50' : ''}`}>
              <div
                style={{ width: `${item.percentage}%` }}
                className={`h-full transition-all duration-500 ease-out rounded-xl ${
                  isCorrect
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-xs'
                    : isWinner
                    ? 'bg-gradient-to-r from-brand-500 to-indigo-600 shadow-xs'
                    : 'bg-slate-300 group-hover:bg-slate-400'
                }`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
