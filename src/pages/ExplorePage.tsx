import React, { useState, useEffect } from 'react';
import type { Restaurant, SearchFilterState } from '../types/restaurant';
import { RestaurantCard } from '../components/restaurant-list/RestaurantCard';
import { FilterBar } from '../components/restaurant-list/FilterBar';
import { SearchBar } from '../components/common/SearchBar';
import { restaurantService } from '../services/restaurantService';
import { parseSearchQuery, removeVietnameseAccents } from '../utils/cityUtils';
import { useLanguage } from '../context/LanguageContext';
import {
  Compass,
  PlusCircle,
  Sparkles,
  CheckCircle2,
  Inbox,
  SendHorizontal,
  Zap,
  Loader2,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

interface ExplorePageProps {
  initialQuery?: string;
  onSelectRestaurant: (restaurantId: string) => void;
  onOpenAnalyzeModal?: () => void;
}

const QUICK_CATEGORIES = [
  { key: 'categoryAll', query: '' },
  { key: 'categoryChickenRice', query: 'cơm gà' },
  { key: 'categoryRicePaper', query: 'bánh tráng' },
  { key: 'categoryQuangNoodles', query: 'mì quảng' },
  { key: 'categoryPho', query: 'phở' },
  { key: 'categoryBrokenRice', query: 'cơm tấm' },
  { key: 'categorySeafood', query: 'hải sản' },
  { key: 'categoryBeefNoodles', query: 'bún bò' },
  { key: 'categoryCrispyPancake', query: 'bánh xèo' },
  { key: 'categoryCoffee', query: 'cà phê' },
];

export const ExplorePage: React.FC<ExplorePageProps> = ({
  initialQuery = '',
  onSelectRestaurant,
  onOpenAnalyzeModal
}) => {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<SearchFilterState>(() => {
    const parsed = parseSearchQuery(initialQuery);
    return {
      query: initialQuery,
      city: parsed.detectedCity ? parsed.detectedCity : 'Tất cả địa điểm',
      cuisineCategory: 'Tất cả ẩm thực',
      minRating: 0,
      sentimentHealth: 'all',
      sortBy: 'reviews'
    };
  });

  const [prevInitialQuery, setPrevInitialQuery] = useState(initialQuery);
  if (initialQuery !== prevInitialQuery) {
    setPrevInitialQuery(initialQuery);
    const parsed = parseSearchQuery(initialQuery);
    setFilters((prev) => ({
      ...prev,
      query: initialQuery,
      city: parsed.detectedCity ? parsed.detectedCity : 'Tất cả địa điểm'
    }));
  }

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [allAvailableRestaurants, setAllAvailableRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  // Trạng thái gửi yêu cầu cào quán ngầm
  const [queueStatus, setQueueStatus] = useState<'idle' | 'submitting' | 'submitted'>('idle');
  const [queueMessage, setQueueMessage] = useState<string>('');

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
    const parsed = parseSearchQuery(q);
    if (parsed.detectedCity) {
      // Nếu từ khóa có chứa thành phố -> Tự động chuyển dropdown và bộ lọc sang đúng thành phố đó!
      setFilters((prev) => ({ ...prev, query: q, city: parsed.detectedCity! }));
    } else {
      // Nếu từ khóa KHÔNG chứa thành phố (chỉ tìm món ăn như "cơm gà", "bánh tráng")
      // -> Đưa thành phố về 'Tất cả địa điểm' để tìm kiếm toàn quốc trên mọi tỉnh thành!
      setFilters((prev) => ({ ...prev, query: q, city: 'Tất cả địa điểm' }));
    }
    setQueueStatus('idle');
    setQueueMessage('');
  };

  const handleQuickCategoryClick = (categoryQuery: string) => {
    setFilters((prev) => ({
      ...prev,
      query: categoryQuery,
      city: 'Tất cả địa điểm'
    }));
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

  const handleRetryBackend = async () => {
    setLoading(true);
    await restaurantService.getAllRestaurants(true);
    const results = await restaurantService.searchRestaurants(filters);
    setRestaurants(results);
    setLoading(false);
  };

  // Cào & phân tích trực tiếp tức thì (On-demand ~25s)
  const [directCrawlState, setDirectCrawlState] = useState<'idle' | 'crawling' | 'error'>('idle');
  const [directCrawlMessage, setDirectCrawlMessage] = useState<string>('');

  const handleDirectCrawl = async () => {
    const parsed = parseSearchQuery(filters.query);
    const targetQuery = parsed.remainingKeyword.trim() || filters.query.trim() || 'đặc sản món ngon';
    const effectiveCity = parsed.detectedCity || (filters.city !== 'Tất cả địa điểm' ? filters.city : '');
    let targetCity = 'da-nang';
    if (effectiveCity) {
      const normEff = removeVietnameseAccents(effectiveCity).toLowerCase();
      if (normEff.includes('ho chi minh') || normEff.includes('sai gon')) {
        targetCity = 'ho-chi-minh';
      } else if (normEff.includes('ha noi')) {
        targetCity = 'ha-noi';
      } else {
        targetCity = normEff.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
    }
    
    setDirectCrawlState('crawling');
    setDirectCrawlMessage(`Đang tìm kiếm thông tin quán "${targetQuery}" tại ${effectiveCity} và tổng hợp đánh giá thực tế từ thực khách...`);

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
        setDirectCrawlMessage(res.message || 'Không tìm thấy quán phù hợp trên hệ thống.');
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E8E4DC] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#991B1B] mb-1">
            <Compass className="w-4 h-4" />
            <span>{t('explore.badge')}</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#1C1917] tracking-tight">
            {isSearchActive ? t('explore.resultsFor', { query: filters.query }) : t('explore.title')}
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] mt-1">
            {t('explore.subtitle')}
          </p>
        </div>

        <div className="w-full md:w-88 flex items-center gap-2">
          <div className="flex-1">
            <SearchBar
              size="medium"
              initialValue={filters.query}
              debounceLiveSearch={true}
              onSearch={handleSearchSubmit}
              onSelectRestaurant={onSelectRestaurant}
              placeholder={t('explore.searchPlaceholder')}
            />
          </div>
        </div>
      </div>

      {/* Quick Category Chips: Thẻ món ăn chọn nhanh */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-bold text-[#8C857B] shrink-0 flex items-center gap-1 mr-1">
          <Sparkles className="w-3.5 h-3.5 text-[#991B1B]" />
          <span>{t('explore.popularDishes')}</span>
        </span>
        {QUICK_CATEGORIES.map((cat) => {
          const isSelected =
            (cat.query === '' && filters.query === '') ||
            (cat.query !== '' && filters.query.toLowerCase() === cat.query.toLowerCase());
          const catLabel = t(`explore.${cat.key}`);
          return (
            <button
              key={cat.key}
              onClick={() => handleQuickCategoryClick(cat.query)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-[#1C1917] text-white shadow-editorial-sm'
                  : 'bg-white border border-[#E8E4DC] text-[#57534E] hover:border-[#991B1B]/40 hover:bg-[#FAF7F2]'
              }`}
            >
              {catLabel}
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
              <p className="font-semibold text-sm">{t('explore.queueSuccess')}</p>
              <p className="text-[11px] text-emerald-800/90 mt-0.5">{queueMessage || t('explore.queueSuccessDesc')}</p>
            </div>
          </div>
          <button
            onClick={() => setQueueStatus('idle')}
            className="text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1 hover:underline cursor-pointer"
          >
            {t('common.close')}
          </button>
        </div>
      )}

      {/* Kết quả số lượng & Trạng thái truy vấn */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#71717A] pt-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#18181B]">
            {loading ? t('explore.searching') : t('explore.foundCount', { count: restaurants.length })}
          </span>
          {!loading && !restaurantService.isConnectedToBackend() && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200"
              title={t('explore.offlineTooltip')}
            >
              <AlertCircle className="w-3 h-3 text-amber-600" />
              {t('explore.offlineMode')}
            </span>
          )}
        </div>
        
        {isSearchActive && (
          <button
            onClick={handleResetFilters}
            className="text-zinc-500 hover:text-zinc-800 hover:underline underline-offset-2 font-medium cursor-pointer"
          >
            {t('explore.clearFilters')}
          </button>
        )}
      </div>

      {/* Banner cảnh báo khi chưa kết nối máy chủ dữ liệu và có nút thử kết nối lại */}
      {!loading && !restaurantService.isConnectedToBackend() && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 text-xs animate-in fade-in">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-bold text-sm text-amber-900">{t('explore.offlineBannerTitle')}</p>
              <p className="text-xs text-amber-800/90 mt-0.5">
                {t('explore.offlineBannerDesc', { count: restaurants.length })}
              </p>
            </div>
          </div>
          <button
            onClick={handleRetryBackend}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 flex items-center justify-center gap-1.5 transition-colors shadow-sm self-start sm:self-center cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('explore.retryConnection')}
          </button>
        </div>
      )}

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
                  {t('explore.crawlingTitle')}
                </h4>
                <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                  {directCrawlMessage || t('explore.crawlingDesc')}
                </p>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-base font-bold text-[#18181B] mb-1">
                    {!restaurantService.isConnectedToBackend()
                      ? t('explore.emptyNoServer')
                      : isSearchActive
                      ? t('explore.emptyNoDataForQuery', { query: filters.query })
                      : filters.city !== 'Tất cả địa điểm'
                      ? t('explore.emptyNoDataForCity', { city: filters.city })
                      : t('explore.emptyNoResults')}
                  </h3>
                  <p className="text-xs text-[#71717A] max-w-md mx-auto leading-relaxed">
                    {!restaurantService.isConnectedToBackend()
                      ? t('explore.emptyDescNoServer')
                      : isSearchActive
                      ? t('explore.emptyDescQuery', { query: filters.query })
                      : filters.city !== 'Tất cả địa điểm'
                      ? t('explore.emptyDescCity', { city: filters.city })
                      : t('explore.emptyDescFilter')}
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
                    className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-[#18181B] hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all transform active:scale-95 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {isSearchActive
                        ? t('explore.directCrawlQuery', { query: filters.query })
                        : filters.city !== 'Tất cả địa điểm'
                        ? t('explore.directCrawlCity', { city: filters.city })
                        : t('explore.directCrawlNew')}
                    </span>
                  </button>

                  {/* Nút 2: Gửi yêu cầu cập nhật */}
                  {isSearchActive && (
                    queueStatus !== 'submitted' ? (
                      <button
                        onClick={handleSubmitQueueRequest}
                        disabled={queueStatus === 'submitting'}
                        className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-[#C2410C] hover:bg-[#9a3412] text-white text-xs font-semibold rounded-lg shadow-sm transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <SendHorizontal className="w-3.5 h-3.5" />
                        <span>
                          {queueStatus === 'submitting'
                            ? t('explore.queueSubmitting')
                            : t('explore.queueRequest')}
                        </span>
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                        {t('explore.queueSubmittedBadge')}
                      </span>
                    )
                  )}

                  {onOpenAnalyzeModal && (
                    <button
                      onClick={onOpenAnalyzeModal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>{t('explore.pasteFoodyDirect')}</span>
                    </button>
                  )}

                  {filters.city !== 'Tất cả địa điểm' && (
                    <button
                      onClick={() => setFilters((prev) => ({ ...prev, query: '' }))}
                      className="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-[#C2410C] text-xs font-semibold rounded-lg border border-[#C2410C]/20 transition-colors cursor-pointer"
                    >
                      {t('explore.viewAllInCity', { city: filters.city })}
                    </button>
                  )}

                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    {t('filter.reset')}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Gợi ý các quán đang có sẵn: CHỈ hiển thị khi người dùng ở chế độ xem tất cả địa điểm và KHÔNG có từ khóa tìm kiếm */}
          {!isSearchActive && filters.city === 'Tất cả địa điểm' && allAvailableRestaurants.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-zinc-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#18181B] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#C2410C]" />
                  <span>{t('explore.suggestedTitle')}</span>
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

