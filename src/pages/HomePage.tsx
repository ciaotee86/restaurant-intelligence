import React, { useState, useEffect } from 'react';
import { SearchBar } from '../components/common/SearchBar';
import { RestaurantCard } from '../components/restaurant-list/RestaurantCard';
import type { Restaurant } from '../types/restaurant';
import { 
  BarChart3, 
  ArrowRight, 
  ShieldCheck, 
  Utensils, 
  Store, 
  Sparkles, 
  Quote, 
  ThumbsUp, 
  AlertTriangle, 
  Trophy, 
  CheckCircle2, 
  MapPin, 
  ChevronRight, 
  Scale, 
  Flame 
} from 'lucide-react';
import { formatNumber } from '../utils/sentimentUtils';

interface HomePageProps {
  restaurants: Restaurant[];
  onSelectRestaurant: (restaurantId: string) => void;
  onSearch: (query: string) => void;
  onNavigateExplore: () => void;
  onNavigateHowItWorks: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  restaurants = [],
  onSelectRestaurant,
  onSearch,
  onNavigateExplore,
  onNavigateHowItWorks
}) => {
  // Trạng thái quán mẫu được chọn trong Live Scorecard Widget ở Hero
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  
  // Trạng thái chuyển đổi góc nhìn Thực khách vs Chủ quán
  const [perspectiveTab, setPerspectiveTab] = useState<'diner' | 'owner'>('diner');

  // Trạng thái so sánh đối đầu (Head-to-Head Comparison)
  const [compareIdA, setCompareIdA] = useState<string>('');
  const [compareIdB, setCompareIdB] = useState<string>('');

  useEffect(() => {
    if (restaurants && restaurants.length > 0) {
      if (!compareIdA || !restaurants.some(r => r.id === compareIdA)) {
        setCompareIdA(restaurants[0].id);
      }
      if (!compareIdB || !restaurants.some(r => r.id === compareIdB)) {
        setCompareIdB(restaurants[1]?.id || restaurants[0].id);
      }
    }
  }, [restaurants]);

  // Lấy danh sách quán mẫu hiển thị ở Hero
  const sampleRestaurants = (restaurants && restaurants.length > 0) ? restaurants.slice(0, 3) : [];
  const activeSample = sampleRestaurants[selectedSampleIndex] || sampleRestaurants[0] || null;

  // Bảng xếp hạng: Lọc top 3 quán có tỷ lệ khách hài lòng cao nhất
  const leaderboard = (restaurants && restaurants.length > 0)
    ? [...restaurants]
        .sort((a, b) => (b.sentimentDistribution?.positive ?? 0) - (a.sentimentDistribution?.positive ?? 0))
        .slice(0, 3)
    : [];

  // Quán tiêu biểu của tuần (Top 1)
  const heroFeatured = leaderboard[0] || (restaurants && restaurants[0]) || null;

  // Top quán có điểm ẩm thực cao nhất
  const topFoodRestaurant = (restaurants && restaurants.length > 0)
    ? [...restaurants].sort((a, b) => {
        const foodA = a.aspects?.find(asp => asp.category === 'Món ăn')?.positivePercentage || 0;
        const foodB = b.aspects?.find(asp => asp.category === 'Món ăn')?.positivePercentage || 0;
        return foodB - foodA;
      })[0] || null
    : null;

  // Mẫu trích dẫn của quán đang chọn
  const activeQuote = activeSample?.reviews?.[0]?.text || activeSample?.sentimentSummarySentence || 'Nhận xét chân thực từ khách hàng.';
  const displayQuote = activeQuote && activeQuote.length > 130 ? `${activeQuote.slice(0, 127)}...` : (activeQuote || '');

  // Lấy dữ liệu cho module so sánh 2 quán
  const restaurantA = restaurants.find(r => r.id === compareIdA) || restaurants[0] || null;
  const restaurantB = restaurants.find(r => r.id === compareIdB) || restaurants[1] || restaurants[0] || null;

  const aspectCategories = ['Món ăn', 'Dịch vụ', 'Giá cả', 'Không gian', 'Vị trí'] as const;

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      
      {/* 1. HERO SECTION: BỐ CỤC BẤT ĐỐI XỨNG (SPLIT HERO + LIVE RADAR SPOTLIGHT) */}
      <section className="pt-8 sm:pt-14 pb-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* CỘT TRÁI: THÔNG ĐIỆP CHÍNH & TÌM KIẾM NHANH (7 CỘT) */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Category Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAF9F5] border border-[#E5E3DE] text-xs font-bold text-[#C2410C]">
              <span className="w-2 h-2 rounded-full bg-[#C2410C] animate-pulse" />
              <span>Bản đồ đọc vị ẩm thực từ thực khách thực tế</span>
            </div>

            {/* Tiêu đề chính thức */}
            <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-black text-[#18181B] tracking-tight leading-[1.15]">
              Đọc vị mọi <br className="hidden sm:inline" />
              đánh giá quán ăn.
            </h1>

            {/* Dòng mô tả trực diện giá trị */}
            <p className="text-base sm:text-lg text-[#52525B] max-w-xl leading-relaxed">
              Thay vì mất 30 phút đọc hàng trăm bình luận — xem ngay bức tranh toàn cảnh về <strong className="text-[#18181B] font-bold">Món ăn</strong>, <strong className="text-[#18181B] font-bold">Giá cả</strong>, <strong className="text-[#18181B] font-bold">Thái độ phục vụ</strong> và <strong className="text-[#18181B] font-bold">Không gian</strong>.
            </p>

            {/* Khung tìm kiếm chính */}
            <div className="pt-1">
              <SearchBar
                size="large"
                onSearch={onSearch}
                onSelectRestaurant={onSelectRestaurant}
                placeholder="Tìm quán ăn hoặc món ngon (vd: Pizza 4P's, Cơm Gà 9 Ly, Phở Thìn)..."
              />
            </div>

            {/* Gợi ý nhu cầu thực tế (Quick Demand Chips) */}
            <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
              <span className="text-zinc-500 font-semibold">Nhu cầu phổ biến:</span>
              <button
                type="button"
                onClick={() => onSearch('gia đình')}
                className="px-2.5 py-1 bg-white hover:bg-[#FAF9F5] text-zinc-800 rounded border border-[#E5E3DE] hover:border-zinc-400 font-medium transition-colors"
              >
                👨‍👩‍👧 Ăn gia đình
              </button>
              <button
                type="button"
                onClick={() => onSearch('cơm')}
                className="px-2.5 py-1 bg-white hover:bg-[#FAF9F5] text-zinc-800 rounded border border-[#E5E3DE] hover:border-zinc-400 font-medium transition-colors"
              >
                ⚡ Phục vụ nhanh
              </button>
              <button
                type="button"
                onClick={() => onSearch('bình dân')}
                className="px-2.5 py-1 bg-white hover:bg-[#FAF9F5] text-zinc-800 rounded border border-[#E5E3DE] hover:border-zinc-400 font-medium transition-colors"
              >
                💰 Ngon bình dân
              </button>
              <button
                type="button"
                onClick={() => onSearch('đặc sản')}
                className="px-2.5 py-1 bg-white hover:bg-[#FAF9F5] text-zinc-800 rounded border border-[#E5E3DE] hover:border-zinc-400 font-medium transition-colors"
              >
                🍜 Đặc sản vùng miền
              </button>
            </div>

            {/* Trust Badges */}
            <div className="pt-3 flex flex-wrap items-center gap-6 text-xs text-[#71717A]">
              <span className="flex items-center gap-1.5 font-semibold text-zinc-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                Không cần đăng nhập
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-zinc-800">
                <CheckCircle2 className="w-4 h-4 text-[#C2410C] shrink-0" />
                Lọc sạch spam & seeding
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-zinc-800">
                <BarChart3 className="w-4 h-4 text-blue-600 shrink-0" />
                Bóc tách 5 khía cạnh cốt lõi
              </span>
            </div>

          </div>

          {/* CỘT PHẢI: INTERACTIVE LIVE RADAR SPOTLIGHT (5 CỘT) */}
          <div className="lg:col-span-5">
            {activeSample ? (
              <div className="bg-white border border-[#18181B] rounded-2xl p-6 sm:p-7 shadow-craft relative transition-all">
                
                {/* Header widget */}
                <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-[#E5E3DE] mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                      Báo cáo đọc vị trực tiếp
                    </span>
                  </div>

                  {/* Nút chuyển đổi quán mẫu */}
                  {sampleRestaurants.length > 1 && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-zinc-400 uppercase font-semibold mr-1">Quán:</span>
                      {sampleRestaurants.map((r, idx) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSelectedSampleIndex(idx)}
                          className={`w-6 h-6 rounded text-[11px] font-extrabold transition-all ${
                            selectedSampleIndex === idx
                              ? 'bg-[#C2410C] text-white shadow-craft-sm'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          }`}
                          title={r.name}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tên quán & Điểm số */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[11px] font-bold text-[#C2410C] bg-orange-50 px-2 py-0.5 rounded border border-orange-200/90">
                      {activeSample.cuisine || 'Ẩm thực'}
                    </span>
                    <h3 className="text-xl font-black text-[#18181B] tracking-tight mt-1.5">
                      {activeSample.name}
                    </h3>
                    <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      {activeSample.city} · {formatNumber(activeSample.totalReviews || 0)} đánh giá thực
                    </p>
                  </div>

                  {/* Điểm hài lòng */}
                  <div className="text-right shrink-0 bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 text-center min-w-[78px]">
                    <span className="text-2xl font-black text-emerald-900 leading-none block">
                      {activeSample.sentimentDistribution?.positive ?? 0}%
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 tracking-tight uppercase block mt-1">
                      Hài lòng
                    </span>
                  </div>
                </div>

                {/* Trích dẫn thực khách thật */}
                <div className="my-3.5 p-3 rounded-lg bg-[#FAF9F5] border-l-2 border-[#C2410C] border-y border-r border-[#E5E3DE] text-xs text-zinc-700 leading-relaxed italic relative">
                  <Quote className="w-3.5 h-3.5 text-zinc-300 absolute -top-1.5 left-2 bg-[#FAF9F5] px-0.5" />
                  "{displayQuote}"
                </div>

                {/* 5 Thước đo yếu tố cốt lõi */}
                {activeSample.aspects && activeSample.aspects.length > 0 && (
                  <div className="space-y-2 py-3 border-y border-[#E5E3DE] my-3">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                      <span>Thước đo 5 khía cạnh cốt lõi:</span>
                      <span className="text-[10px] text-zinc-400 font-mono">Tỷ lệ khen</span>
                    </div>
                    <div className="space-y-1.5">
                      {activeSample.aspects.slice(0, 4).map((aspect) => (
                        <div key={aspect.category} className="flex items-center justify-between text-xs">
                          <span className="text-zinc-700 font-semibold w-20">{aspect.category}</span>
                          <div className="flex-1 mx-3 h-2 bg-zinc-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-600 rounded-full" 
                              style={{ width: `${aspect.positivePercentage}%` }} 
                            />
                          </div>
                          <span className="font-mono font-bold text-zinc-900 text-xs w-9 text-right">
                            {aspect.positivePercentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Món nên thử & Điểm trừ */}
                <div className="space-y-1.5 text-xs mb-5">
                  {activeSample.strengths?.[0] && (
                    <div className="flex items-center gap-1.5 text-emerald-900 font-medium">
                      <ThumbsUp className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      <span className="truncate">
                        <strong>Nên gọi:</strong> {activeSample.strengths[0].title}
                      </span>
                    </div>
                  )}
                  {activeSample.attentionAreas?.[0] && (
                    <div className="flex items-center gap-1.5 text-amber-900 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span className="truncate">
                        <strong>Lưu ý:</strong> {activeSample.attentionAreas[0].commonComplaints?.[0] || 'Giờ cao điểm đợi món hơi lâu'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Nút xem báo cáo đầy đủ */}
                <button
                  type="button"
                  onClick={() => onSelectRestaurant(activeSample.id)}
                  className="w-full py-3 bg-[#18181B] hover:bg-[#C2410C] text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-craft-sm"
                >
                  <span>Xem báo cáo đầy đủ quán này</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

              </div>
            ) : (
              <div className="bg-white border border-[#E5E3DE] rounded-2xl p-8 text-center">
                <p className="text-sm font-semibold text-zinc-600">Đang chuẩn bị dữ liệu quán ăn...</p>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* 2. ASYMMETRIC BENTO GRID: BẢNG XẾP HẠNG & TIÊU ĐIỂM ẨM THỰC */}
      {restaurants && restaurants.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#C2410C] mb-1">
                <Trophy className="w-4 h-4 text-[#C2410C]" />
                <span>Tiêu điểm tuần</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#18181B] tracking-tight">
                Bảng xếp hạng & Dấu ấn nổi bật
              </h2>
            </div>
            <button
              onClick={onNavigateExplore}
              className="text-xs font-bold text-[#18181B] hover:text-[#C2410C] flex items-center gap-1 self-start sm:self-auto group"
            >
              <span>Xem toàn bộ xếp hạng</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Bento Grid Bất Đối Xứng */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Card Lớn (Hero Bento): Quán Xuất Sắc Nhất Tuần (7 Cột) */}
            {heroFeatured && (
              <div 
                onClick={() => onSelectRestaurant(heroFeatured.id)}
                className="lg:col-span-7 bg-white border border-[#E5E3DE] hover:border-[#18181B] rounded-2xl p-6 sm:p-8 flex flex-col justify-between hover:shadow-craft transition-all cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
                      <Flame className="w-3.5 h-3.5 text-amber-600" />
                      Quán được đánh giá cao nhất tuần
                    </span>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                      {heroFeatured.sentimentDistribution?.positive ?? 0}% Hài lòng
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-[#18181B] group-hover:text-[#C2410C] transition-colors tracking-tight mb-2">
                    {heroFeatured.name}
                  </h3>

                  <p className="text-xs sm:text-sm text-zinc-500 flex items-center gap-2 mb-4">
                    <MapPin className="w-4 h-4 text-zinc-400" />
                    {heroFeatured.address} · {heroFeatured.cuisine}
                  </p>

                  <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed mb-6 bg-[#FAF9F5] p-4 rounded-xl border border-[#E5E3DE] italic">
                    "{heroFeatured.sentimentSummarySentence || heroFeatured.reviews?.[0]?.text || 'Đánh giá chân thực từ khách hàng.'}"
                  </p>

                  {/* 4 Chỉ số khía cạnh hàng đầu */}
                  {heroFeatured.aspects && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      {heroFeatured.aspects.slice(0, 4).map(asp => (
                        <div key={asp.category} className="bg-[#FAF9F5] border border-[#E5E3DE] p-3 rounded-lg text-center">
                          <span className="block text-[11px] font-semibold text-zinc-500 uppercase">{asp.category}</span>
                          <span className="text-base font-black text-[#18181B]">{asp.positivePercentage}%</span>
                          <span className="block text-[10px] text-emerald-700 font-medium">tích cực</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#E5E3DE]">
                  <span className="text-xs text-zinc-500 font-medium">
                    Tổng hợp từ {formatNumber(heroFeatured.totalReviews || 0)} đánh giá thực tế
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#18181B] group-hover:text-[#C2410C]">
                    Khám phá toàn bộ báo cáo →
                  </span>
                </div>
              </div>
            )}

            {/* Cột Vệ Tinh (5 Cột): Gồm 2 card xếp tầng */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Card Vệ Tinh 1: Top Vị Ngon Đậm Đà */}
              {topFoodRestaurant && (
                <div
                  onClick={() => onSelectRestaurant(topFoodRestaurant.id)}
                  className="bg-white border border-[#E5E3DE] hover:border-[#18181B] rounded-2xl p-6 flex flex-col justify-between hover:shadow-craft transition-all cursor-pointer group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        🏆 Đỉnh cao vị giác
                      </span>
                      <span className="text-xs font-mono font-bold text-zinc-600">
                        {topFoodRestaurant.aspects?.find(a => a.category === 'Món ăn')?.positivePercentage ?? 0}% Khen món
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-[#18181B] group-hover:text-[#C2410C] transition-colors line-clamp-1 mb-1">
                      {topFoodRestaurant.name}
                    </h4>

                    <p className="text-xs text-zinc-500 mb-3">
                      {topFoodRestaurant.cuisine} · {topFoodRestaurant.city}
                    </p>

                    {topFoodRestaurant.strengths?.[0] && (
                      <div className="text-xs text-emerald-900 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100 mb-2">
                        <strong>Món khách khen nhiều nhất:</strong> {topFoodRestaurant.strengths[0].title}
                      </div>
                    )}
                  </div>

                  <div className="text-xs font-bold text-zinc-800 group-hover:text-[#C2410C] flex items-center gap-1 pt-2">
                    <span>Xem phân tích món ăn →</span>
                  </div>
                </div>
              )}

              {/* Card Vệ Tinh 2: Minh Bạch Dữ Liệu & Lọc Spam */}
              <div className="bg-[#FAF9F5] border border-[#E5E3DE] rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                      Cơ chế lọc review rác độc lập
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-[#18181B] mb-2">
                    Dữ liệu sạch, không thiên vị
                  </h4>

                  <p className="text-xs text-zinc-600 leading-relaxed mb-4">
                    Hệ thống tự động loại bỏ các tài khoản bot cày xu, nội dung lặp lại tên quán vô nghĩa hoặc seeding nhận thưởng ảo trước khi phân tích cảm xúc.
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-[#E5E3DE]">
                      <span className="block font-black text-sm text-[#18181B]">100%</span>
                      <span className="text-[10px] text-zinc-500">Khách thật</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-[#E5E3DE]">
                      <span className="block font-black text-sm text-emerald-700">0%</span>
                      <span className="text-[10px] text-zinc-500">Quảng cáo tài trợ</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onNavigateHowItWorks}
                  className="mt-4 text-xs font-bold text-[#C2410C] hover:underline flex items-center gap-1"
                >
                  <span>Tìm hiểu quy trình làm sạch dữ liệu →</span>
                </button>
              </div>

            </div>

          </div>
        </section>
      )}

      {/* 3. HEAD-TO-HEAD COMPARISON: SO SÁNH ĐỐI ĐẦU 2 QUÁN ĂN */}
      {restaurantA && restaurantB && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-[#18181B] rounded-2xl p-6 sm:p-8 shadow-craft">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E5E3DE]">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#C2410C] mb-1">
                  <Scale className="w-4 h-4 text-[#C2410C]" />
                  <span>Công cụ đối chiếu trực quan</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-[#18181B] tracking-tight">
                  So sánh đối đầu: Chọn quán nào?
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Đặt 2 quán ăn cạnh nhau trên cùng một trục 5 tiêu chí để tìm ra lựa chọn phù hợp nhất cho bạn.
                </p>
              </div>

              {/* Bộ chọn 2 quán ăn */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-500">Quán A:</span>
                  <select
                    value={compareIdA}
                    onChange={(e) => setCompareIdA(e.target.value)}
                    className="bg-[#FAF9F5] border border-[#E5E3DE] rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-800 focus:outline-none focus:border-zinc-900"
                  >
                    {restaurants.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.city})</option>
                    ))}
                  </select>
                </div>

                <span className="text-xs font-bold text-[#C2410C]">VS</span>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-500">Quán B:</span>
                  <select
                    value={compareIdB}
                    onChange={(e) => setCompareIdB(e.target.value)}
                    className="bg-[#FAF9F5] border border-[#E5E3DE] rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-800 focus:outline-none focus:border-zinc-900"
                  >
                    {restaurants.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.city})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Bảng so sánh 5 khía cạnh trực quan */}
            <div className="pt-6 space-y-5">
              
              {/* Header 2 quán */}
              <div className="grid grid-cols-12 gap-4 items-center font-bold text-xs pb-2 border-b border-[#E5E3DE]">
                <div className="col-span-4 text-left">
                  <span className="text-sm font-black text-[#18181B] block">{restaurantA.name}</span>
                  <span className="text-[11px] text-zinc-500 font-normal">{restaurantA.cuisine} · {restaurantA.sentimentDistribution?.positive ?? 0}% hài lòng</span>
                </div>
                <div className="col-span-4 text-center text-zinc-400 font-mono uppercase text-[11px]">
                  5 Tiêu chí bóc tách
                </div>
                <div className="col-span-4 text-right">
                  <span className="text-sm font-black text-[#18181B] block">{restaurantB.name}</span>
                  <span className="text-[11px] text-zinc-500 font-normal">{restaurantB.cuisine} · {restaurantB.sentimentDistribution?.positive ?? 0}% hài lòng</span>
                </div>
              </div>

              {/* 5 Hàng đối chiếu */}
              {aspectCategories.map((aspect) => {
                const scoreA = restaurantA.aspects?.find(a => a.category === aspect)?.positivePercentage || 0;
                const scoreB = restaurantB.aspects?.find(a => a.category === aspect)?.positivePercentage || 0;
                const isAWinner = scoreA > scoreB;
                const isBWinner = scoreB > scoreA;

                return (
                  <div key={aspect} className="grid grid-cols-12 gap-4 items-center text-xs">
                    {/* Quán A Score & Bar */}
                    <div className="col-span-4 flex items-center justify-end gap-2.5">
                      <span className={`font-mono font-bold ${isAWinner ? 'text-emerald-700 text-sm' : 'text-zinc-600'}`}>
                        {scoreA}%
                      </span>
                      <div className="w-24 sm:w-36 h-2.5 bg-zinc-100 rounded-full overflow-hidden flex justify-end">
                        <div 
                          className={`h-full rounded-full ${isAWinner ? 'bg-emerald-600' : 'bg-zinc-400'}`} 
                          style={{ width: `${scoreA}%` }} 
                        />
                      </div>
                    </div>

                    {/* Tên khía cạnh ở giữa */}
                    <div className="col-span-4 text-center">
                      <span className="px-2.5 py-1 rounded bg-[#FAF9F5] border border-[#E5E3DE] font-bold text-zinc-800 text-[11px]">
                        {aspect}
                      </span>
                    </div>

                    {/* Quán B Bar & Score */}
                    <div className="col-span-4 flex items-center justify-start gap-2.5">
                      <div className="w-24 sm:w-36 h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${isBWinner ? 'bg-emerald-600' : 'bg-zinc-400'}`} 
                          style={{ width: `${scoreB}%` }} 
                        />
                      </div>
                      <span className={`font-mono font-bold ${isBWinner ? 'text-emerald-700 text-sm' : 'text-zinc-600'}`}>
                        {scoreB}%
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Nút xem chi tiết từng quán */}
              <div className="grid grid-cols-12 gap-4 pt-4 border-t border-[#E5E3DE]">
                <div className="col-span-6 text-left">
                  <button
                    type="button"
                    onClick={() => onSelectRestaurant(restaurantA.id)}
                    className="px-3.5 py-2 bg-white hover:bg-zinc-100 border border-zinc-900 rounded-lg text-xs font-bold text-zinc-900 shadow-craft-sm"
                  >
                    Xem báo cáo {restaurantA.name} →
                  </button>
                </div>
                <div className="col-span-6 text-right">
                  <button
                    type="button"
                    onClick={() => onSelectRestaurant(restaurantB.id)}
                    className="px-3.5 py-2 bg-white hover:bg-zinc-100 border border-zinc-900 rounded-lg text-xs font-bold text-zinc-900 shadow-craft-sm"
                  >
                    Xem báo cáo {restaurantB.name} →
                  </button>
                </div>
              </div>

            </div>

          </div>
        </section>
      )}

      {/* 4. DUAL PERSPECTIVE SWITCHER: BỘ CHUYỂN ĐỔI 2 GÓC NHÌN */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-[#18181B] tracking-tight mb-2">
            Được xây dựng cho cả 2 góc nhìn
          </h2>
          <p className="text-sm text-[#71717A]">
            Dù bạn là người đi ăn hay người vận hành quán, thông tin đều được bóc tách phục vụ đúng mục đích của bạn.
          </p>

          {/* Tab Selector */}
          <div className="inline-flex p-1 bg-[#FAF9F5] rounded-xl mt-5 border border-[#E5E3DE]">
            <button
              type="button"
              onClick={() => setPerspectiveTab('diner')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                perspectiveTab === 'diner'
                  ? 'bg-[#18181B] text-white shadow-craft-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>Dành cho Thực khách</span>
            </button>
            <button
              type="button"
              onClick={() => setPerspectiveTab('owner')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                perspectiveTab === 'owner'
                  ? 'bg-[#18181B] text-white shadow-craft-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Dành cho Chủ quán & Quản lý</span>
            </button>
          </div>
        </div>

        {/* Nội dung Tab Thực khách */}
        {perspectiveTab === 'diner' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
            <div className="bg-white border border-[#E5E3DE] rounded-xl p-6 sm:p-7 space-y-3 hover:shadow-craft transition-all">
              <div className="w-10 h-10 rounded-lg bg-orange-50 text-[#C2410C] flex items-center justify-center font-bold text-lg border border-orange-200">
                🍜
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#18181B]">
                Biết trước món ngon & món dở
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Xem ngay món nào là signature được khách khen nức nở, và món nào hay bị chê nguội, mặn hoặc không đúng kỳ vọng để tránh gọi nhầm.
              </p>
            </div>

            <div className="bg-white border border-[#E5E3DE] rounded-xl p-6 sm:p-7 space-y-3 hover:shadow-craft transition-all">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-lg border border-amber-200">
                ⚠️
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#18181B]">
                Nhìn thấu điểm trừ thực tế
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Biết trước quán có chỗ đỗ ô tô không, giờ cao điểm phải đợi bàn bao lâu và thái độ phục vụ của nhân viên ra sao trước khi bạn bước chân đến.
              </p>
            </div>

            <div className="bg-white border border-[#E5E3DE] rounded-xl p-6 sm:p-7 space-y-3 hover:shadow-craft transition-all">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-200">
                💰
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#18181B]">
                Mức giá & khẩu phần thực tế
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Đánh giá xem giá tiền có xứng đáng với đĩa đồ ăn mang ra hay không dựa trên nhận xét của hàng trăm người đã trả tiền trước bạn.
              </p>
            </div>
          </div>
        ) : (
          /* Nội dung Tab Chủ quán */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
            <div className="bg-white border border-[#E5E3DE] rounded-xl p-6 sm:p-7 space-y-3 hover:shadow-craft transition-all">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg border border-blue-200">
                👥
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#18181B]">
                Đo lường thái độ nhân viên
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Nắm bắt ngay tỷ lệ khiếu nại về tốc độ lên món, thái độ nhân viên order hay bảo vệ dắt xe mà không cần có mặt giám sát 24/7.
              </p>
            </div>

            <div className="bg-white border border-[#E5E3DE] rounded-xl p-6 sm:p-7 space-y-3 hover:shadow-craft transition-all">
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center font-bold text-lg border border-red-200">
                🎯
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#18181B]">
                Bắt đúng bệnh vận hành
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Hệ thống tự động gom các sự cố lặp lại thành cụm vấn đề (bàn dơ, thiếu điều hòa, món ra chậm) để bạn khắc phục đúng nút thắt.
              </p>
            </div>

            <div className="bg-white border border-[#E5E3DE] rounded-xl p-6 sm:p-7 space-y-3 hover:shadow-craft transition-all">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-lg border border-purple-200">
                📈
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#18181B]">
                Theo dõi cải thiện qua thời gian
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Sau khi điều chỉnh công thức món ăn hoặc training lại nhân sự, theo dõi biểu đồ tỷ lệ hài lòng có tăng trưởng theo tháng hay không.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 5. BỘ SƯU TẬP QUÁN ĂN CHỌN LỌC (EDITORIAL CURATION GRID) */}
      {restaurants && restaurants.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#C2410C] mb-1">
                Bộ sưu tập chọn lọc
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#18181B] tracking-tight">
                Quán ăn nổi bật đã được đánh giá
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Khám phá bức tranh đánh giá chi tiết theo từng quán ăn tiêu biểu
              </p>
            </div>
            <button
              onClick={onNavigateExplore}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#18181B] hover:text-[#C2410C] transition-colors group"
            >
              <span>Xem toàn bộ quán ăn ({restaurants.length})</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Lưới thẻ quán ăn chuẩn Editorial */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.slice(0, 6).map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onSelect={onSelectRestaurant}
              />
            ))}
          </div>
        </section>
      )}

      {/* 6. QUY TRÌNH 4 BƯỚC MINH BẠCH (METHODOLOGY BANNER) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#18181B] text-white rounded-2xl p-8 sm:p-10 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-craft">
          <div className="space-y-3 text-center lg:text-left">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
              Minh bạch & Độc lập
            </span>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              Restaurant Intelligence đọc vị đánh giá như thế nào?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
              Từ hàng ngàn bài nhận xét rời rạc của thực khách trên Foody, hệ thống tự động làm sạch bình luận rác và bot cày xu, bóc tách tỷ lệ khen - chê theo 5 khía cạnh và đưa ra bản tóm tắt trung thực chỉ trong vài giây.
            </p>
          </div>

          <button
            onClick={onNavigateHowItWorks}
            className="px-6 py-3.5 bg-white hover:bg-zinc-100 text-[#18181B] rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all shrink-0 shadow-craft-sm"
          >
            Xem cách thức hoạt động →
          </button>
        </div>
      </section>

    </div>
  );
};
