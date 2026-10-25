import React, { useState } from 'react';
import { Lock, Mail, ShieldCheck, ArrowRight, Loader2, Sparkles, AlertCircle, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const LoginView = () => {
  const { signIn, selectManager, allManagers } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Veuillez renseigner votre email et mot de passe.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await signIn(email, password);
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg(err.message || 'Identifiants incorrects.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 flex flex-col justify-between p-6 max-w-md w-full mx-auto transition-colors duration-200">
      {/* Top Bar with Theme Toggle */}
      <div className="flex justify-end pt-2">
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-amber-500 shadow-sm active:scale-95 transition-all"
          title={theme === 'dark' ? "Passer en mode clair" : "Passer en mode sombre"}
        >
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>

      {/* Header Branding */}
      <div className="pt-4 text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-emerald-400 p-0.5 shadow-xl shadow-emerald-950/20 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center text-white font-black text-2xl tracking-tighter">
            EM
          </div>
        </div>

        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            El Mokhtar PocketApp
          </h1>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest mt-1">
            Espace Responsables & Managers
          </p>
        </div>
      </div>

      {/* Main Form Box */}
      <div className="glass-card rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl my-auto space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Connexion Manager</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Accédez aux demandes de devis, vols et alertes</p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-300 text-xs font-medium flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ammoumen.abderrezak@gmail.com"
                className="w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-2xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">Mot de passe</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-2xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
            <span>{loading ? 'Connexion...' : 'Se connecter'}</span>
          </button>
        </form>

        {/* Quick Testing Switcher */}
        {allManagers.length > 0 && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block text-center">
              Ou tester directement avec un compte :
            </span>
            <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto">
              {allManagers.slice(0, 5).map((mgr) => (
                <button
                  key={mgr.id}
                  type="button"
                  onClick={() => selectManager(mgr)}
                  className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-between transition-all active:scale-95 text-left"
                >
                  <div className="truncate">
                    <p className="font-bold text-slate-900 dark:text-white truncate text-[11px]">{mgr.nom || mgr.email}</p>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400">{mgr.email}</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 uppercase shrink-0">
                    {mgr.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center pb-4 text-[10px] text-slate-400 dark:text-slate-500">
        El Mokhtar Travel CRM &copy; {new Date().getFullYear()} · PocketApp WebView
      </div>
    </div>
  );
};

export default LoginView;
