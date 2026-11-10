import React from 'react';
import type { Restaurant } from '../../types/restaurant';
import { AlertTriangle } from 'lucide-react';
import { formatNumber } from '../../utils/sentimentUtils';

interface WhatNeedsAttentionProps {
  restaurant: Restaurant;
}

export const WhatNeedsAttention: React.FC<WhatNeedsAttentionProps> = ({ restaurant }) => {
  return (
    <div className="bg-white border border-[#E4E4E7] rounded-lg p-5 sm:p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded bg-red-50 text-red-700 flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#18181B] tracking-tight">
            Điểm cần chú ý & cải thiện
          </h2>
        </div>

        {/* Thẻ cảnh báo vận hành */}
        <div className="space-y-4">
          {restaurant.attentionAreas.map((area, idx) => (
            <div
              key={idx}
              className="bg-red-50/40 border border-red-200/80 rounded-lg p-4 transition-all hover:bg-red-50/60"
            >
              {/* Header thẻ: Tên khía cạnh + tỷ lệ tiêu cực */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-red-900 bg-red-100/80 px-2 py-0.5 rounded">
                    {area.aspect}
                  </span>
                  <h3 className="text-sm font-bold text-red-950 mt-1">
                    {area.negativePercentage}% đánh giá về {area.aspect.toLowerCase()} là tiêu cực
                  </h3>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-red-800 bg-white/80 px-2 py-0.5 rounded border border-red-200">
                    {formatNumber(area.complaintCount)} đánh giá
                  </span>
                  <div className="text-[10px] text-red-700 mt-0.5">phản hồi góp ý</div>
                </div>
              </div>

              {/* Danh sách khiếu nại phổ biến */}
              <div className="mt-3">
                <span className="text-xs font-semibold text-red-900 block mb-1">
                  Các vấn đề thường gặp nhất:
                </span>
                <ul className="space-y-1 text-xs text-red-950/90 pl-3 list-disc">
                  {area.commonComplaints.map((complaint, cIdx) => (
                    <li key={cIdx} className="leading-snug">
                      {complaint}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trích dẫn đánh giá thực tế */}
              {area.sampleReviewQuotes && area.sampleReviewQuotes.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-red-200/60 text-xs italic text-red-900/80 bg-white/60 p-2 rounded">
                  "{area.sampleReviewQuotes[0]}"
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-100 text-xs text-[#71717A]">
        Điểm nghẽn vận hành được phát hiện từ các khiếu nại lặp lại của thực khách
      </div>
    </div>
  );
};
