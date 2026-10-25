import React from 'react';
import { FileText, Plane, Calculator, Bell } from 'lucide-react';

const BottomNavbar = ({ activeTab, onTabChange, pendingCount = 0, alertsCount = 0 }) => {
  const tabs = [
    {
      id: 'devis',
      label: 'Devis',
      icon: FileText,
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: 'bg-amber-500 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.7)]',
    },
    {
      id: 'vols',
      label: 'رحلات العمرة',
      icon: Plane,
      badge: null,
    },
    {
      id: 'simulateur',
      label: 'Simulateur',
      icon: Calculator,
      badge: null,
    },
    {
      id: 'alertes',
      label: 'Alertes',
      icon: Bell,
      badge: alertsCount > 0 ? alertsCount : null,
      badgeColor: 'bg-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.7)]',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-nav shadow-mobile-nav pb-[env(safe-area-inset-bottom,0px)] w-full max-w-full overflow-hidden">
      <div className="max-w-md mx-auto grid grid-cols-4 h-16 px-1 w-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center py-1 transition-all duration-200 active:scale-95 group focus:outline-none"
            >
              {/* Active Glow Pill */}
              {isActive && (
                <div className="absolute top-1 w-8 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-in fade-in zoom-in-75 duration-200" />
              )}

              {/* Icon Container with Badge */}
              <div className="relative mt-1">
                <Icon
                  size={20}
                  className={`transition-colors duration-200 ${
                    isActive
                      ? 'text-emerald-500 dark:text-emerald-400 stroke-[2.3]'
                      : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 stroke-[1.8]'
                  }`}
                />
                {tab.badge && (
                  <span className={`absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 text-[9px] font-black rounded-full flex items-center justify-center animate-pulse ${tab.badgeColor || 'bg-amber-500 text-slate-950'}`}>
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[9.5px] mt-1 font-semibold truncate max-w-[80px] text-center tracking-tight transition-colors duration-200 ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavbar;
