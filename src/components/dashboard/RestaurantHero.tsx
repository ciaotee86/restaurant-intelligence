import React from 'react';
import { MapPin, Calendar, Layers, Star, ArrowLeft, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { Restaurant } from '../../types/restaurant';
import { formatNumber } from '../../utils/sentimentUtils';

interface RestaurantHeroProps {
  restaurant: Restaurant;
  onBack: () => void;
}

export const RestaurantHero: React.FC<RestaurantHeroProps> = ({ restaurant, onBack }) => {
  // Tìm khía cạnh có phản hồi tiêu cực đáng chú ý (nếu > 12%)
  const urgentComplaintAspect = restaurant.aspects.find(a => a.negativePercentage >= 12);
  const complaintDetail = restaurant.attentionAreas?.[0]?.commonComplaints?.[0] || urgentComplaintAspect?.category;

  return (
    <div className="bg-white border-b border-[#E5E3DE] pt-8 pb-7">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Nút quay lại */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#71717A] hover:text-[#18181B] mb-5 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Quay lại danh sách nhà hàng</span>
        </button>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          {/* Thông tin chính nhà hàng */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#C2410C] bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded">
                {restaurant.cuisine}
              </span>
              <span className="text-xs font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                {restaurant.priceLevel || '$$'} · {restaurant.priceRange}
              </span>
              <span className="text-xs text-[#71717A] font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                {restaurant.address}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-black text-[#18181B] tracking-tight leading-tight">
              {restaurant.name}
            </h1>

            {/* Điểm đánh giá & số lượng review */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-[#52525B]">
              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-950 border border-amber-300 px-3 py-1 rounded-md font-black text-sm shadow-craft-sm">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span>{restaurant.rating}</span>
                <span className="text-amber-800 font-medium text-xs">/ 5.0</span>
              </div>

              <span>
                Dựa trên <strong className="font-extrabold text-[#18181B]">{formatNumber(restaurant.totalReviews)} đánh giá thực tế</strong> từ khách hàng
              </span>

              <div className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dữ liệu đã lọc sạch review rác</span>
              </div>
            </div>
          </div>

          {/* Metadata bên phải */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#71717A] border-t lg:border-t-0 pt-4 lg:pt-0 border-zinc-100">
            <div className="flex items-center gap-1.5 bg-[#FAF9F5] px-3 py-2 rounded-lg border border-[#E5E3DE]">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Cập nhật: <strong className="font-semibold text-zinc-900">{restaurant.lastAnalyzedDate}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 bg-[#FAF9F5] px-3 py-2 rounded-lg border border-[#E5E3DE]">
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              <span>Nguồn: <strong className="font-semibold text-zinc-900">{restaurant.dataSource}</strong></span>
            </div>
          </div>
        </div>

        {/* Thanh cảnh báo khẩn cấp (nếu có tỷ lệ phàn nàn đáng chú ý) */}
        {urgentComplaintAspect && (
          <div className="mt-5 p-3.5 bg-amber-50/90 border-l-4 border-amber-500 border-y border-r border-amber-200 rounded-lg flex items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Lưu ý từ thực khách:</strong> Có {urgentComplaintAspect.negativePercentage}% phản hồi chưa hài lòng về <strong>{urgentComplaintAspect.category}</strong> ({complaintDetail}).
              </span>
            </div>
            <span className="text-[11px] font-mono text-amber-700 font-semibold shrink-0 hidden sm:inline">
              Khía cạnh cần lưu ý
            </span>
          </div>
        )}

      </div>
    </div>
  );
};
