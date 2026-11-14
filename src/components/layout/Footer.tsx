import React from 'react';
import { Store, ShieldCheck } from 'lucide-react';
import { BrandMark } from '../common/BrandLogo';
import { useLanguage } from '../../context/LanguageContext';

interface FooterProps {
  onNavigate: (view: 'home' | 'explore' | 'dashboard' | 'how-it-works', restaurantId?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { t } = useLanguage();

  return (
    <footer className="bg-[#F2EFE9] border-t border-[#E8E4DC] text-[#57534E] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Cột 1: Thông tin nền tảng */}
          <div className="md:col-span-2 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#991B1B]/5 border border-[#991B1B]/15 flex items-center justify-center p-1">
                <BrandMark className="w-full h-full drop-shadow-sm" />
              </div>
              <span className="font-display font-bold text-base text-[#1C1917] tracking-tight">
                Restaurant Intelligence
              </span>
            </div>
            <p className="text-xs text-[#78716C] max-w-md leading-relaxed">
              {t('footer.description')}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#78716C] pt-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Store className="w-3.5 h-3.5 text-[#8C857B]" />
                {t('footer.dinerSurvey')}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#065F46]" />
                {t('footer.filterSpam')}
              </span>
            </div>
          </div>

          {/* Cột 2: Điều hướng */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">{t('footer.platform')}</h4>
            <ul className="space-y-2 text-xs text-[#78716C] font-medium">
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="hover:text-[#991B1B] transition-colors"
                >
                  {t('footer.home')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('explore')}
                  className="hover:text-[#991B1B] transition-colors"
                >
                  {t('footer.explore')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('how-it-works')}
                  className="hover:text-[#991B1B] transition-colors"
                >
                  {t('footer.methodology')}
                </button>
              </li>
            </ul>
          </div>

          {/* Cột 3: Nhà hàng tiêu biểu */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">{t('footer.featuredReports')}</h4>
            <ul className="space-y-2 text-xs text-[#78716C] font-medium">
              <li>
                <button
                  onClick={() => onNavigate('dashboard', 'pizza-4ps-trang-tien')}
                  className="hover:text-[#991B1B] transition-colors"
                >
                  Pizza 4P's (Tràng Tiền, Hà Nội)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('dashboard', 'pho-thin-lo-duc')}
                  className="hover:text-[#991B1B] transition-colors"
                >
                  Phở Thìn (Lò Đúc, Hà Nội)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('dashboard', 'the-coffee-house-nguyen-trai')}
                  className="hover:text-[#991B1B] transition-colors"
                >
                  The Coffee House (Nguyễn Trãi, TP.HCM)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('dashboard', 'dim-tu-tac-dong-du')}
                  className="hover:text-[#991B1B] transition-colors"
                >
                  Dim Tu Tac (Đông Du, TP.HCM)
                </button>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-[#E8E4DC] mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#78716C]">
          <span>{t('footer.copyright')}</span>
          <span className="font-mono text-[11px] text-[#A8A29E]">
            {t('footer.pipeline')}
          </span>
        </div>
      </div>
    </footer>
  );
};
