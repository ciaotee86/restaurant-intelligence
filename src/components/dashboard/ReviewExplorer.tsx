import React, { useState } from 'react';
import type { CustomerReview, AspectCategory, SentimentType } from '../../types/restaurant';
import { AspectPill } from '../common/AspectPill';
import { SentimentBadge } from '../common/SentimentBadge';
import { ReviewDetailModal } from './ReviewDetailModal';
import { Search, Star, Filter, MessageSquare, Maximize2 } from 'lucide-react';
import { restaurantService } from '../../services/restaurantService';
import { formatNumber } from '../../utils/sentimentUtils';

interface ReviewExplorerProps {
  reviews: CustomerReview[];
  initialAspect?: AspectCategory | 'all';
}

export const ReviewExplorer: React.FC<ReviewExplorerProps> = ({
  reviews,
  initialAspect = 'all'
}) => {
  const [sentimentFilter, setSentimentFilter] = useState<'all' | SentimentType>('all');
  const [aspectFilter, setAspectFilter] = useState<'all' | AspectCategory>(initialAspect);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedReview, setSelectedReview] = useState<CustomerReview | null>(null);

  const filteredReviews = restaurantService.filterReviews(
    reviews,
    sentimentFilter,
    aspectFilter,
    searchKeyword
  );

  const aspectsList: AspectCategory[] = ['Món ăn', 'Dịch vụ', 'Giá cả', 'Không gian', 'Vị trí'];

  return (
    <div id="review-explorer" className="bg-white border border-[#E4E4E7] rounded-lg p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#18181B] tracking-tight">
            Đánh giá từ khách hàng
          </h2>
          <p className="text-xs text-[#71717A] mt-0.5">
            Khám phá từng bài đánh giá chi tiết với trích xuất thực thể cảm xúc và khía cạnh bằng NLP
          </p>
        </div>

        <div className="text-xs font-mono text-zinc-500 bg-zinc-50 px-2.5 py-1 rounded border border-zinc-200 self-start sm:self-auto">
          Hiển thị {formatNumber(filteredReviews.length)} trên tổng số {formatNumber(reviews.length)} đánh giá
        </div>
      </div>

      {/* Thanh bộ lọc */}
      <div className="space-y-3 bg-zinc-50/70 p-4 rounded-lg border border-zinc-200/80">
        
        {/* Ô tìm kiếm & Chọn cảm xúc */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          
          {/* Tìm từ khóa */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm kiếm từ trong bài đánh giá (vd: 'burrata', 'chờ', 'giá', 'phục vụ')..."
              className="w-full bg-white border border-[#D4D4D8] text-xs sm:text-sm pl-9 pr-4 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-800"
            />
          </div>

          {/* Nút lọc cảm xúc */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-md border border-[#D4D4D8] self-start md:self-auto">
            <span className="text-[11px] font-semibold text-zinc-400 px-2 uppercase tracking-wider hidden sm:inline">
              Cảm xúc:
            </span>
            {(
              [
                { id: 'all', label: 'Tất cả' },
                { id: 'positive', label: 'Tích cực' },
                { id: 'neutral', label: 'Trung lập' },
                { id: 'negative', label: 'Tiêu cực' }
              ] as const
            ).map((s) => {
              const isActive = sentimentFilter === s.id;
              let activeColor = 'bg-zinc-900 text-white';
              if (isActive && s.id === 'positive') activeColor = 'bg-emerald-700 text-white';
              if (isActive && s.id === 'neutral') activeColor = 'bg-amber-700 text-white';
              if (isActive && s.id === 'negative') activeColor = 'bg-red-700 text-white';

              return (
                <button
                  key={s.id}
                  onClick={() => setSentimentFilter(s.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    isActive
                      ? `${activeColor} shadow-2xs font-semibold`
                      : 'text-[#52525B] hover:text-[#18181B] hover:bg-zinc-100'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Nút lọc khía cạnh */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs font-semibold text-zinc-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            Khía cạnh:
          </span>

          <button
            onClick={() => setAspectFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              aspectFilter === 'all'
                ? 'bg-zinc-900 text-white shadow-2xs'
                : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-400'
            }`}
          >
            Tất cả khía cạnh
          </button>

          {aspectsList.map((aspect) => {
            const isActive = aspectFilter === aspect;
            return (
              <button
                key={aspect}
                onClick={() => setAspectFilter(aspect)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                  isActive
                    ? 'bg-[#C2410C] text-white border-[#C2410C] shadow-2xs'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
                }`}
              >
                {aspect}
              </button>
            );
          })}
        </div>

      </div>

      {/* Danh sách thẻ đánh giá */}
      {filteredReviews.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-200 rounded-lg bg-zinc-50">
          <MessageSquare className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-700">Không tìm thấy đánh giá phù hợp</p>
          <p className="text-xs text-zinc-500 mt-1">Hãy thử xóa bộ lọc hoặc tìm kiếm từ khóa khác</p>
          <button
            onClick={() => {
              setSentimentFilter('all');
              setAspectFilter('all');
              setSearchKeyword('');
            }}
            className="mt-3 px-3 py-1.5 bg-white border border-zinc-300 text-xs font-medium rounded hover:bg-zinc-100 text-zinc-700 transition-colors"
          >
            Đặt lại tất cả bộ lọc
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredReviews.map((rev) => (
            <div
              key={rev.id}
              onClick={() => setSelectedReview(rev)}
              className="bg-white border border-[#E4E4E7] rounded-lg p-4.5 sm:p-5 hover:border-zinc-400 hover:shadow-xs transition-all cursor-pointer group"
            >
              {/* Header thẻ: Tác giả, Điểm sao, Ngày, Cảm xúc tổng thể */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200/80 px-2 py-0.5 rounded text-xs font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{rev.rating}.0</span>
                  </div>

                  <span className="text-xs font-semibold text-[#18181B]">
                    {rev.author}
                  </span>

                  <span className="text-xs text-[#71717A]">
                    {rev.dateDisplay}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <SentimentBadge sentiment={rev.overallSentiment} size="sm" />
                  <span className="text-zinc-400 group-hover:text-[#C2410C] transition-colors p-1" title="Xem chi tiết phân tích">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* Nội dung đánh giá */}
              <p className="text-xs sm:text-sm text-[#18181B] leading-relaxed mb-3 group-hover:text-zinc-950">
                "{rev.text}"
              </p>

              {/* Tag các khía cạnh trích xuất */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-100">
                <span className="text-[11px] font-semibold text-zinc-400 mr-1 uppercase font-mono">
                  Trích xuất:
                </span>
                {rev.aspects.map((aspectItem, aIdx) => (
                  <AspectPill
                    key={aIdx}
                    aspect={aspectItem.aspect}
                    sentiment={aspectItem.sentiment}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal chi tiết */}
      <ReviewDetailModal
        review={selectedReview}
        onClose={() => setSelectedReview(null)}
      />
    </div>
  );
};
