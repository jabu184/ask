import React from 'react';

export default function WordCloud({ words = [], className = '' }) {
  if (!words || words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <p className="text-base font-medium">No words submitted yet</p>
        <p className="text-xs text-slate-400 mt-1">Submitted words will appear here in real time</p>
      </div>
    );
  }

  const counts = words.map((w) => w.count);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);

  const getPillStyle = (count) => {
    if (maxCount === minCount) {
      return 'bg-slate-200/90 text-slate-700 px-4 py-2 rounded-xl text-sm sm:text-base font-bold shadow-2xs';
    }
    const ratio = (count - minCount) / (maxCount - minCount);
    if (ratio >= 0.8) {
      // Top dominant tier (e.g. "strategy" in screenshot)
      return 'bg-[#d8e3ed] text-[#0f2d4a] px-6 py-3.5 sm:px-8 sm:py-4.5 rounded-2xl text-3xl sm:text-5xl font-black shadow-xs tracking-tight';
    }
    if (ratio >= 0.45) {
      // Secondary tier (e.g. "teambuilding", "AM tips", "vision" in screenshot)
      return 'bg-[#e0f2fe] text-[#0284c7] px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-lg sm:text-2xl font-extrabold shadow-2xs';
    }
    if (ratio >= 0.25) {
      // Intermediate tier
      return 'bg-[#e2e8f0] text-slate-800 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-sm sm:text-base font-bold shadow-2xs';
    }
    // Baseline single/low-vote tier (e.g. "closing", "activities", "team structure")
    return 'bg-[#cbd5e1]/90 text-slate-700 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl text-xs sm:text-sm font-semibold shadow-2xs';
  };

  // Center-out arrangement so the largest words naturally cluster in the center
  const centerOutWords = (items) => {
    if (!items || items.length <= 1) return items;
    const sorted = [...items].sort((a, b) => b.count - a.count);
    const result = [];
    sorted.forEach((item, idx) => {
      if (idx % 2 === 0) {
        result.push(item);
      } else {
        result.unshift(item);
      }
    });
    return result;
  };

  const displayList = centerOutWords(words);

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 p-6 sm:p-10 bg-white/70 rounded-3xl border border-slate-100 min-h-[220px] max-w-4xl mx-auto ${className}`}
    >
      {displayList.map((item, idx) => {
        const pillClasses = getPillStyle(item.count);

        return (
          <div
            key={item.text + idx}
            title={`${item.text}: ${item.count} submission${item.count === 1 ? '' : 's'}`}
            className={`inline-flex items-center gap-2 transition-all duration-300 hover:scale-105 select-none cursor-default ${pillClasses}`}
          >
            <span>{item.text}</span>
            {item.count > 1 && (
              <span className="text-[10px] sm:text-xs opacity-75 font-normal">
                ({item.count})
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
