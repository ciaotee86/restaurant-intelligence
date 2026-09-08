import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trendText?: string;
  sentiment?: 'positive' | 'negative' | 'neutral' | 'neutral-slate';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  trendText,
  sentiment = 'neutral-slate',
  className = ''
}) => {
  let valueColor = 'text-[#18181B]';
  if (sentiment === 'positive') valueColor = 'text-emerald-700';
  if (sentiment === 'negative') valueColor = 'text-red-700';
  if (sentiment === 'neutral') valueColor = 'text-amber-700';

  return (
    <div className={`bg-white border border-[#E4E4E7] rounded-lg p-4 sm:p-5 flex flex-col justify-between transition-all hover:border-zinc-300 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-xs font-semibold text-[#71717A] uppercase tracking-wider">
          {label}
        </span>
        {trendText && (
          <span className="text-[11px] font-medium text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
            {trendText}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-2xl sm:text-3xl font-bold tracking-tight ${valueColor}`}>
          {value}
        </span>
        {subtext && (
          <span className="text-xs text-[#71717A] font-normal">
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
};
