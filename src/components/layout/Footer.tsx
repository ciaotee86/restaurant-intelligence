import React from 'react';
import { Database, ShieldCheck, Sparkles } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: 'home' | 'explore' | 'dashboard' | 'how-it-works', restaurantId?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-white border-t border-[#E5E3DE] text-[#52525B] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Cột 1: Thông tin nền tảng */}
          <div className="md:col-span-2 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-[#18181B] text-white flex items-center justify-center font-black text-xs shadow-craft-sm">
                RI
              </div>
              <span className="font-extrabold text-base text-[#18181B] tracking-tight">
                Restaurant Intelligence
              </span>
            </div>
            <p className="text-xs text-[#71717A] max-w-md leading-relaxed">
              Nền tảng đọc vị đánh giá ẩm thực từ thực khách thực tế. Giúp người đi ăn chọn đúng quán ngon và giúp chủ quán nắm bắt phản hồi chân thực để nâng cao chất lượng phục vụ.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#71717A] pt-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Database className="w-3.5 h-3.5 text-zinc-500" />
                Dữ liệu công khai từ Foody
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Lọc sạch spam & seeding
              </span>
            </div>
          </div>

          {/* Cột 2: Điều hướng */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-[#18181B] uppercase tracking-wider">Nền tảng</h4>
            <ul className="space-y-2 text-xs text-[#71717A] font-medium">
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="hover:text-[#C2410C] transition-colors"
                >
                  Trang chủ
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('explore')}
                  className="hover:text-[#C2410C] transition-colors"
                >
                  Khám phá nhà hàng
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('how-it-works')}
                  className="hover:text-[#C2410C] transition-colors"
                >
                  Quy trình & Phương pháp phân tích
                </button>
              </li>
            </ul>
          </div>

          {/* Cột 3: Nhà hàng tiêu biểu */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-[#18181B] uppercase tracking-wider">Báo cáo tiêu biểu</h4>
            <ul className="space-y-2 text-xs text-[#71717A] font-medium">
              <li>
                <button
                  onClick={() => onNavigate('dashboard', 'pizza-4ps-trang-tien')}
                  className="hover:text-[#C2410C] transition-colors"
                >
                  Pizza 4P's (Tràng Tiền, Hà Nội)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('dashboard', 'pho-thin-lo-duc')}
                  className="hover:text-[#C2410C] transition-colors"
                >
                  Phở Thìn (Lò Đúc, Hà Nội)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('dashboard', 'the-coffee-house-nguyen-trai')}
                  className="hover:text-[#C2410C] transition-colors"
                >
                  The Coffee House (Nguyễn Trãi, TP.HCM)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('dashboard', 'dim-tu-tac-dong-du')}
                  className="hover:text-[#C2410C] transition-colors"
                >
                  Dim Tu Tac (Đông Du, TP.HCM)
                </button>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-[#E5E3DE] mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#71717A]">
          <span>© 2026 Restaurant Intelligence. Phục vụ nghiên cứu và phân tích dữ liệu vận hành ẩm thực.</span>
          <span className="font-mono text-[11px] text-zinc-500">
            Thu thập Foody → Tiền xử lý lọc bot → ABSA 5 khía cạnh → Báo cáo
          </span>
        </div>
      </div>
    </footer>
  );
};
