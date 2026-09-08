import React, { useState, useEffect } from 'react';
import type { Restaurant, SearchFilterState } from '../types/restaurant';
import { RestaurantCard } from '../components/restaurant-list/RestaurantCard';
import { FilterBar } from '../components/restaurant-list/FilterBar';
import { SearchBar } from '../components/common/SearchBar';
import { restaurantService } from '../services/restaurantService';
import {
  Compass,
  UtensilsCrossed,
  PlusCircle,
  Search,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Database,
  Globe
} from 'lucide-react';

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

  // Trạng thái cào & phân tích tự động từ Foody
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlStep, setCrawlStep] = useState<number>(0);
  const [crawlMessage, setCrawlMessage] = useState<string>('');
  const [crawlError, setCrawlError] = useState<string>('');

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
    setCrawlError('');
  };

  const handleSearchSubmit = (q: string) => {
    // Nếu người dùng dán link Foody vào ô tìm kiếm -> mở modal phân tích tự động!
    if (q.includes('foody.vn') && onOpenAnalyzeModal) {
      onOpenAnalyzeModal();
      return;
    }
    setFilters({ ...filters, query: q });
    setCrawlError('');
  };

  // Tự động tìm kiếm trên Foody, cào đánh giá và phân tích AI
  const handleAutoSearchAndCrawl = async (customQuery?: string) => {
    const q = (customQuery || filters.query || '').trim();
    if (!q) return;

    setIsCrawling(true);
    setCrawlError('');
    setCrawlStep(1);
    setCrawlMessage(`Đang tìm kiếm quán ăn phù hợp với "${q}" trên Foody.vn...`);

    // Mô phỏng các giai đoạn để người dùng theo dõi trực quan
    const step2Timer = setTimeout(() => {
      setCrawlStep(2);
      setCrawlMessage(`Đã tìm thấy quán! Đang cào đánh giá thực tế và loại bỏ bình luận spam...`);
    }, 3500);

    const step3Timer = setTimeout(() => {
      setCrawlStep(3);
      setCrawlMessage(`Đang chạy Gemini AI phân tích khía cạnh (Món ăn, Giá cả, Dịch vụ, Không gian, Vệ sinh)...`);
    }, 9000);

    try {
      // Map thành phố nếu người dùng đang chọn bộ lọc thành phố
      let citySlug = 'da-nang';
      if (filters.city && filters.city.toLowerCase().includes('hồ chí minh')) {
        citySlug = 'ho-chi-minh';
      } else if (filters.city && filters.city.toLowerCase().includes('hà nội')) {
        citySlug = 'ha-noi';
      }

      const res = await restaurantService.searchAndCrawlFoody(q, citySlug, 25);
      clearTimeout(step2Timer);
      clearTimeout(step3Timer);

      if (res.success && res.restaurant) {
        setCrawlStep(4);
        setCrawlMessage(`Hoàn tất! Đã lưu dữ liệu vào hệ thống cho tất cả người dùng.`);
        
        // Cập nhật danh sách hiển thị
        const newRes = res.restaurant;
        setRestaurants((prev) => [newRes, ...prev.filter((r) => r.id !== newRes.id)]);
        
        setTimeout(() => {
          setIsCrawling(false);
          setCrawlStep(0);
          onSelectRestaurant(newRes.id);
        }, 1500);
      } else {
        setIsCrawling(false);
        setCrawlError(res.message || 'Không tìm thấy quán nào trên Foody hoặc lỗi trong quá trình phân tích.');
      }
    } catch (err: any) {
      clearTimeout(step2Timer);
      clearTimeout(step3Timer);
      setIsCrawling(false);
      setCrawlError(err?.message || 'Lỗi kết nối tới máy chủ backend.');
    }
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

      {/* Banner đang cào & phân tích tự động */}
      {isCrawling && (
        <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200 rounded-xl p-5 shadow-xs animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#C2410C] text-white flex items-center justify-center shrink-0 animate-spin">
                <Loader2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C2410C] bg-orange-100 px-2 py-0.5 rounded">
                    Tự động hóa Foody + Gemini AI
                  </span>
                  <span className="text-xs text-zinc-500 font-medium">Bước {crawlStep}/4</span>
                </div>
                <h4 className="text-sm font-bold text-[#18181B] mt-0.5">
                  {crawlMessage}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-600 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-orange-200/60 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-[#C2410C]" />
              <span>Dữ liệu sẽ được lưu vào cơ sở dữ liệu chung</span>
            </div>
          </div>

          {/* Thanh tiến trình các bước */}
          <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-orange-200/60 text-[11px]">
            <div className={`flex items-center gap-1.5 ${crawlStep >= 1 ? 'text-[#C2410C] font-semibold' : 'text-zinc-400'}`}>
              <Globe className="w-3.5 h-3.5" />
              <span className="truncate">1. Tìm trên Foody</span>
            </div>
            <div className={`flex items-center gap-1.5 ${crawlStep >= 2 ? 'text-[#C2410C] font-semibold' : 'text-zinc-400'}`}>
              <Search className="w-3.5 h-3.5" />
              <span className="truncate">2. Cào đánh giá thật</span>
            </div>
            <div className={`flex items-center gap-1.5 ${crawlStep >= 3 ? 'text-[#C2410C] font-semibold' : 'text-zinc-400'}`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span className="truncate">3. Gemini AI phân tích</span>
            </div>
            <div className={`flex items-center gap-1.5 ${crawlStep >= 4 ? 'text-green-600 font-semibold' : 'text-zinc-400'}`}>
              <Database className="w-3.5 h-3.5" />
              <span className="truncate">4. Lưu vào Database</span>
            </div>
          </div>
        </div>
      )}

      {/* Thông báo lỗi khi cào */}
      {crawlError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between gap-3 text-red-800 text-xs animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{crawlError}</p>
              <p className="text-[11px] text-red-600 mt-0.5">
                Bạn có thể thử nhập từ khóa cụ thể hơn hoặc dán trực tiếp đường link Foody của quán.
              </p>
            </div>
          </div>
          {onOpenAnalyzeModal && (
            <button
              onClick={onOpenAnalyzeModal}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-semibold shrink-0 transition-colors"
            >
              Dán link Foody
            </button>
          )}
        </div>
      )}

      {/* Kết quả số lượng & Tùy chọn cào thêm */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#71717A] pt-2">
        <span className="font-medium text-[#18181B]">
          {loading ? 'Đang truy vấn cơ sở dữ liệu...' : `Tìm thấy ${restaurants.length} nhà hàng trong cơ sở dữ liệu`}
        </span>
        
        <div className="flex items-center gap-3">
          {isSearchActive && !isCrawling && (
            <button
              onClick={() => handleAutoSearchAndCrawl()}
              className="inline-flex items-center gap-1 text-[#C2410C] hover:text-[#9a3412] font-semibold hover:underline underline-offset-2"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Tìm thêm "{filters.query}" trên Foody</span>
            </button>
          )}

          {isSearchActive && (
            <button
              onClick={handleResetFilters}
              className="text-zinc-500 hover:text-zinc-800 hover:underline underline-offset-2 font-medium"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
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
              {isSearchActive ? `Chưa có quán nào cho "${filters.query}" trong hệ thống` : 'Không tìm thấy nhà hàng nào'}
            </h3>
            <p className="text-xs text-[#71717A] max-w-md mx-auto leading-relaxed">
              {isSearchActive
                ? `Hệ thống chưa có dữ liệu phân tích của "${filters.query}". Nhấn nút bên dưới để hệ thống tự động tìm kiếm trên Foody.vn, cào đánh giá và phân tích bằng Gemini AI ngay lập tức!`
                : 'Không có nhà hàng nào khớp với các thiết lập bộ lọc hiện tại của bạn.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {isSearchActive && !isCrawling && (
              <button
                onClick={() => handleAutoSearchAndCrawl()}
                className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-[#C2410C] hover:bg-[#9a3412] text-white text-xs font-semibold rounded-lg shadow-sm transition-all transform active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>🚀 Tự động tìm trên Foody & Phân tích bằng Gemini AI</span>
              </button>
            )}

            {isSearchActive && onOpenAnalyzeModal && !isCrawling && (
              <button
                onClick={onOpenAnalyzeModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-lg transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Hoặc dán link Foody</span>
              </button>
            )}

            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-lg transition-colors"
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

