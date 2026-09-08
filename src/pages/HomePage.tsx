import React from 'react';
import { SearchBar } from '../components/common/SearchBar';
import { RestaurantCard } from '../components/restaurant-list/RestaurantCard';
import type { Restaurant } from '../types/restaurant';
import { BarChart3, MessageSquareText, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

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
    <div className="space-y-16 sm:space-y-24 pb-16">
      
      {/* HERO SECTION */}
      <section className="pt-14 sm:pt-20 pb-8 sm:pb-12 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        
        {/* Category Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200/80 text-xs font-medium text-[#52525B] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C2410C]" />
          <span>Nền tảng phân tích đánh giá nhà hàng từ Foody</span>
        </div>

        {/* Tiêu đề trang trọng */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#18181B] tracking-tight leading-[1.15] mb-5">
          Thấu hiểu suy nghĩ thực sự <br className="hidden sm:inline" />
          của khách hàng.
        </h1>

        {/* Dòng mô tả */}
        <p className="text-base sm:text-lg lg:text-xl text-[#52525B] max-w-2xl mx-auto leading-relaxed mb-10">
          Khám phá đánh giá nhà hàng và nhận biết những điều khách hàng yêu thích, chưa hài lòng và kỳ vọng.
        </p>

        {/* Khung tìm kiếm chính */}
        <SearchBar
          size="large"
          onSearch={onSearch}
          onSelectRestaurant={onSelectRestaurant}
          placeholder="Tìm kiếm nhà hàng (vd: Pizza 4P's, Phở Thìn, The Coffee House)..."
        />

        {/* Trust Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-[#71717A]">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-zinc-400" />
            Không cần đăng nhập
          </span>
          <span className="text-zinc-300">•</span>
          <span>15.000+ đánh giá Foody được phân tích</span>
          <span className="text-zinc-300">•</span>
          <span>5 khía cạnh vận hành cốt lõi</span>
        </div>
      </section>

      {/* SUPPORTING SECTION: Biến đánh giá thành thông tin giá trị */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#18181B] tracking-tight mb-3">
            Biến đánh giá thành thông tin hữu ích.
          </h2>
          <p className="text-sm text-[#71717A]">
            Chuyển đổi các bài viết nhận xét rời rạc thành dữ liệu phân tích có cấu trúc phục vụ thực khách và chủ nhà hàng.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Khối 1: Cảm xúc khách hàng */}
          <div className="bg-white border border-[#E4E4E7] rounded-xl p-6 sm:p-7 flex flex-col justify-between hover:border-zinc-300 transition-colors shadow-2xs">
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 border border-emerald-100">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#18181B] tracking-tight mb-2">
                Cảm xúc khách hàng
              </h3>
              <p className="text-xs sm:text-sm text-[#52525B] leading-relaxed">
                Nắm bắt tỷ lệ khách hàng tích cực, trung lập hay tiêu cực và theo dõi sự thay đổi chất lượng trải nghiệm qua từng tháng.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-emerald-700 font-medium">
              <span>Phân bổ cảm xúc</span>
              <span>76% Tích cực trung bình</span>
            </div>
          </div>

          {/* Khối 2: Chủ đề khách hàng bàn luận */}
          <div className="bg-white border border-[#E4E4E7] rounded-xl p-6 sm:p-7 flex flex-col justify-between hover:border-zinc-300 transition-colors shadow-2xs">
            <div>
              <div className="w-10 h-10 rounded-lg bg-orange-50 text-[#C2410C] flex items-center justify-center mb-4 border border-orange-100">
                <MessageSquareText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#18181B] tracking-tight mb-2">
                Chủ đề khách hàng thảo luận
              </h3>
              <p className="text-xs sm:text-sm text-[#52525B] leading-relaxed">
                Nhận diện các chủ đề được nhắc tới nhiều nhất: Món ăn, Dịch vụ, Giá cả, Không gian và Vị trí với điểm số cảm xúc chi tiết.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-[#C2410C] font-medium">
              <span>Phân tích khía cạnh (ABSA)</span>
              <span>5 Khía cạnh chính</span>
            </div>
          </div>

          {/* Khối 3: Khu vực cần cải thiện */}
          <div className="bg-white border border-[#E4E4E7] rounded-xl p-6 sm:p-7 flex flex-col justify-between hover:border-zinc-300 transition-colors shadow-2xs">
            <div>
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center mb-4 border border-red-100">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#18181B] tracking-tight mb-2">
                Khu vực cần cải thiện
              </h3>
              <p className="text-xs sm:text-sm text-[#52525B] leading-relaxed">
                Phát hiện các khiếu nại lặp lại và điểm yếu tiềm ẩn giúp ban quản lý khắc phục nút thắt vận hành và tốc độ ra món.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-red-700 font-medium">
              <span>Cảnh báo nguyên nhân gốc</span>
              <span>Checklist hành động</span>
            </div>
          </div>

        </div>
      </section>

      {/* DANH SÁCH NHÀ HÀNG TIÊU BIỂU */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#C2410C] mb-1">
              Danh mục mẫu
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#18181B] tracking-tight">
              Nhà hàng đã được phân tích
            </h2>
          </div>
          <button
            onClick={onNavigateExplore}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#18181B] hover:text-[#C2410C] transition-colors group"
          >
            <span>Xem toàn bộ nhà hàng</span>
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
            <span className="text-xs font-mono font-semibold text-orange-400 uppercase tracking-wider">
              Phương pháp & Kiến trúc dữ liệu
            </span>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
              Restaurant Intelligence xử lý đánh giá như thế nào?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl">
              Tìm hiểu quy trình 4 bước thu thập đánh giá Foody, chuẩn hóa văn bản tiếng Việt, trích xuất thực thể khía cạnh và tính toán chỉ số vận hành.
            </p>
          </div>

          <button
            onClick={onNavigateHowItWorks}
            className="px-5 py-3 bg-white hover:bg-zinc-100 text-[#18181B] rounded-lg text-xs font-bold tracking-wide transition-colors shrink-0 shadow-sm"
          >
            Xem quy trình hoạt động →
          </button>
        </div>
      </section>

    </div>
  );
};
