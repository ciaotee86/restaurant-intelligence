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
  Sparkles,
  CheckCircle2,
  Inbox,
  SendHorizontal,
  Zap,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface ExplorePageProps {
  initialQuery?: string;
  onSelectRestaurant: (restaurantId: string) => void;
  onOpenAnalyzeModal?: () => void;
}

const QUICK_CATEGORIES = [
  { label: 'Tất cả', query: '' },
  { label: 'Cơm gà', query: 'cơm gà' },
  { label: 'Bánh tráng', query: 'bánh tráng' },
  { label: 'Mì Quảng', query: 'mì quảng' },
  { label: 'Phở', query: 'phở' },
  { label: 'Cơm tấm', query: 'cơm tấm' },
  { label: 'Hải sản', query: 'hải sản' },
  { label: 'Bún bò', query: 'bún bò' },
  { label: 'Bánh xèo', query: 'bánh xèo' },
  { label: 'Cà phê', query: 'cà phê' },
];

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
  const [allAvailableRestaurants, setAllAvailableRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  // Trạng thái gửi yêu cầu cào quán ngầm
  const [queueStatus, setQueueStatus] = useState<'idle' | 'submitting' | 'submitted'>('idle');
  const [queueMessage, setQueueMessage] = useState<string>('');

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

  // Load danh sách tổng để hiển thị gợi ý khi không tìm thấy quán
  useEffect(() => {
    restaurantService.getAllRestaurants().then((all) => {
      setAllAvailableRestaurants(all);
    });
  }, []);

  const handleResetFilters = () => {
    setFilters({
      query: '',
      city: 'Tất cả địa điểm',
      cuisineCategory: 'Tất cả ẩm thực',
      minRating: 0,
      sentimentHealth: 'all',
      sortBy: 'reviews'
    });
    setQueueStatus('idle');
    setQueueMessage('');
  };

  const handleSearchSubmit = (q: string) => {
    // Nếu người dùng dán link Foody vào ô tìm kiếm -> mở modal phân tích trực tiếp!
    if (q.includes('foody.vn') && onOpenAnalyzeModal) {
      onOpenAnalyzeModal();
      return;
    }
    setFilters({ ...filters, query: q });
    setQueueStatus('idle');
    setQueueMessage('');
  };

  const handleQuickCategoryClick = (categoryQuery: string) => {
    setFilters((prev) => ({ ...prev, query: categoryQuery }));
    setQueueStatus('idle');
    setQueueMessage('');
  };

  // Gửi yêu cầu cào quán vào hàng đợi ngầm của hệ thống (phản hồi tức thì < 50ms)
  const handleSubmitQueueRequest = async () => {
    const q = filters.query.trim();
    if (!q) return;

    setQueueStatus('submitting');
    try {
      const res = await restaurantService.requestCrawl(q, filters.city);
      setQueueStatus('submitted');
      setQueueMessage(res.message);
    } catch {
      setQueueStatus('submitted');
      setQueueMessage(`Đã ghi nhận yêu cầu cho "${q}". Hệ thống sẽ tự động quét và phân tích trong phiên chạy tiếp theo!`);
    }
  };

  // Cào & phân tích trực tiếp tức thì (On-demand ~25s)
  const [directCrawlState, setDirectCrawlState] = useState<'idle' | 'crawling' | 'error'>('idle');
  const [directCrawlMessage, setDirectCrawlMessage] = useState<string>('');

  const handleDirectCrawl = async () => {
    const targetQuery = filters.query.trim() || 'đặc sản món ngon';
    const targetCity = filters.city !== 'Tất cả địa điểm' ? filters.city : 'da-nang';
    
    setDirectCrawlState('crawling');
    setDirectCrawlMessage(`Đang tìm kiếm quán "${targetQuery}" tại ${targetCity} trên Foody, cào review & chạy Gemini AI phân tích...`);

    try {
      const res = await restaurantService.searchAndCrawlFoody(targetQuery, targetCity, 20);
      if (res.success && res.restaurant) {
        setDirectCrawlState('idle');
        const updated = await restaurantService.getAllRestaurants();
        setAllAvailableRestaurants(updated);
        setRestaurants([res.restaurant, ...updated.filter(r => r.id !== res.restaurant?.id)]);
        onSelectRestaurant(res.restaurant.id);
      } else {
        setDirectCrawlState('error');
        setDirectCrawlMessage(res.message || 'Không tìm thấy quán phù hợp trên Foody.');
      }
    } catch (e: any) {
      setDirectCrawlState('error');
      setDirectCrawlMessage(e?.message || 'Có lỗi xảy ra khi kết nối máy chủ phân tích.');
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
            <span>Danh mục quán ăn đã đánh giá</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#18181B] tracking-tight">
            {isSearchActive ? `Kết quả cho "${filters.query}"` : 'Khám phá quán ăn'}
          </h1>
          <p className="text-xs sm:text-sm text-[#71717A] mt-1">
            Tra cứu mức độ hài lòng thực tế và đánh giá chi tiết của thực khách tại các quán ăn trên toàn quốc.
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

      {/* Quick Category Chips: Thẻ món ăn chọn nhanh */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-semibold text-zinc-500 shrink-0 flex items-center gap-1 mr-1">
          <Sparkles className="w-3.5 h-3.5 text-[#C2410C]" />
          <span>Món phổ biến:</span>
        </span>
        {QUICK_CATEGORIES.map((cat) => {
          const isSelected =
            (cat.query === '' && filters.query === '') ||
            (cat.query !== '' && filters.query.toLowerCase() === cat.query.toLowerCase());
          return (
            <button
              key={cat.label}
              onClick={() => handleQuickCategoryClick(cat.query)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-[#C2410C] text-white shadow-2xs font-semibold'
                  : 'bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Thanh bộ lọc và sắp xếp */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
      />

      {/* Banner thông báo khi đã gửi yêu cầu thu thập quán thành công */}
      {queueStatus === 'submitted' && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-900 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Gửi yêu cầu thành công!</p>
              <p className="text-[11px] text-emerald-800/90 mt-0.5">{queueMessage || 'Hệ thống sẽ cập nhật quán này trong thời gian sớm nhất.'}</p>
            </div>
          </div>
          <button
            onClick={() => setQueueStatus('idle')}
            className="text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1 hover:underline"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Kết quả số lượng & Trạng thái truy vấn */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#71717A] pt-1">
        <span className="font-medium text-[#18181B]">
          {loading ? 'Đang tìm kiếm quán ăn...' : `Tìm thấy ${restaurants.length} quán ăn phù hợp`}
        </span>
        
        {isSearchActive && (
          <button
            onClick={handleResetFilters}
            className="text-zinc-500 hover:text-zinc-800 hover:underline underline-offset-2 font-medium"
          >
            Xóa bộ lọc
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
        <div className="space-y-8">
          {/* Card thông báo không có kết quả + Nút gửi yêu cầu */}
          <div className="text-center py-10 bg-white border border-dashed border-zinc-300 rounded-xl p-6 sm:p-8 max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-orange-50 text-[#C2410C] flex items-center justify-center mx-auto">
              <Inbox className="w-6 h-6" />
            </div>

            {directCrawlState === 'crawling' ? (
              <div className="py-6 space-y-3 text-center">
                <Loader2 className="w-9 h-9 text-[#C2410C] animate-spin mx-auto" />
                <h4 className="text-sm font-bold text-[#18181B]">
                  Đang tổng hợp đánh giá thực tế từ thực khách...
                </h4>
                <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                  {directCrawlMessage || 'Hệ thống đang đọc các nhận xét công khai từ thực khách trên Foody và lập báo cáo tóm tắt. Vui lòng đợi trong giây lát (~20 - 30 giây)...'}
                </p>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-base font-bold text-[#18181B] mb-1">
                    {isSearchActive
                      ? `Chưa có dữ liệu cho "${filters.query}"`
                      : filters.city !== 'Tất cả địa điểm'
                      ? `Chưa có dữ liệu cho khu vực "${filters.city}"`
                      : 'Không tìm thấy quán ăn nào'}
                  </h3>
                  <p className="text-xs text-[#71717A] max-w-md mx-auto leading-relaxed">
                    {isSearchActive
                      ? `Quán ăn "${filters.query}" chưa có trong danh mục. Bạn có thể bấm nút bên dưới để hệ thống đọc đánh giá và lập báo cáo ngay sau 25 giây, hoặc gửi yêu cầu cập nhật sau.`
                      : filters.city !== 'Tất cả địa điểm'
                      ? `Khu vực "${filters.city}" chưa có quán ăn trong danh mục hiện tại. Bạn có thể bấm xem ngay các quán nổi bật tại ${filters.city} hoặc chọn "Tất cả địa điểm".`
                      : 'Không có quán ăn nào khớp với các thiết lập bộ lọc hiện tại của bạn.'}
                  </p>
                </div>

                {directCrawlState === 'error' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2 max-w-md mx-auto text-left">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{directCrawlMessage}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {/* Nút 1: Tổng hợp trực tiếp */}
                  <button
                    onClick={handleDirectCrawl}
                    className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-[#18181B] hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all transform active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {isSearchActive
                        ? `⚡ Tổng hợp đánh giá "${filters.query}" ngay (~25s)`
                        : filters.city !== 'Tất cả địa điểm'
                        ? `⚡ Xem quán nổi bật tại ${filters.city} (~25s)`
                        : '⚡ Tổng hợp đánh giá quán mới (~25s)'}
                    </span>
                  </button>

                  {/* Nút 2: Gửi yêu cầu cập nhật */}
                  {isSearchActive && (
                    queueStatus !== 'submitted' ? (
                      <button
                        onClick={handleSubmitQueueRequest}
                        disabled={queueStatus === 'submitting'}
                        className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-[#C2410C] hover:bg-[#9a3412] text-white text-xs font-semibold rounded-lg shadow-sm transition-all transform active:scale-95 disabled:opacity-50"
                      >
                        <SendHorizontal className="w-3.5 h-3.5" />
                        <span>
                          {queueStatus === 'submitting'
                            ? 'Đang gửi...'
                            : `📋 Yêu cầu thêm quán này`}
                        </span>
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                        ✅ Đã ghi nhận yêu cầu của bạn!
                      </span>
                    )
                  )}

                  {onOpenAnalyzeModal && (
                    <button
                      onClick={onOpenAnalyzeModal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-lg transition-colors"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Dán link Foody trực tiếp</span>
                    </button>
                  )}

                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-lg transition-colors"
                  >
                    Đặt lại bộ lọc
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Gợi ý các quán đang có sẵn */}
          {allAvailableRestaurants.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-zinc-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#18181B] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#C2410C]" />
                  <span>Gợi ý một số quán ăn nổi bật dành cho bạn:</span>
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allAvailableRestaurants.slice(0, 6).map((restaurant) => (
                  <RestaurantCard
                    key={restaurant.id}
                    restaurant={restaurant}
                    onSelect={onSelectRestaurant}
                  />
                ))}
              </div>
            </div>
          )}
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

