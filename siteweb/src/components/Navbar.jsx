import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Sun, Moon, Globe, LogIn, Menu, X, ArrowUpRight, Languages 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Navbar = ({ onOpenQuoteModal }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, clientProfile, isAuthenticated } = useClientAuth();
  const { isDark, toggleTheme } = useTheme();
  const { lang, isArabic, toggleLang, t } = useLanguage();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { to: '/', label: t('nav_home') },
    { to: '/programme-omra', label: t('nav_program') },
    { to: '/omra', label: t('nav_omra') },
    { to: '/#packages', label: t('nav_packages') },
    { to: '/visas', label: t('nav_visas') },
    { to: '/#engagements', label: t('nav_why_us') },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 sm:px-6 pt-3 sm:pt-5 transition-all duration-300">
      <nav 
        className={cn(
          "w-full max-w-7xl flex items-center justify-between px-4 sm:px-6 py-2.5 rounded-full transition-all duration-500",
          scrolled 
            ? "glass-island shadow-2xl" 
            : "bg-white/80 dark:bg-obsidian-950/75 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-lg shadow-black/5"
        )}
      >
        {/* Logo & Brand Name */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-white/10 p-1 flex items-center justify-center shadow-md shadow-brand-900/10 border border-slate-200 dark:border-white/15 overflow-hidden group-hover:scale-105 transition-transform duration-300 shrink-0">
            <img 
              src="/logo.png" 
              alt="Logo Agence El-Mokhtar" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div className="flex flex-col shrink-0">
            <span className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1 leading-tight whitespace-nowrap">
              {isArabic ? (
                <><span>وكالة</span> <span className="text-brand-600 dark:text-brand-400 font-black">المختار</span></>
              ) : (
                <><span>AGENCE</span> <span className="text-brand-600 dark:text-brand-400 font-black">EL-MOKHTAR</span></>
              )}
            </span>
            <span className="text-[9px] uppercase tracking-widest text-gold-600 dark:text-gold-400 font-bold leading-none whitespace-nowrap">
              {t('agency_sub')}
            </span>
          </div>
        </Link>

        {/* Desktop Links (No Wrapping) */}
        <div className="hidden lg:flex items-center gap-0.5 bg-black/[0.04] dark:bg-white/5 p-1 rounded-full border border-black/5 dark:border-white/10 shrink-0">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.label}
                to={link.to}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-full transition-all duration-200 whitespace-nowrap shrink-0",
                  isActive 
                    ? "bg-brand-500 text-white shadow-sm" 
                    : "text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right Actions: Language Switch + Theme Toggle + Devis + Espace Client */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          
          {/* Language Switcher Pill */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all hover:scale-105 shrink-0"
            title={isArabic ? 'Passer en Français' : 'التحويل إلى اللغة العربية'}
          >
            <Languages size={13} className="text-brand-500" />
            <span className="font-mono text-[11px]">{isArabic ? 'العربية' : 'FR'}</span>
          </button>

          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 border border-slate-200 dark:border-white/15 flex items-center justify-center text-slate-700 dark:text-gold-400 transition-all duration-200 hover:scale-105 shrink-0"
            title={isDark ? 'Mode clair' : 'Mode sombre'}
          >
            {isDark ? <Sun size={15} className="text-gold-400" /> : <Moon size={15} className="text-slate-700" />}
          </button>

          {/* Devis Button */}
          <button
            onClick={onOpenQuoteModal}
            className="group flex items-center gap-2 pl-3.5 pr-1.5 py-1.5 rounded-full bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-brand-600/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap shrink-0"
          >
            <span>{t('nav_quote_btn')}</span>
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200">
              <ArrowUpRight size={13} className="text-white" />
            </div>
          </button>

          {/* Account / Login */}
          {isAuthenticated ? (
            <Link
              to="/mon-espace"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white font-bold text-xs transition-all duration-200 whitespace-nowrap shrink-0"
            >
              <div className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]">
                {clientProfile?.nom?.charAt(0)?.toUpperCase() || 'C'}
              </div>
              <span className="truncate max-w-[80px]">{clientProfile?.nom || t('nav_my_account')}</span>
            </Link>
          ) : (
            <Link
              to="/connexion"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-white font-bold text-xs transition-all duration-200 whitespace-nowrap shrink-0"
            >
              <LogIn size={13} className="text-brand-500" />
              <span>{t('nav_client_portal')}</span>
            </Link>
          )}
        </div>

        {/* Mobile Actions: Language + Theme + Hamburger */}
        <div className="flex items-center gap-1.5 md:hidden">
          <button
            onClick={toggleLang}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold"
          >
            {isArabic ? 'FR' : 'عربي'}
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-gold-400"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white/95 dark:bg-black/90 backdrop-blur-2xl md:hidden pt-24 px-6 flex flex-col gap-6 animate-fade-in">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className="text-xl font-bold text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 py-2 border-b border-slate-200 dark:border-white/5"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenQuoteModal();
              }}
              className="w-full py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-center flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25"
            >
              <span>{t('nav_quote_btn')}</span>
            </button>

            {isAuthenticated ? (
              <Link
                to="/mon-espace"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white font-bold text-center flex items-center justify-center gap-2"
              >
                <span>{t('nav_my_account')}</span>
              </Link>
            ) : (
              <Link
                to="/connexion"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 font-bold text-center flex items-center justify-center gap-2"
              >
                <LogIn size={16} /> {t('nav_client_portal')}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
