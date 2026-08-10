import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sparkles, ArrowRight, ArrowLeft, ShieldCheck, Compass, Plane, Users, Star, Award, CheckCircle2 } from 'lucide-react';

// Composant d'Arrière-Plan : Lignes de trajectoires de vols célestes (Ultra-Légères & 100% Fluides, 0% CPU)
const FlightSkyBackground = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      
      {/* Background SVG Vector Lines (Statiques, sans filtres lourds pour une fluidité maximale) */}
      <svg 
        className="w-full h-full min-w-[900px] min-h-[500px] opacity-40 dark:opacity-60" 
        viewBox="0 0 1440 700" 
        preserveAspectRatio="xMidYMid slice"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradient doré & émeraude de la trajectoire principale */}
          <linearGradient id="flightTrailGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34783B" stopOpacity="0" />
            <stop offset="25%" stopColor="#34783B" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#D89F35" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#34783B" stopOpacity="0" />
          </linearGradient>

          {/* Gradient doré & émeraude de la trajectoire secondaire */}
          <linearGradient id="flightTrailGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#D89F35" stopOpacity="0" />
            <stop offset="35%" stopColor="#D89F35" stopOpacity="0.75" />
            <stop offset="75%" stopColor="#34783B" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#D89F35" stopOpacity="0" />
          </linearGradient>

          {/* Gradient de l'arc supérieur */}
          <linearGradient id="flightTrailGradient3" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34783B" stopOpacity="0" />
            <stop offset="50%" stopColor="#D89F35" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#34783B" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* LIGNE 1 : Trajectoire Principale (Algérie -> Lieux Saints) */}
        <path
          d="M -80,560 C 220,520 400,230 720,310 C 1020,390 1200,160 1520,90"
          stroke="url(#flightTrailGradient1)"
          strokeWidth="2"
          strokeDasharray="6 6"
        />

        {/* LIGNE 2 : Trajectoire Diagonale Inverse */}
        <path
          d="M 1520,580 C 1180,480 960,180 640,260 C 340,340 180,120 -80,200"
          stroke="url(#flightTrailGradient2)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />

        {/* LIGNE 3 : Grand Arc Céleste Supérieur */}
        <path
          d="M -100,280 C 300,100 800,90 1200,220 C 1350,270 1480,340 1600,420"
          stroke="url(#flightTrailGradient3)"
          strokeWidth="1.5"
          strokeDasharray="5 7"
        />
      </svg>
    </div>
  );
};

