import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Globe } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'segmented' | 'toggle';
  size?: 'sm' | 'md';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'segmented',
  size = 'md',
  className = '',
}) => {
  const { language, setLanguage, toggleLanguage, t } = useLanguage();

  const isSmall = size === 'sm';

  if (variant === 'toggle') {
    const isVN = language === 'vi';
    const nextLangTitle = isVN ? t('nav.switchToEn') : t('nav.switchToVi');

    return (
      <button
        type="button"
        onClick={toggleLanguage}
        title={nextLangTitle}
        aria-label={nextLangTitle}
        className={`inline-flex items-center gap-1.5 bg-white border border-[#E8E4DC] hover:border-[#1C1917]/40 rounded-lg font-semibold text-[#1C1917] hover:bg-[#FAF7F2] transition-all shadow-editorial-sm active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#991B1B]/30 ${
          isSmall ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
        } ${className}`}
      >
        <span className="text-sm leading-none" role="img" aria-label={isVN ? 'Vietnam Flag' : 'UK Flag'}>
          {isVN ? '🇻🇳' : '🇬🇧'}
        </span>
        <span className="font-mono tracking-tight text-[11px] font-bold">
          {isVN ? 'VN' : 'EN'}
        </span>
        <Globe className="w-3 h-3 text-[#8C857B] opacity-70" />
      </button>
    );
  }

  // Segmented control [ 🇻🇳 VN | EN 🇬🇧 ]
  return (
    <div
      role="group"
      aria-label={t('nav.language')}
      className={`inline-flex items-center p-0.5 bg-[#F2EFE9] border border-[#E8E4DC] rounded-lg transition-colors ${
        isSmall ? 'text-[10px]' : 'text-xs'
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => setLanguage('vi')}
        aria-label="Tiếng Việt"
        title="Tiếng Việt"
        aria-pressed={language === 'vi'}
        className={`inline-flex items-center gap-1 rounded-md font-semibold transition-all cursor-pointer focus:outline-none ${
          isSmall ? 'px-1.5 py-0.5' : 'px-2 py-1'
        } ${
          language === 'vi'
            ? 'bg-white text-[#1C1917] shadow-xs'
            : 'text-[#78716C] hover:text-[#1C1917]'
        }`}
      >
        <span className="text-xs leading-none" role="img" aria-label="Cờ Việt Nam">
          🇻🇳
        </span>
        <span className="font-mono tracking-tight text-[11px]">VN</span>
      </button>

      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-label="English"
        title="English"
        aria-pressed={language === 'en'}
        className={`inline-flex items-center gap-1 rounded-md font-semibold transition-all cursor-pointer focus:outline-none ${
          isSmall ? 'px-1.5 py-0.5' : 'px-2 py-1'
        } ${
          language === 'en'
            ? 'bg-white text-[#1C1917] shadow-xs'
            : 'text-[#78716C] hover:text-[#1C1917]'
        }`}
      >
        <span className="text-xs leading-none" role="img" aria-label="UK Flag">
          🇬🇧
        </span>
        <span className="font-mono tracking-tight text-[11px]">EN</span>
      </button>
    </div>
  );
};
