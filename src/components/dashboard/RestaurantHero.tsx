import React from 'react';
import { MapPin, Calendar, Layers, Star, ArrowLeft } from 'lucide-react';
import type { Restaurant } from '../../types/restaurant';
import { formatNumber } from '../../utils/sentimentUtils';

interface RestaurantHeroProps {
  restaurant: Restaurant;
  onBack: () => void;
}

export const RestaurantHero: React.FC<RestaurantHeroProps> = ({ restaurant, onBack }) => {
  return (
    <div className="bg-white border-b border-[#E4E4E7] pt-8 pb-7">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Nút quay lại */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#71717A] hover:text-[#18181B] mb-4 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Quay lại danh sách nhà hàng</span>
        </button>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          {/* Thông tin chính nhà hàng */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-[#C2410C] bg-orange-50 border border-orange-200/80 px-2.5 py-0.5 rounded">
                {restaurant.cuisine}
              </span>
              <span className="text-xs text-[#71717A] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                {restaurant.address}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-[#18181B] tracking-tight mb-2">
              {restaurant.name}
            </h1>

            {/* Điểm đánh giá & số lượng review */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-[#52525B]">
              <div className="flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded font-semibold">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{restaurant.rating}</span>
                <span className="text-amber-700 font-normal">/ 5</span>
              </div>

              <span>Dựa trên <strong className="font-semibold text-[#18181B]">{formatNumber(restaurant.totalReviews)} đánh giá từ khách hàng</strong></span>
            </div>
          </div>

          {/* Metadata bên phải */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#71717A] border-t lg:border-t-0 pt-4 lg:pt-0 border-zinc-100">
            <div className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1.5 rounded border border-zinc-200">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Cập nhật: <strong className="font-medium text-zinc-800">{restaurant.lastAnalyzedDate}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 bg-zinc-50 px-2.5 py-1.5 rounded border border-zinc-200">
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              <span>Nguồn: <strong className="font-medium text-zinc-800">{restaurant.dataSource}</strong></span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