export const HeroSection = ({ onOpenQuoteModal }) => {
  const { t, isArabic } = useLanguage();
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  return (
    <section className="relative min-h-[95dvh] flex flex-col justify-center items-center pt-32 pb-20 px-4 sm:px-6 overflow-hidden">
      
      {/* ✈️ Vector Flight Trajectory Lines (High Performance) */}
      <FlightSkyBackground />

      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-brand-500/15 via-gold-500/10 to-transparent rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-brand-600/10 rounded-full blur-[80px] pointer-events-none" />
      
      {/* Subtle Texture Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#00000008_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />

      <div className="relative z-10 max-w-5xl mx-auto text-center flex flex-col items-center">
        
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 dark:bg-white/5 border border-brand-500/20 dark:border-white/10 backdrop-blur-md text-brand-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-8 shadow-inner animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          <span>{t('agency_name')}</span>
          <span className="text-slate-300 dark:text-white/20">•</span>
          <span className="text-gold-600 dark:text-gold-400 font-extrabold">{t('hero_season_badge')}</span>
        </div>

        {/* Cinematic Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.12] max-w-4xl mb-6 animate-fade-up">
          {t('hero_title_prefix')} <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-gold-500 bg-clip-text text-transparent">{t('hero_title_highlight')}</span> {t('hero_title_suffix')}
        </h1>

        {/* Subtext */}
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl font-medium leading-relaxed mb-10 animate-fade-up" style={{ animationDelay: '150ms' }}>
          {t('hero_subtitle')}
        </p>

        {/* Interactive Action Bar (Double-Bezel style) */}
        <div className="w-full max-w-3xl card-bezel-outer shadow-2xl mb-12 animate-fade-up" style={{ animationDelay: '300ms' }}>
          <div className="card-bezel-inner p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Quick feature tags */}
            <div className="grid grid-cols-3 gap-3 w-full sm:w-auto flex-1 text-left rtl:text-right">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <Compass className="w-4 h-4 text-brand-500 flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">{t('hero_card_stays')}</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-white truncate">{t('hero_card_stays_sub')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <Plane className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">{t('hero_card_services')}</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-white truncate">{t('hero_card_services_sub')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <ShieldCheck className="w-4 h-4 text-gold-500 flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">{t('hero_card_support')}</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-white truncate">{t('hero_card_support_sub')}</span>
                </div>
              </div>
            </div>

            {/* Primary CTA Button */}
            <button
              onClick={onOpenQuoteModal}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-bold text-sm shadow-xl shadow-brand-600/30 transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            >
              <span>{t('hero_cta')}</span>
              <ArrowIcon size={16} />
            </button>
          </div>
        </div>

        {/* Trust Badges & Stats Monolith Ribbon (Tasteskills Architectural Edition) */}
        <div className="w-full max-w-5xl pt-6 animate-fade-up" style={{ animationDelay: '400ms' }}>
          <div className="card-bezel-outer shadow-2xl rounded-[2rem] p-1.5 bg-slate-900/5 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 backdrop-blur-2xl">
            <div className="card-bezel-inner rounded-[calc(2rem-0.375rem)] bg-white/85 dark:bg-[#070e0a]/95 grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse divide-slate-200/60 dark:divide-white/10 overflow-hidden">
              
              {/* Segment 1: Pèlerins */}
              <div className="p-4 sm:p-6 flex flex-col justify-between text-left rtl:text-right hover:bg-brand-500/[0.03] dark:hover:bg-white/[0.02] transition-colors duration-300 group">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight bg-gradient-to-br from-slate-950 via-slate-800 to-slate-600 dark:from-white dark:via-slate-100 dark:to-slate-300 bg-clip-text text-transparent group-hover:from-brand-600 group-hover:to-brand-500 transition-all">
                    {t('hero_stat_pilgrims')}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Users size={16} />
                  </div>
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white block leading-snug">
                    {t('hero_stat_pilgrims_label')}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                    {t('hero_stat_pilgrims_sub')}
                  </span>
                </div>
              </div>

              {/* Segment 2: Satisfaction */}
              <div className="p-4 sm:p-6 flex flex-col justify-between text-left rtl:text-right hover:bg-brand-500/[0.03] dark:hover:bg-white/[0.02] transition-colors duration-300 group">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight bg-gradient-to-r from-emerald-600 via-brand-500 to-teal-500 bg-clip-text text-transparent">
                    {t('hero_stat_satisfaction')}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Star size={16} className="fill-brand-500/20" />
                  </div>
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white block leading-snug">
                    {t('hero_stat_satisfaction_label')}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                    {t('hero_stat_satisfaction_sub')}
                  </span>
                </div>
              </div>

              {/* Segment 3: Expérience */}
              <div className="p-4 sm:p-6 flex flex-col justify-between text-left rtl:text-right hover:bg-gold-500/[0.03] dark:hover:bg-white/[0.02] transition-colors duration-300 group">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight bg-gradient-to-r from-amber-500 via-gold-500 to-amber-600 bg-clip-text text-transparent">
                    {t('hero_stat_experience')}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-600 dark:text-gold-400 flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Award size={16} />
                  </div>
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white block leading-snug">
                    {t('hero_stat_experience_label')}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                    {t('hero_stat_experience_sub')}
                  </span>
                </div>
              </div>

              {/* Segment 4: Digital & Visas */}
              <div className="p-4 sm:p-6 flex flex-col justify-between text-left rtl:text-right hover:bg-brand-500/[0.03] dark:hover:bg-white/[0.02] transition-colors duration-300 group">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight bg-gradient-to-br from-slate-950 via-slate-800 to-slate-600 dark:from-white dark:via-slate-100 dark:to-slate-300 bg-clip-text text-transparent group-hover:from-gold-600 group-hover:to-gold-500 transition-all">
                    {t('hero_stat_digital')}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-slate-500/10 dark:bg-white/10 border border-slate-300 dark:border-white/15 flex items-center justify-center text-slate-700 dark:text-slate-300 flex-shrink-0 group-hover:scale-110 transition-transform">
                    <CheckCircle2 size={16} />
                  </div>
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white block leading-snug">
                    {t('hero_stat_digital_label')}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                    {t('hero_stat_digital_sub')}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
