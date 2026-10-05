import React from 'react';
import { Search, Compass, HelpCircle, PlusCircle, Sparkles } from 'lucide-react';

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
    <header className="sticky top-0 z-40 bg-[#FBF9F5]/95 backdrop-blur-md border-b border-[#E5E3DE] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Editorial Masthead */}
        <div className="flex items-center gap-7">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 text-left group focus:outline-none"
          >
            {/* Artisanal Stamp Logo */}
            <div className="relative">
              <div className="w-8 h-8 rounded bg-[#18181B] text-white flex items-center justify-center font-bold text-sm tracking-tighter shadow-craft-sm group-hover:bg-[#C2410C] transition-colors">
                RI
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#C2410C] border-2 border-[#FBF9F5]" />
            </div>

            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-[#18181B] leading-none group-hover:text-[#C2410C] transition-colors">
                Restaurant Intelligence
              </span>
              <span className="text-[10px] text-[#71717A] tracking-wider uppercase font-semibold mt-1">
                Bản đồ đọc vị ẩm thực đa chiều
              </span>
            </div>
          </button>

          {/* Navigation Links Tiếng Việt */}
          <nav className="hidden md:flex items-center gap-1 pl-2 border-l border-[#E5E3DE]">
            <button
              onClick={() => onNavigate('explore')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                currentView === 'explore'
                  ? 'bg-[#18181B] text-white shadow-2xs'
                  : 'text-[#52525B] hover:text-[#18181B] hover:bg-black/5'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Khám phá quán
            </button>

            <button
              onClick={() => onNavigate('how-it-works')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                currentView === 'how-it-works'
                  ? 'bg-[#18181B] text-white shadow-2xs'
                  : 'text-[#52525B] hover:text-[#18181B] hover:bg-black/5'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Quy trình & Phương pháp
            </button>
          </nav>
        </div>

        {/* Nút hành động phải: Tìm kiếm, Thêm quán từ link Foody */}
        <div className="flex items-center gap-2.5">
          {/* Badge minh bạch */}
          <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-medium text-[#71717A] bg-white px-2.5 py-1.5 rounded-md border border-[#E5E3DE]">
            <Sparkles className="w-3.5 h-3.5 text-[#C2410C]" />
            <span>Lọc sạch seeding & spam</span>
          </div>

          {currentView !== 'home' && (
            <button
              onClick={() => {
                if (onOpenSearch) onOpenSearch();
                else onNavigate('explore');
              }}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E5E3DE] hover:border-zinc-500 rounded-md text-xs font-medium text-[#71717A] hover:text-[#18181B] transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden md:inline">Tìm quán ăn...</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] bg-zinc-100 border border-zinc-200 rounded text-zinc-500 font-mono">
                ⌘K
              </kbd>
            </button>
          )}

          {onOpenAnalyzeModal && (
            <button
              onClick={onOpenAnalyzeModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#C2410C] hover:bg-[#9a3412] text-white rounded-md text-xs font-bold shadow-craft-sm transition-all transform active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Phân tích link Foody</span>
            </button>
          )}
        </div>

      </div>

      {/* Mobile Subnav */}
      <div className="md:hidden flex items-center justify-between border-t border-[#E5E3DE] px-4 py-2 bg-[#FBF9F5] gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onNavigate('home')}
            className={`px-2.5 py-1 rounded font-semibold text-xs ${
              currentView === 'home' ? 'bg-[#18181B] text-white' : 'text-zinc-600'
            }`}
          >
            Trang chủ
          </button>
          <button
            onClick={() => onNavigate('explore')}
            className={`px-2.5 py-1 rounded font-semibold text-xs ${
              currentView === 'explore' ? 'bg-[#18181B] text-white' : 'text-zinc-600'
            }`}
          >
            Khám phá
          </button>
          <button
            onClick={() => onNavigate('how-it-works')}
            className={`px-2.5 py-1 rounded font-semibold text-xs ${
              currentView === 'how-it-works' ? 'bg-[#18181B] text-white' : 'text-zinc-600'
            }`}
          >
            Quy trình
          </button>
        </div>

        {onOpenAnalyzeModal && (
          <button
            onClick={onOpenAnalyzeModal}
            className="px-2.5 py-1 bg-[#C2410C] text-white rounded font-bold text-[11px]"
          >
            + Link Foody
          </button>
        )}
      </div>
    </header>
  );
};
