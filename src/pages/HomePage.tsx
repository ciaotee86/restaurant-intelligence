import React, { useState } from 'react';
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
  Star, 
  Quote, 
  ThumbsUp, 
  AlertTriangle, 
  Trophy, 
  Clock, 
  Users, 
  TrendingUp,
  CheckCircle2,
  MapPin,
  ChevronRight
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
  restaurants,
  onSelectRestaurant,
  onSearch,
  onNavigateExplore,
  onNavigateHowItWorks
}) => {
  // Trạng thái quán mẫu được chọn trong Live Scorecard Widget ở Hero
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  
  // Trạng thái chuyển đổi góc nhìn Thực khách vs Chủ quán
  const [perspectiveTab, setPerspectiveTab] = useState<'diner' | 'owner'>('diner');

  // Lấy danh sách 3 quán mẫu hiển thị ở Hero
  const sampleRestaurants = restaurants.slice(0, 3);
  const activeSample = sampleRestaurants[selectedSampleIndex] || restaurants[0];

  // Bảng xếp hạng: Lọc top 3 quán có tỷ lệ khách hài lòng cao nhất
  const leaderboard = [...restaurants]
    .sort((a, b) => b.sentimentDistribution.positive - a.sentimentDistribution.positive)
    .slice(0, 3);

  // Mẫu trích dẫn của quán đang chọn
  const activeQuote = activeSample?.reviews?.[0]?.text || activeSample?.sentimentSummarySentence || 'Nhận xét chân thực từ khách hàng.';
  const displayQuote = activeQuote.length > 120 ? `${activeQuote.slice(0, 117)}...` : activeQuote;

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      
      {/* 1. HERO SECTION: BỐ CỤC BẤT ĐỐI XỨNG (SPLIT HERO + LIVE SCORECARD SPOTLIGHT) */}
      <section className="pt-10 sm:pt-16 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* CỘT TRÁI: THÔNG ĐIỆP CHÍNH & TÌM KIẾM NHANH (7 CỘT) */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Category Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50/90 border border-orange-200/90 text-xs font-semibold text-[#C2410C]">
              <span className="w-2 h-2 rounded-full bg-[#C2410C] animate-pulse" />
              <span>Bản đồ đọc vị ẩm thực từ thực khách thực tế</span>
            </div>

            {/* Tiêu đề chính thức (Lựa chọn 3) */}
            <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-black text-[#18181B] tracking-tight leading-[1.15]">
              Đọc vị mọi <br className="hidden sm:inline" />
              đánh giá quán ăn.
            </h1>

            {/* Dòng mô tả trực diện giá trị */}
            <p className="text-base sm:text-lg text-[#52525B] max-w-xl leading-relaxed">
              Thay vì mất 30 phút đọc hàng trăm bình luận — xem ngay bức tranh toàn cảnh về <span className="font-semibold text-[#18181B]">Món ăn</span>, <span className="font-semibold text-[#18181B]">Giá cả</span>, <span className="font-semibold text-[#18181B]">Thái độ phục vụ</span> và <span className="font-semibold text-[#18181B]">Không gian</span>.
            </p>

            {/* Khung tìm kiếm chính */}
            <div className="pt-1">
              <SearchBar
                size="large"
                onSearch={onSearch}
                onSelectRestaurant={onSelectRestaurant}
                placeholder="Tìm quán ăn hoặc món ngon (vd: Pizza 4P's, Phở Thìn, Bánh tráng cuốn)..."
              />
            </div>

            {/* Gợi ý nhu cầu thực tế (Quick Demand Chips) */}
            <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
              <span className="text-zinc-500 font-medium">Nhu cầu phổ biến:</span>
              <button
                type="button"
                onClick={() => onSearch('gia đình')}
                className="px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-700 rounded-md border border-zinc-200 transition-colors"
              >
                👨‍👩‍👧 Ăn gia đình
              </button>
              <button
                type="button"
                onClick={() => onSearch('cơm')}
                className="px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-700 rounded-md border border-zinc-200 transition-colors"
              >
                ⚡ Phục vụ nhanh
              </button>
              <button
                type="button"
                onClick={() => onSearch('bình dân')}
                className="px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-700 rounded-md border border-zinc-200 transition-colors"
              >
                💰 Ngon bình dân
              </button>
              <button
                type="button"
                onClick={() => onSearch('đặc sản')}
                className="px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-700 rounded-md border border-zinc-200 transition-colors"
              >
                🍜 Đặc sản vùng miền
              </button>
            </div>

            {/* Trust Badges */}
            <div className="pt-3 flex flex-wrap items-center gap-6 text-xs text-[#71717A]">
              <span className="flex items-center gap-1.5 font-medium text-zinc-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                Tra cứu mở, không cần đăng nhập
              </span>
              <span className="flex items-center gap-1.5 font-medium text-zinc-700">
                <CheckCircle2 className="w-4 h-4 text-[#C2410C] shrink-0" />
                Dữ liệu thực khách thật
              </span>
              <span className="flex items-center gap-1.5 font-medium text-zinc-700">
                <BarChart3 className="w-4 h-4 text-blue-600 shrink-0" />
                Bóc tách 5 khía cạnh cốt lõi
              </span>
            </div>

          </div>

          {/* CỘT PHẢI: INTERACTIVE LIVE SCORECARD SPOTLIGHT (5 CỘT) */}
          <div className="lg:col-span-5">
            {activeSample ? (
              <div className="bg-white border-2 border-zinc-900 rounded-2xl p-6 sm:p-7 shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] relative transition-all">
                
                {/* Header widget */}
                <div className="flex items-center justify-between gap-2 pb-4 border-b border-zinc-100 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                      Hồ sơ đọc vị mẫu trực tiếp
                    </span>
                  </div>

                  {/* Nút chuyển đổi quán mẫu */}
                  <div className="flex items-center gap-1">
                    {sampleRestaurants.map((r, idx) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedSampleIndex(idx)}
                        className={`w-6 h-6 rounded text-[11px] font-bold transition-all ${
                          selectedSampleIndex === idx
                            ? 'bg-[#C2410C] text-white shadow-2xs'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        }`}
                        title={r.name}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tên quán & Điểm số */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[11px] font-semibold text-[#C2410C] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                      {activeSample.cuisine}
                    </span>
                    <h3 className="text-xl font-bold text-[#18181B] tracking-tight mt-1.5">
                      {activeSample.name}
                    </h3>
                    <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-zinc-400" />
                      {activeSample.city} · {formatNumber(activeSample.totalReviews)} đánh giá thực
                    </p>
                  </div>

                  {/* Vòng tròn điểm hài lòng */}
                  <div className="text-right shrink-0 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center min-w-[76px]">
                    <span className="text-2xl font-black text-emerald-800 leading-none block">
                      {activeSample.sentimentDistribution.positive}%
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 tracking-tight uppercase block mt-0.5">
                      Hài lòng
                    </span>
                  </div>
                </div>

                {/* Trích dẫn thực khách thật */}
                <div className="my-3.5 p-3 rounded-lg bg-[#FBFBFA] border border-zinc-200/80 text-xs text-zinc-700 leading-relaxed italic relative">
                  <Quote className="w-3.5 h-3.5 text-zinc-300 absolute -top-1.5 left-2 bg-[#FBFBFA] px-0.5" />
                  "{displayQuote}"
                </div>

                {/* 5 Thước đo yếu tố cốt lõi */}
                <div className="space-y-2 py-3 border-y border-zinc-100 my-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Bóc tách 5 yếu tố đo lường:
                  </div>
                  <div className="space-y-1.5">
                    {activeSample.aspects.slice(0, 4).map((aspect) => (
                      <div key={aspect.category} className="flex items-center justify-between text-xs">
                        <span className="text-zinc-600 font-medium w-20">{aspect.category}</span>
                        <div className="flex-1 mx-3 h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-600 rounded-full" 
                            style={{ width: `${aspect.positivePercentage}%` }} 
                          />
                        </div>
                        <span className="font-bold text-zinc-800 text-[11px] w-9 text-right">
                          {aspect.positivePercentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Món nên thử & Điểm trừ */}
                <div className="space-y-1.5 text-xs mb-5">
                  {activeSample.strengths?.[0] && (
                    <div className="flex items-center gap-1.5 text-emerald-800">
                      <ThumbsUp className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      <span className="truncate">
                        <strong>Nên gọi:</strong> {activeSample.strengths[0].title}
                      </span>
                    </div>
                  )}
                  {activeSample.attentionAreas?.[0] && (
                    <div className="flex items-center gap-1.5 text-amber-800">
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
                  className="w-full py-3 bg-[#18181B] hover:bg-[#C2410C] text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Xem toàn bộ báo cáo quán này</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

              </div>
            ) : null}
          </div>

        </div>
      </section>

      {/* 2. BẢNG XẾP HẠNG THỰC KHÁCH HÀI LÒNG NHẤT (LEADERBOARD) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#FBFBFA] border border-zinc-200/90 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Bảng xếp hạng thực khách</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#18181B] tracking-tight">
                Top quán ăn có tỷ lệ hài lòng cao nhất
              </h2>
            </div>
            <button
              onClick={onNavigateExplore}
              className="text-xs font-semibold text-[#18181B] hover:text-[#C2410C] flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Xem toàn bộ xếp hạng</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {leaderboard.map((item, index) => {
              const medals = ['🥇 Top 1', '🥈 Top 2', '🥉 Top 3'];
              const medalColors = [
                'bg-amber-100 text-amber-900 border-amber-300',
                'bg-slate-100 text-slate-800 border-slate-300',
                'bg-orange-100 text-orange-900 border-orange-300'
              ];

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectRestaurant(item.id)}
                  className="bg-white border border-zinc-200 rounded-xl p-5 hover:border-zinc-400 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${medalColors[index]}`}>
                        {medals[index]}
                      </span>
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {item.sentimentDistribution.positive}% hài lòng
                      </span>
                    </div>

                    <h4 className="font-bold text-base text-[#18181B] group-hover:text-[#C2410C] transition-colors line-clamp-1 mb-1">
                      {item.name}
                    </h4>

                    <p className="text-xs text-zinc-500 flex items-center gap-1 mb-3">
                      <MapPin className="w-3 h-3 text-zinc-400" />
                      {item.city} · {item.cuisine}
                    </p>

                    {item.strengths?.[0] && (
                      <div className="text-xs text-emerald-800 bg-emerald-50/60 p-2 rounded border border-emerald-100 line-clamp-1 mb-3">
                        ✓ {item.strengths[0].title}
                      </div>
                    )}
                  </div>

                  <span className="text-xs font-semibold text-zinc-800 group-hover:text-[#C2410C] flex items-center gap-1 pt-2 border-t border-zinc-100">
                    Xem báo cáo quán này →
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. DUAL PERSPECTIVE SWITCHER: BỘ CHUYỂN ĐỔI 2 GÓC NHÌN */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18181B] tracking-tight mb-2">
            Được xây dựng cho cả 2 nhu cầu
          </h2>
          <p className="text-sm text-[#71717A]">
            Dù bạn là người đi ăn hay người vận hành quán, thông tin đều được bóc tách phục vụ đúng mục đích của bạn.
          </p>

          {/* Tab Selector */}
          <div className="inline-flex p-1 bg-zinc-100 rounded-xl mt-5 border border-zinc-200">
            <button
              type="button"
              onClick={() => setPerspectiveTab('diner')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                perspectiveTab === 'diner'
                  ? 'bg-white text-[#C2410C] shadow-xs'
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
                  ? 'bg-white text-[#18181B] shadow-xs'
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
            <div className="bg-white border border-[#E5E5E0] rounded-xl p-6 sm:p-7 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 text-[#C2410C] flex items-center justify-center font-bold text-lg border border-orange-100">
                🍜
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#18181B]">
                Biết trước món ngon & món dở
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Xem ngay món nào là signature được khách khen nức nở, và món nào hay bị chê nguội, mặn hoặc không đúng kỳ vọng để tránh gọi nhầm.
              </p>
            </div>

            <div className="bg-white border border-[#E5E5E0] rounded-xl p-6 sm:p-7 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-lg border border-amber-100">
                ⚠️
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#18181B]">
                Nhìn thấu điểm trừ thực tế
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Biết trước quán có chỗ đỗ ô tô không, giờ cao điểm phải đợi bàn bao lâu và thái độ phục vụ của nhân viên ra sao trước khi bạn bước chân đến.
              </p>
            </div>

            <div className="bg-white border border-[#E5E5E0] rounded-xl p-6 sm:p-7 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-100">
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
            <div className="bg-white border border-[#E5E5E0] rounded-xl p-6 sm:p-7 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg border border-blue-100">
                👥
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#18181B]">
                Đo lường thái độ nhân viên
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Nắm bắt ngay tỷ lệ khiếu nại về tốc độ lên món, thái độ nhân viên order hay bảo vệ dắt xe mà không cần có mặt giám sát 24/7.
              </p>
            </div>

            <div className="bg-white border border-[#E5E5E0] rounded-xl p-6 sm:p-7 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center font-bold text-lg border border-red-100">
                🎯
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#18181B]">
                Bắt đúng bệnh vận hành
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Hệ thống tự động gom các sự cố lặp lại thành cụm vấn đề (bàn dơ, thiếu điều hòa, món ra chậm) để bạn khắc phục đúng nút thắt.
              </p>
            </div>

            <div className="bg-white border border-[#E5E5E0] rounded-xl p-6 sm:p-7 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-lg border border-purple-100">
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

      {/* 4. BỘ SƯU TẬP QUÁN ĂN NỔI BẬT (EDITORIAL CURATION GRID) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#C2410C] mb-1">
              Bộ sưu tập chọn lọc
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#18181B] tracking-tight">
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

      {/* 5. QUY TRÌNH 4 BƯỚC MINH BẠCH (METHODOLOGY BANNER) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#18181B] text-white rounded-2xl p-8 sm:p-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center lg:text-left">
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
              Minh bạch & Độc lập
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Restaurant Intelligence đọc vị đánh giá như thế nào?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
              Từ hàng ngàn bài nhận xét rời rạc của thực khách trên Foody, hệ thống tự động làm sạch bình luận rác, bóc tách tỷ lệ khen - chê theo 5 khía cạnh và đưa ra bản tóm tắt trung thực chỉ trong vài giây.
            </p>
          </div>

          <button
            onClick={onNavigateHowItWorks}
            className="px-6 py-3.5 bg-white hover:bg-zinc-100 text-[#18181B] rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-colors shrink-0 shadow-sm"
          >
            Xem cách thức hoạt động →
          </button>
        </div>
      </section>

    </div>
  );
};
