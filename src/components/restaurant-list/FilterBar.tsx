import React from 'react';
import type { SearchFilterState } from '../../types/restaurant';
import { Filter, RotateCcw } from 'lucide-react';
import { VIETNAM_CITIES } from '../../utils/cityUtils';

interface FilterBarProps {
  filters: SearchFilterState;
  onChange: (filters: SearchFilterState) => void;
  onReset: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onChange, onReset }) => {
  const cities = [
    'Tất cả địa điểm',
    ...VIETNAM_CITIES.map((c) => c.name)
  ];
  const cuisines = [
    'Tất cả ẩm thực',
    'Ý',
    'Việt Nam',
    'Dim Sum',
    'Nướng BBQ',
    'Cafe',
    'Đường phố'
  ];

  return (
    <div className="bg-white border border-[#E8E4DC] rounded-2xl p-5 sm:p-6 space-y-5 shadow-editorial-sm">
      <div className="flex items-center justify-between pb-3 border-b border-[#E8E4DC]">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#991B1B]" />
          <h3 className="font-display font-bold text-sm text-[#1C1917] uppercase tracking-wider">
            Bộ lọc & Tinh chỉnh
          </h3>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-[#8C857B] hover:text-[#991B1B] flex items-center gap-1.5 transition-colors font-medium"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Đặt lại bộ lọc</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Bộ lọc Thành phố */}
        <div>
          <label className="block text-[11px] font-semibold text-[#78716C] uppercase tracking-wider mb-1.5">
            Địa điểm
          </label>
          <select
            value={filters.city}
            onChange={(e) => onChange({ ...filters, city: e.target.value })}
            className="w-full bg-[#FAF7F2] border border-[#E8E4DC] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#991B1B]"
          >
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Bộ lọc Ẩm thực */}
        <div>
          <label className="block text-[11px] font-semibold text-[#78716C] uppercase tracking-wider mb-1.5">
            Loại hình ẩm thực
          </label>
          <select
            value={filters.cuisineCategory}
            onChange={(e) => onChange({ ...filters, cuisineCategory: e.target.value })}
            className="w-full bg-[#FAF7F2] border border-[#E8E4DC] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#991B1B]"
          >
            {cuisines.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Điểm tối thiểu */}
        <div>
          <label className="block text-[11px] font-semibold text-[#78716C] uppercase tracking-wider mb-1.5">
            Điểm đánh giá tối thiểu
          </label>
          <select
            value={filters.minRating}
            onChange={(e) => onChange({ ...filters, minRating: Number(e.target.value) })}
            className="w-full bg-[#FAF7F2] border border-[#E8E4DC] rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-[#991B1B]"
          >
            <option value={0}>Tất cả điểm số</option>
            <option value={4.0}>4.0 ★ trở lên</option>
            <option value={4.3}>4.3 ★ trở lên</option>
            <option value={4.5}>4.5 ★ trở lên</option>
          </select>
        </div>

        {/* Trạng thái cảm xúc */}
        <div>
          <label className="block text-[11px] font-semibold text-[#78716C] uppercase tracking-wider mb-1.5">
            Mức độ hài lòng
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
            <option value="all">Tất cả mức độ</option>
            <option value="high_positive">Được khen nhiều (&gt;75% hài lòng)</option>
            <option value="balanced">Bình thường</option>
            <option value="needs_attention">Nhiều phàn nàn (&gt;12% chê)</option>
          </select>
        </div>
      </div>

      {/* Sắp xếp kết quả */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E8E4DC] text-xs">
        <span className="text-[#78716C] font-medium">Sắp xếp theo:</span>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'reviews', label: 'Nhiều đánh giá nhất' },
              { id: 'rating', label: 'Điểm sao cao nhất' },
              { id: 'positive_sentiment', label: 'Được lòng khách nhất' },
              { id: 'name', label: 'Tên A - Z' }
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => onChange({ ...filters, sortBy: opt.id })}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
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
