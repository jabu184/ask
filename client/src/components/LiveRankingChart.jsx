import React from 'react';

export default function LiveRankingChart({
  rankingData = null,
  results: propResults = null,
  totalVotes: propTotalVotes = 0,
  isPresenter = false
}) {
  const data = rankingData || {};
  const results = propResults || data.results || [];

  if (!results || results.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400">
        <p className="text-sm">No ranking options configured</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2.5">
      {results.map((item, idx) => {
        const rank = item.rank || idx + 1;

        return (
          <div
            key={idx}
            className={`flex items-center space-x-3.5 bg-white border border-slate-200/90 rounded-2xl ${
              isPresenter ? 'p-4 sm:p-5' : 'p-3.5 sm:p-4'
            } shadow-2xs hover:border-slate-300 transition`}
          >
            <span
              className={`inline-flex items-center justify-center font-bold rounded-xl bg-slate-900 text-white shrink-0 ${
                isPresenter ? 'w-9 h-9 text-base' : 'w-7 h-7 text-xs'
              }`}
            >
              #{rank}
            </span>
            <span
              className={`font-semibold text-slate-900 truncate flex-1 ${
                isPresenter ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'
              }`}
            >
              {item.option}
            </span>
          </div>
        );
      })}
    </div>
  );
}
