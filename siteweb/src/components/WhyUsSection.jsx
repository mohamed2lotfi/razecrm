import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ShieldCheck, HeartHandshake, Award, Headphones } from 'lucide-react';

export const WhyUsSection = () => {
  const { t } = useLanguage();

  const commitments = [
    {
      icon: ShieldCheck,
      title: t('why_1_title'),
      desc: t('why_1_desc')
    },
    {
      icon: Award,
      title: t('why_2_title'),
      desc: t('why_2_desc')
    },
    {
      icon: HeartHandshake,
      title: t('why_3_title'),
      desc: t('why_3_desc')
    },
    {
      icon: Headphones,
      title: t('why_4_title'),
      desc: t('why_4_desc')
    }
  ];

  return (
    <section id="engagements" className="py-24 px-4 sm:px-6 relative max-w-7xl mx-auto">
      <div className="card-bezel-outer bg-gradient-to-b from-slate-100 dark:from-white/5 to-transparent">
        <div className="card-bezel-inner p-8 sm:p-14 bg-white dark:bg-obsidian-900/90 shadow-xl">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-600 dark:text-gold-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Award size={13} /> {t('why_badge')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
              {t('why_title')}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              {t('why_subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {commitments.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex flex-col items-start p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 hover:border-brand-500/40 transition-colors group text-left rtl:text-right">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-5 group-hover:scale-110 transition-transform">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
};
