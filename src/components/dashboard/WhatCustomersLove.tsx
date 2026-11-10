import React from 'react';
import type { Restaurant } from '../../types/restaurant';
import { ThumbsUp, Check } from 'lucide-react';

interface WhatCustomersLoveProps {
  restaurant: Restaurant;
}

export const WhatCustomersLove: React.FC<WhatCustomersLoveProps> = ({ restaurant }) => {
  return (
    <div className="bg-white border border-[#E4E4E7] rounded-lg p-5 sm:p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ThumbsUp className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#18181B] tracking-tight">
            Điểm khách hàng yêu thích
          </h2>
        </div>

        {/* Danh sách điểm mạnh */}
        <div className="divide-y divide-zinc-100">
          {restaurant.strengths.map((item, idx) => (
            <div key={idx} className="py-3.5 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                  <h3 className="text-sm font-semibold text-[#18181B]">
                    {item.title}
                  </h3>
                </div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {item.positivePercentage}% tích cực
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#52525B] leading-relaxed pl-6">
                {item.description}
              </p>

              {item.sampleKeywords && item.sampleKeywords.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pl-6 mt-2">
                  {item.sampleKeywords.map((kw, i) => (
                    <span
                      key={i}
                      className="text-[11px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded font-mono"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-100 text-xs text-[#71717A]">
        Các yếu tố nổi bật được xếp hạng theo lượng phản hồi tích cực từ khách hàng
      </div>
    </div>
  );
};
