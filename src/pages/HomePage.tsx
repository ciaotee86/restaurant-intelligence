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
  Quote, 
  ThumbsUp, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  Scale,
  Sparkles,
  TrendingUp
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
  // Quán mẫu được chọn trong Live Spotlight Bento ở Hero
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  
  // Trạng thái chuyển đổi góc nhìn Thực khách vs Chủ quán
  const [perspectiveTab, setPerspectiveTab] = useState<'diner' | 'owner'>('diner');

  // Trạng thái so sánh đối đầu (Head-to-Head Comparison)
  const [compareIdA, setCompareIdA] = useState<string>('');
  const [compareIdB, setCompareIdB] = useState<string>('');

  const selectedCompareIdA = (compareIdA && restaurants.some(r => r.id === compareIdA))
    ? compareIdA
    : (restaurants[0]?.id || '');

  const selectedCompareIdB = (compareIdB && restaurants.some(r => r.id === compareIdB))
    ? compareIdB
    : (restaurants[1]?.id || restaurants[0]?.id || '');

  // Lấy danh sách quán mẫu hiển thị ở Bento Spotlight
  const sampleRestaurants = (restaurants && restaurants.length > 0) ? restaurants.slice(0, 3) : [];
  const activeSample = sampleRestaurants[selectedSampleIndex] || sampleRestaurants[0] || null;

  // Mẫu trích dẫn của quán đang chọn
  const activeQuote = activeSample?.reviews?.[0]?.text || activeSample?.sentimentSummarySentence || 'Nhận xét chân thực từ thực khách thực tế.';
  const displayQuote = activeQuote && activeQuote.length > 140 ? `${activeQuote.slice(0, 137)}...` : (activeQuote || '');

  // Dữ liệu so sánh 2 quán
  const restaurantA = restaurants.find(r => r.id === selectedCompareIdA) || restaurants[0] || null;
  const restaurantB = restaurants.find(r => r.id === selectedCompareIdB) || restaurants[1] || restaurants[0] || null;

  const aspectCategories = ['Món ăn', 'Dịch vụ', 'Giá cả', 'Không gian', 'Vị trí'] as const;

  return (
    <div className="space-y-16 sm:space-y-24 pb-24">
      
      {/* 1. HERO SECTION: FULL-BLEED ATMOSPHERE & FLOATING CONSOLE (PATTERN B HYBRID) */}
      <section className="relative pt-6 sm:pt-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#FAF7F2] to-[#F2EFE9] border border-[#E8E4DC] p-8 sm:p-14 lg:p-16 shadow-editorial-lg">
          
          {/* Subtle Ambient Vignette Texture */}
          <div className="absolute inset-0 pointer-events-none hero-atmosphere-pattern opacity-80" />
          
          <div className="relative max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
            
            {/* Editorial Category Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-[#E8E4DC] text-xs font-semibold text-[#991B1B] shadow-editorial-sm">
              <span className="w-2 h-2 rounded-full bg-[#991B1B] animate-pulse" />
              <span>Bản đồ đọc vị ẩm thực từ thực khách thực tế</span>
            </div>

            {/* Display Headline (Spectral Serif) */}
            <h1 className="font-display font-bold text-3xl sm:text-5xl lg:text-[56px] text-[#1C1917] tracking-tight leading-[1.12]">
              Đọc vị mọi bàn ăn. <br />
              <span className="italic font-normal text-[#991B1B]">Thấy rõ điều thực khách thực sự nghĩ.</span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-[#57534E] max-w-2xl mx-auto leading-relaxed">
              Thay vì mất 30 phút đọc hàng trăm bình luận lẫn lộn — xem ngay bức tranh toàn cảnh về <strong className="text-[#1C1917] font-semibold">Món ăn</strong>, <strong className="text-[#1C1917] font-semibold">Giá cả</strong>, <strong className="text-[#1C1917] font-semibold">Thái độ phục vụ</strong> và <strong className="text-[#1C1917] font-semibold">Không gian</strong> được bóc tách khoa học.
            </p>

            {/* Floating Search Console */}
            <div className="pt-2 sm:pt-4 max-w-3xl mx-auto">
              <SearchBar
                size="large"
                onSearch={onSearch}
                onSelectRestaurant={onSelectRestaurant}
                placeholder="Tìm món ngon hoặc quán ăn (vd: Pizza 4P's, Phở Thìn, Cơm Gà 9 Ly)..."
              />
            </div>

            {/* Quick Demand Tags */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
              <span className="text-[#8C857B] font-medium mr-1">Dịp ăn uống:</span>
              <button
                type="button"
                onClick={() => onSearch('gia đình')}
                className="px-3 py-1.5 bg-white hover:bg-[#FDF2F2] hover:text-[#991B1B] hover:border-[#FECACA] text-[#57534E] rounded-lg border border-[#E8E4DC] font-medium transition-all shadow-editorial-sm"
              >
                👨‍👩‍👧 Bữa cơm gia đình
              </button>
              <button
                type="button"
                onClick={() => onSearch('hẹn hò')}
                className="px-3 py-1.5 bg-white hover:bg-[#FDF2F2] hover:text-[#991B1B] hover:border-[#FECACA] text-[#57534E] rounded-lg border border-[#E8E4DC] font-medium transition-all shadow-editorial-sm"
              >
                🍷 Tiếp khách & Hẹn hò
              </button>
              <button
                type="button"
                onClick={() => onSearch('cơm')}
                className="px-3 py-1.5 bg-white hover:bg-[#FDF2F2] hover:text-[#991B1B] hover:border-[#FECACA] text-[#57534E] rounded-lg border border-[#E8E4DC] font-medium transition-all shadow-editorial-sm"
              >
                ⚡ Phục vụ nhanh
              </button>
              <button
                type="button"
                onClick={() => onSearch('bình dân')}
                className="px-3 py-1.5 bg-white hover:bg-[#FDF2F2] hover:text-[#991B1B] hover:border-[#FECACA] text-[#57534E] rounded-lg border border-[#E8E4DC] font-medium transition-all shadow-editorial-sm"
              >
                💰 Ngon bình dân
              </button>
              <button
                type="button"
                onClick={() => onSearch('đặc sản')}
                className="px-3 py-1.5 bg-white hover:bg-[#FDF2F2] hover:text-[#991B1B] hover:border-[#FECACA] text-[#57534E] rounded-lg border border-[#E8E4DC] font-medium transition-all shadow-editorial-sm"
              >
                🍜 Đặc sản vùng miền
              </button>
            </div>

            {/* Trust Signals */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs text-[#78716C]">
              <span className="flex items-center gap-2 font-medium">
                <ShieldCheck className="w-4 h-4 text-[#065F46] shrink-0" />
                Không cần đăng nhập tài khoản
              </span>
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-[#991B1B] shrink-0" />
                Loại bỏ nhận xét giả & đánh giá ảo
              </span>
              <span className="flex items-center gap-2 font-medium">
                <BarChart3 className="w-4 h-4 text-[#D97706] shrink-0" />
                Đánh giá theo 5 tiêu chí cốt lõi
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* 2. SECTION: ASYMMETRIC BENTO RADAR SPOTLIGHT (8-4 BENTO GRID - NOT 3 EQUAL CARDS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#991B1B] mb-1">
                Bóc tách trực tiếp
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#1C1917] tracking-tight">
                Spotlight: Hồ sơ đọc vị tiêu biểu
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#78716C] max-w-md">
              Xem cách hệ thống tự động bóc tách đánh giá thực khách từ dữ liệu lớn thành chỉ số trực quan.
            </p>
          </div>

          {/* BENTO GRID 8-4 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* BENTO CARD LỚN (8 CỘT): QUÁN ĂN TRỌNG TÂM */}
            <div className="lg:col-span-8 bg-white border border-[#E8E4DC] rounded-2xl p-6 sm:p-8 shadow-editorial flex flex-col justify-between">
              {activeSample ? (
                <div className="space-y-6">
                  {/* Top bar quán ăn */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8E4DC]">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-[#991B1B] bg-[#FDF2F2] border border-[#FECACA] px-3 py-1 rounded-full">
                        {activeSample.cuisine || 'Ẩm thực'}
                      </span>
                      <span className="text-xs text-[#78716C] flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#A8A29E]" />
                        {activeSample.city} · {formatNumber(activeSample.totalReviews || 0)} đánh giá thực
                      </span>
                    </div>

                    {/* Selector quán mẫu */}
                    {sampleRestaurants.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[#8C857B] font-medium mr-1">Đổi quán mẫu:</span>
                        {sampleRestaurants.map((r, idx) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setSelectedSampleIndex(idx)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              selectedSampleIndex === idx
                                ? 'bg-[#991B1B] text-white shadow-editorial-sm'
                                : 'bg-[#F2EFE9] text-[#57534E] hover:bg-[#E8E4DC]'
                            }`}
                          >
                            {r.name.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tên quán & Tỷ lệ hài lòng */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display font-bold text-2xl sm:text-3xl text-[#1C1917] tracking-tight">
                        {activeSample.name}
                      </h3>
                      <p className="text-xs text-[#78716C] mt-1 font-medium">
                        Địa chỉ: {activeSample.address || 'Đang cập nhật'}
                      </p>
                    </div>

                    <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl p-3 sm:p-4 text-center min-w-[90px] shrink-0">
                      <span className="font-display font-bold text-3xl sm:text-4xl text-[#065F46] leading-none block">
                        {activeSample.sentimentDistribution?.positive ?? 0}%
                      </span>
                      <span className="text-[10px] font-bold text-[#065F46] uppercase tracking-wider block mt-1">
                        Hài lòng
                      </span>
                    </div>
                  </div>

                  {/* Trích dẫn thực khách kiểu chuyên san ẩm thực */}
                  <div className="p-4 rounded-xl bg-[#FAF7F2] border-l-3 border-[#991B1B] border-y border-r border-[#E8E4DC] text-sm text-[#57534E] leading-relaxed relative">
                    <Quote className="w-4 h-4 text-[#C2410C]/30 absolute -top-2 left-3 bg-[#FAF7F2] px-0.5" />
                    <p className="italic">
                      "{displayQuote}"
                    </p>
                  </div>

                  {/* 5 Thước đo yếu tố cốt lõi */}
                  {activeSample.aspects && activeSample.aspects.length > 0 && (
                    <div className="space-y-3 py-3 border-y border-[#E8E4DC]">
                      <div className="flex items-center justify-between text-xs font-bold text-[#1C1917]">
                        <span>Thước đo 5 tiêu chí cốt lõi:</span>
                        <span className="text-[11px] text-[#8C857B] font-mono">Tỷ lệ khen ngợi</span>
                      </div>
                      <div className="space-y-2">
                        {activeSample.aspects.slice(0, 5).map((aspect) => (
                          <div key={aspect.category} className="flex items-center justify-between text-xs">
                            <span className="text-[#57534E] font-medium w-24">{aspect.category}</span>
                            <div className="flex-1 mx-4 h-2 bg-[#F2EFE9] rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#065F46] rounded-full transition-all duration-500" 
                                style={{ width: `${aspect.positivePercentage}%` }} 
                              />
                            </div>
                            <span className="font-mono font-bold text-[#1C1917] text-xs w-10 text-right">
                              {aspect.positivePercentage}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer nút hành động */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onSelectRestaurant(activeSample.id)}
                      className="w-full py-3.5 bg-[#1C1917] hover:bg-[#991B1B] text-white font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-editorial-sm group"
                    >
                      <span>Xem toàn bộ hồ sơ phân tích {activeSample.name}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                </div>
              ) : (
                <div className="text-center py-12 text-[#78716C]">
                  Đang chuẩn bị dữ liệu quán ăn...
                </div>
              )}
            </div>

            {/* CỘT PHẢI BENTO (4 CỘT): 2 THẺ VỆ TINH MINH BẠCH & SIGNATURE */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Thẻ Vệ tinh 1: Lớp lọc nhận xét ảo */}
              <div className="bg-white border border-[#E8E4DC] rounded-2xl p-6 shadow-editorial flex-1 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#FDF2F2] text-[#991B1B] flex items-center justify-center mb-4 border border-[#FECACA]">
                    <ShieldCheck className="w-5 h-5 text-[#991B1B]" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-[#1C1917] mb-2">
                    Tách lọc nhận xét ảo
                  </h3>
                  <p className="text-xs text-[#78716C] leading-relaxed mb-4">
                    Hệ thống tự động loại trừ các bình luận quảng cáo, tài khoản mới tạo đánh giá ảo, chỉ giữ lại nhận xét từ người dùng có trải nghiệm thực tế.
                  </p>
                  
                  <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E8E4DC] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#57534E]">Tỷ lệ loại bỏ nhận xét ảo:</span>
                      <span className="font-mono font-bold text-[#991B1B]">~18.5% đã loại bỏ</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#57534E]">Độ tin cậy dữ liệu:</span>
                      <span className="font-mono font-bold text-[#065F46]">98.2% Chuẩn xác</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E8E4DC] mt-4 flex items-center justify-between text-[11px] text-[#8C857B]">
                  <span>Cập nhật liên tục</span>
                  <span className="font-medium text-[#991B1B]">Khách quan 100%</span>
                </div>
              </div>

              {/* Thẻ Vệ tinh 2: Món Signature & Điểm cần lưu ý */}
              <div className="bg-white border border-[#E8E4DC] rounded-2xl p-6 shadow-editorial flex-1 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center mb-4 border border-[#FDE68A]">
                    <Sparkles className="w-5 h-5 text-[#D97706]" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-[#1C1917] mb-2">
                    Món Nên Thử & Lưu Ý
                  </h3>
                  
                  <div className="space-y-3 text-xs mt-3">
                    {activeSample?.strengths?.[0] && (
                      <div className="p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46]">
                        <span className="font-bold flex items-center gap-1.5 mb-1">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          Món Signature được khen nhất:
                        </span>
                        <p className="font-semibold text-[#1C1917]">
                          {activeSample.strengths[0].title}
                        </p>
                      </div>
                    )}

                    {activeSample?.attentionAreas?.[0] && (
                      <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E]">
                        <span className="font-bold flex items-center gap-1.5 mb-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Điểm cần chuẩn bị trước:
                        </span>
                        <p className="font-semibold text-[#1C1917]">
                          {activeSample.attentionAreas[0].commonComplaints?.[0] || 'Giờ cao điểm cần đặt bàn trước'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E8E4DC] mt-4 text-[11px] text-[#78716C] italic">
                  * Trích xuất tự động từ lời khen và phàn nàn lặp lại nhiều nhất.
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 3. HEAD-TO-HEAD COMPARISON: SO SÁNH ĐỐI ĐẦU 2 QUÁN ĂN */}
      {restaurantA && restaurantB && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-[#E8E4DC] rounded-3xl p-6 sm:p-10 shadow-editorial">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E8E4DC]">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#991B1B] mb-1">
                  <Scale className="w-4 h-4 text-[#991B1B]" />
                  <span>Công cụ đối chiếu trực quan</span>
                </div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#1C1917] tracking-tight">
                  So sánh đối đầu: Chọn quán nào?
                </h2>
                <p className="text-xs sm:text-sm text-[#78716C] mt-1">
                  Đặt 2 quán ăn cạnh nhau trên cùng một trục 5 tiêu chí để tìm ra lựa chọn tối ưu cho bạn.
                </p>
              </div>

              {/* Bộ chọn 2 quán ăn */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#8C857B]">Quán A:</span>
                  <select
                    value={selectedCompareIdA}
                    onChange={(e) => setCompareIdA(e.target.value)}
                    className="bg-[#FAF7F2] border border-[#E8E4DC] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1C1917] focus:outline-none focus:border-[#991B1B]"
                  >
                    {restaurants.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.city})</option>
                    ))}
                  </select>
                </div>

                <span className="text-xs font-bold text-[#991B1B] bg-[#FDF2F2] px-2 py-1 rounded-full border border-[#FECACA]">
                  VS
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#8C857B]">Quán B:</span>
                  <select
                    value={selectedCompareIdB}
                    onChange={(e) => setCompareIdB(e.target.value)}
                    className="bg-[#FAF7F2] border border-[#E8E4DC] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1C1917] focus:outline-none focus:border-[#991B1B]"
                  >
                    {restaurants.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.city})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Bảng so sánh 5 khía cạnh trực quan */}
            <div className="pt-6 space-y-6">
              
              {/* Header 2 quán */}
              <div className="grid grid-cols-12 gap-4 items-center pb-3 border-b border-[#E8E4DC]">
                <div className="col-span-5 text-left">
                  <span className="font-display font-bold text-base sm:text-lg text-[#1C1917] block">
                    {restaurantA.name}
                  </span>
                  <span className="text-xs text-[#78716C]">
                    {restaurantA.cuisine} · <strong className="text-[#065F46] font-bold">{restaurantA.sentimentDistribution?.positive ?? 0}% hài lòng</strong>
                  </span>
                </div>
                <div className="col-span-2 text-center text-[#8C857B] font-mono uppercase text-[10px] tracking-wider">
                  5 Tiêu chí
                </div>
                <div className="col-span-5 text-right">
                  <span className="font-display font-bold text-base sm:text-lg text-[#1C1917] block">
                    {restaurantB.name}
                  </span>
                  <span className="text-xs text-[#78716C]">
                    {restaurantB.cuisine} · <strong className="text-[#065F46] font-bold">{restaurantB.sentimentDistribution?.positive ?? 0}% hài lòng</strong>
                  </span>
                </div>
              </div>

              {/* 5 Hàng đối chiếu */}
              {aspectCategories.map((aspect) => {
                const scoreA = restaurantA.aspects?.find(a => a.category === aspect)?.positivePercentage || 0;
                const scoreB = restaurantB.aspects?.find(a => a.category === aspect)?.positivePercentage || 0;
                const isAWinner = scoreA > scoreB;
                const isBWinner = scoreB > scoreA;

                return (
                  <div key={aspect} className="grid grid-cols-12 gap-3 sm:gap-4 items-center text-xs">
                    {/* Quán A Score & Bar */}
                    <div className="col-span-5 flex items-center justify-end gap-3">
                      <span className={`font-mono font-bold ${isAWinner ? 'text-[#065F46] text-sm' : 'text-[#78716C]'}`}>
                        {scoreA}%
                      </span>
                      <div className="w-24 sm:w-48 h-2.5 bg-[#F2EFE9] rounded-full overflow-hidden flex justify-end">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${isAWinner ? 'bg-[#065F46]' : 'bg-[#A8A29E]'}`} 
                          style={{ width: `${scoreA}%` }} 
                        />
                      </div>
                    </div>

                    {/* Tên khía cạnh ở giữa */}
                    <div className="col-span-2 text-center">
                      <span className="px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#E8E4DC] font-semibold text-[#1C1917] text-[11px] inline-block">
                        {aspect}
                      </span>
                    </div>

                    {/* Quán B Bar & Score */}
                    <div className="col-span-5 flex items-center justify-start gap-3">
                      <div className="w-24 sm:w-48 h-2.5 bg-[#F2EFE9] rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${isBWinner ? 'bg-[#065F46]' : 'bg-[#A8A29E]'}`} 
                          style={{ width: `${scoreB}%` }} 
                        />
                      </div>
                      <span className={`font-mono font-bold ${isBWinner ? 'text-[#065F46] text-sm' : 'text-[#78716C]'}`}>
                        {scoreB}%
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Nút xem chi tiết từng quán */}
              <div className="grid grid-cols-12 gap-4 pt-4 border-t border-[#E8E4DC]">
                <div className="col-span-6 text-left">
                  <button
                    type="button"
                    onClick={() => onSelectRestaurant(restaurantA.id)}
                    className="px-4 py-2.5 bg-[#F8F6F0] hover:bg-[#F2EFE9] border border-[#E8E4DC] rounded-xl text-xs font-bold text-[#1C1917] shadow-editorial-sm transition-all"
                  >
                    Xem hồ sơ {restaurantA.name} →
                  </button>
                </div>
                <div className="col-span-6 text-right">
                  <button
                    type="button"
                    onClick={() => onSelectRestaurant(restaurantB.id)}
                    className="px-4 py-2.5 bg-[#F8F6F0] hover:bg-[#F2EFE9] border border-[#E8E4DC] rounded-xl text-xs font-bold text-[#1C1917] shadow-editorial-sm transition-all"
                  >
                    Xem hồ sơ {restaurantB.name} →
                  </button>
                </div>
              </div>

            </div>

          </div>
        </section>
      )}

      {/* 4. DUAL PERSPECTIVE SWITCHER: BENTO GRID 2 GÓC NHÌN (NOT 3 EQUAL CARDS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="text-xs font-bold uppercase tracking-wider text-[#991B1B] mb-1">
            Ứng dụng đa chiều
          </div>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#1C1917] tracking-tight mb-2">
            Được kiến tạo cho cả 2 góc nhìn
          </h2>
          <p className="text-sm text-[#78716C]">
            Dù bạn là người đi tìm quán ăn hay người trực tiếp vận hành nhà hàng, dữ liệu đều được tinh lọc đúng mục tiêu của bạn.
          </p>

          {/* Tab Selector */}
          <div className="inline-flex p-1.5 bg-[#F2EFE9] rounded-2xl mt-6 border border-[#E8E4DC]">
            <button
              type="button"
              onClick={() => setPerspectiveTab('diner')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                perspectiveTab === 'diner'
                  ? 'bg-[#1C1917] text-white shadow-editorial-sm'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>Dành cho Thực khách</span>
            </button>
            <button
              type="button"
              onClick={() => setPerspectiveTab('owner')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                perspectiveTab === 'owner'
                  ? 'bg-[#1C1917] text-white shadow-editorial-sm'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Dành cho Chủ quán & Quản lý</span>
            </button>
          </div>
        </div>

        {/* Nội dung Tab Thực khách (Bento Layout: 1 Khối lớn 6 cột + 2 Khối 3 cột) */}
        {perspectiveTab === 'diner' ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in duration-300">
            {/* Khối chính lớn (6 cột) */}
            <div className="md:col-span-6 bg-white border border-[#E8E4DC] rounded-2xl p-7 sm:p-8 flex flex-col justify-between hover:shadow-editorial transition-all">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#FDF2F2] text-[#991B1B] flex items-center justify-center font-bold text-xl border border-[#FECACA] mb-5">
                  🍜
                </div>
                <h3 className="font-display font-bold text-xl text-[#1C1917] mb-3">
                  Biết trước món ngon signature & món nên tránh
                </h3>
                <p className="text-sm text-[#57534E] leading-relaxed">
                  Xem ngay đĩa đồ ăn nào là linh hồn của quán được 90% thực khách khen nức nở, và món nào thường xuyên bị phàn nàn mặn, nguội hoặc khẩu phần ít so với giá tiền để không bị thất vọng.
                </p>
              </div>
              <div className="pt-6 border-t border-[#E8E4DC] mt-6 flex items-center gap-2 text-xs text-[#991B1B] font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Tránh rủi ro gọi nhầm món khi đi ăn tiệc</span>
              </div>
            </div>

            {/* Khối phụ 1 (6 cột chia 2 ô hoặc 2 thẻ xếp tầng) */}
            <div className="md:col-span-6 flex flex-col gap-6">
              <div className="bg-white border border-[#E8E4DC] rounded-2xl p-6 sm:p-7 flex-1 hover:shadow-editorial transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#FFFBEB] text-[#D97706] flex items-center justify-center font-bold text-lg border border-[#FDE68A] mb-3">
                  ⚠️
                </div>
                <h3 className="font-display font-bold text-lg text-[#1C1917] mb-2">
                  Nhìn thấu điểm trừ vận hành thực tế
                </h3>
                <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                  Biết trước quán có chỗ đỗ ô tô hay không, giờ cao điểm phải đợi bàn bao lâu và thái độ phục vụ ra sao trước khi bạn bước chân đến quán.
                </p>
              </div>

              <div className="bg-white border border-[#E8E4DC] rounded-2xl p-6 sm:p-7 flex-1 hover:shadow-editorial transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#065F46] flex items-center justify-center font-bold text-lg border border-[#A7F3D0] mb-3">
                  💰
                </div>
                <h3 className="font-display font-bold text-lg text-[#1C1917] mb-2">
                  Mức giá & khẩu phần thực tế
                </h3>
                <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                  Đánh giá xem hóa đơn thanh toán có xứng đáng với chất lượng mang lại hay không dựa trên ý kiến khách quan từ hàng trăm người đã trải nghiệm.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Nội dung Tab Chủ quán (Bento Layout tương tự) */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in duration-300">
            {/* Khối chính lớn (6 cột) */}
            <div className="md:col-span-6 bg-white border border-[#E8E4DC] rounded-2xl p-7 sm:p-8 flex flex-col justify-between hover:shadow-editorial transition-all">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center font-bold text-xl border border-[#BFDBFE] mb-5">
                  🎯
                </div>
                <h3 className="font-display font-bold text-xl text-[#1C1917] mb-3">
                  Bắt đúng bệnh vận hành nhà hàng
                </h3>
                <p className="text-sm text-[#57534E] leading-relaxed">
                  Hệ thống tự động gom các sự cố lặp lại thành cụm vấn đề (bàn dơ, thiếu điều hòa, tốc độ ra món chậm, tính tiền nhầm) để bạn điều chỉnh đúng điểm nghẽn mà không cần phỏng đoán.
                </p>
              </div>
              <div className="pt-6 border-t border-[#E8E4DC] mt-6 flex items-center gap-2 text-xs text-[#1D4ED8] font-semibold">
                <TrendingUp className="w-4 h-4" />
                <span>Tiết kiệm hàng chục giờ kiểm tra camera & sổ sách</span>
              </div>
            </div>

            {/* Khối phụ 2 (6 cột) */}
            <div className="md:col-span-6 flex flex-col gap-6">
              <div className="bg-white border border-[#E8E4DC] rounded-2xl p-6 sm:p-7 flex-1 hover:shadow-editorial transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#FAF5FF] text-[#7E22CE] flex items-center justify-center font-bold text-lg border border-[#E9D5FF] mb-3">
                  👥
                </div>
                <h3 className="font-display font-bold text-lg text-[#1C1917] mb-2">
                  Đo lường thái độ nhân viên & dịch vụ
                </h3>
                <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                  Nắm bắt ngay tỷ lệ khiếu nại về thái độ nhân viên order, phục vụ hay bảo vệ dắt xe theo từng mốc thời gian cụ thể.
                </p>
              </div>

              <div className="bg-white border border-[#E8E4DC] rounded-2xl p-6 sm:p-7 flex-1 hover:shadow-editorial transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#065F46] flex items-center justify-center font-bold text-lg border border-[#A7F3D0] mb-3">
                  📈
                </div>
                <h3 className="font-display font-bold text-lg text-[#1C1917] mb-2">
                  Theo dõi cải thiện qua từng tháng
                </h3>
                <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
                  Sau khi đào tạo nhân viên hoặc đổi nhà cung cấp nguyên liệu, theo dõi trực tiếp xem tỷ lệ khen ngợi trên biểu đồ xu hướng có tăng trưởng hay không.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 5. BỘ SƯU TẬP QUÁN ĂN CHỌN LỌC (EDITORIAL CURATION GRID) */}
      {restaurants && restaurants.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#991B1B] mb-1">
                Tuyển tập tiêu biểu
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#1C1917] tracking-tight">
                Quán ăn nổi bật đã được đánh giá
              </h2>
              <p className="text-xs sm:text-sm text-[#78716C] mt-1">
                Khám phá hồ sơ bóc tách chi tiết của các quán ăn được quan tâm nhiều nhất
              </p>
            </div>
            <button
              onClick={onNavigateExplore}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1C1917] hover:text-[#991B1B] transition-colors group"
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

      {/* 6. QUY TRÌNH MINH BẠCH & MANIFESTO BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#1C1917] text-[#FAF7F2] rounded-3xl p-8 sm:p-12 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-editorial-lg border border-[#292524] relative overflow-hidden">
          
          <div className="space-y-3.5 text-center lg:text-left relative z-10">
            <span className="text-xs font-bold text-[#D97706] uppercase tracking-wider">
              Minh bạch & Độc lập
            </span>
            <h3 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-white">
              Restaurant Intelligence đọc vị đánh giá như thế nào?
            </h3>
            <p className="text-xs sm:text-sm text-[#D6D3D1] max-w-2xl leading-relaxed">
              Từ hàng ngàn bài nhận xét của thực khách, hệ thống tự động loại bỏ bình luận rác và tài khoản ảo, phân loại tỷ lệ khen - chê theo 5 tiêu chí chất lượng và đưa ra bản tóm tắt trung thực chỉ trong vài giây.
            </p>
          </div>

          <button
            onClick={onNavigateHowItWorks}
            className="px-6 py-3.5 bg-white hover:bg-[#FAF7F2] text-[#1C1917] rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all shrink-0 shadow-editorial-sm relative z-10"
          >
            Xem cách thức hoạt động →
          </button>
        </div>
      </section>

    </div>
  );
};
