import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, Users, CreditCard, FileText, 
  Database, KanbanSquare, Globe, ChevronDown, ChevronRight, LogOut,
  TrendingDown, FileBarChart, Scan, Briefcase, Stamp, Contact, Mail,
  ShieldCheck, UserCheck, Package, Calculator, User
} from 'lucide-react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import UserAvatar from '@/components/UserAvatar';

const navItems = [
  { to: '/', icon: CreditCard, label: 'Ventes', end: true },
  { to: '/pipeline', icon: KanbanSquare, label: 'Devis' },
  { to: '/simulateur-devis', icon: Calculator, label: 'Simulateur Devis' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/banque-contacts', icon: Contact, label: 'Contacts B2B' },
];

const docItems = [
  { to: '/documents', icon: Scan, label: 'Numérisation & Scans' },
  { to: '/facturation', icon: FileText, label: 'Facturation' },
];

const marketingItems = [
  { to: '/marketing', icon: Mail, label: 'Email Marketing' },
];

const settingsItems = [
  { to: '/profil', icon: User, label: 'Mon Profil' },
  { to: '/master-data', icon: Database, label: 'Master Data' },
];

const rhItems = [
  { to: '/rh', icon: Briefcase, label: 'Employés' },
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
      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group active:scale-[0.98]",
      isActive 
        ? "bg-white/10 text-white shadow-sm" 
        : "text-zinc-400 hover:text-white hover:bg-white/5"
    )}
  >
    {({ isActive }) => (
      <>
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[55%] bg-primary rounded-r" />
        )}
        <Icon size={18} className={cn("flex-shrink-0 transition-colors", isActive ? "text-primary" : "text-zinc-500 group-hover:text-zinc-300")} />
        <span className="truncate">{label}</span>
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
  const { signOut, user, profile, isAdmin, isAgent, role } = useAuth();
  
  const isOmraActive = location.pathname.startsWith('/omra');
  const [isOmraOpen, setIsOmraOpen] = useState(isOmraActive);

  useEffect(() => {
    const fetchGroups = async () => {
      const { data } = await supabase.from('omra_groupes').select('id, nom').order('created_at', { ascending: false });
      if (data) setGroupes(data);
    };
    fetchGroups();
  }, [location.pathname]);

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

  const displayName = profile?.nom || user?.email?.split('@')[0] || 'Utilisateur';
  const userInitial = (displayName?.charAt(0) || 'U').toUpperCase();

  return (
    <aside className="w-[260px] bg-sidebar fixed h-screen left-0 top-0 z-40 flex flex-col p-4 overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-3 px-2 mb-8 mt-2 cursor-pointer group" onClick={() => navigate('/')}>
        <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/15 shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
          <img src="/logo.png" alt="Agence El-Mokhtar" className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-black text-white tracking-tight leading-none">El-Mokhtar</span>
          <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold mt-0.5">Voyages & Omra</span>
        </div>
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

          {/* Sub-items (Groups & Pèlerins) */}
          {isOmraOpen && (
            <div className="flex flex-col gap-0.5 mt-1 ml-7 border-l border-slate-700/50 pl-2">
              <NavLink
                to="/omra"
                end
                className={({ isActive }) => cn(
                  "px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                  isActive ? "bg-sidebar-active/50 text-white font-bold" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                )}
              >
                Groupes & Départs
              </NavLink>
              <NavLink
                to="/omra/pelerins"
                className={({ isActive }) => cn(
                  "px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between",
                  isActive ? "bg-sidebar-active/50 text-white font-bold" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                )}
              >
                <span>Pèlerins</span>
                <Users size={13} className="text-emerald-400" />
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

        <SidebarLink to="/visas" icon={Stamp} label="Visas" />
        <SidebarLink to="/packages" icon={Package} label="Packages" />

        <SectionLabel>Documents</SectionLabel>
        {docItems.map(item => <SidebarLink key={item.to} {...item} />)}

        <SectionLabel>Marketing</SectionLabel>
        {marketingItems.map(item => <SidebarLink key={item.to} {...item} />)}
        
        {/* Master Data - accessible à tous */}
        <SectionLabel>Paramètres</SectionLabel>
        {settingsItems.map(item => <SidebarLink key={item.to} {...item} />)}

        {/* Sections Réservées aux Administrateurs */}
        {isAdmin && (
          <>
            <SectionLabel>Ressources Humaines</SectionLabel>
            {rhItems.map(item => <SidebarLink key={item.to} {...item} />)}

            <SectionLabel>Finance</SectionLabel>
            {financeItems.map(item => <SidebarLink key={item.to} {...item} />)}
          </>
        )}
      </nav>

      {/* User Info & Role Badge */}
      <div className="mt-auto pt-4 border-t border-slate-800 flex flex-col gap-3">
        <div 
          onClick={() => navigate('/profil')}
          className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/40 cursor-pointer transition-all duration-200 group"
          title="Voir et modifier mon profil"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar 
              user={profile || user} 
              size="sm" 
              showOnline={true}
              className="ring-2 ring-white/15 group-hover:ring-primary/50 transition-all"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors truncate">
                {displayName}
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                {user?.email}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0 ml-2">
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <ShieldCheck size={11} /> Admin
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                <UserCheck size={11} /> Agent
              </span>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut size={16} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

