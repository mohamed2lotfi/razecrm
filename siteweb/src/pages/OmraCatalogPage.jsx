import React from 'react';
import { OmraPackages } from '@/components/OmraPackages';
import { HaramHotelsRadar } from '@/components/HaramHotelsRadar';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sparkles } from 'lucide-react';

export const OmraCatalogPage = ({ onSelectPackage, onSelectHotel, onOpenQuoteModal }) => {
  const { t, isArabic } = useLanguage();

  return (
    <div className="pt-28 pb-20 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider mb-4">
          <Sparkles size={13} /> {t('hero_season_badge')}
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
          {isArabic ? 'دليل برامج ورحلات العمرة' : 'Nos Formules & Séjours Omra'}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
          {isArabic 
            ? 'تصفح جميع برامجنا الحصرية إلى مكة المكرمة والمدينة المنورة مع أرقى الفنادق وأفضل خدمات الإرشاد والتنقل.' 
            : 'Découvrez l\'ensemble de nos départs programmés pour La Mecque et Médine avec hébergements de prestige et encadrement VIP.'}
        </p>
      </div>

      <OmraPackages onSelectPackage={onSelectPackage} />

      <HaramHotelsRadar onSelectHotel={onSelectHotel} />
    </div>
  );
};
