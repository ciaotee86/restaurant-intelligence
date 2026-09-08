import React from 'react';
import type { SentimentType } from '../../types/restaurant';
import { getSentimentBadgeClass, getSentimentLabel } from '../../utils/sentimentUtils';

interface SentimentBadgeProps {
  sentiment: SentimentType;
  percentage?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export const SentimentBadge: React.FC<SentimentBadgeProps> = ({
  sentiment,
  percentage,
  size = 'md',
  className = ''
}) => {
  const badgeClass = getSentimentBadgeClass(sentiment);
  const label = getSentimentLabel(sentiment);
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full ${badgeClass} ${sizeClass} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        sentiment === 'positive' ? 'bg-emerald-500' : sentiment === 'negative' ? 'bg-red-500' : 'bg-amber-500'
      }`} />
      <span>{label}</span>
      {percentage !== undefined && <span className="font-semibold">{percentage}%</span>}
    </span>
  );
};
