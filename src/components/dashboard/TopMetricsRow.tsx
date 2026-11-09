import React from 'react';
import type { Restaurant } from '../../types/restaurant';
import { MetricCard } from '../common/MetricCard';
import { formatNumber } from '../../utils/sentimentUtils';

interface TopMetricsRowProps {
  restaurant: Restaurant;
}

export const TopMetricsRow: React.FC<TopMetricsRowProps> = ({ restaurant }) => {
  const sourceLabel = React.useMemo(() => {
    const foodyCount = restaurant.sourceBreakdown?.foody ?? (restaurant.foodyUrl ? restaurant.totalReviews : 0);
    const gMapsCount = restaurant.sourceBreakdown?.googleMaps ?? (restaurant.googleMapsUrl ? restaurant.totalReviews : 0);

    if (foodyCount > 0 && gMapsCount > 0) {
      return 'Đa nguồn';
    }
    if (gMapsCount > 0 && foodyCount === 0) {
      return 'Google Maps';
    }
    if (foodyCount > 0 && gMapsCount === 0) {
      return 'Foody';
    }
    if (restaurant.dataSource) {
      if (restaurant.dataSource.includes('+') || restaurant.dataSource.toLowerCase().includes('đa nguồn')) {
        return 'Đa nguồn';
      }
      return restaurant.dataSource;
    }
    return 'Xác thực';
  }, [restaurant]);

  return (
    <section aria-label="Chỉ số hiệu suất phân tích">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Điểm đánh giá */}
        <MetricCard
          label="Điểm đánh giá"
          value={`${restaurant.rating}`}
          subtext="/ 5.0"
          trendText="Xác thực"
        />

        {/* Metric 2: Tổng đánh giá */}
        <MetricCard
          label="Tổng đánh giá"
          value={formatNumber(restaurant.totalReviews)}
          subtext="đã phân tích"
          trendText={sourceLabel}
        />

        {/* Metric 3: Cảm xúc tích cực */}
        <MetricCard
          label="Tích cực"
          value={`${restaurant.sentimentDistribution.positive}%`}
          subtext="phản hồi hài lòng"
          sentiment="positive"
        />

        {/* Metric 4: Cảm xúc tiêu cực */}
        <MetricCard
          label="Tiêu cực"
          value={`${restaurant.sentimentDistribution.negative}%`}
          subtext="phản hồi góp ý"
          sentiment="negative"
        />
      </div>
    </section>
  );
};
