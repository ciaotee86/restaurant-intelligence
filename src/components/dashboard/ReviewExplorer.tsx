import React, { useState, useMemo } from 'react';
import type { CustomerReview, AspectCategory, SentimentType } from '../../types/restaurant';
import { AspectPill } from '../common/AspectPill';
import { SentimentBadge } from '../common/SentimentBadge';
import { ReviewDetailModal } from './ReviewDetailModal';
import { ReviewReplyModal } from './ReviewReplyModal';
import { Search, Star, Filter, MessageSquare, Maximize2, ShieldCheck, Zap, Layers, MapPin } from 'lucide-react';
import { restaurantService } from '../../services/restaurantService';
import { formatNumber } from '../../utils/sentimentUtils';

/**
 * Làm sạch tên tác giả một cách an toàn:
 * - Nếu trống, rỗng hoặc chỉ có khoảng trắng -> hiển thị "Khách đánh giá"
 * - Không render bất kỳ chuỗi {{...}} nào (mã template AngularJS)
 * - Nếu tác giả chứa common_delete, Model. hoặc mã rác -> fallback về "Khách đánh giá"
 */
const getSafeAuthor = (author?: string, source?: string): string => {
  const defaultName = (source || '').toLowerCase().includes('google') ? 'Khách Google' : 'Khách Foody';
  if (!author || typeof author !== 'string') return defaultName;
  const trimmed = author.trim();
  if (!trimmed) return defaultName;

  // Kiểm tra chuỗi chứa template rác hoặc biểu thức AngularJS
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('{{') ||
    lower.includes('}}') ||
    lower.includes('model.') ||
    lower.includes('common_delete')
  ) {
    const stripped = trimmed.replace(/\{\{[\s\S]*?\}\}/g, '').trim();
    if (!stripped || stripped.toLowerCase().includes('model.') || stripped.toLowerCase().includes('common_delete')) {
      return defaultName;
    }
    return stripped;
  }
  return trimmed;
};

/**
 * Làm sạch nội dung bài viết:
 * - Loại bỏ triệt để bất kỳ chuỗi {{...}} nào
 */
const getSafeText = (text?: string): string => {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/\{\{[\s\S]*?\}\}/g, '').replace(/\{\{|\}\}/g, '').trim();
};

/**
 * Hiển thị ngày an toàn, bỏ qua chuỗi template rác
 */
const getSafeDateDisplay = (dateDisplay?: string): string => {
  if (!dateDisplay || typeof dateDisplay !== 'string') return '';
  if (dateDisplay.includes('{{') || dateDisplay.toLowerCase().includes('model.')) return '';
  return dateDisplay.trim();
};

interface ReviewExplorerProps {
  reviews: CustomerReview[];
  initialAspect?: AspectCategory | 'all';
  restaurantId?: string;
  restaurantName?: string;
}

