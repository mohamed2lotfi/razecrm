import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, Users, CreditCard, FileText, 
  Database, KanbanSquare, Globe, ChevronDown, ChevronRight, LogOut,
  TrendingDown, FileBarChart
} from 'lucide-react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const navItems = [
  { to: '/', icon: CreditCard, label: 'Ventes', end: true },
  { to: '/pipeline', icon: KanbanSquare, label: 'Pipeline Devis' },
  { to: '/clients', icon: Users, label: 'Clients' },
];

const docItems = [
  { to: '/facturation', icon: FileText, label: 'Facturation' },
];

const settingsItems = [
  { to: '/master-data', icon: Database, label: 'Master Data' },
];

const financeItems = [
  { to: '/outcomes', icon: TrendingDown, label: 'Dépenses' },
  { to: '/reports', icon: FileBarChart, label: 'Rapports' },
];

const SidebarLink = ({ to, icon: Icon, label, end }) => (
  <NavLink 
    to={to}
    end={end}
    className={({ isActive }) => cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative",
      isActive 
        ? "bg-sidebar-active text-white" 
        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
    )}
  >
    {({ isActive }) => (
      <>
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[55%] bg-gradient-to-b from-primary to-violet-500 rounded-r" />
        )}
        <Icon size={18} className="flex-shrink-0" />
        <span>{label}</span>
      </>
    )}
  </NavLink>
);

const SectionLabel = ({ children }) => (
  <div className="px-3 pt-5 pb-2 text-[10px] uppercase tracking-widest font-bold text-slate-600">
    {children}
  </div>
);

const Sidebar = () => {
  const [groupes, setGroupes] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  
  const isOmraActive = location.pathname.startsWith('/omra');
  const [isOmraOpen, setIsOmraOpen] = useState(isOmraActive);

  useEffect(() => {
    const fetchGroups = async () => {
      const { data } = await supabase.from('omra_groupes').select('id, nom').order('created_at', { ascending: false });
      if (data) setGroupes(data);
    };
    fetchGroups();
  }, [location.pathname]); // Refresh groups when navigation happens (simple way to stay synced)

  // Keep accordion open if we are in an omra route
  useEffect(() => {
    if (isOmraActive) {
      setIsOmraOpen(true);
    }
  }, [isOmraActive]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <aside className="w-[260px] bg-sidebar fixed h-screen left-0 top-0 z-40 flex flex-col p-4 overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-2.5 px-3 mb-8 mt-2 cursor-pointer" onClick={() => navigate('/')}>
        <div className="bg-gradient-to-br from-primary to-violet-500 bg-clip-text text-transparent">
          <LayoutDashboard size={24} />
        </div>
        <span className="text-xl font-extrabold text-white tracking-tight">AgencyCRM</span>
      </div>
      
      <nav className="flex flex-col gap-0.5 flex-1">
        {navItems.map(item => <SidebarLink key={item.to} {...item} />)}
        
        <SectionLabel>Modules Spéciaux</SectionLabel>
        
        {/* Omra Accordion */}
        <div className="flex flex-col">
          <div 
            className={cn(
              "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer relative",
              isOmraActive && !isOmraOpen 
                ? "bg-sidebar-active text-white" 
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            )}
            onClick={() => {
              if (!isOmraActive && !isOmraOpen) {
                navigate('/omra');
              }
              setIsOmraOpen(!isOmraOpen);
            }}
          >
            {isOmraActive && !isOmraOpen && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[55%] bg-gradient-to-b from-primary to-violet-500 rounded-r" />
            )}
            <div className="flex items-center gap-3">
              <Globe size={18} className="flex-shrink-0" />
              <span>Omra</span>
            </div>
            {isOmraOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>

          {/* Sub-items (Groups) */}
          {isOmraOpen && (
            <div className="flex flex-col gap-0.5 mt-1 ml-7 border-l border-slate-700/50 pl-2">
              <NavLink
                to="/omra"
                end
                className={({ isActive }) => cn(
                  "px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                  isActive ? "bg-sidebar-active/50 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                )}
              >
                Tableau de bord
              </NavLink>
              {groupes.map(g => (
                <NavLink
                  key={g.id}
                  to={`/omra/group/${g.id}`}
                  className={({ isActive }) => cn(
                    "px-3 py-2 rounded-lg text-xs font-medium transition-colors truncate",
                    isActive ? "bg-sidebar-active/50 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  )}
                  title={g.nom}
                >
                  {g.nom}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <SectionLabel>Documents</SectionLabel>
        {docItems.map(item => <SidebarLink key={item.to} {...item} />)}
        
        <SectionLabel>Finance</SectionLabel>
        {financeItems.map(item => <SidebarLink key={item.to} {...item} />)}
        
        <SectionLabel>Paramètres</SectionLabel>
        {settingsItems.map(item => <SidebarLink key={item.to} {...item} />)}
      </nav>

      {/* Logout Button */}
      <div className="mt-auto pt-4 border-t border-slate-800">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
