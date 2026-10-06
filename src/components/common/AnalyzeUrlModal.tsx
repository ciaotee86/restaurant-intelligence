import React, { useState, useEffect } from 'react';
import { X, Link2, ArrowRight, Loader2, CheckCircle2, AlertCircle, Sparkles, Search, Zap } from 'lucide-react';
import { restaurantService } from '../../services/restaurantService';

interface AnalyzeUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (restaurantId: string) => void;
}

export const AnalyzeUrlModal: React.FC<AnalyzeUrlModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'keyword' | 'url'>('keyword');
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('da-nang');
  const [url, setUrl] = useState('');
  const [maxReviews, setMaxReviews] = useState(15);
  const [status, setStatus] = useState<'idle' | 'crawling' | 'analyzing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [statusText, setStatusText] = useState('');

  // Autocomplete suggestions từ DB có sẵn (233 quán)
  const [suggestions, setSuggestions] = useState<{ name: string; cuisine: string; city: string; id: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Stepper tiến trình xử lý
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let interval: any;
    if (status === 'crawling') {
      setElapsedSeconds(0);
      setCurrentStep(1);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          if (next >= 2 && next < 6) setCurrentStep(2);
          else if (next >= 6) setCurrentStep(3);
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  if (!isOpen) return null;

  const handleKeywordChange = (val: string) => {
    setKeyword(val);
    if (val.trim().length >= 2) {
      const matched = restaurantService.getSearchSuggestions(val.trim());
      setSuggestions(matched);
      setShowSuggestions(matched.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (restaurantId: string) => {
    setShowSuggestions(false);
    onSuccess(restaurantId);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    setStatus('crawling');
    setErrorMessage('');

    try {
      if (tab === 'keyword') {
        if (!keyword.trim()) return;
        setStatusText(`Đang tra cứu "${keyword.trim()}" trên hệ thống và Foody...`);
        const res = await restaurantService.searchAndCrawlFoody(keyword.trim(), city, maxReviews);
        
        if (res.success && res.restaurant) {
          setStatus('success');
          setTimeout(() => {
            onSuccess(res.restaurant!.id);
            onClose();
            setStatus('idle');
            setKeyword('');
          }, 800);
        } else {
          setStatus('error');
          setErrorMessage(res.message || 'Không tìm thấy quán nào trên Foody.');
        }
      } else {
        if (!url.trim()) return;
        setStatusText('Đang nạp dữ liệu từ URL Foody và phân tích bằng Gemini AI...');
        const res = await restaurantService.analyzeFoodyUrl(url.trim(), maxReviews);
        
        if (res.success && res.restaurant) {
          setStatus('success');
          setTimeout(() => {
            onSuccess(res.restaurant!.id);
            onClose();
            setStatus('idle');
            setUrl('');
          }, 800);
        } else {
          setStatus('error');
          setErrorMessage(res.message || 'Không thể xử lý URL này.');
        }
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || 'Lỗi kết nối tới máy chủ backend.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-[#E4E4E7] w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E4E4E7] flex items-center justify-between bg-zinc-50/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#C2410C] text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#18181B] tracking-tight">
                Tổng hợp đánh giá quán ăn mới
              </h3>
              <p className="text-[11px] text-[#71717A]">
                Tra cứu nhanh dữ liệu hoặc tổng hợp quán mới từ Foody qua Gemini AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={status === 'crawling'}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-[#18181B] hover:bg-zinc-200/60 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-zinc-200 bg-zinc-100/60 p-1 gap-1">
          <button
            type="button"
            onClick={() => { setTab('keyword'); setShowSuggestions(false); }}
            disabled={status === 'crawling'}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md transition-all ${
              tab === 'keyword'
                ? 'bg-white text-[#C2410C] shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Tìm theo tên quán / từ khóa</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab('url'); setShowSuggestions(false); }}
            disabled={status === 'crawling'}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md transition-all ${
              tab === 'url'
                ? 'bg-white text-[#C2410C] shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Dán link Foody trực tiếp</span>
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {tab === 'keyword' ? (
            <>
              <div className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#18181B]">
                    Tên quán ăn hoặc từ khóa món ăn
                  </label>
                  <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                    ⚡ Có sẵn 230+ quán mở tức thì
                  </span>
                </div>
                
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={keyword}
                    onChange={(e) => handleKeywordChange(e.target.value)}
                    onFocus={() => {
                      if (keyword.trim().length >= 2 && suggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    placeholder="Ví dụ: Bánh tráng Tiên Tiên, Pizza 4P's, Cơm gà Gia Vĩnh..."
                    disabled={status === 'crawling'}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white border border-[#D4D4D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20 focus:border-[#C2410C] transition-all text-[#18181B]"
                  />

                  {/* Autocomplete Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-zinc-200 rounded-lg shadow-xl z-30 overflow-hidden divide-y divide-zinc-100 max-h-56 overflow-y-auto">
                      <div className="px-3 py-1.5 bg-zinc-50 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-amber-500" />
                        <span>Quán đã có sẵn trong hệ thống (Bấm để mở ngay &lt; 0.1s):</span>
                      </div>
                      {suggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectSuggestion(item.id)}
                          className="w-full px-3.5 py-2 text-left hover:bg-orange-50/60 flex items-center justify-between transition-colors group"
                        >
                          <div>
                            <p className="text-xs font-bold text-zinc-900 group-hover:text-[#C2410C] transition-colors">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              {item.cuisine} • {item.city}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded-md">
                            <Zap className="w-2.5 h-2.5" /> Mở ngay
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-[#71717A] mt-1">
                  Nếu quán chưa có trong hệ thống, hệ thống sẽ tự động tìm trên Foody và phân tích bằng Gemini AI.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#18181B] mb-1.5">
                  Khu vực / Thành phố
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={status === 'crawling'}
                  className="w-full text-xs px-3 py-2 bg-zinc-50 border border-[#D4D4D8] rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-800 text-[#18181B]"
                >
                  <option value="da-nang">Đà Nẵng</option>
                  <option value="ho-chi-minh">Hồ Chí Minh</option>
                  <option value="ha-noi">Hà Nội</option>
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-[#18181B] mb-1.5">
                Đường dẫn quán ăn trên Foody.vn
              </label>
              <div className="relative">
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.foody.vn/da-nang/banh-trang-tien-tien"
                  disabled={status === 'crawling'}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white border border-[#D4D4D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20 focus:border-[#C2410C] transition-all text-[#18181B]"
                />
              </div>
              <p className="text-[11px] text-[#71717A] mt-1">
                Dán URL trang chi tiết nhà hàng trên Foody (chứa phần bình luận của khách hàng).
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#18181B] mb-1.5">
              Số lượng đánh giá thu thập
            </label>
            <select
              value={maxReviews}
              onChange={(e) => setMaxReviews(Number(e.target.value))}
              disabled={status === 'crawling'}
              className="w-full text-xs px-3 py-2 bg-zinc-50 border border-[#D4D4D8] rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-800 text-[#18181B]"
            >
              <option value={15}>15 đánh giá (Siêu tốc - ~5-8 giây)</option>
              <option value={25}>25 đánh giá (Tiêu chuẩn - ~12-15 giây)</option>
              <option value={40}>40 đánh giá (Chuyên sâu - ~25 giây)</option>
            </select>
          </div>

          {/* Stepper Progress State khi đang cào & phân tích */}
          {status === 'crawling' && (
            <div className="p-3.5 bg-orange-50/80 border border-orange-200/80 rounded-xl space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-[#18181B]">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-[#C2410C] animate-spin" />
                  <span>Đang tổng hợp dữ liệu ({elapsedSeconds}s)</span>
                </div>
                <span className="text-[10px] text-[#C2410C] font-semibold bg-white px-2 py-0.5 rounded border border-orange-200">
                  Bước {currentStep}/3
                </span>
              </div>

              {/* 3-Step Timeline */}
              <div className="space-y-1.5 text-xs">
                <div className={`flex items-center gap-2 p-1.5 rounded-md transition-colors ${
                  currentStep === 1
                    ? 'bg-white shadow-xs font-semibold text-[#C2410C]'
                    : currentStep > 1
                    ? 'text-emerald-700 bg-emerald-50/60'
                    : 'text-zinc-400'
                }`}>
                  {currentStep > 1 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : currentStep === 1 ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#C2410C] animate-spin shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-zinc-300 flex items-center justify-center text-[9px] shrink-0">1</span>
                  )}
                  <span>1. Tra cứu thông tin quán trên Foody (Fast HTTP)</span>
                </div>

                <div className={`flex items-center gap-2 p-1.5 rounded-md transition-colors ${
                  currentStep === 2
                    ? 'bg-white shadow-xs font-semibold text-[#C2410C]'
                    : currentStep > 2
                    ? 'text-emerald-700 bg-emerald-50/60'
                    : 'text-zinc-400'
                }`}>
                  {currentStep > 2 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : currentStep === 2 ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#C2410C] animate-spin shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-zinc-300 flex items-center justify-center text-[9px] shrink-0">2</span>
                  )}
                  <span>2. Thu thập {maxReviews} đánh giá thực tế mới nhất</span>
                </div>

                <div className={`flex items-center gap-2 p-1.5 rounded-md transition-colors ${
                  currentStep === 3
                    ? 'bg-white shadow-xs font-semibold text-[#C2410C]'
                    : 'text-zinc-400'
                }`}>
                  {currentStep === 3 ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#C2410C] animate-spin shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-zinc-300 flex items-center justify-center text-[9px] shrink-0">3</span>
                  )}
                  <span>3. Gemini AI phân tích khía cạnh &amp; trích xuất cảm xúc</span>
                </div>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold">Đã hoàn tất tổng hợp!</p>
                <p className="text-[11px] text-emerald-800/80 mt-0.5">Báo cáo đánh giá đã sẵn sàng. Đang chuyển hướng tới trang chi tiết...</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-xs text-red-900">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Không thể tổng hợp đánh giá</p>
                <p className="text-[11px] text-red-800/80 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={status === 'crawling'}
              className="px-4 py-2 text-xs font-medium text-[#71717A] hover:text-[#18181B] transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={status === 'crawling' || (tab === 'keyword' ? !keyword.trim() : !url.trim())}
              className="inline-flex items-center gap-1.5 px-4.5 py-2 bg-[#18181B] hover:bg-[#C2410C] text-white rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{tab === 'keyword' ? 'Xem báo cáo đánh giá' : 'Tổng hợp từ liên kết'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
