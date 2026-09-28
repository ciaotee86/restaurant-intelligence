import React from 'react';
import type { Restaurant } from '../../types/restaurant';
import { MapPin, Star, ArrowRight, MessageSquare, Quote, ThumbsUp, AlertTriangle } from 'lucide-react';
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
  const quoteText = sampleReview.length > 110 ? `${sampleReview.slice(0, 107)}...` : sampleReview;

  // Lấy chỉ số 3 yếu tố quan trọng nhất: Món ăn, Giá cả, Phục vụ
  const foodAspect = restaurant.aspects.find(a => a.category === 'Món ăn');
  const serviceAspect = restaurant.aspects.find(a => a.category === 'Dịch vụ');
  const priceAspect = restaurant.aspects.find(a => a.category === 'Giá cả');

  return (
    <article 
      onClick={() => onSelect(restaurant.id)}
      className="bg-white border border-[#E5E5E0] hover:border-[#C2410C] rounded-xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 hover:shadow-md cursor-pointer group relative"
    >
      <div>
        {/* Hàng trên: Ẩm thực, Mức giá, Địa điểm */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-[#C2410C] bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200/80">
              {restaurant.cuisine}
            </span>
            <span className="text-[11px] font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
              {restaurant.priceLevel || '$$'} · {restaurant.priceRange}
            </span>
          </div>

          <span className="text-xs text-[#71717A] flex items-center gap-1 shrink-0">
            <MapPin className="w-3 h-3 text-zinc-400" />
            {restaurant.city}
          </span>
        </div>

        {/* Tên nhà hàng */}
        <h3 className="text-lg sm:text-xl font-bold text-[#18181B] group-hover:text-[#C2410C] transition-colors tracking-tight line-clamp-1 mb-2">
          {restaurant.name}
        </h3>

        {/* Hàng chỉ số tin cậy: Đánh giá sao, Số lượng review & Tỷ lệ hài lòng */}
        <div className="flex items-center gap-2.5 text-xs mb-3.5 flex-wrap">
          <div className="flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{restaurant.rating}</span>
          </div>

          <div className="flex items-center gap-1 text-[#52525B]">
            <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
            <span>{formatNumber(restaurant.totalReviews)} đánh giá thực</span>
          </div>

          <span className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded ml-auto text-[11px]">
            {restaurant.sentimentDistribution.positive}% hài lòng
          </span>
        </div>

        {/* Trích dẫn thực khách (Editorial Diner Quote) */}
        <div className="mb-4 p-3 rounded-lg bg-[#FBFBFA] border border-zinc-200/70 text-xs text-[#3F3F46] leading-relaxed relative italic">
          <Quote className="w-3.5 h-3.5 text-zinc-300 absolute -top-1.5 left-2 bg-[#FBFBFA] px-0.5" />
          <p className="line-clamp-2">
            "{quoteText}"
          </p>
        </div>

        {/* Bóc tách 2 yếu tố quyết định: Món nên thử & Điểm trừ cần biết */}
        <div className="space-y-1.5 mb-4 text-xs">
          {topStrength && (
            <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
              <ThumbsUp className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span className="truncate">
                <strong className="text-emerald-900">Nên thử:</strong> {topStrength.title}
              </span>
            </div>
          )}

          {topComplaint && (
            <div className="flex items-center gap-1.5 text-amber-800 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span className="truncate">
                <strong className="text-amber-900">Lưu ý:</strong> {topComplaint}
              </span>
            </div>
          )}
        </div>

        {/* 3 Thước đo hài lòng nhanh (Mini aspect indicators) */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-zinc-100 text-[11px] text-zinc-600 mb-4">
          <div className="bg-zinc-50 p-1.5 rounded text-center">
            <span className="block text-[10px] text-zinc-400 uppercase font-medium">Món ăn</span>
            <span className="font-bold text-zinc-800">{foodAspect ? `${foodAspect.positivePercentage}%` : 'N/A'}</span>
          </div>
          <div className="bg-zinc-50 p-1.5 rounded text-center">
            <span className="block text-[10px] text-zinc-400 uppercase font-medium">Phục vụ</span>
            <span className="font-bold text-zinc-800">{serviceAspect ? `${serviceAspect.positivePercentage}%` : 'N/A'}</span>
          </div>
          <div className="bg-zinc-50 p-1.5 rounded text-center">
            <span className="block text-[10px] text-zinc-400 uppercase font-medium">Giá cả</span>
            <span className="font-bold text-zinc-800">{priceAspect ? `${priceAspect.positivePercentage}%` : 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Nút hành động */}
      <div className="pt-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(restaurant.id);
          }}
          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#18181B] group-hover:bg-[#C2410C] text-white rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-2xs"
        >
          <span>Xem bức tranh toàn cảnh</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </article>
  );
};
