import React, { useState, useEffect } from 'react';
import type { Restaurant, AspectCategory } from '../types/restaurant';
import { RestaurantHero } from '../components/dashboard/RestaurantHero';
import { TopMetricsRow } from '../components/dashboard/TopMetricsRow';
import { SentimentBreakdown } from '../components/dashboard/SentimentBreakdown';
import { SentimentTrendChart } from '../components/dashboard/SentimentTrendChart';
import { AspectAnalysis } from '../components/dashboard/AspectAnalysis';
import { WhatCustomersLove } from '../components/dashboard/WhatCustomersLove';
import { WhatNeedsAttention } from '../components/dashboard/WhatNeedsAttention';
import { KeyFindings } from '../components/dashboard/KeyFindings';
import { OperationalAdvice } from '../components/dashboard/OperationalAdvice';
import { ReviewExplorer } from '../components/dashboard/ReviewExplorer';
import { AiAssistantWidget } from '../components/dashboard/AiAssistantWidget';
import { restaurantService } from '../services/restaurantService';
import { Utensils, Store, MessageSquare, ArrowRight, Bot } from 'lucide-react';

interface DashboardPageProps {
  restaurantId: string;
  onBackToExplore: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  restaurantId,
  onBackToExplore
}) => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAspect, setSelectedAspect] = useState<AspectCategory | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'diner' | 'owner' | 'assistant' | 'reviews'>('diner');

  useEffect(() => {
    let isMounted = true;
    const fetchRestaurant = async () => {
      setLoading(true);
      const res = await restaurantService.getRestaurantByIdOrSlug(restaurantId);
      if (isMounted) {
        setRestaurant(res || null);
        setLoading(false);
      }
    };
    fetchRestaurant();
    return () => {
      isMounted = false;
    };
  }, [restaurantId]);

  const handleSelectAspectFromAnalysis = (aspect: AspectCategory) => {
    setSelectedAspect(aspect);
    setActiveTab('reviews');
    setTimeout(() => {
      const el = document.getElementById('review-explorer');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-8 h-8 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-zinc-600">Đang chuẩn bị báo cáo đánh giá quán ăn...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h2 className="text-xl font-bold text-zinc-900 mb-2">Không tìm thấy quán ăn</h2>
        <p className="text-sm text-zinc-600 mb-6">
          Quán ăn bạn tìm kiếm hiện chưa có dữ liệu đánh giá hoặc đường dẫn không chính xác.
        </p>
        <button
          onClick={onBackToExplore}
          className="px-4 py-2 bg-[#18181B] hover:bg-[#C2410C] text-white rounded-md text-xs font-semibold transition-colors"
        >
          Quay lại danh sách quán
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* 1. Header & Thông tin chung */}
      <RestaurantHero
        restaurant={restaurant}
        onBack={onBackToExplore}
      />

      {/* 2. TAB SELECTOR: BỘ CHUYỂN ĐỔI 3 GÓC NHÌN */}
      <div className="bg-[#FBF9F5] border-b border-[#E5E3DE] sticky top-16 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 sm:gap-3 overflow-x-auto py-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('diner')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'diner'
                ? 'bg-[#C2410C] text-white shadow-craft-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-black/5'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Dành cho Thực khách (Món ngon & Lưu ý)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('owner')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'owner'
                ? 'bg-[#18181B] text-white shadow-craft-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-black/5'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Dành cho Quản lý & Chủ quán (Vận hành)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assistant')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'assistant'
                ? 'bg-[#18181B] text-white shadow-craft-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-black/5'
            }`}
          >
            <Bot className="w-4 h-4 text-orange-400" />
            <span>Trợ lý AI Nhà Hàng (Hỏi - Đáp)</span>
            <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-wider">
              Mới
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'reviews'
                ? 'bg-[#18181B] text-white shadow-craft-sm'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-black/5'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Tất cả nhận xét gốc ({restaurant.reviews.length})</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pt-2">
        
        {/* Chỉ số hiệu suất tổng quan hàng đầu */}
        <TopMetricsRow restaurant={restaurant} />

        {/* NỘI DUNG TAB 1: DÀNH CHO THỰC KHÁCH */}
        {activeTab === 'diner' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Điểm yêu thích & Điểm cần chú ý */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <WhatCustomersLove restaurant={restaurant} />
              <WhatNeedsAttention restaurant={restaurant} />
            </div>

            {/* Bóc tách 5 yếu tố trải nghiệm */}
            <AspectAnalysis
              restaurant={restaurant}
              selectedAspect={selectedAspect}
              onSelectAspect={handleSelectAspectFromAnalysis}
            />

            {/* Khung Trợ lý AI Hỏi-Đáp chuyên sâu */}
            <AiAssistantWidget restaurant={restaurant} />

            {/* Những phát hiện cốt lõi */}
            <KeyFindings restaurant={restaurant} />

            {/* CTA chuyển sang đọc review gốc */}
            <div className="p-6 bg-orange-50/60 border border-orange-200/80 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-[#18181B]">
                  Muốn đọc chi tiết nhận xét từng khách hàng?
                </h3>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Xem toàn bộ {restaurant.reviews.length} đánh giá gốc đã được phân loại theo món ăn và cảm xúc.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className="px-4 py-2.5 bg-[#C2410C] hover:bg-[#9a3412] text-white text-xs font-semibold rounded-lg shrink-0 flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <span>Xem tất cả nhận xét gốc</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* NỘI DUNG TAB 2: DÀNH CHO QUẢN LÝ & CHỦ QUÁN */}
        {activeTab === 'owner' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Phân bổ cảm xúc & Xu hướng thời gian */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-5 flex flex-col">
                <SentimentBreakdown restaurant={restaurant} />
              </div>
              <div className="lg:col-span-7 flex flex-col">
                <SentimentTrendChart restaurant={restaurant} />
              </div>
            </div>

            {/* Khung Trợ lý AI hỗ trợ vận hành */}
            <AiAssistantWidget restaurant={restaurant} />

            {/* Đề xuất cải thiện vận hành */}
            <OperationalAdvice restaurant={restaurant} />

            {/* Điểm cần chú ý & Khiếu nại của khách */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <WhatNeedsAttention restaurant={restaurant} />
              <WhatCustomersLove restaurant={restaurant} />
            </div>

            {/* Phân bổ 5 khía cạnh */}
            <AspectAnalysis
              restaurant={restaurant}
              selectedAspect={selectedAspect}
              onSelectAspect={handleSelectAspectFromAnalysis}
            />
          </div>
        )}

        {/* NỘI DUNG TAB 3: TẤT CẢ NHẬN XÉT GỐC */}
        {activeTab === 'reviews' && (
          <div className="animate-in fade-in duration-200">
            <ReviewExplorer
              reviews={restaurant.reviews}
              initialAspect={selectedAspect}
            />
          </div>
        )}

      </div>
    </div>
  );
};
