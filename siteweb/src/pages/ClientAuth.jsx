import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Mail, Lock, User, Phone, ArrowRight, ArrowLeft, 
  Sparkles, AlertCircle, Loader2, Sun, Moon, Languages 
} from 'lucide-react';

export const ClientAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useClientAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t, isArabic, toggleLang } = useLanguage();
  const navigate = useNavigate();
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        navigate('/mon-espace');
      } else {
        if (password.length < 6) {
          throw new Error(isArabic ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' : 'Le mot de passe doit comporter au moins 6 caractères.');
        }
        await signUp(nom, email, telephone, password);
        navigate('/mon-espace');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || (isArabic ? 'بيانات الاعتماد غير صحيحة.' : 'Identifiants incorrects ou erreur lors de la création.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative pt-24 pb-16">
      {/* Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Floating Controls: Language + Theme Toggle */}
      <div className="absolute top-6 right-6 rtl:right-auto rtl:left-6 z-20 flex items-center gap-2">
        <button
          onClick={toggleLang}
          className="px-3 py-2 rounded-full bg-white dark:bg-white/10 shadow-md border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 text-xs font-bold hover:scale-105 transition-transform"
        >
          {isArabic ? 'FR' : 'عربي'}
        </button>
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-full bg-white dark:bg-white/10 shadow-md border border-slate-200 dark:border-white/15 text-slate-700 dark:text-gold-400 hover:scale-105 transition-transform"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="w-full max-w-md card-bezel-outer shadow-2xl relative z-10 animate-fade-in">
        <div className="card-bezel-inner p-8 bg-white dark:bg-obsidian-900/95 text-left rtl:text-right">
          
          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/15 p-1 shadow-md mb-4 hover:scale-105 transition-transform">
              <img src="/logo.png" alt="Agence El-Mokhtar" className="w-full h-full object-contain" />
            </Link>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isLogin ? t('auth_title_login') : t('auth_title_signup')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isLogin 
                ? (isArabic ? 'قم بتسجيل الدخول لمتابعة حجوزاتك وتأشيراتك.' : 'Connectez-vous pour suivre vos réservations et visas.') 
                : (isArabic ? 'أنشئ حسابك للاستفادة من المتابعة الرقمية الفورية.' : 'Accédez à votre historique, vos factures et vos devis.')}
            </p>
          </div>

          {/* Toggle Switch */}
          <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 mb-6">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                isLogin ? 'bg-brand-500 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('auth_login_tab')}
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                !isLogin ? 'bg-brand-500 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('auth_signup_tab')}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    {t('quote_fullname')}
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder={isArabic ? 'مثال: سامي بلحاج' : 'Ex: Samy Hadj'}
                      value={nom}
                      onChange={e => setNom(e.target.value)}
                      className="w-full h-11 pl-10 rtl:pl-4 rtl:pr-10 pr-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                    {t('quote_phone')}
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      required
                      placeholder="05 50 00 00 00"
                      value={telephone}
                      onChange={e => setTelephone(e.target.value)}
                      className="w-full h-11 pl-10 rtl:pl-4 rtl:pr-10 pr-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
                      dir="ltr"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                {t('quote_email')} *
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="votre.email@exemple.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 rtl:pl-4 rtl:pr-10 pr-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                {t('auth_password')}
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 rtl:pl-4 rtl:pr-10 pr-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-500"
                  dir="ltr"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-600 hover:from-brand-500 hover:to-emerald-500 text-white font-bold text-sm shadow-xl shadow-brand-600/25 transition-all flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <><Loader2 className="animate-spin" size={16} /> Patientez...</>
              ) : isLogin ? (
                <><span>{t('auth_login_btn')}</span> <ArrowIcon size={15} /></>
              ) : (
                <><span>{t('auth_signup_btn')}</span> <Sparkles size={15} /></>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10 text-center">
            <Link to="/" className="text-xs text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
              {t('auth_back_home')}
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};
