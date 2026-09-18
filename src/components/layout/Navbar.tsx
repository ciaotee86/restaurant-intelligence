import React from 'react';
import { Search, Compass, HelpCircle, Layers, PlusCircle } from 'lucide-react';

interface NavbarProps {
  currentView: 'home' | 'explore' | 'dashboard' | 'how-it-works';
  onNavigate: (view: 'home' | 'explore' | 'dashboard' | 'how-it-works', restaurantId?: string) => void;
  onOpenSearch?: () => void;
  onOpenAnalyzeModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenSearch,
  onOpenAnalyzeModal
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAFAF8]/95 backdrop-blur-md border-b border-[#E4E4E7] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo & Tên nền tảng */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-8 h-8 rounded bg-[#18181B] text-white flex items-center justify-center font-bold text-sm tracking-tighter shadow-sm group-hover:bg-[#C2410C] transition-colors">
              RI
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-base tracking-tight text-[#18181B] leading-none group-hover:text-[#C2410C] transition-colors">
                Restaurant Intelligence
              </span>
              <span className="text-[11px] text-[#71717A] tracking-wider uppercase font-medium mt-0.5">
                Đọc vị đánh giá ẩm thực
              </span>
            </div>
          </button>

          {/* Navigation Links Tiếng Việt */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onNavigate('explore')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                currentView === 'explore'
                  ? 'bg-zinc-100 text-[#18181B]'
                  : 'text-[#52525B] hover:text-[#18181B] hover:bg-zinc-50'
              }`}
            >
              <Compass className="w-4 h-4 text-[#71717A]" />
              Khám phá quán
            </button>

            <button
              onClick={() => onNavigate('how-it-works')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                currentView === 'how-it-works'
                  ? 'bg-zinc-100 text-[#18181B]'
                  : 'text-[#52525B] hover:text-[#18181B] hover:bg-zinc-50'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-[#71717A]" />
              Cách hoạt động
            </button>
          </nav>
        </div>

        {/* Nút hành động phải: Tìm kiếm, Nút cào URL Foody mới */}
        <div className="flex items-center gap-2.5">
          {onOpenAnalyzeModal && (
            <button
              onClick={onOpenAnalyzeModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C2410C] hover:bg-[#9a3412] text-white rounded-md text-xs font-semibold shadow-2xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Thêm quán mới</span>
            </button>
          )}

          {currentView !== 'home' && (
            <button
              onClick={() => {
                if (onOpenSearch) onOpenSearch();
                else onNavigate('explore');
              }}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E4E4E7] rounded-md text-xs font-medium text-[#71717A] hover:border-zinc-400 hover:text-[#18181B] transition-colors shadow-2xs"
            >
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden md:inline">Tìm quán ăn...</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] bg-zinc-100 border border-zinc-200 rounded text-zinc-500 font-mono">
                ⌘K
              </kbd>
            </button>
          )}

          <div className="hidden xl:flex items-center gap-2 text-xs font-medium text-[#71717A] bg-zinc-100/80 px-2.5 py-1.5 rounded border border-zinc-200/60">
            <Layers className="w-3.5 h-3.5 text-zinc-500" />
            <span>Tổng hợp từ thực khách</span>
          </div>
        </div>

      </div>

      {/* Mobile Subnav */}
      <div className="md:hidden flex items-center justify-between border-t border-[#E4E4E7] px-4 py-2 bg-white gap-2 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('home')}
            className={`px-2.5 py-1 rounded font-medium ${
              currentView === 'home' ? 'bg-zinc-900 text-white' : 'text-zinc-600'
            }`}
          >
            Trang chủ
          </button>
          <button
            onClick={() => onNavigate('explore')}
            className={`px-2.5 py-1 rounded font-medium ${
              currentView === 'explore' ? 'bg-zinc-900 text-white' : 'text-zinc-600'
            }`}
          >
            Nhà hàng
          </button>
          <button
            onClick={() => onNavigate('how-it-works')}
            className={`px-2.5 py-1 rounded font-medium ${
              currentView === 'how-it-works' ? 'bg-zinc-900 text-white' : 'text-zinc-600'
            }`}
          >
            Quy trình
          </button>
        </div>

        {onOpenAnalyzeModal && (
          <button
            onClick={onOpenAnalyzeModal}
            className="px-2.5 py-1 bg-[#C2410C] text-white rounded font-medium text-[11px]"
          >
            + Link Foody
          </button>
        )}
      </div>
    </header>
  );
};
