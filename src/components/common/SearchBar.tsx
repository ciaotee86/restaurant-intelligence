import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowRight, MapPin, Utensils, X } from 'lucide-react';
import { restaurantService } from '../../services/restaurantService';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onSelectRestaurant?: (restaurantId: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  size?: 'large' | 'medium';
  initialValue?: string;
  debounceLiveSearch?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onSelectRestaurant,
  placeholder = "Tìm kiếm nhà hàng...",
  autoFocus = false,
  size = 'large',
  initialValue = '',
  debounceLiveSearch = false
}) => {
  const [query, setQuery] = useState(initialValue);
  const [prevInitialValue, setPrevInitialValue] = useState(initialValue);
  if (initialValue !== prevInitialValue) {
    setPrevInitialValue(initialValue);
    setQuery(initialValue);
  }

  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = query.trim().length > 0
    ? restaurantService.getSearchSuggestions(query)
    : [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);

    if (debounceLiveSearch) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (val.trim() === '') {
        onSearch('');
      } else {
        debounceTimerRef.current = setTimeout(() => {
          onSearch(val.trim());
        }, 300);
      }
    }
  };

  const handleClear = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setQuery('');
    setIsOpen(false);
    onSearch('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setIsOpen(false);
    onSearch(query.trim());
  };

  const handleSuggestionClick = (id: string, name: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setQuery(name);
    setIsOpen(false);
    if (onSelectRestaurant) {
      onSelectRestaurant(id);
    } else {
      onSearch(name);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-[#8C857B]">
            <Search className={size === 'large' ? 'w-5 h-5 text-[#991B1B]' : 'w-4 h-4 text-[#8C857B]'} />
          </div>
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={`w-full bg-white border border-[#E8E4DC] text-[#1C1917] placeholder-[#A8A29E] rounded-xl shadow-editorial focus:outline-none focus:ring-2 focus:ring-[#991B1B]/15 focus:border-[#991B1B] transition-all ${
              size === 'large'
                ? 'py-4 pl-12 pr-36 text-base md:text-lg font-normal'
                : 'py-2.5 pl-10 pr-28 text-sm'
            }`}
          />
          {query.trim().length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className={`absolute inset-y-0 right-28 flex items-center pr-2 text-[#8C857B] hover:text-[#1C1917] transition-colors ${
                size === 'large' ? 'right-36' : 'right-28'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nút Xem đánh giá */}
        <button
          type="submit"
          className={`absolute right-1.5 inline-flex items-center gap-1.5 bg-[#991B1B] hover:bg-[#7F1D1D] text-white font-medium rounded-lg transition-all shadow-editorial-sm ${
            size === 'large'
              ? 'px-5 py-2.5 text-sm md:text-base'
              : 'px-3.5 py-1.5 text-xs'
          }`}
        >
          <span>Xem đánh giá</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Dropdown gợi ý */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-[#E8E4DC] rounded-xl shadow-editorial-lg z-50 overflow-hidden text-left divide-y divide-[#F2EFE9]">
          {suggestions.length > 0 && (
            <>
              <div className="px-3.5 py-2 bg-[#F8F6F0] text-[11px] font-bold text-[#8C857B] uppercase tracking-wider">
                Quán ăn đã có báo cáo phân tích
              </div>
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSuggestionClick(item.id, item.name)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-[#FAF7F2] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#F2EFE9] flex items-center justify-center text-[#57534E] group-hover:bg-[#FDF2F2] group-hover:text-[#991B1B] transition-colors">
                      <Utensils className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#1C1917] group-hover:text-[#991B1B] transition-colors">
                        {item.name}
                      </div>
                      <div className="text-xs text-[#78716C] flex items-center gap-2">
                        <span>{item.cuisine}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-[#A8A29E]" />
                          {item.city}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[#A8A29E] group-hover:text-[#991B1B] group-hover:translate-x-0.5 transition-all">
                    Xem đánh giá →
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Tùy chọn tìm & tổng hợp quán mới */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onSearch(query.trim());
            }}
            className="w-full px-4 py-3 text-left flex items-center justify-between bg-[#FDF2F2] hover:bg-[#FEE2E2] text-[#991B1B] transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#991B1B]/10 flex items-center justify-center text-[#991B1B] group-hover:bg-[#991B1B] group-hover:text-white transition-colors">
                <Search className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#1C1917] group-hover:text-[#991B1B]">
                  Tìm & tổng hợp đánh giá quán "{query}"
                </span>
                <span className="block text-[11px] text-[#78716C]">
                  Đọc nhanh nhận xét từ thực khách thực tế và tóm tắt mức độ hài lòng
                </span>
              </div>
            </div>
            <span className="text-[11px] font-semibold bg-[#991B1B] text-white px-2.5 py-1 rounded shadow-editorial-sm">
              Xem ngay →
            </span>
          </button>
        </div>
      )}

      {/* Dòng hướng dẫn dưới ô tìm kiếm */}
      {size === 'large' && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between text-xs text-[#78716C] px-1">
          <span>Tìm theo tên món hoặc thương hiệu</span>
          <div className="flex items-center gap-2 mt-1 sm:mt-0">
            <span className="text-[#A8A29E]">Gợi ý:</span>
            <button
              type="button"
              onClick={() => {
                setQuery("Pizza 4P's");
                if (onSelectRestaurant) onSelectRestaurant('pizza-4ps-trang-tien');
              }}
              className="hover:text-[#991B1B] hover:underline underline-offset-2 font-medium"
            >
              Pizza 4P's
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => {
                setQuery("Phở Thìn");
                if (onSelectRestaurant) onSelectRestaurant('pho-thin-lo-duc');
              }}
              className="hover:text-[#991B1B] hover:underline underline-offset-2 font-medium"
            >
              Phở Thìn
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => {
                setQuery("The Coffee House");
                if (onSelectRestaurant) onSelectRestaurant('the-coffee-house-nguyen-trai');
              }}
              className="hover:text-[#991B1B] hover:underline underline-offset-2 font-medium"
            >
              The Coffee House
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
