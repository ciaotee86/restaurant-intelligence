import React from 'react';
import { HighlightSpan } from '../types/restaurant';

interface TextHighlighterProps {
  text: string;
  spans: HighlightSpan[];
  className?: string;
  showLabels?: boolean;
}

export const TextHighlighter: React.FC<TextHighlighterProps> = ({
  text,
  spans,
  className = '',
  showLabels = false
}) => {
  if (!spans || spans.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Sort spans by startIndex
  const sortedSpans = [...spans].sort((a, b) => a.startIndex - b.startIndex);
  const elements: React.ReactNode[] = [];
  let currentIndex = 0;

  sortedSpans.forEach((span, idx) => {
    // Non-highlighted segment before this span
    if (span.startIndex > currentIndex) {
      elements.push(
        <span key={`text-${currentIndex}`}>
          {text.slice(currentIndex, span.startIndex)}
        </span>
      );
    }

    // Determine highlight color class
    let highlightClass = 'sentiment-highlight-pos';
    let dotColor = 'bg-emerald-500';
    if (span.sentiment === 'negative') {
      highlightClass = 'sentiment-highlight-neg';
      dotColor = 'bg-red-500';
    } else if (span.sentiment === 'neutral') {
      highlightClass = 'sentiment-highlight-neu';
      dotColor = 'bg-amber-500';
    }

    const spanText = text.slice(span.startIndex, span.endIndex) || span.text;

    elements.push(
      <mark
        key={`span-${idx}`}
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 mx-0.5 transition-colors ${highlightClass}`}
        title={`${span.aspect}: ${span.sentiment.toUpperCase()}`}
      >
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span>{spanText}</span>
        {showLabels && (
          <span className="text-[10px] uppercase font-mono tracking-wider opacity-75 ml-1 px-1 py-0.2 bg-white/60 rounded">
            {span.aspect} · {span.sentiment}
          </span>
        )}
      </mark>
    );

    currentIndex = Math.max(currentIndex, span.endIndex);
  });

  // Remaining text after last span
  if (currentIndex < text.length) {
    elements.push(
      <span key={`text-end`}>
        {text.slice(currentIndex)}
      </span>
    );
  }

  return <div className={`leading-relaxed ${className}`}>{elements}</div>;
};
