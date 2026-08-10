import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { MapPin, Phone, Mail, Clock, ShieldCheck } from 'lucide-react';

export const Footer = () => {
  const { t, isArabic } = useLanguage();

  return (
    <footer className="border-t border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-obsidian-950 pt-16 pb-12 px-4 sm:px-6 relative overflow-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-200 dark:border-white/5">
        
        {/* Brand Column */}
        <div className="lg:col-span-2 space-y-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white dark:bg-white/10 p-1 flex items-center justify-center border border-slate-200 dark:border-white/15 shadow-sm overflow-hidden flex-shrink-0">
              <img src="/logo.png" alt="Agence El-Mokhtar" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">
                {isArabic ? 'وكالة المختار' : 'AGENCE EL-MOKHTAR'}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-gold-600 dark:text-gold-400 font-bold mt-0.5">
                {t('agency_sub')}
              </span>
            </div>
          </Link>

          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed">
            {t('agency_desc')}
          </p>

          <div className="flex items-center gap-2 pt-2 text-xs text-brand-600 dark:text-brand-400 font-bold">
            <ShieldCheck size={16} />
            <span>{t('license_badge')}</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">{t('footer_quick_omra')}</h4>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <li><Link to="/programme-omra" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors font-bold text-brand-600 dark:text-brand-400">{t('nav_program')}</Link></li>
            <li><Link to="/omra" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Omra Ramadan 1447</Link></li>
            <li><Link to="/omra" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Omra Confort 5★</Link></li>
            <li><Link to="/omra" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Omra VIP Prestige</Link></li>
          </ul>
        </div>

        {/* Visas */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">{t('footer_quick_visas')}</h4>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <li><Link to="/visas" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">E-Visa Arabie Saoudite</Link></li>
            <li><Link to="/visas" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Visa Dubaï Touristique</Link></li>
            <li><Link to="/visas" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">E-Visa Turquie</Link></li>
            <li><Link to="/visas" className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors">Visa Égypte & Schengen</Link></li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">{t('footer_contact_title')}</h4>
          <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
            <li className="flex items-start gap-2">
              <MapPin size={14} className="text-brand-500 flex-shrink-0 mt-0.5" />
              <span>{t('footer_address')}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={14} className="text-brand-500 flex-shrink-0" />
              <span className="font-mono text-slate-900 dark:text-white font-semibold" dir="ltr">+213 (0) 555 00 00 00</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={14} className="text-brand-500 flex-shrink-0" />
              <span>contact@agence-elmokhtar.com</span>
            </li>
            <li className="flex items-center gap-2">
              <Clock size={14} className="text-brand-500 flex-shrink-0" />
              <span>{t('footer_hours')}</span>
            </li>
          </ul>
        </div>

      </div>

      <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} {isArabic ? 'وكالة المختار للسياحة والأسفار' : 'Agence El-Mokhtar'}. {t('footer_rights')}</p>
        <div className="flex items-center gap-6">
          <Link to="/connexion" className="hover:text-brand-600 dark:hover:text-slate-300">{t('nav_client_portal')}</Link>
          <Link to="/#engagements" className="hover:text-brand-600 dark:hover:text-slate-300">{t('footer_terms')}</Link>
          <Link to="/#engagements" className="hover:text-brand-600 dark:hover:text-slate-300">{t('footer_privacy')}</Link>
        </div>
      </div>
    </footer>
  );
};
