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
  const urgentComplaintAspect = restaurant.aspects?.find(a => a.negativePercentage >= 12);
  const complaintDetail = restaurant.attentionAreas?.[0]?.commonComplaints?.[0] || urgentComplaintAspect?.category;

  return (
    <div className="bg-white border-b border-[#E8E4DC] pt-8 pb-7 shadow-editorial-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Nút quay lại */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C857B] hover:text-[#991B1B] mb-5 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Quay lại danh sách nhà hàng</span>
        </button>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          {/* Thông tin chính nhà hàng */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#991B1B] bg-[#FDF2F2] border border-[#FECACA] px-3 py-0.5 rounded-full">
                {restaurant.cuisine}
              </span>
              <span className="text-xs font-medium text-[#57534E] bg-[#F2EFE9] px-2.5 py-0.5 rounded-full border border-[#E8E4DC]">
                {restaurant.priceLevel || '$$'} · {restaurant.priceRange}
              </span>
              <span className="text-xs text-[#8C857B] font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#A8A29E]" />
                {restaurant.address}
              </span>
            </div>

            <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-[40px] text-[#1C1917] tracking-tight leading-tight">
              {restaurant.name}
            </h1>

            {/* Điểm đánh giá & số lượng review */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-[#57534E]">
              <div className="flex items-center gap-1.5 bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-3 py-1 rounded-lg font-bold text-sm shadow-editorial-sm">
                <Star className="w-4 h-4 fill-[#D97706] text-[#D97706]" />
                <span>{restaurant.rating}</span>
                <span className="text-[#B45309] font-normal text-xs">/ 5.0</span>
              </div>

              <span>
                Dựa trên <strong className="font-bold text-[#1C1917]">{formatNumber(restaurant.totalReviews)} đánh giá thực tế</strong> từ thực khách
              </span>

              <div className="flex items-center gap-1 text-xs font-bold text-[#065F46] bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-1 rounded-lg">
                <ShieldCheck className="w-3.5 h-3.5 text-[#065F46]" />
                <span>Nhận xét đã xác thực minh bạch</span>
              </div>
            </div>
          </div>

          {/* Metadata bên phải */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#78716C] border-t lg:border-t-0 pt-4 lg:pt-0 border-[#E8E4DC]">
            <div className="flex items-center gap-1.5 bg-[#FAF7F2] px-3 py-2 rounded-xl border border-[#E8E4DC]">
              <Calendar className="w-3.5 h-3.5 text-[#A8A29E]" />
              <span>Cập nhật: <strong className="font-semibold text-[#1C1917]">{restaurant.lastAnalyzedDate}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 bg-[#FAF7F2] px-3 py-2 rounded-xl border border-[#E8E4DC]">
              <Layers className="w-3.5 h-3.5 text-[#A8A29E]" />
              <span>Nguồn: <strong className="font-semibold text-[#1C1917]">{restaurant.dataSource}</strong></span>
            </div>
          </div>
        </div>

        {/* Thanh cảnh báo khẩn cấp (nếu có tỷ lệ phàn nàn đáng chú ý) */}
        {urgentComplaintAspect && (
          <div className="mt-5 p-3.5 bg-[#FFFBEB] border-l-4 border-[#D97706] border-y border-r border-[#FDE68A] rounded-xl flex items-center justify-between gap-3 text-xs text-[#92400E]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
              <span>
                <strong>Lưu ý từ thực khách:</strong> Có {urgentComplaintAspect.negativePercentage}% phản hồi chưa hài lòng về <strong>{urgentComplaintAspect.category}</strong> ({complaintDetail}).
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#B45309] font-semibold shrink-0 hidden sm:inline">
              Tiêu chí cần cải thiện
            </span>
          </div>
        )}

      </div>
    </div>
  );
};
