import React, { useState, useEffect } from 'react';
import {
  X,
  Link2,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import type { Restaurant, CrawlGoogleMapsResponse } from '../../types/restaurant';
import { restaurantService } from '../../services/restaurantService';
import { formatNumber } from '../../utils/sentimentUtils';

export interface LinkGoogleMapsModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: Restaurant;
  onSuccess?: (result: CrawlGoogleMapsResponse) => void;
}

const LinkGoogleMapsModalContent: React.FC<Omit<LinkGoogleMapsModalProps, 'isOpen'>> = ({
  onClose,
  restaurant,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'search'>('url');
  const [googleMapsUrl, setGoogleMapsUrl] = useState(restaurant.googleMapsUrl || '');
  const [queryName, setQueryName] = useState(
    `${restaurant.name} ${restaurant.address || restaurant.city || ''}`.trim()
  );
  const [maxReviews, setMaxReviews] = useState<number>(30);

  // Trạng thái cào dữ liệu
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [crawlResult, setCrawlResult] = useState<CrawlGoogleMapsResponse | null>(null);

  // Animation các bước cào dữ liệu khi đang loading
  useEffect(() => {
    if (!isLoading) return;

    const timer1 = setTimeout(() => setLoadingStep(1), 2500);
    const timer2 = setTimeout(() => setLoadingStep(2), 7000);
    const timer3 = setTimeout(() => setLoadingStep(3), 14000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isLoading]);

  // Đóng modal khi nhấn ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, onClose]);

  const loadingMessages = [
    'Đang khởi tạo trình duyệt ẩn danh Playwright...',
    'Đang kết nối Google Maps & cuộn container đánh giá thực tế...',
    'Đang mở rộng bài viết ẩn, kiểm tra trùng lặp qua mã băm SHA-256...',
    'Đang phân loại spam & trích xuất 5 khía cạnh trải nghiệm bằng Google Gemini ABSA...'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setCrawlResult(null);

    const payloadUrl = activeTab === 'url' ? googleMapsUrl.trim() : undefined;
    const payloadQuery = activeTab === 'search' ? queryName.trim() : undefined;

    if (activeTab === 'url' && !payloadUrl) {
      setErrorMsg('Vui lòng nhập đường dẫn Google Maps hợp lệ.');
      return;
    }

    if (activeTab === 'search' && !payloadQuery) {
      setErrorMsg('Vui lòng nhập tên hoặc từ khóa tìm kiếm quán.');
      return;
    }

    setLoadingStep(0);
    setIsLoading(true);
    try {
      const res = await restaurantService.crawlGoogleMaps({
        restaurantId: restaurant.id,
        googleMapsUrl: payloadUrl,
        queryName: payloadQuery,
        maxReviews
      });

      if (!res.success) {
        setErrorMsg(res.message || 'Không thể cào dữ liệu từ Google Maps. Vui lòng kiểm tra lại đường dẫn hoặc tên quán.');
      } else {
        setCrawlResult(res);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra trong quá trình xử lý. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyResult = () => {
    if (crawlResult) {
      onSuccess?.(crawlResult);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-maps-modal-title"
    >
      <div
        className="bg-[#FAF9F5] border border-[#E8E4DC] rounded-2xl w-full max-w-2xl shadow-editorial-lg overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white border-b border-[#E8E4DC] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FDF2F2] border border-[#FECACA] flex items-center justify-center text-[#991B1B] shadow-editorial-sm shrink-0">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="google-maps-modal-title"
                className="font-display font-bold text-lg sm:text-xl text-[#1C1917] tracking-tight leading-snug"
              >
                Bổ Sung Đánh Giá Từ Google Maps
              </h2>
              <p className="text-xs text-[#78716C]">
                Mở rộng cỡ mẫu phân tích cho <strong className="text-[#1C1917] font-semibold">{restaurant.name}</strong>
              </p>
            </div>
          </div>

          {!isLoading && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8C857B] hover:text-[#1C1917] hover:bg-[#F2EFE9] transition-colors cursor-pointer"
              title="Đóng (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Nội dung Modal */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* TRẠNG THÁI 1: ĐANG CÀO DỮ LIỆU (LOADING) */}
          {isLoading && (
            <div className="py-8 px-4 text-center space-y-5 bg-white border border-[#E8E4DC] rounded-xl shadow-editorial-sm">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-[#F2EFE9] border-t-[#991B1B] animate-spin" />
                <div className="absolute inset-2 rounded-full bg-[#FDF2F2] flex items-center justify-center text-[#991B1B]">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-bold text-[#1C1917]">
                  Đang thu thập & chuẩn hóa đánh giá
                </h3>
                <p className="text-xs text-[#C2410C] font-medium animate-pulse min-h-[32px] flex items-center justify-center">
                  {loadingMessages[loadingStep]}
                </p>
              </div>

              {/* Progress step indicators */}
              <div className="grid grid-cols-4 gap-2 max-w-md mx-auto pt-2">
                {[0, 1, 2, 3].map((stepIdx) => (
                  <div
                    key={stepIdx}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      loadingStep >= stepIdx ? 'bg-[#991B1B]' : 'bg-[#E8E4DC]'
                    }`}
                  />
                ))}
              </div>

              <div className="text-[11px] text-[#8C857B] bg-[#FAF7F2] p-3 rounded-lg border border-[#E8E4DC] max-w-md mx-auto text-left flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#065F46] shrink-0 mt-0.5" />
                <span>
                  Hệ thống tự động loại trừ các bài viết trùng lặp giữa Foody và Google Maps thông qua mã băm SHA-256 fingerprint, chỉ nạp đánh giá mới.
                </span>
              </div>
            </div>
          )}

          {/* TRẠNG THÁI 2: THÀNH CÔNG (SUCCESS) */}
          {!isLoading && crawlResult && crawlResult.success && (
            <div className="space-y-5 bg-white border border-[#A7F3D0] rounded-xl p-6 shadow-editorial-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center text-[#065F46] shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#065F46]">
                    Nạp dữ liệu từ Google Maps thành công!
                  </h3>
                  <p className="text-xs text-[#57534E]">
                    Toàn bộ bài viết mới đã được phân tích khía cạnh bằng Google Gemini ABSA.
                  </p>
                </div>
              </div>

              {/* Bento Grid thống kê kết quả */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-[#FAF7F2] border border-[#E8E4DC] p-3.5 rounded-xl text-center">
                  <span className="block text-[11px] uppercase tracking-wider text-[#8C857B] font-bold">
                    Review mới
                  </span>
                  <span className="text-2xl font-bold font-display text-[#065F46]">
                    +{formatNumber(crawlResult.newReviewsCount)}
                  </span>
                </div>

                <div className="bg-[#FAF7F2] border border-[#E8E4DC] p-3.5 rounded-xl text-center">
                  <span className="block text-[11px] uppercase tracking-wider text-[#8C857B] font-bold">
                    Trùng lặp bỏ qua
                  </span>
                  <span className="text-2xl font-bold font-display text-[#8C857B]">
                    {formatNumber(crawlResult.duplicateReviewsSkipped)}
                  </span>
                </div>

                <div className="bg-[#FAF7F2] border border-[#E8E4DC] p-3.5 rounded-xl text-center">
                  <span className="block text-[11px] uppercase tracking-wider text-[#8C857B] font-bold">
                    Tổng đánh giá
                  </span>
                  <span className="text-2xl font-bold font-display text-[#1C1917]">
                    {formatNumber(crawlResult.totalReviewsNow)}
                  </span>
                </div>

                <div className="bg-[#FAF7F2] border border-[#E8E4DC] p-3.5 rounded-xl text-center">
                  <span className="block text-[11px] uppercase tracking-wider text-[#8C857B] font-bold">
                    Độ tin cậy mới
                  </span>
                  <span className="text-2xl font-bold font-display text-[#991B1B]">
                    {Math.round(
                      (crawlResult.credibilityScore ?? 0) <= 1.0
                        ? (crawlResult.credibilityScore ?? 1.0) * 100
                        : (crawlResult.credibilityScore ?? 100)
                    )}
                    %
                  </span>
                </div>
              </div>

              {crawlResult.elapsedSeconds && (
                <div className="text-xs text-[#8C857B] text-center font-mono">
                  Thời gian hoàn tất: {crawlResult.elapsedSeconds.toFixed(1)} giây · Nguồn: Google Maps
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-[#E8E4DC]">
                <button
                  type="button"
                  onClick={handleApplyResult}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#065F46] hover:bg-[#044E39] text-white text-xs font-bold rounded-xl shadow-editorial-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Xác nhận & Cập nhật Dashboard</span>
                </button>
              </div>
            </div>
          )}

          {/* TRẠNG THÁI 3: FORM NHẬP LIỆU (KHI CHƯA CHẠY HOẶC CÓ LỖI) */}
          {!isLoading && (!crawlResult || !crawlResult.success) && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Thông báo lỗi nếu có */}
              {errorMsg && (
                <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex items-start gap-2.5 text-xs text-[#991B1B]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Không thể hoàn tất thu thập:</p>
                    <p>{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* Chọn phương thức liên kết (Tabs) */}
              <div className="flex border-b border-[#E8E4DC] gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('url')}
                  className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'url'
                      ? 'border-[#991B1B] text-[#991B1B]'
                      : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Dán đường dẫn Google Maps</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('search')}
                  className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'search'
                      ? 'border-[#991B1B] text-[#991B1B]'
                      : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Tìm kiếm tự động theo tên quán</span>
                </button>
              </div>

              {/* Nội dung Tab 1: Dán URL */}
              {activeTab === 'url' && (
                <div className="space-y-2">
                  <label htmlFor="gmaps-url-input" className="block text-xs font-bold text-[#1C1917]">
                    Đường dẫn Google Maps (Place URL hoặc Share Link)
                  </label>
                  <div className="relative">
                    <input
                      id="gmaps-url-input"
                      type="url"
                      value={googleMapsUrl}
                      onChange={(e) => setGoogleMapsUrl(e.target.value)}
                      placeholder="https://maps.app.goo.gl/... hoặc https://www.google.com/maps/place/..."
                      className="w-full bg-white border border-[#E8E4DC] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#991B1B] transition-colors"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-[#78716C] flex items-center gap-1">
                    <ExternalLink className="w-3 h-3 text-[#A8A29E]" />
                    <span>Mẹo: Mở Google Maps trên trình duyệt, tìm quán và bấm nút "Chia sẻ" để copy liên kết.</span>
                  </p>
                </div>
              )}

              {/* Nội dung Tab 2: Tìm kiếm theo tên */}
              {activeTab === 'search' && (
                <div className="space-y-2">
                  <label htmlFor="gmaps-query-input" className="block text-xs font-bold text-[#1C1917]">
                    Tên quán & Địa chỉ cần tìm trên Google Maps
                  </label>
                  <div className="relative">
                    <input
                      id="gmaps-query-input"
                      type="text"
                      value={queryName}
                      onChange={(e) => setQueryName(e.target.value)}
                      placeholder="VD: Cơm Gà Bà Buội Phan Chu Trinh Hội An"
                      className="w-full bg-white border border-[#E8E4DC] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:border-[#991B1B] transition-colors"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-[#78716C]">
                    Hệ thống sẽ dùng Playwright để tìm địa điểm chính xác nhất và trích xuất đánh giá.
                  </p>
                </div>
              )}

              {/* Số lượng đánh giá cần cào */}
              <div className="space-y-2 bg-white border border-[#E8E4DC] p-3.5 rounded-xl">
                <span className="block text-xs font-bold text-[#1C1917]">
                  Số lượng đánh giá mong muốn thu thập:
                </span>
                <div className="flex items-center gap-2">
                  {[20, 30, 50].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMaxReviews(num)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        maxReviews === num
                          ? 'bg-[#1C1917] text-white border-[#1C1917] shadow-editorial-sm'
                          : 'bg-[#FAF7F2] text-[#57534E] border-[#E8E4DC] hover:border-[#1C1917]'
                      }`}
                    >
                      {num} đánh giá {num === 30 && '(Khuyên dùng)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Box giải thích cơ chế khử trùng lặp */}
              <div className="bg-[#FDF2F2] border border-[#FECACA] rounded-xl p-3.5 text-xs text-[#991B1B] space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Layers className="w-4 h-4 text-[#991B1B]" />
                  <span>Quy trình xử lý dữ liệu chuẩn hóa</span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#7F1D1D]">
                  Dữ liệu sau khi thu thập bằng Playwright Headless sẽ được khử trùng lặp qua mã băm SHA-256 fingerprint, kiểm tra bộ lọc spam 11 ca và phân tích ABSA 5 khía cạnh độc lập qua Google Gemini AI.
                </p>
              </div>

              {/* Nút hành động */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#E8E4DC]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#57534E] hover:bg-[#F2EFE9] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#991B1B] hover:bg-[#7F1D1D] text-white shadow-editorial-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang kết nối...</span>
                    </>
                  ) : (
                    <>
                      <span>Bắt đầu thu thập</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export const LinkGoogleMapsModal: React.FC<LinkGoogleMapsModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <LinkGoogleMapsModalContent {...props} />;
};
