import React from 'react';
import type { Restaurant } from '../../types/restaurant';
import { MapPin, Star, ArrowRight, MessageSquare } from 'lucide-react';
import { formatNumber } from '../../utils/sentimentUtils';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onSelect: (restaurantId: string) => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, onSelect }) => {
  return (
    <div className="bg-white border border-[#E4E4E7] rounded-lg p-5 sm:p-6 flex flex-col justify-between hover:border-zinc-400 hover:shadow-xs transition-all group">
      <div>
        {/* Top: Thể loại ẩm thực & Thành phố */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-[#C2410C] bg-orange-50 px-2.5 py-0.5 rounded border border-orange-200/80">
            {restaurant.cuisine}
          </span>
          <span className="text-xs text-[#71717A] flex items-center gap-1">
            <MapPin className="w-3 h-3 text-zinc-400" />
            {restaurant.city}
          </span>
        </div>

        {/* Tên nhà hàng */}
        <h3 className="text-xl font-bold text-[#18181B] group-hover:text-[#C2410C] transition-colors tracking-tight mb-2">
          {restaurant.name}
        </h3>

        {/* Hàng chỉ số: Điểm ★, Số lượng review, % Tích cực */}
        <div className="flex flex-wrap items-center gap-3 text-xs mb-3.5">
          <div className="flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200/80 px-2 py-0.5 rounded font-semibold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{restaurant.rating} ★</span>
          </div>

          <div className="flex items-center gap-1 text-[#52525B]">
            <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
            <span>{formatNumber(restaurant.totalReviews)} đánh giá</span>
          </div>

          <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            {restaurant.sentimentDistribution.positive}% tích cực
          </span>
        </div>

        {/* Thanh phân bổ cảm xúc mini */}
        <div className="space-y-1 mb-4">
          <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${restaurant.sentimentDistribution.positive}%` }}
              className="bg-emerald-600 h-full"
            />
            <div
              style={{ width: `${restaurant.sentimentDistribution.neutral}%` }}
              className="bg-amber-500 h-full"
            />
            <div
              style={{ width: `${restaurant.sentimentDistribution.negative}%` }}
              className="bg-red-600 h-full"
            />
          </div>
          <div className="flex items-center justify-between text-[10.5px] text-[#71717A] font-mono">
            <span>{restaurant.sentimentDistribution.positive}% tích cực</span>
            <span>{restaurant.sentimentDistribution.negative}% tiêu cực</span>
          </div>
        </div>

        {/* Điểm khen nổi bật */}
        {restaurant.strengths.length > 0 && (
          <div className="text-xs text-[#52525B] line-clamp-2 bg-zinc-50 p-2.5 rounded border border-zinc-100 mb-4">
            <span className="font-semibold text-zinc-800">Điểm khen hàng đầu: </span>
            {restaurant.strengths.map((s) => s.title).join(', ')}
          </div>
        )}
      </div>

      {/* Nút Xem phân tích */}
      <button
        onClick={() => onSelect(restaurant.id)}
        className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#18181B] group-hover:bg-[#C2410C] text-white rounded-md text-xs font-semibold tracking-wide transition-colors shadow-2xs"
      >
        <span>Xem phân tích</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};
