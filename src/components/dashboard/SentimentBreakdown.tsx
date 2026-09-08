import React from 'react';
import type { Restaurant } from '../../types/restaurant';
import { formatNumber } from '../../utils/sentimentUtils';

interface SentimentBreakdownProps {
  restaurant: Restaurant;
}

export const SentimentBreakdown: React.FC<SentimentBreakdownProps> = ({ restaurant }) => {
  const { positive, neutral, negative } = restaurant.sentimentDistribution;

  return (
    <div className="bg-white border border-[#E4E4E7] rounded-lg p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-bold text-[#18181B] tracking-tight">
          Cảm xúc khách hàng
        </h2>
        <span className="text-xs text-[#71717A] font-mono">
          N = {formatNumber(restaurant.totalReviews)}
        </span>
      </div>

      {/* Thanh phân bổ trực quan đa phân đoạn */}
      <div className="space-y-3">
        <div className="h-4 w-full bg-zinc-100 rounded-full overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${positive}%` }}
            className="bg-emerald-600 h-full transition-all duration-500 hover:opacity-90 relative group"
            title={`Tích cực: ${positive}%`}
          />
          <div
            style={{ width: `${neutral}%` }}
            className="bg-amber-500 h-full transition-all duration-500 hover:opacity-90 relative group"
            title={`Trung lập: ${neutral}%`}
          />
          <div
            style={{ width: `${negative}%` }}
            className="bg-red-600 h-full transition-all duration-500 hover:opacity-90 relative group"
            title={`Tiêu cực: ${negative}%`}
          />
        </div>

        {/* Chú thích với số liệu chi tiết */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-b border-zinc-100 pb-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs text-[#52525B]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
              <span>Tích cực</span>
            </div>
            <span className="text-lg font-bold text-emerald-700 tracking-tight mt-0.5">
              {positive}%
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs text-[#52525B]">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <span>Trung lập</span>
            </div>
            <span className="text-lg font-bold text-amber-700 tracking-tight mt-0.5">
              {neutral}%
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs text-[#52525B]">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
              <span>Tiêu cực</span>
            </div>
            <span className="text-lg font-bold text-red-700 tracking-tight mt-0.5">
              {negative}%
            </span>
          </div>
        </div>

        {/* Câu nhận định tổng hợp tự nhiên */}
        <p className="text-xs sm:text-sm text-[#52525B] leading-relaxed italic bg-zinc-50/80 p-3 rounded border border-zinc-200/70">
          "{restaurant.sentimentSummarySentence}"
        </p>
      </div>
    </div>
  );
};
