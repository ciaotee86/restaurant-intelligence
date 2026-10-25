import React from 'react';
import { MapPin, Calendar, Layers, Star, ArrowLeft, ShieldCheck, Shield, AlertTriangle, Link2 } from 'lucide-react';
import type { Restaurant } from '../../types/restaurant';
import { formatNumber } from '../../utils/sentimentUtils';

interface RestaurantHeroProps {
  restaurant: Restaurant;
  onBack: () => void;
  onOpenLinkGoogleMaps?: () => void;
}

export const RestaurantHero: React.FC<RestaurantHeroProps> = ({
  restaurant,
  onBack,
  onOpenLinkGoogleMaps
}) => {
  // Tìm khía cạnh có phản hồi tiêu cực đáng chú ý (nếu > 12%)
  const urgentComplaintAspect = restaurant.aspects?.find((a) => a.negativePercentage >= 12);
  const complaintDetail = restaurant.attentionAreas?.[0]?.commonComplaints?.[0] || urgentComplaintAspect?.category;

  // Tính toán chỉ số tin cậy mẫu (0 - 100) theo SPEC-FEAT-06: C = min(1.0, ln(N+1)/ln(31)) * 100
  const totalReviews = restaurant.totalReviews ?? restaurant.reviews?.length ?? 0;
  let rawScore = restaurant.credibilityScore;
  if (rawScore === undefined || rawScore === null || Number.isNaN(rawScore)) {
    const calculated = Math.min(1.0, Math.log(totalReviews + 1) / Math.log(31)) * 100;
    rawScore = Math.round(calculated);
  } else if (rawScore <= 1.0) {
    rawScore = Math.round(rawScore * 100);
  } else {
    rawScore = Math.round(rawScore);
  }
  const credibilityScore = Math.min(100, Math.max(0, rawScore));

  const credibilityLevel: 'high' | 'medium' | 'low' =
    totalReviews < 10
      ? 'low'
      : (restaurant.credibilityLevel && (restaurant.credibilityLevel !== 'high' || totalReviews >= 20)
          ? restaurant.credibilityLevel
          : (credibilityScore >= 90 && totalReviews >= 20 ? 'high' : credibilityScore >= 65 ? 'medium' : 'low'));

  const credibilityConfig = {
    high: {
      label: `Độ tin cậy mẫu cao: ${credibilityScore}% · Đủ mẫu phân tích`,
      className: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]',
      Icon: ShieldCheck
    },
    medium: {
      label: `Độ tin cậy mẫu khá: ${credibilityScore}% · Tham khảo tốt`,
      className: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
      Icon: Shield
    },
    low: {
      label: `Mẫu nhỏ: ${credibilityScore}% · Khuyến nghị bổ sung`,
      className: 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]',
      Icon: AlertTriangle
    }
  }[credibilityLevel];

  // Thống kê phân bổ nguồn dữ liệu
  let foodyCount = restaurant.sourceBreakdown?.foody;
  let googleMapsCount = restaurant.sourceBreakdown?.googleMaps;

  if (foodyCount === undefined || googleMapsCount === undefined) {
    const reviews = restaurant.reviews || [];
    let fCount = 0;
    let gCount = 0;
    for (const r of reviews) {
      const s = (r.source || '').toLowerCase();
      if (s.includes('google')) {
        gCount++;
      } else {
        fCount++;
      }
    }
    if (reviews.length === 0 && totalReviews > 0) {
      fCount = totalReviews;
    }
    foodyCount = fCount;
    googleMapsCount = gCount;
  }

  const hasMultiSource = foodyCount > 0 && googleMapsCount > 0;

  return (
    <div className="bg-white border-b border-[#E8E4DC] pt-8 pb-7 shadow-editorial-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Nút quay lại */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C857B] hover:text-[#991B1B] mb-5 transition-colors group cursor-pointer"
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

            {/* Điểm đánh giá, số lượng review & Huy hiệu Độ tin cậy mẫu */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-sm text-[#57534E]">
              <div className="flex items-center gap-1.5 bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] px-3 py-1 rounded-lg font-bold text-sm shadow-editorial-sm">
                <Star className="w-4 h-4 fill-[#D97706] text-[#D97706]" />
                <span>{restaurant.rating}</span>
                <span className="text-[#B45309] font-normal text-xs">/ 5.0</span>
              </div>

              <span>
                Dựa trên <strong className="font-bold text-[#1C1917]">{formatNumber(restaurant.totalReviews)} đánh giá thực tế</strong> từ thực khách
              </span>

              {/* Huy hiệu Độ tin cậy mẫu trực quan (MOD-03) */}
              <div
                className={`flex items-center gap-1.5 text-xs font-bold border px-3 py-1 rounded-lg transition-colors ${credibilityConfig.className}`}
                title={`Chỉ số tin cậy mẫu: ${credibilityScore}%`}
              >
                <credibilityConfig.Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{credibilityConfig.label}</span>
              </div>
            </div>
          </div>

          {/* Metadata bên phải & Nút hành động liên kết Google Maps */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 border-t lg:border-t-0 pt-4 lg:pt-0 border-[#E8E4DC]">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#78716C]">
              <div className="flex items-center gap-1.5 bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#E8E4DC]">
                <Calendar className="w-3.5 h-3.5 text-[#A8A29E]" />
                <span>Cập nhật: <strong className="font-semibold text-[#1C1917]">{restaurant.lastAnalyzedDate}</strong></span>
              </div>

              {/* Tỷ lệ đóng góp của các nguồn */}
              <div className="flex items-center gap-1.5 bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#E8E4DC]">
                <Layers className="w-3.5 h-3.5 text-[#A8A29E]" />
                <span>Nguồn: </span>
                {hasMultiSource ? (
                  <span className="font-semibold text-[#1C1917] inline-flex items-center gap-1.5">
                    <span className="text-[#EA580C] font-bold">{formatNumber(foodyCount)} Foody</span>
                    <span className="text-[#A8A29E]">·</span>
                    <span className="text-[#2563EB] font-bold">{formatNumber(googleMapsCount)} Google Maps</span>
                  </span>
                ) : (
                  <strong className="font-semibold text-[#1C1917]">
                    {googleMapsCount > 0 && foodyCount === 0
                      ? `${formatNumber(googleMapsCount)} Google Maps`
                      : `${formatNumber(foodyCount || totalReviews)} Foody`}
                  </strong>
                )}
              </div>
            </div>

            {/* Nút hành động nổi bật: Bổ sung từ Google Maps */}
            {onOpenLinkGoogleMaps && (
              <button
                type="button"
                onClick={onOpenLinkGoogleMaps}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#991B1B] hover:bg-[#7F1D1D] text-white shadow-editorial-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                title="Bổ sung đánh giá từ Google Maps để làm giàu dữ liệu và nâng cao độ tin cậy mẫu"
              >
                <Link2 className="w-4 h-4 text-[#FECACA]" />
                <span>🔗 Bổ sung từ Google Maps</span>
              </button>
            )}
          </div>
        </div>

        {/* Thanh cảnh báo cỡ mẫu nhỏ khi credibilityLevel === 'low' hoặc N < 10 */}
        {credibilityLevel === 'low' && (
          <div className="mt-5 p-3.5 bg-[#FEF2F2] border-l-4 border-[#991B1B] border-y border-r border-[#FECACA] rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#991B1B]">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#991B1B] shrink-0" />
              <span>
                <strong>Cảnh báo cỡ mẫu nhỏ ({totalReviews} đánh giá):</strong>{' '}
                {restaurant.sampleWarning ||
                  'Dữ liệu hiện tại chưa đủ lớn để đảm bảo độ tin cậy cao cho phân tích xu hướng. Khuyến nghị nạp thêm đánh giá từ Google Maps để tăng tính đại diện!'}
              </span>
            </div>
            {onOpenLinkGoogleMaps && (
              <button
                type="button"
                onClick={onOpenLinkGoogleMaps}
                className="px-3 py-1.5 bg-[#991B1B] text-white text-xs font-bold rounded-lg hover:bg-[#7F1D1D] shrink-0 transition-colors inline-flex items-center gap-1.5 shadow-editorial-sm cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Nạp từ Google Maps ngay</span>
              </button>
            )}
          </div>
        )}

        {/* Thanh cảnh báo khẩn cấp (nếu có tỷ lệ phàn nàn đáng chú ý) */}
        {urgentComplaintAspect && (
          <div className="mt-4 p-3.5 bg-[#FFFBEB] border-l-4 border-[#D97706] border-y border-r border-[#FDE68A] rounded-xl flex items-center justify-between gap-3 text-xs text-[#92400E]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
              <span>
                <strong>Lưu ý từ thực khách:</strong> Có {urgentComplaintAspect.negativePercentage}% phản hồi chưa hài lòng về{' '}
                <strong>{urgentComplaintAspect.category}</strong> ({complaintDetail}).
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
