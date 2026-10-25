import React from 'react';
import { isFeatureNew, type FeatureBadgeConfig } from '../../utils/featureBadges';

export interface NewBadgeProps extends Partial<FeatureBadgeConfig> {
  featureId: string;
  label?: string;
  className?: string;
}

/**
 * Component hiển thị nhãn "MỚI" (New Badge) có giới hạn thời gian (1-15 ngày):
 * Tự động ẩn (return null) khi tính năng đã quá thời gian quy định.
 */
export const NewBadge: React.FC<NewBadgeProps> = ({
  featureId,
  label = 'Mới',
  className = 'px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold uppercase tracking-wider',
  releaseDate,
  durationDays,
  useFirstSeen,
}) => {
  const isNew = isFeatureNew(featureId, { releaseDate, durationDays, useFirstSeen });

  if (!isNew) {
    return null;
  }

  return (
    <span className={className} aria-label={`${label} - Tính năng mới`}>
      {label}
    </span>
  );
};
