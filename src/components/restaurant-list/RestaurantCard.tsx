import React from 'react';
import type { Restaurant } from '../../types/restaurant';
import { MapPin, Star, ArrowRight, MessageSquare, ThumbsUp, AlertTriangle, ShieldCheck } from 'lucide-react';
import { formatNumber } from '../../utils/sentimentUtils';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onSelect: (restaurantId: string) => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, onSelect }) => {
  if (!restaurant) return null;

  // Trích xuất món nên thử hàng đầu
  const topStrength = restaurant.strengths?.[0];
  // Trích xuất điểm cần lưu ý thực tế
  const topComplaint = restaurant.attentionAreas?.[0]?.commonComplaints?.[0] || restaurant.attentionAreas?.[0]?.aspect;
  
  // Trích xuất nhận xét thực tế từ thực khách
  const sampleReview = restaurant.reviews?.[0]?.text || restaurant.sentimentSummarySentence || '';
  const quoteText = sampleReview && sampleReview.length > 115 
    ? `${sampleReview.slice(0, 112)}...` 
    : (sampleReview || 'Đang cập nhật đánh giá thực tế...');

  // Lấy chỉ số 3 yếu tố quan trọng nhất: Món ăn, Dịch vụ, Giá cả
  const foodAspect = restaurant.aspects?.find(a => a.category === 'Món ăn');
  const serviceAspect = restaurant.aspects?.find(a => a.category === 'Dịch vụ');
  const priceAspect = restaurant.aspects?.find(a => a.category === 'Giá cả');

  const posPct = restaurant.sentimentDistribution?.positive ?? 0;
  const neuPct = restaurant.sentimentDistribution?.neutral ?? 0;
  const negPct = restaurant.sentimentDistribution?.negative ?? 0;

  return (
    <article 
      onClick={() => onSelect(restaurant.id)}
      className="bg-white border border-[#E8E4DC] hover:border-[#991B1B]/40 rounded-2xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 hover:shadow-editorial cursor-pointer group relative"
    >
      <div>
        {/* Hàng 1: Phân loại ẩm thực, Mức giá, Thành phố */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-[#991B1B] bg-[#FDF2F2] px-2.5 py-0.5 rounded-full border border-[#FECACA] tracking-tight">
              {restaurant.cuisine || 'Ẩm thực'}
            </span>
            <span className="text-[11px] font-medium text-[#57534E] bg-[#F2EFE9] px-2 py-0.5 rounded-full border border-[#E8E4DC]">
              {restaurant.priceLevel || '$$'} · {restaurant.priceRange || 'Bình dân'}
            </span>
          </div>

          <span className="text-xs text-[#8C857B] font-medium flex items-center gap-1 shrink-0">
            <MapPin className="w-3.5 h-3.5 text-[#A8A29E]" />
            {restaurant.city || 'Việt Nam'}
          </span>
        </div>

        {/* Tên quán ăn */}
        <h3 className="font-display font-bold text-lg sm:text-xl text-[#1C1917] group-hover:text-[#991B1B] transition-colors tracking-tight line-clamp-1 mb-2.5">
          {restaurant.name}
        </h3>

        {/* Hàng chỉ số tin cậy: Điểm sao & Số lượng review đã xác thực */}
        <div className="flex items-center justify-between gap-2 text-xs mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-2 py-0.5 rounded-md font-bold">
              <Star className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" />
              <span>{restaurant.rating ?? 5.0}</span>
            </div>

            <div className="flex items-center gap-1 text-[#57534E] text-xs">
              <MessageSquare className="w-3.5 h-3.5 text-[#A8A29E]" />
              <span>{formatNumber(restaurant.totalReviews || 0)} đánh giá</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-0.5 rounded-md">
            <ShieldCheck className="w-3 h-3 text-[#065F46]" />
            <span>{posPct}% Hài lòng</span>
          </div>
        </div>

        {/* Thanh xếp tầng phân bổ cảm xúc thực tế (Positive - Neutral - Negative Bar) */}
        <div className="mb-3.5">
          <div className="flex items-center justify-between text-[10px] text-[#8C857B] font-medium mb-1">
            <span>Phân bổ phản hồi:</span>
            <span>{posPct}% Khen · {neuPct}% Ổn · {negPct}% Chê</span>
          </div>
          <div className="h-1.5 w-full bg-[#F2EFE9] rounded-full overflow-hidden flex">
            <div style={{ width: `${posPct}%` }} className="bg-[#065F46] h-full" title={`Hài lòng: ${posPct}%`} />
            <div style={{ width: `${neuPct}%` }} className="bg-[#D97706] h-full" title={`Trung lập: ${neuPct}%`} />
            <div style={{ width: `${negPct}%` }} className="bg-[#991B1B] h-full" title={`Không hài lòng: ${negPct}%`} />
          </div>
        </div>

        {/* Trích dẫn thực khách (Editorial Diner Quote) */}
        <div className="mb-3.5 p-3 rounded-xl bg-[#FAF7F2] border-l-2 border-[#991B1B] border-y border-r border-[#E8E4DC] text-xs text-[#57534E] leading-relaxed relative">
          <p className="line-clamp-2 italic">
            "{quoteText}"
          </p>
        </div>

        {/* 2 Điểm nhấn mấu chốt: Món nên thử & Điểm cần lưu ý */}
        <div className="space-y-1.5 mb-4 text-xs">
          {topStrength && (
            <div className="flex items-center gap-1.5 text-[#065F46] font-medium">
              <ThumbsUp className="w-3.5 h-3.5 shrink-0 text-[#065F46]" />
              <span className="truncate">
                <strong className="font-bold">Nên gọi:</strong> {topStrength.title}
              </span>
            </div>
          )}

          {topComplaint && (
            <div className="flex items-center gap-1.5 text-[#92400E] font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#D97706]" />
              <span className="truncate">
                <strong className="font-bold">Lưu ý:</strong> {topComplaint}
              </span>
            </div>
          )}
        </div>

        {/* 3 Thước đo khía cạnh cốt lõi */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#E8E4DC] text-[11px] text-[#57534E] mb-4">
          <div className="bg-[#FAF7F2] p-1.5 rounded-lg text-center border border-[#E8E4DC]">
            <span className="block text-[10px] text-[#8C857B] uppercase font-semibold">Món ăn</span>
            <span className="font-bold text-[#1C1917] text-xs">
              {foodAspect ? `${foodAspect.positivePercentage}%` : 'N/A'}
            </span>
          </div>
          <div className="bg-[#FAF7F2] p-1.5 rounded-lg text-center border border-[#E8E4DC]">
            <span className="block text-[10px] text-[#8C857B] uppercase font-semibold">Phục vụ</span>
            <span className="font-bold text-[#1C1917] text-xs">
              {serviceAspect ? `${serviceAspect.positivePercentage}%` : 'N/A'}
            </span>
          </div>
          <div className="bg-[#FAF7F2] p-1.5 rounded-lg text-center border border-[#E8E4DC]">
            <span className="block text-[10px] text-[#8C857B] uppercase font-semibold">Giá cả</span>
            <span className="font-bold text-[#1C1917] text-xs">
              {priceAspect ? `${priceAspect.positivePercentage}%` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Nút xem chi tiết */}
      <div className="pt-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(restaurant.id);
          }}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1C1917] group-hover:bg-[#991B1B] text-white rounded-xl text-xs font-bold tracking-wide transition-all duration-150 shadow-editorial-sm"
        >
          <span>Xem báo cáo chi tiết</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </article>
  );
};
