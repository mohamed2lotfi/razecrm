import React from 'react';
import { RefreshCw, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const MobileHeader = ({ title = "Devis Managers", onRefresh, isRefreshing = false }) => {
  const { profile, signOut, allManagers, selectManager } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 glass-header pt-[env(safe-area-inset-top,0px)] w-full max-w-full overflow-hidden">
      <div className="max-w-md mx-auto px-3.5 h-14 flex items-center justify-between gap-1.5 w-full">
        {/* Left: Branding & Role */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white font-black text-xs shadow-md shadow-emerald-950/20 border border-emerald-300/30 shrink-0">
            EM
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight leading-none truncate">
                {title}
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                Manager
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
              {profile?.nom || profile?.email || 'Manager connecté'}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-amber-500 dark:text-amber-400 active:scale-95 transition-all shadow-xs shrink-0"
            title={theme === 'dark' ? "Passer en mode clair" : "Passer en mode sombre"}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Quick Manager Switcher (if multiple managers or testing) */}
          {allManagers.length > 1 && (
            <select
              value={profile?.id || ''}
              onChange={(e) => {
                const target = allManagers.find(m => m.id === e.target.value);
                if (target) selectManager(target);
              }}
              className="bg-slate-100 dark:bg-slate-800/80 text-[10px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 rounded-lg px-1 py-1 max-w-[76px] truncate focus:outline-none focus:border-emerald-500 shrink-0"
              title="Changer de profil Manager"
            >
              {allManagers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom || m.email}
                </option>
              ))}
            </select>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-slate-700 dark:text-slate-300 active:scale-95 transition-all"
              title="Actualiser"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-emerald-500' : ''} />
            </button>
          )}

          <button
            onClick={signOut}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 dark:bg-slate-800/80 dark:hover:bg-red-500/20 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-slate-500 dark:text-slate-400 active:scale-95 transition-all"
            title="Déconnexion"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;
