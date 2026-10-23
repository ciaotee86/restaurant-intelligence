import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { CustomerReview, ReplyTone, GenerateReplyRequest, GenerateReplyResponse } from '../../types/restaurant';
import { restaurantService } from '../../services/restaurantService';
import { AspectPill } from '../common/AspectPill';
import { SentimentBadge } from '../common/SentimentBadge';
import {
  X,
  Sparkles,
  Copy,
  Check,
  Ticket,
  Star,
  MessageSquare,
  HeartHandshake,
  Heart,
  Info,
  Zap,
  AlertCircle,
  FileEdit,
  ShieldCheck
} from 'lucide-react';

export interface ReviewReplyModalProps {
  review: CustomerReview | null;
  restaurantId: string;
  restaurantName?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ToneConfig {
  id: ReplyTone;
  label: string;
  sublabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  activeBorder: string;
  activeBg: string;
}

const TONE_CONFIGS: ToneConfig[] = [
  {
    id: 'apology',
    label: 'Chân thành & Nhận lỗi',
    sublabel: 'Xoa dịu bức xúc',
    description: 'Thừa nhận thiếu sót, cam kết chấn chỉnh dịch vụ và cung cấp hotline hỗ trợ trực tiếp.',
    icon: HeartHandshake,
    accentColor: 'text-red-700',
    activeBorder: 'border-red-600',
    activeBg: 'bg-red-50/70'
  },
  {
    id: 'voucher',
    label: 'Lịch sự & Tặng Voucher',
    sublabel: 'Đền bù ưu đãi 15%',
    description: 'Bày tỏ tiếc nuối và khéo léo gửi tặng mã giảm giá ưu đãi để mời thực khách quay lại.',
    icon: Ticket,
    accentColor: 'text-amber-800',
    activeBorder: 'border-amber-600',
    activeBg: 'bg-amber-50/80'
  },
  {
    id: 'gratitude',
    label: 'Tri ân & Thân thiện',
    sublabel: 'Cảm ơn & Gắn kết',
    description: 'Cảm ơn ấm áp, nhắc lại món ăn được khen ngợi và duy trì tình cảm thân thiết với khách quen.',
    icon: Heart,
    accentColor: 'text-emerald-800',
    activeBorder: 'border-emerald-600',
    activeBg: 'bg-emerald-50/80'
  },
  {
    id: 'clarification',
    label: 'Giải thích & Cầu thị',
    sublabel: 'Minh bạch lý do',
    description: 'Trình bày nhã nhặn về định lượng, quy chuẩn bếp hoặc giờ cao điểm với thái độ tôn trọng.',
    icon: Info,
    accentColor: 'text-stone-800',
    activeBorder: 'border-stone-600',
    activeBg: 'bg-stone-100/80'
  }
];

function determineInitialTone(rev: CustomerReview): ReplyTone {
  if (rev.rating <= 2 || rev.overallSentiment === 'negative') {
    return 'apology';
  }
  if (rev.rating >= 4 || rev.overallSentiment === 'positive') {
    return 'gratitude';
  }
  return 'clarification';
}

interface ModalContentProps {
  review: CustomerReview;
  restaurantId: string;
  restaurantName: string;
  onClose: () => void;
}

const ReviewReplyDialogContent: React.FC<ModalContentProps> = ({
  review,
  restaurantId,
  restaurantName,
  onClose
}) => {
  const initialTone = useMemo(() => determineInitialTone(review), [review]);
  const [selectedTone, setSelectedTone] = useState<ReplyTone>(initialTone);
  const [replyText, setReplyText] = useState<string>('');
  const [cachedReplies, setCachedReplies] = useState<Record<string, GenerateReplyResponse>>({});
  const [currentResponseMeta, setCurrentResponseMeta] = useState<GenerateReplyResponse | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [hasCopiedVoucher, setHasCopiedVoucher] = useState<boolean>(false);

  // Hàm sinh phản hồi từ API Backend / Gemini
  const fetchReply = useCallback(
    async (tone: ReplyTone, forceRegenerate: boolean = false) => {
      const cacheKey = `${review.id}_${tone}`;
      if (!forceRegenerate && cachedReplies[cacheKey]) {
        const cached = cachedReplies[cacheKey];
        setReplyText(cached.replyText);
        setCurrentResponseMeta(cached);
        setErrorMessage(null);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      const requestPayload: GenerateReplyRequest = {
        restaurantId: restaurantId || review.restaurantId,
        restaurantName: restaurantName,
        reviewId: review.id,
        author: review.author,
        rating: review.rating,
        overallSentiment: review.overallSentiment,
        reviewText: review.text,
        aspects: review.aspects,
        tone: tone,
        includeVoucher: tone === 'voucher',
        voucherDiscountPercent: 15,
        forceRegenerate: forceRegenerate
      };

      try {
        const res = await restaurantService.generateReviewReply(
          restaurantId || review.restaurantId,
          requestPayload
        );
        setReplyText(res.replyText);
        setCurrentResponseMeta(res);
        setCachedReplies((prev) => ({
          ...prev,
          [cacheKey]: res
        }));
      } catch (err: any) {
        console.error('[ReviewReplyModal] Lỗi sinh phản hồi AI:', err);
        setErrorMessage(
          err?.message || 'Không thể tạo bản thảo phản hồi từ AI. Vui lòng bấm thử lại.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [review, restaurantId, restaurantName, cachedReplies]
  );

  // Tự động tải phản hồi khi đổi selectedTone
  useEffect(() => {
    let isCancelled = false;
    const run = async () => {
      if (!isCancelled) {
        await fetchReply(selectedTone, false);
      }
    };
    run();
    return () => {
      isCancelled = true;
    };
  }, [selectedTone, fetchReply]);

  // Phím tắt ESC để đóng modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Copy nội dung phản hồi vào Clipboard
  const handleCopyReply = async () => {
    if (!replyText.trim()) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(replyText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = replyText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch (err) {
      console.warn('Lỗi copy clipboard:', err);
    }
  };

  // Copy mã voucher nếu có
  const handleCopyVoucherCode = async () => {
    const code = currentResponseMeta?.generatedVoucherCode;
    if (!code) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      }
      setHasCopiedVoucher(true);
      setTimeout(() => setHasCopiedVoucher(false), 2000);
    } catch (err) {
      console.warn('Lỗi copy voucher:', err);
    }
  };

  // Đếm từ và ký tự
  const textStats = useMemo(() => {
    const chars = replyText.length;
    const words = replyText.trim() ? replyText.trim().split(/\s+/).length : 0;
    return { charCount: chars, wordCount: words };
  }, [replyText]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reply-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card chính */}
      <div className="relative bg-[#FAF9F5] border border-[#E5E3DE] rounded-2xl shadow-editorial-lg w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="bg-white border-b border-[#E5E3DE] px-5 sm:px-7 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C2410C]/10 text-[#C2410C] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-[#C2410C] bg-[#C2410C]/10 px-2 py-0.5 rounded">
                  Hỗ trợ bởi AI
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  Đánh giá của {review.author}
                </span>
              </div>
              <h3 id="reply-modal-title" className="text-lg sm:text-xl font-black text-[#18181B] tracking-tight font-serif">
                Soạn Thư Phản Hồi Thực Khách
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-[#18181B] hover:bg-zinc-100 transition-colors"
            title="Đóng hộp thoại (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung cuộn được */}
        <div className="p-5 sm:p-7 space-y-5 overflow-y-auto max-h-[calc(92vh-130px)]">

          {/* Phần 1: Tóm tắt ngữ cảnh Đánh giá của khách */}
          <div className="bg-white border border-[#E5E3DE] rounded-xl p-4 sm:p-5 shadow-craft-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E3DE] pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1 bg-amber-50 text-amber-950 border border-amber-300 px-2 py-0.5 rounded font-black text-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{review.rating}.0</span>
                </div>
                <span className="text-xs font-bold text-[#18181B] flex items-center gap-1">
                  <span>{review.author}</span>
                  {review.verifiedVisit && (
                    <span title="Đã xác thực"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" /></span>
                  )}
                </span>
                <span className="text-xs text-[#71717A] font-medium font-mono">
                  {review.dateDisplay}
                </span>
              </div>

              <SentimentBadge sentiment={review.overallSentiment} size="sm" />
            </div>

            <p className="text-xs sm:text-sm text-zinc-800 leading-relaxed italic line-clamp-3">
              "{review.text}"
            </p>

            {review.aspects && review.aspects.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-zinc-400 mr-1 uppercase font-mono">
                  Khía cạnh ghi nhận:
                </span>
                {review.aspects.map((asp, idx) => (
                  <AspectPill key={idx} aspect={asp.aspect} sentiment={asp.sentiment} />
                ))}
              </div>
            )}
          </div>

          {/* Phần 2: Bộ chọn 4 Tông Giọng Nghiệp Vụ */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#C2410C]" />
                <span>Chọn tông giọng phản hồi:</span>
              </label>
              <span className="text-[11px] text-zinc-500 font-mono">
                Tự động điều chỉnh theo từng tình huống
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TONE_CONFIGS.map((toneCfg) => {
                const IconComponent = toneCfg.icon;
                const isSelected = selectedTone === toneCfg.id;

                return (
                  <button
                    key={toneCfg.id}
                    type="button"
                    onClick={() => {
                      if (selectedTone !== toneCfg.id) {
                        setSelectedTone(toneCfg.id);
                      }
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? `${toneCfg.activeBorder} ${toneCfg.activeBg} shadow-craft-sm ring-1 ring-offset-1 ring-zinc-900/10`
                        : 'bg-white border-[#E5E3DE] hover:border-zinc-400 hover:bg-zinc-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white shadow-xs' : 'bg-zinc-100'} ${toneCfg.accentColor}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#18181B] font-serif">
                            {toneCfg.label}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-medium">
                            {toneCfg.sublabel}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-[#C2410C] shrink-0 mt-1" />
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-600 mt-2 leading-snug">
                      {toneCfg.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Phần 3: Khung Soạn Thảo Văn Bản & Meta AI */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileEdit className="w-3.5 h-3.5 text-[#C2410C]" />
                <span>Bản nháp phản hồi đề xuất (Chỉnh sửa trực tiếp):</span>
              </label>

              {/* Thông tin phản hồi đề xuất */}
              {currentResponseMeta && !isLoading && (
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-600 bg-white px-2.5 py-1 rounded-lg border border-[#E5E3DE] shadow-2xs">
                  {currentResponseMeta.engineUsed === 'gemini_cache' ? (
                    <>
                      <Zap className="w-3 h-3 text-blue-600" />
                      <span>Đã lưu sẵn</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-[#C2410C]" />
                      <span>Phản hồi gợi ý từ AI</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Thông báo Voucher nếu có */}
            {selectedTone === 'voucher' && currentResponseMeta?.generatedVoucherCode && !isLoading && (
              <div className="flex items-center justify-between bg-amber-50/90 border border-amber-300/80 rounded-xl px-3.5 py-2 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-amber-700" />
                  <span>
                    Mã ưu đãi đã chèn: <strong className="font-mono text-amber-950 font-bold">{currentResponseMeta.generatedVoucherCode}</strong> (Ưu đãi 15%)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyVoucherCode}
                  className="px-2 py-0.5 bg-white border border-amber-300 hover:bg-amber-100 rounded text-[11px] font-bold text-amber-900 transition-colors"
                >
                  {hasCopiedVoucher ? 'Đã chép mã!' : 'Chép mã'}
                </button>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Không thể tạo phản hồi tự động</p>
                  <p className="mt-0.5 text-red-700">{errorMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => fetchReply(selectedTone, true)}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold transition-colors"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* Skeleton Loading State */}
            {isLoading ? (
              <div className="bg-white border border-[#E5E3DE] rounded-xl p-5 space-y-3 animate-pulse">
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 pb-2 border-b border-zinc-100">
                  <Sparkles className="w-4 h-4 text-[#C2410C] animate-spin" />
                  <span>Đang chuẩn bị nội dung phản hồi phù hợp...</span>
                </div>
                <div className="h-4 bg-zinc-100 rounded w-3/4" />
                <div className="h-4 bg-zinc-100 rounded w-full" />
                <div className="h-4 bg-zinc-100 rounded w-5/6" />
                <div className="h-4 bg-zinc-100 rounded w-2/3" />
              </div>
            ) : (
              <div className="relative">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Nội dung thư phản hồi thực khách..."
                  rows={8}
                  className="w-full bg-white border border-[#E5E3DE] rounded-xl p-4 text-xs sm:text-sm text-[#18181B] leading-relaxed focus:outline-none focus:border-[#C2410C] focus:ring-1 focus:ring-[#C2410C] transition-all resize-y font-sans shadow-inner"
                />
                
                {/* Thanh đếm ký tự & từ ngữ */}
                <div className="absolute right-3 bottom-3 flex items-center gap-2 text-[10px] font-mono text-zinc-400 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded border border-[#E5E3DE]/70">
                  <span>{textStats.wordCount} từ</span>
                  <span>•</span>
                  <span>{textStats.charCount} ký tự</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer Hành Động */}
        <div className="bg-white border-t border-[#E5E3DE] px-5 sm:px-7 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Nút Gợi ý câu khác */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => fetchReply(selectedTone, true)}
            className="px-3.5 py-2 bg-white border border-[#E5E3DE] hover:border-zinc-800 text-zinc-800 hover:text-black rounded-xl text-xs font-bold transition-all shadow-craft-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 text-[#C2410C] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Gợi ý câu khác</span>
          </button>

          {/* Nhóm nút Đóng & Sao chép */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-transparent hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 rounded-xl text-xs font-bold transition-colors"
            >
              Đóng (ESC)
            </button>

            <button
              type="button"
              disabled={isLoading || !replyText.trim()}
              onClick={handleCopyReply}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-craft-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                hasCopied
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-[#C2410C] hover:bg-[#9A3412] text-white'
              }`}
            >
              {hasCopied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Đã sao chép!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Sao chép phản hồi</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export const ReviewReplyModal: React.FC<ReviewReplyModalProps> = ({
  review,
  restaurantId,
  restaurantName = 'Nhà hàng',
  isOpen,
  onClose
}) => {
  if (!isOpen || !review) return null;

  return (
    <ReviewReplyDialogContent
      key={review.id}
      review={review}
      restaurantId={restaurantId}
      restaurantName={restaurantName}
      onClose={onClose}
    />
  );
};
