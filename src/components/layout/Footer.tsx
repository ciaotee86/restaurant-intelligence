import React from 'react';
import { Database, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: 'home' | 'explore' | 'dashboard' | 'how-it-works', restaurantId?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-white border-t border-[#E4E4E7] text-[#52525B] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Cột 1: Thông tin nền tảng */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#18181B] text-white flex items-center justify-center font-bold text-xs">
                RI
              </div>
              <span className="font-semibold text-sm text-[#18181B] tracking-tight">
                Restaurant Intelligence
              </span>
            </div>
            <p className="text-xs text-[#71717A] max-w-md leading-relaxed">
              Nền tảng đọc vị đánh giá ẩm thực từ thực khách thực tế. Giúp thực khách chọn đúng quán ngon và giúp chủ quán nắm bắt phản hồi để nâng cao chất lượng phục vụ.
            </p>
            <div className="flex items-center gap-4 text-[11px] text-[#71717A] pt-1">
              <span className="flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-zinc-400" />
                Nguồn: Tổng hợp từ nhận xét công khai trên Foody
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                Hoàn toàn miễn phí · Tra cứu tức thì
              </span>
            </div>
          </div>

          {/* Cột 2: Điều hướng */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-[#18181B] uppercase tracking-wider">Nền tảng</h4>
            <ul className="space-y-1.5 text-xs text-[#71717A]">
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="hover:text-[#18181B] transition-colors"
                >
                  Trang chủ
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('explore')}
                  className="hover:text-[#18181B] transition-colors"
                >
                  Khám phá nhà hàng
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('how-it-works')}
                  className="hover:text-[#18181B] transition-colors"
                >
                  Quy trình & Phương pháp phân tích
                </button>
              </li>
            </ul>
          </div>

          {/* Cột 3: Nhà hàng phân tích mẫu */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold text-[#18181B] uppercase tracking-wider">Nhà hàng tiêu biểu</h4>
            <ul className="space-y-1.5 text-xs text-[#71717A]">
              <li>
                <button
                  onClick={() => onNavigate('dashboard', 'pizza-4ps-trang-tien')}
                  className="hover:text-[#18181B] transition-colors"
                >
                  Pizza 4P's (Tràng Tiền, Hà Nội)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('dashboard', 'pho-thin-lo-duc')}
                  className="hover:text-[#18181B] transition-colors"
                >
                  Phở Thìn (Lò Đúc, Hà Nội)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('dashboard', 'the-coffee-house-nguyen-trai')}
                  className="hover:text-[#18181B] transition-colors"
                >
                  The Coffee House (Nguyễn Trãi, TP.HCM)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('dashboard', 'dim-tu-tac-dong-du')}
                  className="hover:text-[#18181B] transition-colors"
                >
                  Dim Tu Tac (Đông Du, TP.HCM)
                </button>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-[#E4E4E7] mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#71717A]">
          <span>© 2026 Restaurant Intelligence. Phục vụ nghiên cứu và phân tích dữ liệu vận hành nhà hàng.</span>
          <span className="font-mono text-[11px] text-zinc-400">Luồng xử lý: Thu thập → Tiền xử lý → ABSA → Tổng hợp chỉ số</span>
        </div>
      </div>
    </footer>
  );
};
