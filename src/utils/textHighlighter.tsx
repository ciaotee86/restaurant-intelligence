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
    // Nếu span bị bao trùm hoàn toàn bởi phần đã render, bỏ qua để tránh trùng lặp
    if (span.endIndex <= currentIndex) return;

    // Non-highlighted segment before this span
    if (span.startIndex > currentIndex) {
      elements.push(
        <span key={`text-${currentIndex}`}>
          {text.slice(currentIndex, span.startIndex)}
        </span>
      );
    }

    // Chỉ lấy phần chưa bôi màu nếu có overlap
    const start = Math.max(span.startIndex, currentIndex);
    if (start >= span.endIndex) return;

    // Determine highlight color class
    const sentiment = (span.sentiment || 'neutral').toLowerCase();
    let highlightClass = 'sentiment-highlight-pos';
    let dotColor = 'bg-emerald-500';
    if (sentiment === 'negative') {
      highlightClass = 'sentiment-highlight-neg';
      dotColor = 'bg-red-500';
    } else if (sentiment === 'neutral') {
      highlightClass = 'sentiment-highlight-neu';
      dotColor = 'bg-amber-500';
    }

    const spanText = text.slice(start, span.endIndex) || span.text;

    elements.push(
      <mark
        key={`span-${idx}`}
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 mx-0.5 transition-colors ${highlightClass}`}
        title={`${span.aspect}: ${(span.sentiment || 'neutral').toUpperCase()}`}
      >
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span>{spanText}</span>
        {showLabels && (
          <span className="text-[10px] uppercase font-mono tracking-wider opacity-75 ml-1 px-1 py-0.2 bg-white/60 rounded">
            {span.aspect} · {sentiment}
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
