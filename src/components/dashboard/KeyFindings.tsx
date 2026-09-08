import React from 'react';
import type { Restaurant } from '../../types/restaurant';

interface KeyFindingsProps {
  restaurant: Restaurant;
}

export const KeyFindings: React.FC<KeyFindingsProps> = ({ restaurant }) => {
  return (
    <div className="bg-white border border-[#E4E4E7] rounded-lg p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#18181B] tracking-tight">
            Phát hiện cốt lõi
          </h2>
          <p className="text-xs text-[#71717A] mt-0.5">
            Tổng hợp nhận định định tính và định lượng từ dữ liệu phản hồi của khách hàng
          </p>
        </div>
        <span className="text-xs font-mono text-zinc-500 bg-zinc-50 px-2 py-1 rounded border border-zinc-200">
          Nhận định phân tích
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {restaurant.keyFindings.map((finding) => {
          let accentBorder = 'border-l-zinc-900';
          let numColor = 'text-zinc-400';
          if (finding.sentimentTrend === 'positive') {
            accentBorder = 'border-l-emerald-600';
            numColor = 'text-emerald-700';
          } else if (finding.sentimentTrend === 'negative') {
            accentBorder = 'border-l-red-600';
            numColor = 'text-red-700';
          }

          return (
            <div
              key={finding.id}
              className={`bg-zinc-50/60 border border-[#E4E4E7] border-l-4 ${accentBorder} rounded-lg p-4 flex flex-col justify-between`}
            >
              <div>
                <span className={`font-mono text-xs font-bold tracking-wider ${numColor} mb-1 block`}>
                  {finding.number} — {finding.aspect.toUpperCase()}
                </span>
                <h3 className="text-sm font-bold text-[#18181B] leading-snug mb-2">
                  {finding.title}
                </h3>
                <p className="text-xs text-[#52525B] leading-relaxed">
                  {finding.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
