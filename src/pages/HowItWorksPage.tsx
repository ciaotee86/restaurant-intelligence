import React from 'react';
import { DownloadCloud, Sparkles, Utensils, BarChart2, CheckCircle, Shield, HeartHandshake, Eye } from 'lucide-react';

interface HowItWorksPageProps {
  onNavigateExplore: () => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onNavigateExplore }) => {
  const steps = [
    {
      number: "01",
      title: "Thu thập đánh giá",
      subtitle: "Ý kiến từ thực khách",
      description: "Tập hợp các nhận xét, số sao và trải nghiệm thực tế mà thực khách đã công khai chia sẻ sau khi đến quán ăn.",
      highlight: "Nguồn gốc minh bạch từ người đi ăn thật."
    },
    {
      number: "02",
      title: "Lọc bỏ bình luận rác",
      subtitle: "Giữ lại thông tin thực chất",
      description: "Tự động loại bỏ các câu từ vô nghĩa, bình luận quảng cáo hoặc nhận xét giả để chỉ giữ lại những trải nghiệm ẩm thực thực tế.",
      highlight: "Thông tin cô đọng, loại bỏ nội dung rác."
    },
    {
      number: "03",
      title: "Đánh giá theo 5 tiêu chí",
      subtitle: "Phân loại khen - chê chi tiết",
      description: "Phân tách rõ ràng: Khách khen món nào? Phàn nàn giá cả ra sao? Phục vụ nhanh hay chậm? Không gian có thoải mái không?",
      highlight: "Đánh giá đa chiều, không bị lẫn lộn."
    },
    {
      number: "04",
      title: "Bức tranh toàn cảnh",
      subtitle: "Báo cáo tức thì",
      description: "Đưa ra bảng điểm hài lòng, danh sách món nên gọi, những điểm trừ cần lưu ý và gợi ý hữu ích cho người đi ăn.",
      highlight: "Tiết kiệm thời gian, chọn đúng quán ngon."
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16">
      
      {/* Tiêu đề trang */}
      <div className="text-center max-w-3xl mx-auto space-y-3.5">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FDF2F2] text-xs font-semibold text-[#991B1B] border border-[#FECACA]">
          <Eye className="w-3.5 h-3.5" />
          <span>Minh bạch & Khách quan</span>
        </div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-[#1C1917] tracking-tight">
          Cách Restaurant Intelligence hoạt động
        </h1>
        <p className="text-sm sm:text-base text-[#57534E] leading-relaxed">
          Làm thế nào để từ hàng trăm nhận xét rời rạc biến thành bức tranh toàn cảnh rõ ràng chỉ trong vài giây?
        </p>
      </div>

      {/* 4 Thẻ quy trình */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="bg-white border border-[#E8E4DC] rounded-2xl p-6 flex flex-col justify-between hover:border-[#991B1B]/40 transition-all shadow-editorial-sm group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-display text-2xl font-bold text-[#991B1B]">
                  {step.number}
                </span>
                <div className="w-9 h-9 rounded-xl bg-[#FDF2F2] border border-[#FECACA] flex items-center justify-center text-[#991B1B] group-hover:bg-[#991B1B] group-hover:text-white transition-colors">
                  {idx === 0 && <DownloadCloud className="w-4 h-4" />}
                  {idx === 1 && <Sparkles className="w-4 h-4" />}
                  {idx === 2 && <Utensils className="w-4 h-4" />}
                  {idx === 3 && <BarChart2 className="w-4 h-4" />}
                </div>
              </div>

              <div className="text-[11px] font-bold uppercase tracking-wider text-[#8C857B] mb-1">
                {step.subtitle}
              </div>
              <h3 className="font-display font-bold text-lg text-[#1C1917] tracking-tight mb-2">
                {step.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed mb-4">
                {step.description}
              </p>
            </div>

            <div className="pt-3 border-t border-[#E8E4DC] text-[11px] font-semibold text-[#065F46] bg-[#ECFDF5] p-2.5 rounded-xl border border-[#A7F3D0]">
              ✓ {step.highlight}
            </div>
          </div>
        ))}
      </section>

      {/* Cam kết chất lượng sản phẩm */}
      <section className="bg-white border border-[#E8E4DC] rounded-2xl p-6 sm:p-10 space-y-6 shadow-editorial-sm">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#991B1B] mb-1">
            Cam kết giá trị
          </div>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#1C1917] tracking-tight">
            Nguyên tắc phục vụ của chúng tôi
          </h2>
          <p className="text-xs sm:text-sm text-[#78716C] mt-1">
            Chúng tôi xây dựng nền tảng này nhằm giải quyết nỗi thất vọng khi đọc phải đánh giá ảo hoặc mất hàng giờ tìm quán ăn.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 text-xs sm:text-sm">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] text-[#065F46] flex items-center justify-center shrink-0 border border-[#A7F3D0]">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-[#1C1917] font-bold block mb-1">Tách bạch rõ ràng khen & chê</strong>
              <span className="text-[#57534E] leading-relaxed">
                Một quán có thể nấu ăn rất ngon nhưng phục vụ chậm hoặc gửi xe khó. Chúng tôi phân tách từng yếu tố để bạn không bị đánh đồng.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center shrink-0 border border-[#BFDBFE]">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-[#1C1917] font-bold block mb-1">Không thiên vị bất kỳ quán nào</strong>
              <span className="text-[#57534E] leading-relaxed">
                Các chỉ số được tổng hợp tự động từ nhận xét thực tế. Không nhận tiền quảng cáo để nói tốt cho quán dở.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#FDF2F2] text-[#991B1B] flex items-center justify-center shrink-0 border border-[#FECACA]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-[#1C1917] font-bold block mb-1">Có thể xem lại đánh giá gốc</strong>
              <span className="text-[#57534E] leading-relaxed">
                Mọi kết luận về món ăn hay thái độ nhân viên đều có thể bấm vào để đọc lại chính xác bình luận nguyên bản của thực khách.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Nút hành động */}
      <div className="text-center pt-2">
        <button
          onClick={onNavigateExplore}
          className="px-6 py-3.5 bg-[#1C1917] hover:bg-[#991B1B] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-editorial-sm"
        >
          Khám phá các quán ăn đã đánh giá ngay →
        </button>
      </div>

    </div>
  );
};
