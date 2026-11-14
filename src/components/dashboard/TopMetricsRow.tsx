import React from 'react';
import type { Restaurant } from '../../types/restaurant';
import { MetricCard } from '../common/MetricCard';
import { formatNumber } from '../../utils/sentimentUtils';
import { useLanguage } from '../../context/LanguageContext';

interface TopMetricsRowProps {
  restaurant: Restaurant;
}

export const TopMetricsRow: React.FC<TopMetricsRowProps> = ({ restaurant }) => {
  const { t } = useLanguage();

  return (
    <section aria-label={t('metrics.ariaLabel')}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Điểm đánh giá */}
        <MetricCard
          label={t('metrics.rating')}
          value={`${restaurant.rating}`}
          subtext={t('metrics.ratingSub')}
          trendText={t('metrics.verified')}
        />

        {/* Metric 2: Tổng đánh giá */}
        <MetricCard
          label={t('metrics.totalReviews')}
          value={formatNumber(restaurant.totalReviews)}
          subtext={t('metrics.analyzed')}
          trendText="Foody"
        />

        {/* Metric 3: Cảm xúc tích cực */}
        <MetricCard
          label={t('metrics.positive')}
          value={`${restaurant.sentimentDistribution.positive}%`}
          subtext={t('metrics.positiveSub')}
          sentiment="positive"
        />

        {/* Metric 4: Cảm xúc tiêu cực */}
        <MetricCard
          label={t('metrics.negative')}
          value={`${restaurant.sentimentDistribution.negative}%`}
          subtext={t('metrics.negativeSub')}
          sentiment="negative"
        />
      </div>
    </section>
  );
};
