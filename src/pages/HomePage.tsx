import React from 'react';
import { SearchBar } from '../components/common/SearchBar';
import { RestaurantCard } from '../components/restaurant-list/RestaurantCard';
import type { Restaurant } from '../types/restaurant';
import { BarChart3, MessageSquareText, AlertCircle, ArrowRight, ShieldCheck, Utensils, Store } from 'lucide-react';

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
  return (
    <div className="space-y-14 sm:space-y-20 pb-16">
      
      {/* HERO SECTION */}
      <section className="pt-12 sm:pt-16 pb-6 sm:pb-10 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        
        {/* Category Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-50/80 border border-orange-200/80 text-xs font-semibold text-[#C2410C] mb-6">
          <span className="w-2 h-2 rounded-full bg-[#C2410C] animate-pulse" />
          <span>Báo cáo đánh giá ẩm thực từ thực khách thực tế</span>
        </div>

        {/* Tiêu đề chính thức (Option 3) */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#18181B] tracking-tight leading-[1.18] mb-5">
          Đọc vị mọi đánh giá quán ăn.
        </h1>

        {/* Dòng mô tả trực diện giá trị */}
        <p className="text-base sm:text-lg lg:text-xl text-[#52525B] max-w-2xl mx-auto leading-relaxed mb-8">
          Thay vì mất 30 phút đọc hàng trăm bình luận — xem ngay bức tranh toàn cảnh về <span className="font-semibold text-[#18181B]">Món ăn</span>, <span className="font-semibold text-[#18181B]">Giá cả</span>, <span className="font-semibold text-[#18181B]">Thái độ phục vụ</span> và <span className="font-semibold text-[#18181B]">Không gian</span>.
        </p>

        {/* Khung tìm kiếm chính */}
        <div className="max-w-2xl mx-auto">
          <SearchBar
            size="large"
            onSearch={onSearch}
            onSelectRestaurant={onSelectRestaurant}
            placeholder="Tìm quán ăn hoặc món ngon (vd: Pizza 4P's, Phở Thìn, Bánh tráng cuốn thịt heo)..."
          />
        </div>

        {/* Trust Badges */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-5 text-xs text-[#71717A]">
          <span className="flex items-center gap-1.5 font-medium text-zinc-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Tra cứu tức thì, không cần đăng nhập
          </span>
          <span className="text-zinc-300">•</span>
          <span>Tổng hợp hàng ngàn nhận xét thực tế</span>
          <span className="text-zinc-300">•</span>
          <span>Bóc tách 5 yếu tố quan trọng nhất</span>
        </div>
      </section>

      {/* DUAL-AUDIENCE SECTION: Giá trị cho Thực khách & Chủ quán */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Cột 1: Dành cho Thực khách */}
          <div className="bg-white border border-[#E4E4E7] rounded-xl p-6 sm:p-8 hover:border-orange-300 transition-all shadow-2xs flex flex-col justify-between group">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-orange-50 text-[#C2410C] flex items-center justify-center border border-orange-100">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#C2410C] block">
                    Dành cho bạn đi ăn
                  </span>
                  <h3 className="text-lg font-bold text-[#18181B]">
                    Dành cho Thực khách
                  </h3>
                </div>
              </div>
              <p className="text-sm text-[#52525B] leading-relaxed mb-5">
                Xem nhanh món nào được khen nhiều nhất, món nào bị phàn nàn và những điều quán không nói — để bạn chọn đúng quán, tránh thất vọng khi tới nơi.
              </p>
            </div>
            <div className="pt-4 border-t border-zinc-100 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-md bg-zinc-100 font-medium text-zinc-700">🍜 Món ăn nên thử</span>
              <span className="px-2.5 py-1 rounded-md bg-zinc-100 font-medium text-zinc-700">⚠️ Điểm trừ cần lưu ý</span>
              <span className="px-2.5 py-1 rounded-md bg-zinc-100 font-medium text-zinc-700">💰 Mức giá thực tế</span>
            </div>
          </div>

          {/* Cột 2: Dành cho Chủ quán / Quản lý */}
          <div className="bg-white border border-[#E4E4E7] rounded-xl p-6 sm:p-8 hover:border-zinc-400 transition-all shadow-2xs flex flex-col justify-between group">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 text-[#18181B] flex items-center justify-center border border-zinc-200">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 block">
                    Dành cho doanh nghiệp F&B
                  </span>
                  <h3 className="text-lg font-bold text-[#18181B]">
                    Dành cho Chủ quán & Quản lý
                  </h3>
                </div>
              </div>
              <p className="text-sm text-[#52525B] leading-relaxed mb-5">
                Nắm bắt mọi phản hồi chân thực nhất của khách hàng mà không cần đọc từng bài viết. Biết ngay thái độ nhân viên ra sao, món nào cần cải thiện công thức.
              </p>
            </div>
            <div className="pt-4 border-t border-zinc-100 flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-md bg-zinc-100 font-medium text-zinc-700">📈 Tỷ lệ hài lòng</span>
              <span className="px-2.5 py-1 rounded-md bg-zinc-100 font-medium text-zinc-700">👥 Đánh giá phục vụ</span>
              <span className="px-2.5 py-1 rounded-md bg-zinc-100 font-medium text-zinc-700">🎯 Điểm cần cải thiện</span>
            </div>
          </div>

        </div>
      </section>

      {/* SUPPORTING SECTION: 3 Trụ cột thông tin */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#18181B] tracking-tight mb-3">
            Mọi thứ bạn cần biết chỉ trong 1 trang tóm tắt
          </h2>
          <p className="text-sm text-[#71717A]">
            Tổng hợp toàn diện ý kiến của hàng trăm thực khách thành các góc nhìn rõ ràng, khách quan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Khối 1: Tỷ lệ hài lòng */}
          <div className="bg-white border border-[#E4E4E7] rounded-xl p-6 sm:p-7 flex flex-col justify-between hover:border-zinc-300 transition-colors shadow-2xs">
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 border border-emerald-100">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#18181B] tracking-tight mb-2">
                Tỷ lệ hài lòng thực tế
              </h3>
              <p className="text-xs sm:text-sm text-[#52525B] leading-relaxed">
                Xem ngay tỷ lệ thực khách hài lòng, trung lập hay thất vọng và xu hướng biến động chất lượng của quán qua các tháng gần nhất.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-emerald-700 font-medium">
              <span>Mức độ đón nhận</span>
              <span>Được đo lường minh bạch</span>
            </div>
          </div>

          {/* Khối 2: 5 Yếu tố cốt lõi */}
          <div className="bg-white border border-[#E4E4E7] rounded-xl p-6 sm:p-7 flex flex-col justify-between hover:border-zinc-300 transition-colors shadow-2xs">
            <div>
              <div className="w-10 h-10 rounded-lg bg-orange-50 text-[#C2410C] flex items-center justify-center mb-4 border border-orange-100">
                <MessageSquareText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#18181B] tracking-tight mb-2">
                Bóc tách 5 yếu tố trải nghiệm
              </h3>
              <p className="text-xs sm:text-sm text-[#52525B] leading-relaxed">
                Biết chính xác khách hàng đang khen hay chê điều gì: Hương vị món ăn, Giá cả, Tốc độ & thái độ phục vụ, Không gian quán và Chỗ đỗ xe.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-[#C2410C] font-medium">
              <span>Đánh giá đa chiều</span>
              <span>5 Yếu tố cốt lõi</span>
            </div>
          </div>

          {/* Khối 3: Điểm trừ cần lưu ý */}
          <div className="bg-white border border-[#E4E4E7] rounded-xl p-6 sm:p-7 flex flex-col justify-between hover:border-zinc-300 transition-colors shadow-2xs">
            <div>
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center mb-4 border border-red-100">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#18181B] tracking-tight mb-2">
                Những điểm trừ cần lưu ý
              </h3>
              <p className="text-xs sm:text-sm text-[#52525B] leading-relaxed">
                Chỉ ra ngay những phàn nàn lặp đi lặp lại nhiều nhất từ thực khách: chờ món lâu, phục vụ thiếu chu đáo, hay chỗ để xe bất tiện.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-red-700 font-medium">
              <span>Phát hiện sớm</span>
              <span>Tránh mất tiền oan</span>
            </div>
          </div>

        </div>
      </section>

      {/* DANH SÁCH NHÀ HÀNG TIÊU BIỂU */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#C2410C] mb-1">
              Gợi ý quán ăn
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#18181B] tracking-tight">
              Quán ăn nổi bật đã được đánh giá
            </h2>
          </div>
          <button
            onClick={onNavigateExplore}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#18181B] hover:text-[#C2410C] transition-colors group"
          >
            <span>Xem toàn bộ quán ăn</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

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

      {/* BANNER TÌM HIỂU QUY TRÌNH */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#18181B] text-white rounded-xl p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">
              Minh bạch & Đáng tin cậy
            </span>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
              Restaurant Intelligence tổng hợp đánh giá như thế nào?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-xl">
              Tìm hiểu cách hệ thống gom nhận xét từ thực khách thực tế, phân loại khen - chê theo từng yếu tố và đưa ra bản tóm tắt khách quan chỉ trong vài giây.
            </p>
          </div>

          <button
            onClick={onNavigateHowItWorks}
            className="px-5 py-3 bg-white hover:bg-zinc-100 text-[#18181B] rounded-lg text-xs font-bold tracking-wide transition-colors shrink-0 shadow-sm"
          >
            Xem cách hoạt động →
          </button>
        </div>
      </section>

    </div>
  );
};
