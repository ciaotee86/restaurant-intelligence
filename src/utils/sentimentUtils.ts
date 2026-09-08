import type { SentimentType, AspectCategory } from '../types/restaurant';

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