export const ReviewExplorer: React.FC<ReviewExplorerProps> = ({
  reviews,
  initialAspect = 'all',
  restaurantId,
  restaurantName
}) => {
  const [sentimentFilter, setSentimentFilter] = useState<'all' | SentimentType>('all');
  const [aspectFilter, setAspectFilter] = useState<'all' | AspectCategory>(initialAspect);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'Foody' | 'GoogleMaps'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedReview, setSelectedReview] = useState<CustomerReview | null>(null);
  const [replyReview, setReplyReview] = useState<CustomerReview | null>(null);

  // Lọc phòng vệ dữ liệu đầu vào: đảm bảo danh sách review không chứa bài viết rác
  const cleanReviews = useMemo(() => restaurantService.sanitizeReviews(reviews || []), [reviews]);

  // Đếm số lượng review theo từng nguồn
  const sourceCounts = useMemo(() => {
    let foody = 0;
    let googleMaps = 0;
    for (const r of cleanReviews) {
      const s = (r.source || '').toLowerCase();
      if (s.includes('google')) {
        googleMaps++;
      } else {
        foody++;
      }
    }
    return { all: cleanReviews.length, foody, googleMaps };
  }, [cleanReviews]);

  const filteredReviews = restaurantService.filterReviews(
    cleanReviews,
    sentimentFilter,
    aspectFilter,
    searchKeyword,
    sourceFilter
  );

  const aspectsList: AspectCategory[] = ['Món ăn', 'Dịch vụ', 'Giá cả', 'Không gian', 'Vị trí'];

  return (
    <div id="review-explorer" className="bg-white border border-[#E5E3DE] rounded-xl p-5 sm:p-7 shadow-craft-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E3DE] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C2410C] mb-1">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Nguồn dữ liệu gốc minh bạch</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#18181B] tracking-tight">
            Đánh giá từ thực khách
          </h2>
          <p className="text-xs text-[#71717A] mt-0.5">
            Đọc từng nhận xét chân thực của thực khách theo từng tiêu chí cụ thể và nguồn thu thập
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-600 bg-[#FAF9F5] px-3 py-1.5 rounded-lg border border-[#E5E3DE] self-start sm:self-auto font-bold">
          <span>{formatNumber(filteredReviews.length)}</span>
          <span className="text-zinc-400 font-normal">/</span>
          <span>{formatNumber(cleanReviews.length)} đánh giá</span>
        </div>
      </div>

      {/* Thanh bộ lọc đa chiều (MOD-03) */}
      <div className="space-y-3.5 bg-[#FAF9F5] p-4 sm:p-5 rounded-xl border border-[#E5E3DE]">
        
        {/* Hàng 1: Ô tìm kiếm & Chọn cảm xúc */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Tìm từ khóa */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm theo món ăn hoặc từ khóa (vd: 'gà giòn', 'chờ lâu', 'phục vụ', 'view đẹp')..."
              className="w-full bg-white border border-[#E5E3DE] text-xs sm:text-sm pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-zinc-900 transition-colors"
            />
          </div>

          {/* Nút lọc cảm xúc */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#E5E3DE] self-start md:self-auto">
            <span className="text-[11px] font-bold text-zinc-400 px-2 uppercase tracking-wider hidden sm:inline">
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
              let activeColor = 'bg-[#18181B] text-white shadow-craft-sm';
              if (isActive && s.id === 'positive') activeColor = 'bg-emerald-700 text-white shadow-craft-sm';
              if (isActive && s.id === 'neutral') activeColor = 'bg-amber-700 text-white shadow-craft-sm';
              if (isActive && s.id === 'negative') activeColor = 'bg-red-700 text-white shadow-craft-sm';

              return (
                <button
                  key={s.id}
                  onClick={() => setSentimentFilter(s.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    isActive
                      ? activeColor
                      : 'text-[#52525B] hover:text-[#18181B] hover:bg-zinc-100'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hàng 2: Nút lọc nguồn dữ liệu (MOD-03: Foody & Google Maps) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#E5E3DE]/70">
          <span className="text-xs font-bold text-zinc-500 mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            Nguồn đánh giá:
          </span>

          <button
            type="button"
            onClick={() => setSourceFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              sourceFilter === 'all'
                ? 'bg-[#18181B] text-white shadow-craft-sm'
                : 'bg-white text-zinc-700 border border-[#E5E3DE] hover:border-zinc-500'
            }`}
          >
            Tất cả ({sourceCounts.all})
          </button>

          <button
            type="button"
            onClick={() => setSourceFilter('Foody')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all inline-flex items-center gap-1.5 cursor-pointer ${
              sourceFilter === 'Foody'
                ? 'bg-[#EA580C] text-white border-[#EA580C] shadow-craft-sm'
                : 'bg-white text-zinc-700 border-[#E5E3DE] hover:border-[#EA580C]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${sourceFilter === 'Foody' ? 'bg-white' : 'bg-[#EA580C]'}`} />
            <span>Foody ({sourceCounts.foody})</span>
          </button>

          <button
            type="button"
            onClick={() => setSourceFilter('GoogleMaps')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all inline-flex items-center gap-1.5 cursor-pointer ${
              sourceFilter === 'GoogleMaps'
                ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-craft-sm'
                : 'bg-white text-zinc-700 border-[#E5E3DE] hover:border-[#2563EB]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Google Maps ({sourceCounts.googleMaps})</span>
          </button>
        </div>

        {/* Hàng 3: Nút lọc tiêu chí khía cạnh */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#E5E3DE]/70">
          <span className="text-xs font-bold text-zinc-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            Tiêu chí:
          </span>

          <button
            onClick={() => setAspectFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              aspectFilter === 'all'
                ? 'bg-[#18181B] text-white shadow-craft-sm'
                : 'bg-white text-zinc-700 border border-[#E5E3DE] hover:border-zinc-500'
            }`}
          >
            Tất cả tiêu chí
          </button>

          {aspectsList.map((aspect) => {
            const isActive = aspectFilter === aspect;
            return (
              <button
                key={aspect}
                onClick={() => setAspectFilter(aspect)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C2410C] text-white border-[#C2410C] shadow-craft-sm'
                    : 'bg-white text-zinc-700 border-[#E5E3DE] hover:border-zinc-500'
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
        <div className="text-center py-12 border border-dashed border-[#E5E3DE] rounded-xl bg-[#FAF9F5]">
          <MessageSquare className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-zinc-800">Không tìm thấy đánh giá phù hợp</p>
          <p className="text-xs text-zinc-500 mt-1">Hãy thử xóa bộ lọc hoặc tìm kiếm từ khóa khác</p>
          <button
            onClick={() => {
              setSentimentFilter('all');
              setAspectFilter('all');
              setSourceFilter('all');
              setSearchKeyword('');
            }}
            className="mt-3.5 px-4 py-2 bg-white border border-[#18181B] text-xs font-bold rounded-lg hover:bg-zinc-100 text-zinc-900 shadow-craft-sm transition-all cursor-pointer"
          >
            Đặt lại tất cả bộ lọc
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredReviews.map((rev) => {
            const isGoogleReview = (rev.source || '').toLowerCase().includes('google') || !!rev.googleReviewId;
            const safeRev: CustomerReview = {
              ...rev,
              author: getSafeAuthor(rev.author, rev.source),
              text: getSafeText(rev.text),
              dateDisplay: getSafeDateDisplay(rev.dateDisplay)
            };

            return (
              <div
                key={rev.id}
                onClick={() => setSelectedReview(safeRev)}
                className="bg-white border border-[#E5E3DE] hover:border-[#18181B] rounded-xl p-5 hover:shadow-craft-sm transition-all cursor-pointer group"
              >
                {/* Header thẻ: Tác giả, Nguồn (Badge), Điểm sao, Ngày, Cảm xúc tổng thể */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                    {/* Điểm sao */}
                    <div className="flex items-center gap-1 bg-amber-50 text-amber-950 border border-amber-300 px-2.5 py-0.5 rounded font-black text-xs">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{rev.rating}.0</span>
                    </div>

                    {/* Tác giả */}
                    <span className="text-xs font-bold text-[#1C1917] flex items-center gap-1">
                      <span>{safeRev.author}</span>
                      <span title="Khách hàng thật"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" /></span>
                    </span>

                    {/* Badge nhận diện nguồn trực quan (Foody: Cam, Google Maps: Xanh dương) */}
                    {isGoogleReview ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                        <MapPin className="w-3 h-3 text-[#2563EB]" />
                        <span>Google Maps</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
                        <span>Foody</span>
                      </span>
                    )}

                    {safeRev.dateDisplay && (
                      <span className="text-xs text-[#71717A] font-medium">
                        {safeRev.dateDisplay}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <SentimentBadge sentiment={rev.overallSentiment} size="sm" />

                    {/* Nút kích hoạt nhanh AI Soạn phản hồi */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReplyReview(safeRev);
                      }}
                      title="Soạn thư phản hồi thực khách"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5] hover:bg-[#C2410C] hover:text-white transition-all shadow-craft-sm cursor-pointer"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Soạn phản hồi</span>
                    </button>

                    <span className="text-zinc-400 group-hover:text-[#C2410C] transition-colors p-1" title="Xem chi tiết phân tích">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* Nội dung đánh giá */}
                <p className="text-xs sm:text-sm text-[#18181B] leading-relaxed mb-3 group-hover:text-black">
                  "{safeRev.text}"
                </p>

                {/* Tag các khía cạnh trích xuất */}
                {rev.aspects && rev.aspects.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-[#E5E3DE]">
                    <span className="text-[11px] font-bold text-zinc-400 mr-1 uppercase font-mono">
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal chi tiết */}
      <ReviewDetailModal
        review={selectedReview}
        onClose={() => setSelectedReview(null)}
        onOpenReplyModal={(rev) => setReplyReview({
          ...rev,
          author: getSafeAuthor(rev.author, rev.source),
          text: getSafeText(rev.text),
          dateDisplay: getSafeDateDisplay(rev.dateDisplay)
        })}
      />

      {/* Modal AI Soạn phản hồi thực khách */}
      <ReviewReplyModal
        review={replyReview}
        isOpen={!!replyReview}
        onClose={() => setReplyReview(null)}
        restaurantId={restaurantId || replyReview?.restaurantId || ''}
        restaurantName={
          restaurantName ||
          restaurantService.getCachedRestaurants().find((r) => r.id === replyReview?.restaurantId)?.name ||
          'Nhà hàng'
        }
      />
    </div>
  );
};
