import React from 'react';
import type { Restaurant, AspectCategory } from '../../types/restaurant';
import { formatNumber } from '../../utils/sentimentUtils';
import { BarChart2 } from 'lucide-react';

interface AspectAnalysisProps {
  restaurant: Restaurant;
  selectedAspect?: AspectCategory | 'all';
  onSelectAspect?: (aspect: AspectCategory) => void;
}

export const AspectAnalysis: React.FC<AspectAnalysisProps> = ({
  restaurant,
  selectedAspect,
  onSelectAspect
}) => {
  return (
    <div className="bg-white border border-[#E5E3DE] rounded-xl p-5 sm:p-7 shadow-craft-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-[#E5E3DE]">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#C2410C] mb-1">
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Phân tích khía cạnh chuyên sâu</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#18181B] tracking-tight">
            Khách hàng nói gì nhiều nhất?
          </h2>
          <p className="text-xs text-[#71717A] mt-0.5">
            Mức độ quan tâm và tỷ lệ khen - chê của thực khách phân tách theo 5 chủ đề cốt lõi
          </p>
        </div>
        <span className="text-xs font-bold text-zinc-700 self-start sm:self-auto bg-[#FAF9F5] px-3 py-1.5 rounded-lg border border-[#E5E3DE]">
          5 Khía cạnh đánh giá
        </span>
      </div>

      {/* Danh sách thanh phân bổ theo từng khía cạnh */}
      <div className="space-y-4">
        {(restaurant.aspects || []).map((aspect) => {
          const isSelected = selectedAspect === aspect.category;
          return (
            <div
              key={aspect.category}
              onClick={() => onSelectAspect && onSelectAspect(aspect.category)}
              className={`p-4 rounded-xl border transition-all ${
                isSelected
                  ? 'border-[#18181B] bg-[#FAF9F5] shadow-craft-sm'
                  : 'border-[#E5E3DE] hover:border-zinc-500 hover:bg-[#FAF9F5]/50'
              } ${onSelectAspect ? 'cursor-pointer' : ''}`}
            >
              {/* Header hàng: Tên khía cạnh, tỷ lệ tích cực, tỷ lệ xuất hiện */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-base font-black text-[#18181B]">
                    {aspect.category}
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                    {aspect.positivePercentage}% tích cực
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#71717A]">
                  <span>Xuất hiện trong <strong className="font-extrabold text-zinc-900">{aspect.mentionPercentage}%</strong> bài đánh giá</span>
                  <span className="text-zinc-300">•</span>
                  <span className="font-mono text-[11px] text-zinc-500">({formatNumber(aspect.mentionCount)} lượt nhắc)</span>
                </div>
              </div>

              {/* Thanh phân bổ cảm xúc xếp tầng (Positive - Neutral - Negative Bar) */}
              <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden flex mb-2.5">
                <div
                  style={{ width: `${aspect.positivePercentage}%` }}
                  className="bg-emerald-600 h-full"
                  title={`Tích cực: ${aspect.positivePercentage}%`}
                />
                <div
                  style={{ width: `${aspect.neutralPercentage}%` }}
                  className="bg-amber-500 h-full"
                  title={`Trung lập: ${aspect.neutralPercentage}%`}
                />
                <div
                  style={{ width: `${aspect.negativePercentage}%` }}
                  className="bg-red-600 h-full"
                  title={`Tiêu cực: ${aspect.negativePercentage}%`}
                />
              </div>

              {/* Cụm từ trích xuất phổ biến */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#71717A]">
                <span className="text-zinc-500 font-semibold text-[11px]">Từ khóa tiêu biểu:</span>
                {(aspect.sampleKeywords || []).map((kw, i) => (
                  <span
                    key={i}
                    className="bg-white border border-[#E5E3DE] text-zinc-800 px-2 py-0.5 rounded font-mono text-[11px]"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-[#E5E3DE] flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
        <span className="font-medium">Nhấp vào từng khía cạnh để xem ngay các đánh giá liên quan</span>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-emerald-800"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Tích cực</span>
          <span className="flex items-center gap-1.5 text-amber-800"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Trung lập</span>
          <span className="flex items-center gap-1.5 text-red-800"><span className="w-2.5 h-2.5 rounded-full bg-red-600" /> Tiêu cực</span>
        </div>
      </div>
    </div>
  );
};
