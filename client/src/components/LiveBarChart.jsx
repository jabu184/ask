import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function LiveBarChart({
  results = [],
  totalVotes = 0,
  isPresenter = false,
  correctAnswer = null,
  showCorrectAnswer = false,
  showResults = true
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
        const isCorrect = showCorrectAnswer && Boolean(correctAnswer) && (
          item.option === correctAnswer ||
          (typeof item.option === 'string' && typeof correctAnswer === 'string' && item.option.trim().toLowerCase() === correctAnswer.trim().toLowerCase())
        );
        const isIncorrect = showCorrectAnswer && Boolean(correctAnswer) && !isCorrect;
        const isWinner = showResults && !showCorrectAnswer && totalVotes > 0 && item.percentage === maxPercentage && item.count > 0;

        return (
          <div key={idx} className="relative group">
            {/* Header row: Option text + percentage / vote count */}
            <div className="flex items-center justify-between mb-1.5 text-slate-800">
              <span className={`flex items-center gap-2 font-medium text-slate-900 ${isPresenter ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'}`}>
                {showCorrectAnswer && Boolean(correctAnswer) ? (
                  isCorrect ? (
                    <CheckCircle2 className={`text-brand-500 shrink-0 ${isPresenter ? 'w-5 h-5' : 'w-4 h-4'}`} />
                  ) : isIncorrect ? (
                    <XCircle className={`text-red-500 shrink-0 ${isPresenter ? 'w-5 h-5' : 'w-4 h-4'}`} />
                  ) : null
                ) : isWinner && totalVotes > 1 ? (
                  <CheckCircle2 className={`text-brand-500 shrink-0 ${isPresenter ? 'w-5 h-5' : 'w-4 h-4'}`} />
                ) : null}
                <span>{item.option}</span>
              </span>

              {showResults ? (
                <span className={`font-bold tabular-nums flex items-center gap-2 text-slate-600 ${isPresenter ? 'text-lg' : 'text-sm'}`}>
                  <span className="text-slate-400 font-normal text-xs">({item.count || 0})</span>
                  <span className={
                    showCorrectAnswer && Boolean(correctAnswer)
                      ? (isCorrect ? 'text-brand-600 font-extrabold' : 'text-slate-900 font-bold')
                      : (isWinner ? 'text-brand-600 font-extrabold' : 'text-slate-900 font-bold')
                  }>
                    {item.percentage || 0}%
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span>Collecting...</span>
                </span>
              )}
            </div>

            {/* Progress bar background container */}
            <div className={`w-full bg-slate-100 rounded-xl overflow-hidden ${isPresenter ? 'h-7 sm:h-9' : 'h-5 sm:h-6'}`}>
              {/* Colored fill bar */}
              <div
                style={{ width: showResults ? `${item.percentage || 0}%` : '0%' }}
                className={`h-full transition-all duration-500 ease-out rounded-xl ${
                  isCorrect
                    ? 'bg-gradient-to-r from-brand-500 to-indigo-600 shadow-xs'
                    : isIncorrect
                    ? 'bg-gradient-to-r from-red-500 to-red-800 shadow-xs'
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
