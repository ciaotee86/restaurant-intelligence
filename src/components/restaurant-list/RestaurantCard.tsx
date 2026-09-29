import React from 'react';
import type { Restaurant } from '../../types/restaurant';
import { MapPin, Star, ArrowRight, MessageSquare, Quote, ThumbsUp, AlertTriangle, ShieldCheck } from 'lucide-react';
import { formatNumber } from '../../utils/sentimentUtils';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onSelect: (restaurantId: string) => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, onSelect }) => {
  // Trích xuất món nên thử hàng đầu
  const topStrength = restaurant.strengths?.[0];
  // Trích xuất điểm cần lưu ý thực tế
  const topComplaint = restaurant.attentionAreas?.[0]?.commonComplaints?.[0] || restaurant.attentionAreas?.[0]?.aspect;
  
  // Trích xuất nhận xét thực tế từ thực khách
  const sampleReview = restaurant.reviews?.[0]?.text || restaurant.sentimentSummarySentence;
  const quoteText = sampleReview.length > 115 ? `${sampleReview.slice(0, 112)}...` : sampleReview;

  // Lấy chỉ số 3 yếu tố quan trọng nhất: Món ăn, Dịch vụ, Giá cả
  const foodAspect = restaurant.aspects.find(a => a.category === 'Món ăn');
  const serviceAspect = restaurant.aspects.find(a => a.category === 'Dịch vụ');
  const priceAspect = restaurant.aspects.find(a => a.category === 'Giá cả');

  const posPct = restaurant.sentimentDistribution.positive;
  const neuPct = restaurant.sentimentDistribution.neutral;
  const negPct = restaurant.sentimentDistribution.negative;

  return (
    <article 
      onClick={() => onSelect(restaurant.id)}
      className="bg-white border border-[#E5E3DE] hover:border-[#18181B] rounded-xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-150 hover:shadow-craft cursor-pointer group relative"
    >
      <div>
        {/* Hàng 1: Phân loại ẩm thực, Mức giá, Thành phố */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-[#C2410C] bg-orange-50 px-2.5 py-0.5 rounded border border-orange-200/90 tracking-tight">
              {restaurant.cuisine}
            </span>
            <span className="text-[11px] font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
              {restaurant.priceLevel || '$$'} · {restaurant.priceRange}
            </span>
          </div>

          <span className="text-xs text-[#71717A] font-medium flex items-center gap-1 shrink-0">
            <MapPin className="w-3.5 h-3.5 text-zinc-400" />
            {restaurant.city}
          </span>
        </div>

        {/* Tên quán ăn */}
        <h3 className="text-lg sm:text-xl font-extrabold text-[#18181B] group-hover:text-[#C2410C] transition-colors tracking-tight line-clamp-1 mb-2.5">
          {restaurant.name}
        </h3>

        {/* Hàng chỉ số tin cậy: Điểm sao & Số lượng review đã xác thực */}
        <div className="flex items-center justify-between gap-2 text-xs mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-black">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{restaurant.rating}</span>
            </div>

            <div className="flex items-center gap-1 text-[#52525B] text-xs">
              <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
              <span>{formatNumber(restaurant.totalReviews)} đánh giá</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>{posPct}% Hài lòng</span>
          </div>
        </div>

        {/* Thanh xếp tầng phân bổ cảm xúc thực tế (Positive - Neutral - Negative Bar) */}
        <div className="mb-3.5">
          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-semibold mb-1">
            <span>Phân bổ phản hồi:</span>
            <span>{posPct}% Tốt · {neuPct}% Ổn · {negPct}% Chê</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden flex">
            <div style={{ width: `${posPct}%` }} className="bg-emerald-600 h-full" title={`Hài lòng: ${posPct}%`} />
            <div style={{ width: `${neuPct}%` }} className="bg-amber-500 h-full" title={`Trung lập: ${neuPct}%`} />
            <div style={{ width: `${negPct}%` }} className="bg-red-600 h-full" title={`Không hài lòng: ${negPct}%`} />
          </div>
        </div>

        {/* Trích dẫn thực khách (Editorial Diner Quote) */}
        <div className="mb-3.5 p-3 rounded-lg bg-[#FAF9F5] border-l-2 border-[#C2410C] border-y border-r border-[#E5E3DE] text-xs text-[#3F3F46] leading-relaxed relative">
          <p className="line-clamp-2 italic">
            "{quoteText}"
          </p>
        </div>

        {/* 2 Điểm nhấn mấu chốt: Món nên thử & Điểm cần lưu ý */}
        <div className="space-y-1.5 mb-4 text-xs">
          {topStrength && (
            <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
              <ThumbsUp className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span className="truncate">
                <strong className="text-emerald-950 font-bold">Nên gọi:</strong> {topStrength.title}
              </span>
            </div>
          )}

          {topComplaint && (
            <div className="flex items-center gap-1.5 text-amber-800 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span className="truncate">
                <strong className="text-amber-950 font-bold">Lưu ý:</strong> {topComplaint}
              </span>
            </div>
          )}
        </div>

        {/* 3 Thước đo khía cạnh cốt lõi */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#E5E3DE] text-[11px] text-zinc-600 mb-4">
          <div className="bg-[#FAF9F5] p-1.5 rounded text-center border border-[#E5E3DE]/60">
            <span className="block text-[10px] text-zinc-500 uppercase font-semibold">Món ăn</span>
            <span className="font-extrabold text-[#18181B] text-xs">
              {foodAspect ? `${foodAspect.positivePercentage}%` : 'N/A'}
            </span>
          </div>
          <div className="bg-[#FAF9F5] p-1.5 rounded text-center border border-[#E5E3DE]/60">
            <span className="block text-[10px] text-zinc-500 uppercase font-semibold">Phục vụ</span>
            <span className="font-extrabold text-[#18181B] text-xs">
              {serviceAspect ? `${serviceAspect.positivePercentage}%` : 'N/A'}
            </span>
          </div>
          <div className="bg-[#FAF9F5] p-1.5 rounded text-center border border-[#E5E3DE]/60">
            <span className="block text-[10px] text-zinc-500 uppercase font-semibold">Giá cả</span>
            <span className="font-extrabold text-[#18181B] text-xs">
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
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#18181B] group-hover:bg-[#C2410C] text-white rounded-lg text-xs font-bold tracking-wide transition-all duration-150 shadow-craft-sm"
        >
          <span>Xem báo cáo chi tiết</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </article>
  );
};
