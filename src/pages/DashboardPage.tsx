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
import { restaurantService } from '../services/restaurantService';

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
    const el = document.getElementById('review-explorer');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-zinc-600">Đang tải tập dữ liệu phân tích nhà hàng...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h2 className="text-xl font-bold text-zinc-900 mb-2">Không tìm thấy nhà hàng</h2>
        <p className="text-sm text-zinc-600 mb-6">
          Mã định danh nhà hàng yêu cầu không tồn tại trong cơ sở dữ liệu đã phân tích.
        </p>
        <button
          onClick={onBackToExplore}
          className="px-4 py-2 bg-zinc-900 text-white rounded-md text-xs font-semibold"
        >
          Quay lại trang khám phá
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      
      {/* 1. Header & Thông tin chung */}
      <RestaurantHero
        restaurant={restaurant}
        onBack={onBackToExplore}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* 2. Chỉ số hiệu suất phân tích hàng đầu */}
        <TopMetricsRow restaurant={restaurant} />

        {/* 3. Phân bổ cảm xúc & Biểu đồ xu hướng (2 cột trên máy tính) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-5 flex flex-col">
            <SentimentBreakdown restaurant={restaurant} />
          </div>
          <div className="lg:col-span-7 flex flex-col">
            <SentimentTrendChart restaurant={restaurant} />
          </div>
        </div>

        {/* 4. Khách hàng nói gì nhiều nhất (Phân tích khía cạnh ABSA) */}
        <AspectAnalysis
          restaurant={restaurant}
          selectedAspect={selectedAspect}
          onSelectAspect={handleSelectAspectFromAnalysis}
        />

        {/* 5. Điểm yêu thích & Điểm cần chú ý (2 cột so sánh) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <WhatCustomersLove restaurant={restaurant} />
          <WhatNeedsAttention restaurant={restaurant} />
        </div>

        {/* 6. Phát hiện cốt lõi */}
        <KeyFindings restaurant={restaurant} />

        {/* 7. Đề xuất cải thiện vận hành dành cho quản lý */}
        <OperationalAdvice restaurant={restaurant} />

        {/* 8. Khám phá chi tiết đánh giá từ khách hàng */}
        <ReviewExplorer
          reviews={restaurant.reviews}
          initialAspect={selectedAspect}
        />

      </div>
    </div>
  );
};
