import React from 'react';
import type { Restaurant, AspectCategory } from '../../types/restaurant';
import { formatNumber } from '../../utils/sentimentUtils';

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
    <div className="bg-white border border-[#E4E4E7] rounded-lg p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#18181B] tracking-tight">
            Khách hàng nói gì nhiều nhất
          </h2>
          <p className="text-xs text-[#71717A] mt-0.5">
            Mức độ quan tâm và tỷ lệ khen - chê của thực khách theo từng chủ đề
          </p>
        </div>
        <span className="text-xs font-semibold text-zinc-600 self-start sm:self-auto bg-zinc-50 px-2.5 py-1 rounded border border-zinc-200">
          5 Yếu tố đánh giá
        </span>
      </div>

      {/* Danh sách thanh phân bổ theo từng khía cạnh */}
      <div className="space-y-4">
        {restaurant.aspects.map((aspect) => {
          const isSelected = selectedAspect === aspect.category;
          return (
            <div
              key={aspect.category}
              onClick={() => onSelectAspect && onSelectAspect(aspect.category)}
              className={`p-3 rounded-lg border transition-all ${
                isSelected
                  ? 'border-zinc-900 bg-zinc-50/80 shadow-2xs'
                  : 'border-transparent hover:border-zinc-200 hover:bg-zinc-50/50'
              } ${onSelectAspect ? 'cursor-pointer' : ''}`}
            >
              {/* Header hàng: Tên khía cạnh, tỷ lệ tích cực, tỷ lệ xuất hiện */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#18181B]">
                    {aspect.category}
                  </span>
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                    {aspect.positivePercentage}% tích cực
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#71717A]">
                  <span>Xuất hiện trong <strong className="font-semibold text-zinc-800">{aspect.mentionPercentage}%</strong> bài đánh giá</span>
                  <span className="text-zinc-300">•</span>
                  <span className="font-mono text-[11px] text-zinc-500">({formatNumber(aspect.mentionCount)} lượt nhắc)</span>
                </div>
              </div>

              {/* Thanh phân bổ cảm xúc xếp tầng */}
              <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden flex mb-2">
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
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#71717A]">
                <span className="text-zinc-400 font-medium">Từ khóa tiêu biểu:</span>
                {aspect.sampleKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded font-mono text-[10.5px]"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
        <span>Nhấp vào từng khía cạnh để lọc trực tiếp các đánh giá liên quan bên dưới</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600" /> Tích cực</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Trung lập</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600" /> Tiêu cực</span>
        </div>
      </div>
    </div>
  );
};
