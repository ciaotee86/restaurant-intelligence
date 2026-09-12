import React from 'react';
import type { SearchFilterState } from '../../types/restaurant';
import { Filter, RotateCcw } from 'lucide-react';

interface FilterBarProps {
  filters: SearchFilterState;
  onChange: (filters: SearchFilterState) => void;
  onReset: () => void;
}
export const FilterBar: React.FC<FilterBarProps> = ({ filters, onChange, onReset }) => {
  const cities = [
    'Tất cả địa điểm',
    'Đà Nẵng',
    'Hà Nội',
    'TP. Hồ Chí Minh',
    'Thừa Thiên Huế',
    'Quảng Nam',
    'Khánh Hòa',
    'Lâm Đồng',
    'Hải Phòng',
    'Quảng Ninh',
    'Cần Thơ',
    'Kiên Giang',
    'Bà Rịa - Vũng Tàu',
    'Bình Định',
    'Nghệ An',
    'Đắk Lắk',
    'Ninh Bình',
    'Lào Cai',
    'Bình Dương',
    'Đồng Nai',
    'An Giang',
    'Tây Ninh',
    'Cà Mau',
    'Sóc Trăng'
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
    <div className="bg-white border border-[#E4E4E7] rounded-lg p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-500" />
          <h3 className="text-xs font-bold text-[#18181B] uppercase tracking-wider">
            Bộ lọc & Tinh chỉnh
          </h3>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-[#71717A] hover:text-[#18181B] flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Đặt lại bộ lọc</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Bộ lọc Thành phố */}
        <div>
          <label className="block text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-1">
            Địa điểm
          </label>
          <select
            value={filters.city}
            onChange={(e) => onChange({ ...filters, city: e.target.value })}
            className="w-full bg-zinc-50 border border-[#D4D4D8] rounded-md px-3 py-2 text-xs text-[#18181B] focus:outline-none focus:ring-1 focus:ring-zinc-800"
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
          <label className="block text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-1">
            Loại hình ẩm thực
          </label>
          <select
            value={filters.cuisineCategory}
            onChange={(e) => onChange({ ...filters, cuisineCategory: e.target.value })}
            className="w-full bg-zinc-50 border border-[#D4D4D8] rounded-md px-3 py-2 text-xs text-[#18181B] focus:outline-none focus:ring-1 focus:ring-zinc-800"
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
          <label className="block text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-1">
            Điểm đánh giá tối thiểu
          </label>
          <select
            value={filters.minRating}
            onChange={(e) => onChange({ ...filters, minRating: Number(e.target.value) })}
            className="w-full bg-zinc-50 border border-[#D4D4D8] rounded-md px-3 py-2 text-xs text-[#18181B] focus:outline-none focus:ring-1 focus:ring-zinc-800"
          >
            <option value={0}>Tất cả điểm số</option>
            <option value={4.0}>4.0 ★ trở lên</option>
            <option value={4.3}>4.3 ★ trở lên</option>
            <option value={4.5}>4.5 ★ trở lên</option>
          </select>
        </div>

        {/* Trạng thái cảm xúc */}
        <div>
          <label className="block text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-1">
            Tình trạng cảm xúc
          </label>
          <select
            value={filters.sentimentHealth}
            onChange={(e) =>
              onChange({
                ...filters,
                sentimentHealth: e.target.value as SearchFilterState['sentimentHealth']
              })
            }
            className="w-full bg-zinc-50 border border-[#D4D4D8] rounded-md px-3 py-2 text-xs text-[#18181B] focus:outline-none focus:ring-1 focus:ring-zinc-800"
          >
            <option value="all">Tất cả mức độ</option>
            <option value="high_positive">Tích cực cao (&gt;75%)</option>
            <option value="balanced">Cân bằng</option>
            <option value="needs_attention">Cần cải thiện (&gt;12% Tiêu cực)</option>
          </select>
        </div>
      </div>

      {/* Sắp xếp kết quả */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 text-xs">
        <span className="text-[#71717A]">Sắp xếp theo:</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'reviews', label: 'Nhiều đánh giá nhất' },
              { id: 'rating', label: 'Điểm sao cao nhất' },
              { id: 'positive_sentiment', label: 'Tỷ lệ tích cực cao nhất' },
              { id: 'name', label: 'Tên A - Z' }
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              onClick={() => onChange({ ...filters, sortBy: opt.id })}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filters.sortBy === opt.id
                  ? 'bg-zinc-900 text-white font-semibold shadow-2xs'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
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
