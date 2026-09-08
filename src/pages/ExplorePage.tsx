import React, { useState, useEffect } from 'react';
import type { Restaurant, SearchFilterState } from '../types/restaurant';
import { RestaurantCard } from '../components/restaurant-list/RestaurantCard';
import { FilterBar } from '../components/restaurant-list/FilterBar';
import { SearchBar } from '../components/common/SearchBar';
import { restaurantService } from '../services/restaurantService';
import { Compass, UtensilsCrossed, PlusCircle, Search } from 'lucide-react';

interface ExplorePageProps {
  initialQuery?: string;
  onSelectRestaurant: (restaurantId: string) => void;
  onOpenAnalyzeModal?: () => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  initialQuery = '',
  onSelectRestaurant,
  onOpenAnalyzeModal
}) => {
  const [filters, setFilters] = useState<SearchFilterState>({
    query: initialQuery,
    city: 'Tất cả địa điểm',
    cuisineCategory: 'Tất cả ẩm thực',
    minRating: 0,
    sentimentHealth: 'all',
    sortBy: 'reviews'
  });

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, query: initialQuery }));
  }, [initialQuery]);

  useEffect(() => {
    let isMounted = true;
    const fetchFiltered = async () => {
      setLoading(true);
      const results = await restaurantService.searchRestaurants(filters);
      if (isMounted) {
        setRestaurants(results);
        setLoading(false);
      }
    };
    fetchFiltered();
    return () => {
      isMounted = false;
    };
  }, [filters]);

  const handleResetFilters = () => {
    setFilters({
      query: '',
      city: 'Tất cả địa điểm',
      cuisineCategory: 'Tất cả ẩm thực',
      minRating: 0,
      sentimentHealth: 'all',
      sortBy: 'reviews'
    });
  };

  const handleSearchSubmit = (q: string) => {
    // Nếu người dùng dán link Foody vào ô tìm kiếm -> mở modal phân tích tự động!
    if (q.includes('foody.vn') && onOpenAnalyzeModal) {
      onOpenAnalyzeModal();
      return;
    }
    setFilters({ ...filters, query: q });
  };

  const isSearchActive = Boolean(filters.query && filters.query.trim().length > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Tiêu đề & Ô tìm kiếm */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E4E4E7] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C2410C] mb-1">
            <Compass className="w-4 h-4" />
            <span>Chỉ số phân tích công khai</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#18181B] tracking-tight">
            {isSearchActive ? `Kết quả tìm kiếm cho "${filters.query}"` : 'Khám phá nhà hàng'}
          </h1>
          <p className="text-xs sm:text-sm text-[#71717A] mt-1">
            Tra cứu phân bổ cảm xúc và chỉ số khía cạnh trên các nhà hàng và quán ăn tại Việt Nam.
          </p>
        </div>

        <div className="w-full md:w-88 flex items-center gap-2">
          <div className="flex-1">
            <SearchBar
              size="medium"
              initialValue={filters.query}
              onSearch={handleSearchSubmit}
              onSelectRestaurant={onSelectRestaurant}
              placeholder="Tìm theo tên, món ăn, địa chỉ..."
            />
          </div>
        </div>
      </div>

      {/* Thanh bộ lọc và sắp xếp */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
      />

      {/* Kết quả số lượng */}
      <div className="flex items-center justify-between text-xs text-[#71717A] pt-2">
        <span className="font-medium text-[#18181B]">
          {loading ? 'Đang truy vấn cơ sở dữ liệu...' : `Tìm thấy ${restaurants.length} nhà hàng phù hợp tiêu chí`}
        </span>
        {isSearchActive && (
          <button
            onClick={() => setFilters({ ...filters, query: '' })}
            className="text-[#C2410C] hover:underline underline-offset-2 font-medium"
          >
            Xóa từ khóa tìm kiếm
          </button>
        )}
      </div>

      {/* Lưới danh sách nhà hàng */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-64 bg-zinc-200/60 rounded-lg border border-zinc-200" />
          ))}
        </div>
      ) : restaurants.length === 0 ? (
        <div className="text-center py-12 bg-white border border-dashed border-zinc-300 rounded-xl p-6 sm:p-8 max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-orange-50 text-[#C2410C] flex items-center justify-center mx-auto">
            {isSearchActive ? <Search className="w-6 h-6" /> : <UtensilsCrossed className="w-6 h-6" />}
          </div>

          <div>
            <h3 className="text-base font-bold text-[#18181B] mb-1">
              {isSearchActive ? `Chưa có dữ liệu cho "${filters.query}"` : 'Không tìm thấy nhà hàng nào'}
            </h3>
            <p className="text-xs text-[#71717A] max-w-md mx-auto leading-relaxed">
              {isSearchActive
                ? `Hệ thống chưa lưu dữ liệu đánh giá của "${filters.query}". Bạn có thể dán đường link Foody của quán để hệ thống tự động cào và phân tích ngay lập tức!`
                : 'Không có nhà hàng nào khớp với các thiết lập bộ lọc hiện tại của bạn.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {isSearchActive && onOpenAnalyzeModal && (
              <button
                onClick={onOpenAnalyzeModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C2410C] hover:bg-[#9a3412] text-white text-xs font-semibold rounded-md shadow-2xs transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Phân tích quán "{filters.query}" từ Foody</span>
              </button>
            )}

            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-md transition-colors"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onSelect={onSelectRestaurant}
            />
          ))}
        </div>
      )}

    </div>
  );
};
