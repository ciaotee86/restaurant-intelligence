import React from 'react';
import type { SearchFilterState } from '../../types/restaurant';
import { Filter, RotateCcw } from 'lucide-react';
import { VIETNAM_CITIES, PROMINENT_DESTINATIONS } from '../../utils/cityUtils';
import { useLanguage } from '../../context/LanguageContext';

interface FilterBarProps {
  filters: SearchFilterState;
  onChange: (filters: SearchFilterState) => void;
  onReset: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onChange, onReset }) => {
  const { t } = useLanguage();

  const cuisines = [
    { value: 'Tất cả ẩm thực', label: t('cuisine.all') },
    { value: 'Ý', label: t('cuisine.italian') },
    { value: 'Việt Nam', label: t('cuisine.vietnamese') },
    { value: 'Dim Sum', label: t('cuisine.dimsum') },
    { value: 'Nướng BBQ', label: t('cuisine.bbq') },
    { value: 'Cafe', label: t('cuisine.cafe') },
    { value: 'Đường phố', label: t('cuisine.streetfood') }
  ];

  const sortOptions = [
    { id: 'reviews' as const, label: t('filter.sortReviews') },
    { id: 'rating' as const, label: t('filter.sortRating') },
    { id: 'positive_sentiment' as const, label: t('filter.sortPositive') },
    { id: 'name' as const, label: t('filter.sortName') }
  ];

  return (
    <div className="bg-white border border-[#E8E4DC] rounded-2xl p-5 sm:p-6 space-y-5 shadow-editorial-sm">
      <div className="flex items-center justify-between pb-3 border-b border-[#E8E4DC]">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#991B1B]" />
          <h3 className="font-display font-bold text-sm text-[#1C1917] uppercase tracking-wider">
            {t('filter.title')}
          </h3>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-[#8C857B] hover:text-[#991B1B] flex items-center gap-1.5 transition-colors font-medium cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{t('filter.reset')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Bộ lọc Thành phố */}
        <div>
          <label className="block text-[11px] font-semibold text-[#78716C] uppercase tracking-wider mb-1.5">
            {t('filter.location')}
          </label>
          <select
            value={filters.city}
            onChange={(e) => onChange({ ...filters, city: e.target.value })}
            className="w-full bg-[#FAF7F2] border border-[#E8E4DC] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#991B1B]"
          >
            <option value="Tất cả địa điểm">{t('filter.allLocations')}</option>
            <optgroup label={t('filter.prominentDestinations')}>
              {PROMINENT_DESTINATIONS.map((d) => (
                <option key={d.slug} value={d.name}>
                  {d.displayName}
                </option>
              ))}
            </optgroup>
            <optgroup label={t('filter.allProvinces')}>
              {VIETNAM_CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Bộ lọc Ẩm thực */}
        <div>
          <label className="block text-[11px] font-semibold text-[#78716C] uppercase tracking-wider mb-1.5">
            {t('filter.cuisineType')}
          </label>
          <select
            value={filters.cuisineCategory}
            onChange={(e) => onChange({ ...filters, cuisineCategory: e.target.value })}
            className="w-full bg-[#FAF7F2] border border-[#E8E4DC] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#991B1B]"
          >
            {cuisines.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Điểm tối thiểu */}
        <div>
          <label className="block text-[11px] font-semibold text-[#78716C] uppercase tracking-wider mb-1.5">
            {t('filter.minRating')}
          </label>
          <select
            value={filters.minRating}
            onChange={(e) => onChange({ ...filters, minRating: Number(e.target.value) })}
            className="w-full bg-[#FAF7F2] border border-[#E8E4DC] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#991B1B]"
          >
            <option value={0}>{t('filter.allRatings')}</option>
            <option value={4.0}>4.0 {t('filter.starsOrHigher')}</option>
            <option value={4.3}>4.3 {t('filter.starsOrHigher')}</option>
            <option value={4.5}>4.5 {t('filter.starsOrHigher')}</option>
          </select>
        </div>

        {/* Trạng thái cảm xúc */}
        <div>
          <label className="block text-[11px] font-semibold text-[#78716C] uppercase tracking-wider mb-1.5">
            {t('filter.satisfaction')}
          </label>
          <select
            value={filters.sentimentHealth}
            onChange={(e) =>
              onChange({
                ...filters,
                sentimentHealth: e.target.value as SearchFilterState['sentimentHealth']
              })
            }
            className="w-full bg-[#FAF7F2] border border-[#E8E4DC] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#991B1B]"
          >
            <option value="all">{t('filter.allLevels')}</option>
            <option value="high_positive">{t('filter.highPositive')}</option>
            <option value="balanced">{t('filter.balanced')}</option>
            <option value="needs_attention">{t('filter.needsAttention')}</option>
          </select>
        </div>
      </div>

      {/* Sắp xếp kết quả */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E8E4DC] text-xs">
        <span className="text-[#78716C] font-medium">{t('filter.sortBy')}</span>
        <div className="flex flex-wrap items-center gap-2">
          {sortOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onChange({ ...filters, sortBy: opt.id })}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                filters.sortBy === opt.id
                  ? 'bg-[#1C1917] text-white font-bold shadow-editorial-sm'
                  : 'bg-[#F2EFE9] text-[#57534E] hover:bg-[#E8E4DC] font-medium'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
