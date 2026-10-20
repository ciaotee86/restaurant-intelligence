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
    <header className="sticky top-0 z-40 bg-[#F8F6F0]/92 backdrop-blur-md border-b border-[#E8E4DC] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Editorial Masthead */}
        <div className="flex items-center gap-7">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 text-left group focus:outline-none"
          >
            {/* Artisanal Culinary Seal */}
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-[#991B1B] text-white flex items-center justify-center font-display font-bold text-sm tracking-tighter shadow-editorial-sm group-hover:bg-[#7F1D1D] transition-colors">
                RI
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#D97706] border-2 border-[#F8F6F0]" />
            </div>

            <div className="flex flex-col">
              <span className="font-display font-bold text-lg tracking-tight text-[#1C1917] leading-none group-hover:text-[#991B1B] transition-colors">
                Restaurant Intelligence
              </span>
              <span className="text-[10px] text-[#8C857B] tracking-wider uppercase font-medium mt-1">
                Bản đồ đọc vị ẩm thực đa chiều
              </span>
            </div>
          </button>

          {/* Navigation Links Tiếng Việt */}
          <nav className="hidden md:flex items-center gap-1.5 pl-3 border-l border-[#E8E4DC]">
            <button
              onClick={() => onNavigate('explore')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                currentView === 'explore'
                  ? 'bg-[#1C1917] text-white shadow-editorial-sm'
                  : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#1C1917]/5'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Khám phá quán
            </button>

            <button
              onClick={() => onNavigate('how-it-works')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                currentView === 'how-it-works'
                  ? 'bg-[#1C1917] text-white shadow-editorial-sm'
                  : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#1C1917]/5'
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
          <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-medium text-[#57534E] bg-white px-3 py-1.5 rounded-md border border-[#E8E4DC] shadow-editorial-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
            <span>Đánh giá thực tế & Khách quan</span>
          </div>

          {currentView !== 'home' && (
            <button
              onClick={() => {
                if (onOpenSearch) onOpenSearch();
                else onNavigate('explore');
              }}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E8E4DC] hover:border-[#1C1917]/40 rounded-md text-xs font-medium text-[#57534E] hover:text-[#1C1917] transition-colors shadow-editorial-sm"
            >
              <Search className="w-3.5 h-3.5 text-[#8C857B]" />
              <span className="hidden md:inline">Tìm quán ăn...</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] bg-[#F2EFE9] border border-[#E8E4DC] rounded text-[#8C857B] font-mono">
                ⌘K
              </kbd>
            </button>
          )}

          {onOpenAnalyzeModal && (
            <button
              onClick={onOpenAnalyzeModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#991B1B] hover:bg-[#7F1D1D] text-white rounded-md text-xs font-bold shadow-editorial-sm transition-all transform active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Khảo sát quán mới</span>
            </button>
          )}
        </div>

      </div>

      {/* Mobile Subnav */}
      <div className="md:hidden flex items-center justify-between border-t border-[#E8E4DC] px-4 py-2 bg-[#F8F6F0] gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onNavigate('home')}
            className={`px-2.5 py-1 rounded font-medium text-xs ${
              currentView === 'home' ? 'bg-[#1C1917] text-white' : 'text-[#57534E]'
            }`}
          >
            Trang chủ
          </button>
          <button
            onClick={() => onNavigate('explore')}
            className={`px-2.5 py-1 rounded font-medium text-xs ${
              currentView === 'explore' ? 'bg-[#1C1917] text-white' : 'text-[#57534E]'
            }`}
          >
            Khám phá
          </button>
          <button
            onClick={() => onNavigate('how-it-works')}
            className={`px-2.5 py-1 rounded font-medium text-xs ${
              currentView === 'how-it-works' ? 'bg-[#1C1917] text-white' : 'text-[#57534E]'
            }`}
          >
            Quy trình
          </button>
        </div>

        {onOpenAnalyzeModal && (
          <button
            onClick={onOpenAnalyzeModal}
            className="px-2.5 py-1 bg-[#991B1B] text-white rounded font-bold text-[11px]"
          >
            + Thêm quán
          </button>
        )}
      </div>
    </header>
  );
};
