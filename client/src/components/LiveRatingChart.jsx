import React from 'react';
import { Star } from 'lucide-react';

export default function LiveRatingChart({ ratingData, isPresenter = false }) {
  if (!ratingData) {
    return null;
  }

  const { average = 0, totalVotes = 0, counts = {}, maxRating = 5 } = ratingData;

  const ratings = [];
  for (let i = 1; i <= maxRating; i++) {
    const count = counts[i] || 0;
    const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    ratings.push({ rating: i, count, percentage });
  }

  return (
    <div className="w-full flex flex-col md:flex-row items-center justify-center gap-8 py-4">
      {/* Big Average Score Card */}
      <div className="flex flex-col items-center justify-center bg-amber-50/80 border border-amber-200/60 rounded-3xl p-6 sm:p-8 min-w-[200px] text-center shadow-xs">
        <div className="flex items-center gap-1.5 text-amber-500 mb-2">
          <Star className={`fill-amber-400 text-amber-400 ${isPresenter ? 'w-10 h-10' : 'w-7 h-7'}`} />
          <span className={`font-black tracking-tight text-amber-900 ${isPresenter ? 'text-5xl sm:text-6xl' : 'text-3xl sm:text-4xl'}`}>
            {average}
          </span>
          <span className="text-amber-700/70 font-semibold text-lg sm:text-xl">/{maxRating}</span>
        </div>
        <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
          Average Score
        </p>
        <p className="text-xs text-amber-600 mt-1">
          {totalVotes} vote{totalVotes === 1 ? '' : 's'} total
        </p>
      </div>

      {/* Distribution Bars */}
      <div className="flex-1 w-full max-w-md space-y-2.5">
        {ratings.reverse().map((r) => (
          <div key={r.rating} className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <span className="w-8 flex items-center gap-1 text-slate-600 font-bold shrink-0">
              {r.rating} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 inline" />
            </span>
            <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                style={{ width: `${r.percentage}%` }}
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
              />
            </div>
            <span className="w-12 text-right text-xs text-slate-500 tabular-nums">
              {r.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
