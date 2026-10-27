import React, { useState, useEffect, useRef } from 'react';
import { X, Link2, ArrowRight, Loader2, CheckCircle2, AlertCircle, Sparkles, Search, Zap, Store, MapPin } from 'lucide-react';
import { restaurantService } from '../../services/restaurantService';
import { VIETNAM_CITIES, getCitySlug } from '../../utils/cityUtils';

interface AnalyzeUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (restaurantId: string) => void;
}

/**
 * Kiểm tra tính hợp lệ của liên kết quán ăn từ Foody.vn:
 * - Bắt buộc bắt đầu bằng giao thức http:// hoặc https://.
 * - Hostname phải là foody.vn hoặc subdomain của foody.vn (ví dụ: www.foody.vn).
 * - Path tối thiểu phải có độ dài hoặc chứa slug quán ăn (không chỉ là trang chủ https://www.foody.vn/).
 */
const isValidFoodyUrl = (urlString: string): boolean => {
  const trimmed = urlString.trim();
  if (!trimmed) return false;

  // URL phải bắt đầu bằng http:// hoặc https://
  if (!/^https?:\/\//i.test(trimmed)) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();
    // Hostname phải là foody.vn hoặc subdomain của foody.vn
    const isFoodyHost = hostname === 'foody.vn' || hostname.endsWith('.foody.vn');
    if (!isFoodyHost) {
      return false;
    }

    // Path tối thiểu phải có độ dài, không chỉ là trang chủ "/"
    const cleanPath = parsed.pathname.replace(/^\/+|\/+$/g, '');
    if (!cleanPath) {
      return false;
    }

    const segments = cleanPath.split('/').filter(Boolean);
    if (segments.length === 0) {
      return false;
    }

    // Danh sách các slug chỉ là danh mục thành phố (không phải quán ăn cụ thể)
    const cityOnlySlugs = [
      'da-nang',
      'ho-chi-minh',
      'ha-noi',
      'hai-phong',
      'can-tho',
      'hue',
      'khanh-hoa',
      'lam-dong',
      'vung-tau',
      'quang-nam',
      'kien-giang',
      'quang-ninh'
    ];
    if (segments.length === 1 && cityOnlySlugs.includes(segments[0].toLowerCase())) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Kiểm tra tính hợp lệ của liên kết quán ăn từ Google Maps:
 * - Giao thức http:// hoặc https://
 * - Hostname thuộc các domain Google Maps hợp lệ:
 *   - google.com, google.com.vn, google.vn
 *   - maps.google.com, maps.google.com.vn
 *   - goo.gl, maps.app.goo.gl
 * - Path:
 *   - Nếu goo.gl hoặc maps.app.goo.gl: path không được rỗng
 *   - Nếu google.com/google.com.vn/google.vn (không bắt đầu bằng maps.): path phải bắt đầu với /maps, /place, /search
 *   - Nếu maps.google.*: chấp nhận path hoặc search query
 * - Không chứa userinfo (username:password)
 */
const isValidGoogleMapsUrl = (urlString: string): boolean => {
  const trimmed = urlString.trim();
  if (!trimmed || trimmed.length > 4096) return false;

  if (!/^https?:\/\//i.test(trimmed)) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') {
      return false;
    }

    if (parsed.username || parsed.password) {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!hostname || /[^\w.-]/.test(hostname)) {
      return false;
    }

    const validSuffixes = ['google.com', 'google.com.vn', 'google.vn', 'goo.gl'];
    const isGoogleDomain = validSuffixes.some((d) => hostname === d || hostname.endsWith('.' + d));
    if (!isGoogleDomain) {
      return false;
    }

    const path = parsed.pathname.toLowerCase();

    // Rút gọn link: goo.gl/maps/... hoặc maps.app.goo.gl/...
    if (hostname === 'goo.gl' || hostname === 'maps.app.goo.gl' || hostname.endsWith('.goo.gl')) {
      const cleanPath = path.replace(/^\/+|\/+$/g, '');
      return cleanPath.length > 0;
    }

    // Subdomain maps.google.*
    if (hostname.startsWith('maps.')) {
      return true;
    }

    // Domain google.com, google.com.vn, google.vn
    const validPaths = ['/maps', '/place', '/search'];
    if (validPaths.some((p) => path.startsWith(p))) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * Nhận diện nguồn dữ liệu của URL: 'foody' | 'google_maps' | null
 */
const detectUrlSource = (urlString: string): 'foody' | 'google_maps' | null => {
  if (isValidFoodyUrl(urlString)) return 'foody';
  if (isValidGoogleMapsUrl(urlString)) return 'google_maps';
  return null;
};

export const AnalyzeUrlModal: React.FC<AnalyzeUrlModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'keyword' | 'url'>('keyword');
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('da-nang');
  const [searchSource, setSearchSource] = useState<'auto' | 'foody' | 'google_maps'>('auto');
  const [url, setUrl] = useState('');
  const [maxReviews, setMaxReviews] = useState(15);
  const [status, setStatus] = useState<'idle' | 'crawling' | 'analyzing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Autocomplete suggestions từ DB có sẵn (233 quán)
  const [suggestions, setSuggestions] = useState<{ name: string; cuisine: string; city: string; id: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Stepper tiến trình xử lý
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Đóng dropdown khi click bên ngoài hoặc bấm phím Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Xác thực nguồn URL
  const detectedUrlSource = detectUrlSource(url);
  const isUrlValid = detectedUrlSource !== null;
  const isMaxReviewsValid = Boolean(maxReviews && maxReviews > 0);

  // Xác thực các trường dữ liệu bắt buộc để kích hoạt nút hành động
  const isKeywordValid = keyword.trim().length >= 2;
  const isCityValid = Boolean(city && city.trim());
  const isKeywordFormValid = isKeywordValid && isCityValid && isMaxReviewsValid;
  const isUrlFormValid = isUrlValid && isMaxReviewsValid;

  const isFormValid = tab === 'keyword' ? isKeywordFormValid : isUrlFormValid;

  // Xác định nguồn đang chạy để hiển thị các bước Stepper tương ứng
  const isKeywordUrl = /^https?:\/\//i.test(keyword.trim());
  const activeStepSource: 'auto' | 'foody' | 'google_maps' =
    tab === 'url' || isKeywordUrl
      ? (detectUrlSource(tab === 'url' ? url || keyword.trim() : keyword.trim()) || 'google_maps')
      : searchSource;

  useEffect(() => {
    let interval: any;
    if (status === 'crawling') {
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
    const trimmed = val.trim();
    // Tự động nhận diện URL thông minh nếu người dùng nhập hoặc dán liên kết Foody / Google Maps
    if (/^https?:\/\//i.test(trimmed)) {
      const source = detectUrlSource(trimmed);
      if (source !== null) {
        setTab('url');
        setUrl(trimmed);
        setKeyword('');
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
    }

    setKeyword(val);
    if (trimmed.length >= 2) {
      const matched = restaurantService.getSearchSuggestions(trimmed);
      setSuggestions(matched);
      setShowSuggestions(matched.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleKeywordPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text').trim();
    if (/^https?:\/\//i.test(pastedText)) {
      const source = detectUrlSource(pastedText);
      if (source !== null) {
        e.preventDefault();
        setTab('url');
        setUrl(pastedText);
        setKeyword('');
        setSuggestions([]);
        setShowSuggestions(false);
      }
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
    setCurrentStep(1);
    setElapsedSeconds(0);
    setStatus('crawling');
    setErrorMessage('');

    try {
      if (tab === 'keyword') {
        const trimmedKeyword = keyword.trim();
        if (!trimmedKeyword) return;

        // Phòng thủ nếu người dùng nhập/dán URL trong tab keyword mà chưa chuyển tab
        if (/^https?:\/\//i.test(trimmedKeyword)) {
          const res = await restaurantService.analyzeFoodyUrl(trimmedKeyword, maxReviews);
          if (res.success && res.restaurant) {
            setStatus('success');
            setTimeout(() => {
              onSuccess(res.restaurant!.id);
              onClose();
              setStatus('idle');
              setKeyword('');
              setUrl('');
            }, 800);
          } else {
            setStatus('error');
            setErrorMessage(res.message || 'Không thể xử lý liên kết này.');
          }
          return;
        }

        const res = await restaurantService.searchAndCrawlFoody(
          trimmedKeyword,
          city,
          maxReviews,
          searchSource
        );
        
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
          setErrorMessage(res.message || 'Không tìm thấy quán nào theo từ khóa này.');
        }
      } else {
        if (!url.trim() || !isUrlValid) return;
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
          setErrorMessage(res.message || 'Không thể xử lý liên kết này.');
        }
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || 'Không thể kết nối tới máy chủ dữ liệu. Vui lòng thử lại sau.');
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
                Tra cứu thông tin hoặc tổng hợp nhận xét từ Foody.vn &amp; Google Maps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={status === 'crawling'}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-[#18181B] hover:bg-zinc-200/60 transition-colors disabled:opacity-40 cursor-pointer"
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
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
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
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              tab === 'url'
                ? 'bg-white text-[#C2410C] shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Dán liên kết trang quán ăn</span>
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {tab === 'keyword' ? (
            <>
              {/* Source Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#18181B] mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>Nguồn dữ liệu tìm kiếm</span>
                    <span className="text-red-500 font-bold" title="Trường bắt buộc">*</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-normal">
                    Đồng bộ &amp; phân tích ABSA tự động
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchSource('auto')}
                    disabled={status === 'crawling'}
                    className={`px-2.5 py-2 rounded-lg border text-left transition-all relative flex flex-col gap-0.5 cursor-pointer ${
                      searchSource === 'auto'
                        ? 'bg-orange-50/70 border-[#C2410C] text-[#C2410C] shadow-xs ring-1 ring-[#C2410C]/20'
                        : 'bg-white border-[#E4E4E7] text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50/60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#C2410C]" />
                      <span className="truncate">Tự động (Ưu tiên)</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight">Foody &amp; Maps</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSearchSource('foody')}
                    disabled={status === 'crawling'}
                    className={`px-2.5 py-2 rounded-lg border text-left transition-all relative flex flex-col gap-0.5 cursor-pointer ${
                      searchSource === 'foody'
                        ? 'bg-orange-50/70 border-[#C2410C] text-[#C2410C] shadow-xs ring-1 ring-[#C2410C]/20'
                        : 'bg-white border-[#E4E4E7] text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50/60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Store className="w-3.5 h-3.5 shrink-0 text-[#C2410C]" />
                      <span className="truncate">Foody.vn</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight">Chỉ Foody.vn</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSearchSource('google_maps')}
                    disabled={status === 'crawling'}
                    className={`px-2.5 py-2 rounded-lg border text-left transition-all relative flex flex-col gap-0.5 cursor-pointer ${
                      searchSource === 'google_maps'
                        ? 'bg-blue-50/70 border-blue-600 text-blue-700 shadow-xs ring-1 ring-blue-600/20'
                        : 'bg-white border-[#E4E4E7] text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50/60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                      <span className="truncate">Google Maps</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight">Cào Maps trực tiếp</p>
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#18181B] flex items-center gap-1">
                    <span>Tên quán ăn hoặc từ khóa món ăn</span>
                    <span className="text-red-500 font-bold" title="Trường bắt buộc">*</span>
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
                    onPaste={handleKeywordPaste}
                    onFocus={() => {
                      if (keyword.trim().length >= 2 && suggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    placeholder="Ví dụ: Bánh tráng Tiên Tiên, Pizza 4P's, Cơm gà Gia Vĩnh..."
                    disabled={status === 'crawling'}
                    className={`w-full text-xs sm:text-sm pl-3.5 pr-9 py-2.5 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20 focus:border-[#C2410C] transition-all text-[#18181B] ${
                      keyword.length > 0 && !isKeywordValid ? 'border-amber-400' : 'border-[#D4D4D8]'
                    }`}
                  />
                  {keyword && status !== 'crawling' && (
                    <button
                      type="button"
                      onClick={() => {
                        setKeyword('');
                        setSuggestions([]);
                        setShowSuggestions(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"
                      title="Xóa nội dung nhập"
                      aria-label="Xóa nội dung nhập"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Autocomplete Dropdown với nút X để đóng */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div
                      ref={dropdownRef}
                      className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-zinc-200 rounded-lg shadow-2xl z-30 overflow-hidden divide-y divide-zinc-100 max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150"
                    >
                      <div className="px-3 py-1.5 bg-zinc-50 border-b border-zinc-200/80 flex items-center justify-between sticky top-0 z-10 backdrop-blur-xs">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Quán có sẵn trong hệ thống ({suggestions.length}):</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSuggestions(false);
                          }}
                          className="p-1 rounded text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200/70 transition-colors cursor-pointer"
                          title="Tắt danh sách gợi ý (hoặc nhấn ESC)"
                          aria-label="Đóng danh sách gợi ý"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {suggestions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectSuggestion(item.id)}
                          className="w-full px-3.5 py-2 text-left hover:bg-orange-50/60 flex items-center justify-between transition-colors group cursor-pointer"
                        >
                          <div>
                            <p className="text-xs font-bold text-zinc-900 group-hover:text-[#C2410C] transition-colors">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              {item.cuisine} • {item.city}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded-md shrink-0">
                            <Zap className="w-2.5 h-2.5" /> Mở ngay
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-[#71717A] mt-1">
                  Nếu quán chưa có trong hệ thống, hệ thống sẽ tự động tìm kiếm và tổng hợp đánh giá thực tế.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#18181B] mb-1.5 flex items-center gap-1">
                  <span>Khu vực / Thành phố</span>
                  <span className="text-red-500 font-bold" title="Trường bắt buộc">*</span>
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={status === 'crawling'}
                  className="w-full text-xs px-3 py-2 bg-zinc-50 border border-[#D4D4D8] rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-800 text-[#18181B] cursor-pointer"
                >
                  <optgroup label="🌟 Thành phố trọng điểm ẩm thực">
                    <option value="da-nang">Đà Nẵng</option>
                    <option value="ho-chi-minh">TP. Hồ Chí Minh</option>
                    <option value="ha-noi">Hà Nội</option>
                    <option value="hai-phong">Hải Phòng</option>
                    <option value="can-tho">Cần Thơ</option>
                    <option value="hue">Thừa Thiên Huế</option>
                    <option value="khanh-hoa">Khánh Hòa (Nha Trang)</option>
                    <option value="lam-dong">Lâm Đồng (Đà Lạt)</option>
                    <option value="vung-tau">Bà Rịa - Vũng Tàu</option>
                    <option value="quang-nam">Quảng Nam (Hội An)</option>
                    <option value="kien-giang">Kiên Giang (Phú Quốc)</option>
                    <option value="quang-ninh">Quảng Ninh (Hạ Long)</option>
                  </optgroup>
                  <optgroup label="🏛️ Tất cả 63 Tỉnh / Thành phố Việt Nam">
                    {VIETNAM_CITIES.map((c) => (
                      <option key={c.name} value={getCitySlug(c.name)}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#18181B] flex items-center gap-1">
                  <span>Đường dẫn trang quán ăn</span>
                  <span className="text-red-500 font-bold" title="Trường bắt buộc">*</span>
                </label>
                {/* Badge nhận diện nguồn thông minh */}
                {detectedUrlSource === 'foody' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-[#C2410C] border border-orange-200/80 text-[10px] font-bold rounded-md animate-in fade-in">
                    <Store className="w-3 h-3 text-[#C2410C]" />
                    Nguồn: Foody.vn
                  </span>
                )}
                {detectedUrlSource === 'google_maps' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-md animate-in fade-in">
                    <MapPin className="w-3 h-3 text-blue-600" />
                    Nguồn: Google Maps
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Dán liên kết từ Foody.vn hoặc Google Maps..."
                  disabled={status === 'crawling'}
                  aria-invalid={url.trim().length > 0 && !isUrlValid}
                  className={`w-full text-xs sm:text-sm pl-3.5 pr-9 py-2.5 bg-white border rounded-lg focus:outline-none focus:ring-2 transition-all text-[#18181B] ${
                    url.trim().length > 0 && !isUrlValid
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 bg-red-50/10'
                      : detectedUrlSource === 'google_maps'
                      ? 'border-blue-400 focus:border-blue-500 focus:ring-blue-500/20'
                      : detectedUrlSource === 'foody'
                      ? 'border-orange-400 focus:border-[#C2410C] focus:ring-[#C2410C]/20'
                      : 'border-[#D4D4D8] focus:border-[#C2410C] focus:ring-[#C2410C]/20'
                  }`}
                />
                {url && status !== 'crawling' && (
                  <button
                    type="button"
                    onClick={() => setUrl('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"
                    title="Xóa đường dẫn"
                    aria-label="Xóa đường dẫn"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {url.trim().length > 0 && !isUrlValid ? (
                <div className="flex items-center gap-1.5 text-[11px] text-red-600 mt-1.5 font-medium animate-in fade-in duration-150">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                  <span>Hỗ trợ liên kết quán ăn từ Foody.vn hoặc Google Maps (Ví dụ: https://www.foody.vn/... hoặc https://www.google.com/maps/place/...)</span>
                </div>
              ) : detectedUrlSource === 'google_maps' ? (
                <div className="flex items-center gap-1.5 text-[11px] text-blue-700 mt-1.5 font-medium animate-in fade-in duration-150">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Đã nhận diện liên kết Google Maps hợp lệ. Sẵn sàng cào qua Playwright và phân tích ABSA!</span>
                </div>
              ) : detectedUrlSource === 'foody' ? (
                <div className="flex items-center gap-1.5 text-[11px] text-orange-700 mt-1.5 font-medium animate-in fade-in duration-150">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C2410C] shrink-0" />
                  <span>Đã nhận diện liên kết Foody.vn hợp lệ. Sẵn sàng tổng hợp và phân tích ABSA!</span>
                </div>
              ) : (
                <p className="text-[11px] text-[#71717A] mt-1.5">
                  Hỗ trợ liên kết quán ăn từ Foody.vn hoặc Google Maps (Ví dụ: https://www.foody.vn/... hoặc https://www.google.com/maps/place/...)
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#18181B] mb-1.5 flex items-center gap-1">
              <span>Số lượng đánh giá thu thập</span>
              <span className="text-red-500 font-bold" title="Trường bắt buộc">*</span>
            </label>
            <select
              value={maxReviews}
              onChange={(e) => setMaxReviews(Number(e.target.value))}
              disabled={status === 'crawling'}
              className="w-full text-xs px-3 py-2 bg-zinc-50 border border-[#D4D4D8] rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-800 text-[#18181B] cursor-pointer"
            >
              <option value={15}>15 đánh giá (Siêu tốc - ~5-8 giây)</option>
              <option value={25}>25 đánh giá (Tiêu chuẩn - ~12-15 giây)</option>
              <option value={40}>40 đánh giá (Chuyên sâu - ~25 giây)</option>
            </select>
          </div>

          {/* Tiến trình đang tổng hợp dữ liệu (Stepper thích ứng theo nguồn) */}
          {status === 'crawling' && (
            <div className={`p-3.5 rounded-xl space-y-2.5 animate-in fade-in border ${
              activeStepSource === 'google_maps'
                ? 'bg-blue-50/80 border-blue-200/80'
                : 'bg-orange-50/80 border-orange-200/80'
            }`}>
              <div className="flex items-center justify-between text-xs font-bold text-[#18181B]">
                <div className="flex items-center gap-2">
                  <Loader2 className={`w-4 h-4 animate-spin ${
                    activeStepSource === 'google_maps' ? 'text-blue-600' : 'text-[#C2410C]'
                  }`} />
                  <span>Đang tổng hợp dữ liệu ({elapsedSeconds}s)</span>
                </div>
                <span className={`text-[10px] font-semibold bg-white px-2 py-0.5 rounded border ${
                  activeStepSource === 'google_maps'
                    ? 'text-blue-700 border-blue-200'
                    : 'text-[#C2410C] border-orange-200'
                }`}>
                  Bước {currentStep}/3
                </span>
              </div>

              {/* 3-Step Timeline */}
              <div className="space-y-1.5 text-xs">
                {/* Step 1 */}
                <div className={`flex items-center gap-2 p-1.5 rounded-md transition-colors ${
                  currentStep === 1
                    ? activeStepSource === 'google_maps'
                      ? 'bg-white shadow-xs font-semibold text-blue-700'
                      : 'bg-white shadow-xs font-semibold text-[#C2410C]'
                    : currentStep > 1
                    ? 'text-emerald-700 bg-emerald-50/60'
                    : 'text-zinc-400'
                }`}>
                  {currentStep > 1 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : currentStep === 1 ? (
                    <Loader2 className={`w-3.5 h-3.5 animate-spin shrink-0 ${
                      activeStepSource === 'google_maps' ? 'text-blue-600' : 'text-[#C2410C]'
                    }`} />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-zinc-300 flex items-center justify-center text-[9px] shrink-0">1</span>
                  )}
                  <span>
                    {activeStepSource === 'google_maps'
                      ? '1. Khởi tạo Playwright ẩn danh & kết nối Google Maps'
                      : activeStepSource === 'auto'
                      ? '1. Tra cứu thông tin quán (Foody & Google Maps)'
                      : '1. Tra cứu thông tin địa điểm quán ăn trên Foody.vn'}
                  </span>
                </div>

                {/* Step 2 */}
                <div className={`flex items-center gap-2 p-1.5 rounded-md transition-colors ${
                  currentStep === 2
                    ? activeStepSource === 'google_maps'
                      ? 'bg-white shadow-xs font-semibold text-blue-700'
                      : 'bg-white shadow-xs font-semibold text-[#C2410C]'
                    : currentStep > 2
                    ? 'text-emerald-700 bg-emerald-50/60'
                    : 'text-zinc-400'
                }`}>
                  {currentStep > 2 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : currentStep === 2 ? (
                    <Loader2 className={`w-3.5 h-3.5 animate-spin shrink-0 ${
                      activeStepSource === 'google_maps' ? 'text-blue-600' : 'text-[#C2410C]'
                    }`} />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-zinc-300 flex items-center justify-center text-[9px] shrink-0">2</span>
                  )}
                  <span>
                    {activeStepSource === 'google_maps'
                      ? `2. Cuộn container đánh giá & lọc trùng lặp SHA-256 (${maxReviews} đánh giá)`
                      : activeStepSource === 'auto'
                      ? `2. Thu thập & lọc trùng lặp ${maxReviews} đánh giá thực tế`
                      : `2. Tổng hợp ${maxReviews} đánh giá thực tế gần nhất`}
                  </span>
                </div>

                {/* Step 3 */}
                <div className={`flex items-center gap-2 p-1.5 rounded-md transition-colors ${
                  currentStep === 3
                    ? activeStepSource === 'google_maps'
                      ? 'bg-white shadow-xs font-semibold text-blue-700'
                      : 'bg-white shadow-xs font-semibold text-[#C2410C]'
                    : 'text-zinc-400'
                }`}>
                  {currentStep === 3 ? (
                    <Loader2 className={`w-3.5 h-3.5 animate-spin shrink-0 ${
                      activeStepSource === 'google_maps' ? 'text-blue-600' : 'text-[#C2410C]'
                    }`} />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-zinc-300 flex items-center justify-center text-[9px] shrink-0">3</span>
                  )}
                  <span>3. Phân tích 5 khía cạnh trải nghiệm bằng Google Gemini AI</span>
                </div>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-xs text-emerald-900 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold">Đã hoàn tất tổng hợp!</p>
                <p className="text-[11px] text-emerald-800/80 mt-0.5">Báo cáo đánh giá đã sẵn sàng. Đang chuyển hướng tới trang chi tiết...</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-xs text-red-900 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Không thể tổng hợp đánh giá</p>
                <p className="text-[11px] text-red-800/80 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
            {!isFormValid && status !== 'crawling' ? (
              <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                <span>{tab === 'keyword' ? 'Nhập tên quán (≥ 2 ký tự) để mở khóa' : 'Dán liên kết hợp lệ để mở khóa'}</span>
              </span>
            ) : <div />}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={status === 'crawling'}
                className="px-4 py-2 text-xs font-medium text-[#71717A] hover:text-[#18181B] transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={status === 'crawling' || !isFormValid}
                className={`inline-flex items-center gap-1.5 px-4.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  isFormValid && status !== 'crawling'
                    ? activeStepSource === 'google_maps'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-900/20 cursor-pointer active:scale-[0.98]'
                      : 'bg-[#C2410C] hover:bg-[#9A3412] text-white shadow-md shadow-orange-900/20 cursor-pointer active:scale-[0.98]'
                    : 'bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-300/60 shadow-none'
                }`}
                title={!isFormValid ? (tab === 'keyword' ? 'Vui lòng nhập tên quán/món ăn (tối thiểu 2 ký tự) để kích hoạt' : 'Vui lòng nhập liên kết quán ăn hợp lệ để kích hoạt') : undefined}
              >
                <Sparkles className={`w-3.5 h-3.5 ${isFormValid ? 'text-amber-200' : 'text-zinc-400'}`} />
                <span>
                  {tab === 'keyword'
                    ? searchSource === 'google_maps'
                      ? 'Tổng hợp từ Google Maps'
                      : searchSource === 'foody'
                      ? 'Tổng hợp từ Foody.vn'
                      : 'Xem báo cáo đánh giá'
                    : detectedUrlSource === 'google_maps'
                    ? 'Tổng hợp từ Google Maps'
                    : detectedUrlSource === 'foody'
                    ? 'Tổng hợp từ Foody.vn'
                    : 'Tổng hợp từ liên kết'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
