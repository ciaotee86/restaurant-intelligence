import React from 'react';
import type { CustomerReview } from '../../types/restaurant';
import { TextHighlighter } from '../../utils/textHighlighter';
import { SentimentBadge } from '../common/SentimentBadge';
import { AspectPill } from '../common/AspectPill';
import { X, Calendar, User, Star, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

interface ReviewDetailModalProps {
  review: CustomerReview | null;
  onClose: () => void;
}

export const ReviewDetailModal: React.FC<ReviewDetailModalProps> = ({ review, onClose }) => {
  if (!review) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      {/* Modal Container */}
      <div className="bg-white rounded-xl shadow-2xl border border-[#E4E4E7] w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E4E4E7] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#18181B] tracking-tight">
              Phân tích đánh giá & Trích xuất NLP
            </h3>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
              Mã: {review.id}
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md flex items-center justify-center text-zinc-400 hover:text-[#18181B] hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          
          {/* Metadata Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-50 p-3.5 rounded-lg border border-zinc-200">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center font-bold text-xs">
                <User className="w-4 h-4 text-zinc-600" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#18181B] flex items-center gap-1.5">
                  <span>{review.author}</span>
                  {review.verifiedVisit && (
                    <span className="inline-flex items-center gap-0.5 text-[11px] text-emerald-700 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Đã xác thực trải nghiệm
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#71717A] flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-zinc-400" />
                    {review.dateDisplay}
                  </span>
                  <span>•</span>
                  <span>Nguồn: {review.source}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-zinc-200 text-xs font-semibold text-amber-900">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{review.rating} / 5</span>
              </div>
              <SentimentBadge sentiment={review.overallSentiment} size="md" />
            </div>
          </div>

          {/* Phần 1: Văn bản gốc với Highlight cụm từ cảm xúc */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#18181B] uppercase tracking-wider">
                Đánh giá gốc (Làm nổi bật cụm từ cảm xúc theo khía cạnh)
              </h4>
              <span className="text-[11px] text-zinc-500">
                Màu sắc phản ánh mức độ cảm xúc
              </span>
            </div>

            <div className="p-4 bg-zinc-50/50 rounded-lg border border-zinc-200 text-sm sm:text-base leading-relaxed text-[#18181B]">
              <TextHighlighter
                text={review.text}
                spans={review.highlightSpans}
                showLabels={true}
              />
            </div>
          </div>

          {/* Phần 2: Bảng các khía cạnh trích xuất */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-[#18181B] uppercase tracking-wider">
              Các thực thể khía cạnh phát hiện ({review.aspects.length})
            </h4>

            <div className="border border-zinc-200 rounded-lg overflow-hidden divide-y divide-zinc-100">
              {review.aspects.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AspectPill
                        aspect={item.aspect}
                        sentiment={item.sentiment}
                      />
                      <span className="text-xs font-mono text-zinc-400">
                        Độ tin cậy: {(item.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-[#52525B] font-mono bg-zinc-50 p-1.5 rounded border border-zinc-200 inline-block">
                      "{item.phrase}"
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5 text-xs font-medium">
                    {item.sentiment === 'positive' && (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Phản hồi hài lòng
                      </span>
                    )}
                    {item.sentiment === 'negative' && (
                      <span className="text-red-700 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                        Phản ánh cần cải thiện
                      </span>
                    )}
                    {item.sentiment === 'neutral' && (
                      <span className="text-amber-700 flex items-center gap-1">
                        Ghi nhận trung lập
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phần 3: Chú thích phương pháp luận */}
          <div className="p-3 bg-zinc-100/70 rounded-lg text-xs text-[#71717A] flex items-start gap-2">
            <span className="font-semibold text-zinc-800 shrink-0">Ý nghĩa:</span>
            <span>
              Phân tích đa khía cạnh giúp làm rõ việc một bài đánh giá có thể vừa khen ngợi hương vị món ăn nhưng đồng thời chỉ ra vấn đề về thời gian chờ hoặc tốc độ phục vụ.
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-50 border-t border-[#E4E4E7] px-6 py-3 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#18181B] hover:bg-zinc-800 text-white rounded-md text-xs font-medium transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
