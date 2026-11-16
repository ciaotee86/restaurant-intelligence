import type { SentimentType, AspectCategory, Restaurant } from '../types/restaurant';

export const getSentimentLabel = (sentiment: SentimentType): string => {
  switch (sentiment) {
    case 'positive':
      return 'Tích cực';
    case 'negative':
      return 'Tiêu cực';
    case 'neutral':
      return 'Trung lập';
    default:
      return 'Không xác định';
  }
};

export const getSentimentColor = (sentiment: SentimentType): string => {
  switch (sentiment) {
    case 'positive':
      return '#16A34A'; // Emerald 600
    case 'negative':
      return '#DC2626'; // Red 600
    case 'neutral':
      return '#D97706'; // Amber 600
    default:
      return '#71717A';
  }
};

export const getSentimentBadgeClass = (sentiment: SentimentType): string => {
  switch (sentiment) {
    case 'positive':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'negative':
      return 'bg-red-50 text-red-700 border border-red-200';
    case 'neutral':
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    default:
      return 'bg-zinc-100 text-zinc-700 border border-zinc-200';
  }
};

export const getAspectBadgeClass = (aspect: AspectCategory): string => {
  switch (aspect) {
    case 'Món ăn':
      return 'bg-orange-50 text-orange-800 border-orange-200';
    case 'Dịch vụ':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'Không gian':
      return 'bg-purple-50 text-purple-800 border-purple-200';
    case 'Giá cả':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'Vị trí':
      return 'bg-stone-100 text-stone-800 border-stone-300';
    default:
      return 'bg-zinc-100 text-zinc-700 border-zinc-200';
  }
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('vi-VN').format(num);
};

export const renderStars = (rating: number): string => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? '½' : '';
  return '★'.repeat(full) + half;
};

/**
 * Thống kê phân bổ số lượng đánh giá theo từng nguồn (Foody / Google Maps).
 */
export const getSourceBreakdown = (
  restaurant: Pick<Restaurant, 'sourceBreakdown' | 'reviews' | 'totalReviews' | 'dataSource' | 'foodyUrl' | 'googleMapsUrl'>
): { foody: number; googleMaps: number } => {
  const breakdown = restaurant.sourceBreakdown;
  if (breakdown && breakdown.foody !== undefined && breakdown.googleMaps !== undefined) {
    return {
      foody: Math.max(0, breakdown.foody),
      googleMaps: Math.max(0, breakdown.googleMaps),
    };
  }

  const reviews = restaurant.reviews || [];
  let foody = 0;
  let googleMaps = 0;
  for (const r of reviews) {
    const s = (r.source || '').toLowerCase();
    if (s.includes('google')) {
      googleMaps++;
    } else {
      foody++;
    }
  }

  const total = restaurant.totalReviews ?? reviews.length ?? 0;
  if (reviews.length === 0 && total > 0) {
    const ds = (restaurant.dataSource || '').toLowerCase();
    if (ds.includes('google') && !ds.includes('foody')) {
      googleMaps = total;
    } else if (!restaurant.foodyUrl && restaurant.googleMapsUrl) {
      googleMaps = total;
    } else {
      foody = total;
    }
  }

  return { foody, googleMaps };
};

/**
 * Xác định nhãn nguồn ngắn gọn hiển thị trên thẻ tổng đánh giá (Foody / Google Maps / Foody & Maps).
 */
export const getSourceBadgeLabel = (
  restaurant: Pick<Restaurant, 'sourceBreakdown' | 'reviews' | 'totalReviews' | 'dataSource' | 'foodyUrl' | 'googleMapsUrl'>
): string => {
  const { foody, googleMaps } = getSourceBreakdown(restaurant);
  if (foody > 0 && googleMaps > 0) return 'Foody & Maps';
  if (googleMaps > 0) return 'Google Maps';
  if (foody > 0) return 'Foody';
  return restaurant.dataSource?.trim() || 'Foody';
};
