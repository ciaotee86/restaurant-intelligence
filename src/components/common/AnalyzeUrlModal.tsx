import React, { useState } from 'react';
import { X, Link2, ArrowRight, Loader2, CheckCircle2, AlertCircle, Sparkles, Search, Globe } from 'lucide-react';
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
  const [maxReviews, setMaxReviews] = useState(25);
  const [status, setStatus] = useState<'idle' | 'crawling' | 'analyzing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [statusText, setStatusText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('crawling');
    setErrorMessage('');

    try {
      if (tab === 'keyword') {
        if (!keyword.trim()) return;
        setStatusText(`Đang tìm "${keyword.trim()}" trên Foody.vn, cào đánh giá và phân tích Gemini AI...`);
        const res = await restaurantService.searchAndCrawlFoody(keyword.trim(), city, maxReviews);
        
        if (res.success && res.restaurant) {
          setStatus('success');
          setTimeout(() => {
            onSuccess(res.restaurant!.id);
            onClose();
            setStatus('idle');
            setKeyword('');
          }, 1200);
        } else {
          setStatus('error');
          setErrorMessage(res.message || 'Không tìm thấy quán nào trên Foody.');
        }
      } else {
        if (!url.trim()) return;
        setStatusText('Đang cào dữ liệu từ URL Foody và phân tích bằng Gemini AI...');
        const res = await restaurantService.analyzeFoodyUrl(url.trim(), maxReviews);
        
        if (res.success && res.restaurant) {
          setStatus('success');
          setTimeout(() => {
            onSuccess(res.restaurant!.id);
            onClose();
            setStatus('idle');
            setUrl('');
          }, 1200);
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
                Phân tích nhà hàng mới bằng AI
              </h3>
              <p className="text-[11px] text-[#71717A]">
                Tìm kiếm tự động trên Foody hoặc nhập đường link trực tiếp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={status === 'crawling' || status === 'analyzing'}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-[#18181B] hover:bg-zinc-200/60 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-zinc-200 bg-zinc-100/60 p-1 gap-1">
          <button
            type="button"
            onClick={() => setTab('keyword')}
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
            onClick={() => setTab('url')}
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
              <div>
                <label className="block text-xs font-semibold text-[#18181B] mb-1.5">
                  Tên quán ăn hoặc từ khóa món ăn
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Ví dụ: Bánh tráng Tiên Tiên, Pizza 4P's, Cơm gà Gia Vĩnh..."
                    disabled={status === 'crawling'}
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-white border border-[#D4D4D8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20 focus:border-[#C2410C] transition-all text-[#18181B]"
                  />
                </div>
                <p className="text-[11px] text-[#71717A] mt-1">
                  Hệ thống sẽ tự động tìm kiếm trên Foody, lấy đánh giá và phân tích bằng Gemini AI.
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
              <option value={20}>20 đánh giá (Nhanh nhất - ~15 giây)</option>
              <option value={30}>30 đánh giá (Tiêu chuẩn - ~25 giây)</option>
              <option value={50}>50 đánh giá (Chuyên sâu - ~45 giây)</option>
            </select>
          </div>

          {/* Loading / Status State */}
          {status === 'crawling' && (
            <div className="p-3.5 bg-orange-50 border border-orange-200/80 rounded-lg flex items-center gap-3 text-xs text-orange-900">
              <Loader2 className="w-4 h-4 text-[#C2410C] animate-spin shrink-0" />
              <div>
                <p className="font-semibold">Đang tự động thu thập dữ liệu & phân tích AI...</p>
                <p className="text-[11px] text-orange-800/80 mt-0.5">{statusText || 'Selenium đang quét Foody và gửi review cho Gemini AI.'}</p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold">Phân tích hoàn tất thành công!</p>
                <p className="text-[11px] text-emerald-800/80 mt-0.5">Dữ liệu đã được lưu vào hệ thống. Đang chuyển hướng tới dashboard...</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-xs text-red-900">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Không thể hoàn tất phân tích</p>
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
              <span>{tab === 'keyword' ? 'Tìm & Phân tích Foody' : 'Bắt đầu phân tích URL'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
