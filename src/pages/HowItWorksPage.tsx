import React from 'react';
import { DownloadCloud, Sparkles, Cpu, BarChart2, CheckCircle, Database, Server, Terminal, Shield } from 'lucide-react';

interface HowItWorksPageProps {
  onNavigateExplore: () => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onNavigateExplore }) => {
  const steps = [
    {
      number: "01",
      title: "Thu thập (Collect)",
      subtitle: "Trích xuất dữ liệu",
      description: "Đánh giá của khách hàng, số sao, thời gian đăng tải và nội dung bình luận được thu thập từ nền tảng nguồn (Foody).",
      icon: DownloadCloud,
      technicalDetails: "Hệ thống crawler Selenium tự động trích xuất nội dung bài viết thô, đánh dấu lượt ghé thăm và thông tin ngữ cảnh."
    },
    {
      number: "02",
      title: "Tiền xử lý (Process)",
      subtitle: "Chuẩn hóa văn bản tiếng Việt",
      description: "Văn bản nhận xét tiếng Việt được làm sạch, tách từ (tokenization), loại bỏ nhiễu, sửa lỗi chính tả và chuẩn hóa ngữ pháp.",
      icon: Sparkles,
      technicalDetails: "Áp dụng công cụ tách từ tiếng Việt (VnCoreNLP), xử lý từ dừng (stopwords), teencode và chuẩn hóa dấu câu tiếng Việt."
    },
    {
      number: "03",
      title: "Phân tích (Analyze)",
      subtitle: "Phân tích cảm xúc theo khía cạnh (ABSA)",
      description: "Mô hình NLP nhận diện phân cực cảm xúc (tích cực, trung lập, tiêu cực) gán cho 5 khía cạnh cốt lõi: Món ăn, Dịch vụ, Giá cả, Không gian và Vị trí.",
      icon: Cpu,
      technicalDetails: "Mô hình Transformer PhoBERT tinh chỉnh trích xuất các thực thể khía cạnh và chấm điểm cảm xúc từng cụm từ kèm độ tin cậy."
    },
    {
      number: "04",
      title: "Thấu hiểu (Understand)",
      subtitle: "Tổng hợp chỉ số thông minh",
      description: "Hệ thống tổng hợp dữ liệu thành các chỉ số cấp cao, biểu đồ xu hướng thời gian, cụm vấn đề cần khắc phục và đề xuất vận hành.",
      icon: BarChart2,
      technicalDetails: "Công cụ thống kê tính toán tỷ lệ hài lòng theo khía cạnh, tần suất khiếu nại và lập báo cáo phục vụ quản lý nhà hàng."
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16">
      
      {/* Tiêu đề trang */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 border border-zinc-200">
          <Database className="w-3.5 h-3.5 text-[#C2410C]" />
          <span>Kiến trúc hệ thống & Phương pháp luận</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#18181B] tracking-tight">
          Quy trình hoạt động
        </h1>
        <p className="text-sm sm:text-base text-[#52525B] leading-relaxed">
          Từ các bài đánh giá phi cấu trúc trên Foody đến các chỉ số vận hành có chiều sâu theo từng khía cạnh.
        </p>
      </div>

      {/* 4 Thẻ quy trình */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={idx}
              className="bg-white border border-[#E4E4E7] rounded-xl p-6 flex flex-col justify-between hover:border-zinc-400 transition-colors shadow-2xs group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-2xl font-bold text-[#C2410C]">
                    {step.number}
                  </span>
                  <div className="w-9 h-9 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-700 group-hover:bg-orange-50 group-hover:text-[#C2410C] transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-0.5">
                  {step.subtitle}
                </div>
                <h3 className="text-xl font-bold text-[#18181B] tracking-tight mb-2">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#52525B] leading-relaxed mb-4">
                  {step.description}
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-100 text-[11px] text-[#71717A] bg-zinc-50/70 p-2.5 rounded border border-zinc-100">
                <strong className="text-zinc-800 font-semibold block mb-0.5">Kỹ thuật:</strong>
                {step.technicalDetails}
              </div>
            </div>
          );
        })}
      </section>

      {/* Sơ đồ kiến trúc luồng dữ liệu */}
      <section className="bg-white border border-[#E4E4E7] rounded-xl p-6 sm:p-8 space-y-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#C2410C] mb-1">
            Luồng dữ liệu
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#18181B] tracking-tight">
            Kiến trúc luồng xử lý đầu-cuối
          </h2>
          <p className="text-xs sm:text-sm text-[#71717A] mt-1">
            Được thiết kế theo cấu trúc module linh hoạt giữa crawler thu thập, dịch vụ suy luận NLP và giao diện phân tích phía client.
          </p>
        </div>

        {/* Khung sơ đồ trực quan */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center">
          <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-lg flex flex-col items-center justify-center">
            <Server className="w-6 h-6 text-zinc-700 mb-2" />
            <span className="text-xs font-bold text-[#18181B]">Cổng Foody</span>
            <span className="text-[10px] text-zinc-500 font-mono mt-0.5">Bộ thu thập Selenium</span>
          </div>

          <div className="flex items-center justify-center text-zinc-300 font-mono text-lg hidden md:flex">
            →
          </div>

          <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-lg flex flex-col items-center justify-center">
            <Terminal className="w-6 h-6 text-[#C2410C] mb-2" />
            <span className="text-xs font-bold text-[#18181B]">Mô hình NLP ABSA</span>
            <span className="text-[10px] text-zinc-500 font-mono mt-0.5">PhoBERT / Bộ tách khía cạnh</span>
          </div>

          <div className="flex items-center justify-center text-zinc-300 font-mono text-lg hidden md:flex">
            →
          </div>

          <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-lg flex flex-col items-center justify-center">
            <BarChart2 className="w-6 h-6 text-emerald-600 mb-2" />
            <span className="text-xs font-bold text-[#18181B]">Restaurant Intelligence</span>
            <span className="text-[10px] text-zinc-500 font-mono mt-0.5">React / Tailwind / Giao diện BI</span>
          </div>
        </div>

        {/* Cam kết phương pháp luận */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-zinc-100 text-xs">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#18181B] font-semibold block">Độ chi tiết cấp khía cạnh</strong>
              <span className="text-[#52525B]">Phân tách rõ ràng các nhận xét vừa khen món ăn nhưng vừa phàn nàn về dịch vụ hoặc thời gian chờ.</span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#18181B] font-semibold block">Minh bạch nguồn gốc</strong>
              <span className="text-[#52525B]">Mọi chỉ số tổng hợp đều có thể truy vết trực tiếp về trích đoạn bài viết thực tế từ thực khách.</span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#18181B] font-semibold block">Chuẩn mực Business Intelligence</strong>
              <span className="text-[#52525B]">Không tạo nội dung ảo hay hội thoại lan man; hoàn toàn tập trung vào dữ liệu và chỉ số định lượng.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Nút hành động */}
      <div className="text-center pt-4">
        <button
          onClick={onNavigateExplore}
          className="px-6 py-3 bg-[#18181B] hover:bg-[#C2410C] text-white font-semibold text-sm rounded-lg transition-colors shadow-sm"
        >
          Khám phá các nhà hàng đã phân tích ngay →
        </button>
      </div>

    </div>
  );
};
