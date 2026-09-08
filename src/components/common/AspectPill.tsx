import React from 'react';
import type { AspectCategory, SentimentType } from '../../types/restaurant';
import { getSentimentLabel } from '../../utils/sentimentUtils';

interface AspectPillProps {
  aspect: AspectCategory;
  sentiment?: SentimentType;
  confidence?: number;
  interactive?: boolean;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export const AspectPill: React.FC<AspectPillProps> = ({
  aspect,
  sentiment,
  confidence,
  interactive = false,
  active = false,
  onClick,
  className = ''
}) => {
  let sentimentStyle = 'bg-zinc-100 text-zinc-800 border-zinc-200';
  let dotColor = 'bg-zinc-400';

  if (sentiment === 'positive') {
    sentimentStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (sentiment === 'negative') {
    sentimentStyle = 'bg-red-50 text-red-800 border-red-200';
    dotColor = 'bg-red-500';
  } else if (sentiment === 'neutral') {
    sentimentStyle = 'bg-amber-50 text-amber-800 border-amber-200';
    dotColor = 'bg-amber-500';
  }

  const baseStyle = `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
    active ? 'ring-2 ring-zinc-900 ring-offset-1 font-semibold' : ''
  } ${sentimentStyle} ${interactive ? 'cursor-pointer hover:opacity-90' : ''} ${className}`;

  return (
    <span onClick={onClick} className={baseStyle}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{aspect}</span>
      {sentiment && (
        <span className="opacity-70 font-normal">
          · {getSentimentLabel(sentiment)}
        </span>
      )}
      {confidence !== undefined && (
        <span className="text-[10px] font-mono opacity-50 ml-0.5">
          ({Math.round(confidence * 100)}%)
        </span>
      )}
    </span>
  );
};
