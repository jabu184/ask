import React from 'react';

const PALETTE = [
  '#2563eb', // blue
  '#7c3aed', // violet
  '#db2777', // pink
  '#059669', // emerald
  '#d97706', // amber
  '#0284c7', // sky
  '#4f46e5', // indigo
  '#e11d48', // rose
  '#0d9488', // teal
  '#9333ea', // purple
];

function getColor(index) {
  return PALETTE[index % PALETTE.length];
}

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

  // Compute font size between 14px and 52px
  const getFontSize = (count) => {
    if (maxCount === minCount) return 24;
    const ratio = (count - minCount) / (maxCount - minCount);
    return Math.round(14 + ratio * 38);
  };

  const getWeight = (count) => {
    if (maxCount === minCount) return 'font-semibold';
    const ratio = (count - minCount) / (maxCount - minCount);
    if (ratio > 0.6) return 'font-extrabold';
    if (ratio > 0.3) return 'font-bold';
    return 'font-medium';
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-3 sm:gap-4 p-6 bg-slate-50/70 rounded-2xl border border-slate-100 min-h-[220px] ${className}`}
    >
      {words.map((item, idx) => {
        const size = getFontSize(item.count);
        const weight = getWeight(item.count);
        const color = getColor(idx);

        return (
          <span
            key={item.text + idx}
            title={`${item.text}: ${item.count} vote${item.count === 1 ? '' : 's'}`}
            style={{
              fontSize: `${size}px`,
              color,
              lineHeight: 1.15,
            }}
            className={`inline-flex items-center gap-1.5 transition-all duration-300 hover:scale-110 cursor-default select-none px-2 py-1 rounded-lg hover:bg-white/80 hover:shadow-xs ${weight}`}
          >
            {item.text}
            {item.count > 1 && (
              <span className="text-[10px] bg-slate-200/80 text-slate-700 rounded-full px-1.5 py-0.2 font-normal">
                {item.count}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
