import React from 'react';
import { Award, Trophy } from 'lucide-react';

export default function LiveRankingChart({
  rankingData = null,
  results: propResults = null,
  totalVotes: propTotalVotes = 0,
  isPresenter = false
}) {
  const data = rankingData || {};
  const results = propResults || data.results || [];
  const totalVotes = data.totalVotes ?? propTotalVotes ?? 0;
  const validBallots = data.validBallots ?? totalVotes;

  if (!results || results.length === 0) {
    return (
      <div className="py-8 text-center text-slate-400">
        <p className="text-sm">No ranking options configured</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3.5">
      {results.map((item, idx) => {
        const rank = item.rank || idx + 1;
        const isFirst = rank === 1 && totalVotes > 0;
        const isSecond = rank === 2 && totalVotes > 0;
        const isThird = rank === 3 && totalVotes > 0;

        let badgeBg = 'bg-slate-100 text-slate-600 border-slate-200';
        let barGradient = 'bg-gradient-to-r from-slate-400 to-slate-500';
        let medalEmoji = null;

        if (isFirst) {
          badgeBg = 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs ring-1 ring-amber-400/30';
          barGradient = 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 shadow-xs';
          medalEmoji = '🥇';
        } else if (isSecond) {
          badgeBg = 'bg-slate-200 text-slate-800 border-slate-300';
          barGradient = 'bg-gradient-to-r from-slate-400 to-indigo-400';
          medalEmoji = '🥈';
        } else if (isThird) {
          badgeBg = 'bg-orange-100 text-orange-900 border-orange-200';
          barGradient = 'bg-gradient-to-r from-orange-300 to-amber-400';
          medalEmoji = '🥉';
        }

        return (
          <div key={idx} className="relative group">
            {/* Header row: Rank badge + Option text + Stats */}
            <div className="flex items-center justify-between mb-1.5 text-slate-800 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`inline-flex items-center justify-center font-black rounded-lg border px-2 py-0.5 shrink-0 ${
                    isPresenter ? 'text-sm min-w-[38px] h-7' : 'text-xs min-w-[32px] h-6'
                  } ${badgeBg}`}
                >
                  {medalEmoji ? <span className="mr-1">{medalEmoji}</span> : null}
                  <span>#{rank}</span>
                </span>
                <span
                  className={`font-semibold truncate ${
                    isPresenter ? 'text-lg sm:text-xl text-slate-900' : 'text-sm sm:text-base text-slate-800'
                  }`}
                >
                  {item.option}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0 tabular-nums">
                {item.averageRank > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200/80 ${
                      isPresenter ? 'text-xs' : 'text-[11px]'
                    }`}
                    title="Average rank position across all voters"
                  >
                    Avg #{item.averageRank}
                  </span>
                )}
                <span
                  className={`font-bold flex items-center gap-1.5 ${
                    isPresenter ? 'text-lg' : 'text-sm'
                  } ${isFirst ? 'text-amber-700 font-black' : 'text-slate-700'}`}
                >
                  <span>{item.score || 0} pts</span>
                  <span className="text-slate-400 font-normal text-xs">({item.percentage || 0}%)</span>
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div
              className={`w-full bg-slate-100 rounded-xl overflow-hidden ${
                isPresenter ? 'h-7 sm:h-9' : 'h-5 sm:h-6'
              } ${isFirst ? 'ring-2 ring-amber-400/40' : ''}`}
            >
              <div
                style={{ width: `${Math.max(item.percentage || 0, totalVotes > 0 ? 3 : 0)}%` }}
                className={`h-full transition-all duration-500 ease-out rounded-xl ${barGradient}`}
              />
            </div>
          </div>
        );
      })}

      {validBallots > 0 && (
        <div className="pt-1 text-right text-[11px] text-slate-400 font-medium">
          Ranked by Borda score across {validBallots} ballot{validBallots === 1 ? '' : 's'}
        </div>
      )}
    </div>
  );
}
