import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowRight, MapPin, Utensils } from 'lucide-react';
import { restaurantService } from '../../services/restaurantService';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onSelectRestaurant?: (restaurantId: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  size?: 'large' | 'medium';
  initialValue?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onSelectRestaurant,
  placeholder = "Tìm kiếm nhà hàng...",
  autoFocus = false,
  size = 'large',
  initialValue = ''
}) => {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<{ name: string; cuisine: string; city: string; id: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (query.trim().length > 0) {
      const results = restaurantService.getSearchSuggestions(query);
      setSuggestions(results);
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleSuggestionClick = (id: string, name: string) => {
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
          <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-zinc-400">
            <Search className={size === 'large' ? 'w-5 h-5' : 'w-4 h-4'} />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={`w-full bg-white border border-[#D4D4D8] text-[#18181B] placeholder-zinc-400 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20 focus:border-[#C2410C] transition-all ${
              size === 'large'
                ? 'py-4 pl-12 pr-32 text-base md:text-lg font-normal'
                : 'py-2.5 pl-10 pr-24 text-sm'
            }`}
          />
        </div>

        {/* Nút Phân tích (Analyze) */}
        <button
          type="submit"
          className={`absolute right-1.5 inline-flex items-center gap-1.5 bg-[#18181B] hover:bg-[#C2410C] text-white font-medium rounded-md transition-colors shadow-2xs ${
            size === 'large'
              ? 'px-5 py-2.5 text-sm md:text-base'
              : 'px-3.5 py-1.5 text-xs'
          }`}
        >
          <span>Phân tích</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Dropdown gợi ý */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E4E4E7] rounded-lg shadow-lg z-50 overflow-hidden text-left divide-y divide-zinc-100">
          {suggestions.length > 0 && (
            <>
              <div className="px-3 py-2 bg-zinc-50/80 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Quán đã có sẵn trong hệ thống
              </div>
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSuggestionClick(item.id, item.name)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-zinc-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center text-zinc-600 group-hover:bg-orange-50 group-hover:text-[#C2410C] transition-colors">
                      <Utensils className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#18181B] group-hover:text-[#C2410C] transition-colors">
                        {item.name}
                      </div>
                      <div className="text-xs text-[#71717A] flex items-center gap-2">
                        <span>{item.cuisine}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-zinc-400" />
                          {item.city}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-zinc-400 group-hover:text-[#C2410C] group-hover:translate-x-0.5 transition-all">
                    Xem phân tích →
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Tùy chọn tìm & cào mới trên Foody */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onSearch(query.trim());
            }}
            className="w-full px-4 py-3 text-left flex items-center justify-between bg-orange-50/70 hover:bg-orange-100/80 text-[#C2410C] transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#C2410C]/10 flex items-center justify-center text-[#C2410C] group-hover:bg-[#C2410C] group-hover:text-white transition-colors">
                <Search className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#18181B] group-hover:text-[#C2410C]">
                  Tìm kiếm & AI Phân tích quán "{query}" trên Foody.vn
                </span>
                <span className="block text-[11px] text-zinc-500">
                  Tự động cào đánh giá thật và dùng Gemini AI phân tích khía cạnh (ABSA)
                </span>
              </div>
            </div>
            <span className="text-[11px] font-semibold bg-[#C2410C] text-white px-2.5 py-1 rounded shadow-2xs">
              Tìm trên Foody →
            </span>
          </button>
        </div>
      )}

      {/* Dòng hướng dẫn dưới ô tìm kiếm */}
      {size === 'large' && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between text-xs text-[#71717A] px-1">
          <span>Tìm kiếm theo tên nhà hàng</span>
          <div className="flex items-center gap-2 mt-1 sm:mt-0">
            <span className="text-zinc-400">Gợi ý:</span>
            <button
              type="button"
              onClick={() => {
                setQuery("Pizza 4P's");
                if (onSelectRestaurant) onSelectRestaurant('pizza-4ps-trang-tien');
              }}
              className="hover:text-[#C2410C] hover:underline underline-offset-2"
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
              className="hover:text-[#C2410C] hover:underline underline-offset-2"
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
              className="hover:text-[#C2410C] hover:underline underline-offset-2"
            >
              The Coffee House
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
