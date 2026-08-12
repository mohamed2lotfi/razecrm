import React, { useState, useEffect, useMemo } from 'react';
import { ReactSortable } from 'react-sortablejs';
import { 
  Plus, Phone, GripVertical, Loader2, LayoutGrid, List, Trash2, 
  XCircle, Calculator, Calendar, User, MapPin, Flame, Clock, 
  ArrowUpRight, Sparkles, Filter, ArrowUpDown, Search, X, UserCheck, Check,
  TrendingUp, Send, CheckCircle2, ShieldAlert, ChevronRight, Eye, Briefcase
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProspectModal from '@/components/ProspectModal';
import VenteForm from '@/components/VenteForm';
import CountryFlag from '@/components/CountryFlag';
import DestinationSelect from '@/components/DestinationSelect';
import UserAvatar from '@/components/UserAvatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const COLUMNS = [
  { id: 'nouvelle', title: 'Demande devis', color: 'bg-blue-500', dot: 'bg-blue-500 shadow-blue-500/50', light: 'bg-blue-50/80 border-blue-200/80 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60' },
  { id: 'en_cours', title: 'En cours', color: 'bg-amber-500', dot: 'bg-amber-500 shadow-amber-500/50', light: 'bg-amber-50/80 border-amber-200/80 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60' },
  { id: 'envoye', title: 'Devis envoyé', color: 'bg-violet-500', dot: 'bg-violet-500 shadow-violet-500/50', light: 'bg-violet-50/80 border-violet-200/80 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/60' },
  { id: 'converti', title: 'Converti', color: 'bg-emerald-500', dot: 'bg-emerald-500 shadow-emerald-500/50', light: 'bg-emerald-50/80 border-emerald-200/80 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60', isSplit: true },
  { id: 'ferme', title: 'Fermé', color: 'bg-slate-400', dot: 'bg-slate-400 shadow-slate-400/50', light: 'bg-slate-100/80 border-slate-200/80 text-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800' },
];

const PRIORITY_WEIGHTS = {
  'Urgente': 4,
  'Haute': 3,
  'Moyenne': 2,
  'Basse': 1
};

// Helper for relative elapsed time
const getRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffDays === 0) {
      if (diffHours === 0) return "aujourd'hui";
      return `il y a ${diffHours}h`;
    }
    if (diffDays === 1) return 'hier';
    if (diffDays < 7) return `il y a ${diffDays} j`;
    if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} sem.`;
    return `il y a ${Math.floor(diffDays / 30)} mois`;
  } catch {
    return '';
  }
};

// Helper to extract structured metadata from details_devis
const getQuoteMeta = (task) => {
  if (!task) return { nom_devis: 'Devis sans titre', destination: '', destination_emoji: '📍', priorite: 'Moyenne', agent_nom: '', agent_id: '' };
  let meta = {
    nom_devis: task.nom_prospect || 'Devis sans titre',
    destination: '',
    destination_emoji: '📍',
    priorite: 'Moyenne',
    agent_nom: '',
    agent_id: ''
  };
  try {
    if (task.details_devis && typeof task.details_devis === 'string' && task.details_devis.trim().startsWith('{')) {
      const parsed = JSON.parse(task.details_devis);
      if (parsed.nom_devis) meta.nom_devis = parsed.nom_devis;
      if (parsed.destination) meta.destination = parsed.destination;
      if (parsed.destination_emoji) meta.destination_emoji = parsed.destination_emoji;
      if (parsed.priorite) meta.priorite = parsed.priorite;
      if (parsed.agent_nom) meta.agent_nom = parsed.agent_nom;
      if (parsed.agent_id) meta.agent_id = parsed.agent_id;
    }
  } catch (e) {}
  return meta;
};

const getPriorityBadge = (priorite) => {
  switch (priorite) {
    case 'Urgente':
      return { label: 'Urgente', emoji: '🔥', style: 'bg-red-50 text-red-700 border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60 font-black shadow-2xs' };
    case 'Haute':
      return { label: 'Haute', emoji: '⚡', style: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 font-bold shadow-2xs' };
    case 'Basse':
      return { label: 'Basse', emoji: '⚪', style: 'bg-slate-50 text-slate-600 border-slate-200/80 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-800 font-semibold' };
    case 'Moyenne':
    default:
      return { label: 'Moyenne', emoji: '🔹', style: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 font-semibold' };
  }
};

const Pipeline = () => {
  const { user, profile, isAdmin } = useAuth();
  const [pipelineData, setPipelineData] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [destinationsList, setDestinationsList] = useState([]);
  const [agentsList, setAgentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  
  // Filter & Sort States
  const [filterDate, setFilterDate] = useState('all'); // 'all' | 'today' | 'week' | 'month'
  const [filterPriority, setFilterPriority] = useState('all'); // 'all' | 'Urgente' | 'Haute' | 'Moyenne' | 'Basse'
  const [filterDestination, setFilterDestination] = useState('all');
  const [filterMyQuotes, setFilterMyQuotes] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date_desc'); // 'date_desc' | 'date_asc' | 'prio_desc' | 'prio_asc'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [isNew, setIsNew] = useState(false);

  // Conversion States
  const [pendingVenteClient, setPendingVenteClient] = useState(null);
  const [omraModalOpen, setOmraModalOpen] = useState(false);
  const [omraGroups, setOmraGroups] = useState([]);
  const [selectedOmraGroupId, setSelectedOmraGroupId] = useState('');
  const [selectedOmraClientId, setSelectedOmraClientId] = useState(null);
  const navigate = useNavigate();

  const [columnsState, setColumnsState] = useState({
    nouvelle: [], en_cours: [], envoye: [], converti_vente: [], converti_omra: [], ferme: []
  });
  const [showAllVentes, setShowAllVentes] = useState(false);
  const [showAllOmra, setShowAllOmra] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [pipelineRes, servicesRes, clientsRes, omraRes, destinationsRes, profilesRes] = await Promise.all([
      supabase.from('pipeline').select('*, clients(*)').order('date_creation', { ascending: false }),
      supabase.from('services').select('*').order('created_at'),
      supabase.from('clients').select('*').order('nom', { ascending: true }),
      supabase.from('omra_groupes').select('*').order('created_at', { ascending: false }),
      supabase.from('destinations').select('*').order('nom', { ascending: true }),
      supabase.from('profiles').select('*').order('nom', { ascending: true })
    ]);

    if (servicesRes.data) setServicesList(servicesRes.data);
    if (clientsRes.data) setClientsList(clientsRes.data);
    if (omraRes.data) setOmraGroups(omraRes.data);
    if (destinationsRes.data) setDestinationsList(destinationsRes.data);
    if (profilesRes.data) setAgentsList(profilesRes.data);
    if (pipelineRes.data) setPipelineData(pipelineRes.data);
    setLoading(false);
  };

  // Count my quotes
  const myQuotesCount = useMemo(() => {
    const currentUserId = user?.id;
    const currentProfileId = profile?.id;
    const currentUserName = (profile?.nom || user?.email?.split('@')[0] || '').toLowerCase();

    return pipelineData.filter(task => {
      const meta = getQuoteMeta(task);
      const matchesId = meta.agent_id && (meta.agent_id === currentUserId || meta.agent_id === currentProfileId);
      const matchesName = meta.agent_nom && currentUserName && meta.agent_nom.toLowerCase().includes(currentUserName);
      return matchesId || matchesName;
    }).length;
  }, [pipelineData, user, profile]);

  // General Pipeline Metrics
  const metrics = useMemo(() => {
    const total = pipelineData.length;
    const enCours = pipelineData.filter(p => p.status === 'en_cours').length;
    const envoye = pipelineData.filter(p => p.status === 'envoye').length;
    const convertis = pipelineData.filter(p => p.status === 'converti_vente' || p.status === 'converti_omra' || p.status === 'termine').length;
    const conversionRate = total > 0 ? Math.round((convertis / total) * 100) : 0;
    return { total, enCours, envoye, convertis, conversionRate };
  }, [pipelineData]);

  // Filtered and sorted pipeline data
  const filteredAndSortedPipeline = useMemo(() => {
    return pipelineData.filter(task => {
      const meta = getQuoteMeta(task);
      const clientName = task.clients?.nom || task.nom_prospect || '';

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = meta.nom_devis?.toLowerCase().includes(q);
        const matchClient = clientName.toLowerCase().includes(q);
        const matchDest = meta.destination?.toLowerCase().includes(q);
        const matchAgent = meta.agent_nom?.toLowerCase().includes(q);
        if (!matchTitle && !matchClient && !matchDest && !matchAgent) return false;
      }

      // Filter: Mes devis
      if (filterMyQuotes) {
        const currentUserId = user?.id;
        const currentProfileId = profile?.id;
        const currentUserName = (profile?.nom || user?.email?.split('@')[0] || '').toLowerCase();
        const matchesId = meta.agent_id && (meta.agent_id === currentUserId || meta.agent_id === currentProfileId);
        const matchesName = meta.agent_nom && currentUserName && meta.agent_nom.toLowerCase().includes(currentUserName);
        if (!matchesId && !matchesName) return false;
      }

      // Filter: Priorité
      if (filterPriority !== 'all') {
        if ((meta.priorite || 'Moyenne') !== filterPriority) return false;
      }

      // Filter: Destination
      if (filterDestination !== 'all') {
        if (meta.destination !== filterDestination) return false;
      }

      // Filter: Date
      if (filterDate !== 'all' && task.date_creation) {
        const taskDate = new Date(task.date_creation);
        const now = new Date();
        if (filterDate === 'today') {
          if (taskDate.toDateString() !== now.toDateString()) return false;
        } else if (filterDate === 'week') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (taskDate < sevenDaysAgo) return false;
        } else if (filterDate === 'month') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (taskDate < thirtyDaysAgo) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const metaA = getQuoteMeta(a);
      const metaB = getQuoteMeta(b);

      if (sortBy === 'date_desc') {
        return new Date(b.date_creation || 0) - new Date(a.date_creation || 0);
      }
      if (sortBy === 'date_asc') {
        return new Date(a.date_creation || 0) - new Date(b.date_creation || 0);
      }
      if (sortBy === 'prio_desc') {
        const weightA = PRIORITY_WEIGHTS[metaA.priorite] || 2;
        const weightB = PRIORITY_WEIGHTS[metaB.priorite] || 2;
        if (weightB !== weightA) return weightB - weightA;
        return new Date(b.date_creation || 0) - new Date(a.date_creation || 0);
      }
      if (sortBy === 'prio_asc') {
        const weightA = PRIORITY_WEIGHTS[metaA.priorite] || 2;
        const weightB = PRIORITY_WEIGHTS[metaB.priorite] || 2;
        if (weightA !== weightB) return weightA - weightB;
        return new Date(b.date_creation || 0) - new Date(a.date_creation || 0);
      }
      return 0;
    });
  }, [pipelineData, searchTerm, filterMyQuotes, filterPriority, filterDestination, filterDate, sortBy, user, profile]);

  useEffect(() => {
    setColumnsState({
      nouvelle: filteredAndSortedPipeline.filter(t => t.status === 'nouvelle'),
      en_cours: filteredAndSortedPipeline.filter(t => t.status === 'en_cours'),
      envoye: filteredAndSortedPipeline.filter(t => t.status === 'envoye'),
      converti_vente: filteredAndSortedPipeline.filter(t => t.status === 'converti_vente' || t.status === 'termine'),
      converti_omra: filteredAndSortedPipeline.filter(t => t.status === 'converti_omra'),
      ferme: filteredAndSortedPipeline.filter(t => t.status === 'ferme'),
    });
  }, [filteredAndSortedPipeline]);

  const hasActiveFilters = filterDate !== 'all' || filterPriority !== 'all' || filterDestination !== 'all' || filterMyQuotes || searchTerm.trim() !== '' || sortBy !== 'date_desc';

  const handleResetFilters = () => {
    setFilterDate('all');
    setFilterPriority('all');
    setFilterDestination('all');
    setFilterMyQuotes(false);
    setSearchTerm('');
    setSortBy('date_desc');
  };

  const handleSetList = async (colId, newList) => {
    // Find items in newList whose status changed
    const movedItems = newList.filter(item => item.status !== colId);
    
    // Update main pipelineData
    setPipelineData(prev => prev.map(p => {
      const moved = newList.find(item => item.id === p.id);
      if (moved && p.status !== colId) {
        return { ...p, status: colId };
      }
      return p;
    }));

    for (const item of movedItems) {
      await supabase.from('pipeline').update({ status: colId }).eq('id', item.id);
      
      if (colId === 'converti_vente') {
        setPendingVenteClient(item.client_id || null);
      } else if (colId === 'converti_omra') {
        setSelectedOmraClientId(item.client_id || null);
        setOmraModalOpen(true);
      }
    }
  };

  const handleCreate = () => { setSelectedProspect(null); setIsNew(true); setIsModalOpen(true); };
  const handleCardClick = (p) => { setSelectedProspect(p); setIsNew(false); setIsModalOpen(true); };
  
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Voulez-vous vraiment supprimer ce devis ?')) {
      const { error } = await supabase.from('pipeline').delete().eq('id', id);
      if (!error) {
        setPipelineData(prev => prev.filter(p => p.id !== id));
      } else {
        alert("Erreur de suppression: " + error.message);
      }
    }
  };
  
  const handleSave = async (prospectData) => {
    const id = prospectData.id;
    const updateData = { ...prospectData };
    delete updateData.id;
    delete updateData.clients;

    if (id) {
      const { data, error } = await supabase
        .from('pipeline')
        .update(updateData)
        .eq('id', id)
        .select('*, clients(*)');
      
      if (!error && data) {
        setPipelineData(prev => prev.map(p => p.id === id ? data[0] : p));
      } else if (error) {
        alert("Erreur lors de la mise à jour: " + error.message);
      }
    } else {
      const { data, error } = await supabase
        .from('pipeline')
        .insert([updateData])
        .select('*, clients(*)');
      
      if (!error && data) {
        setPipelineData(prev => [data[0], ...prev]);
      } else if (error) {
        alert("Erreur lors de la création: " + error.message);
      }
    }
    setIsModalOpen(false);
  };

  const getServiceName = (id) => servicesList.find(s => s.id === id)?.nom || 'Service';

  const getColumnKPI = (colId) => {
    const nNouvelle = columnsState.nouvelle?.length || 0;
    const nEnCours = columnsState.en_cours?.length || 0;
    const nEnvoye = columnsState.envoye?.length || 0;
    const nConverti = (columnsState.converti_vente?.length || 0) + (columnsState.converti_omra?.length || 0);
    const nFerme = columnsState.ferme?.length || 0;

    switch (colId) {
      case 'nouvelle': {
        const today = new Date().toDateString();
        const todayCount = (columnsState.nouvelle || []).filter(t => t.date_creation && new Date(t.date_creation).toDateString() === today).length;
        return { label: `${todayCount} nouveau${todayCount > 1 ? 'x' : ''} auj.`, color: 'text-blue-600 dark:text-blue-400' };
      }
      case 'en_cours': {
        const total = nNouvelle + nEnCours;
        const pct = total > 0 ? Math.round((nEnCours / total) * 100) : 0;
        return { label: `${pct}% en traitement`, color: 'text-amber-600 dark:text-amber-400' };
      }
      case 'envoye': {
        const total = nEnCours + nEnvoye;
        const pct = total > 0 ? Math.round((nEnvoye / total) * 100) : 0;
        return { label: `${pct}% proposés`, color: 'text-violet-600 dark:text-violet-400' };
      }
      case 'converti': {
        const total = nEnvoye + nConverti + nFerme;
        const pct = total > 0 ? Math.round((nConverti / total) * 100) : 0;
        return { label: `${pct}% convertis`, color: 'text-emerald-600 dark:text-emerald-400' };
      }
      case 'ferme': {
        const total = nEnvoye + nConverti + nFerme;
        const pct = total > 0 ? Math.round((nFerme / total) * 100) : 0;
        return { label: `${pct}% archivés`, color: 'text-slate-500 dark:text-slate-400' };
      }
      default:
        return null;
    }
  };

  const handleConfirmOmraGroup = () => {
    if (selectedOmraGroupId) {
      setOmraModalOpen(false);
      navigate(`/omra/group/${selectedOmraGroupId}?clientId=${selectedOmraClientId || ''}&openForm=true`);
    } else {
      alert("Veuillez sélectionner un groupe.");
    }
  };

  // Render Kanban Task Card with Double-Bezel Hardware aesthetic
  const renderTaskCard = (task, col) => {
    const meta = getQuoteMeta(task);
    const prio = getPriorityBadge(meta.priorite);
    const clientName = task.clients?.nom || task.nom_prospect || 'Client inconnu';
    const clientPhone = task.clients?.telephone || '';
    const creationDate = task.date_creation ? new Date(task.date_creation).toLocaleDateString('fr-FR') : '';
    const relativeTime = getRelativeTime(task.date_creation);
    
    // Agent avatar initials
    const agentInitials = meta.agent_nom 
      ? meta.agent_nom.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
      : 'AG';

    return (
      <div
        key={task.id}
        onClick={() => handleCardClick(task)}
        className="group relative p-1 mb-2.5 rounded-2xl bg-gradient-to-b from-muted/70 to-muted/20 border border-border/70 hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing hover:-translate-y-0.5"
      >
        {/* Inner Card Core */}
        <div className="p-3 bg-card rounded-[14px] border border-border/40 shadow-xs space-y-2.5">
          {/* Top Row: Title + Priority Badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5 flex-1 min-w-0">
              <GripVertical size={13} className="mt-0.5 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors shrink-0" />
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-xs text-foreground leading-snug truncate group-hover:text-primary transition-colors">
                  {meta.nom_devis || `Devis ${clientName}`}
                </h4>
                <p className="text-[11px] font-semibold text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                  <User size={10} className="text-muted-foreground/70 shrink-0" />
                  <span className="text-foreground/90 font-bold">{clientName}</span>
                  {clientPhone && <span className="text-[10px] text-muted-foreground/60">· {clientPhone}</span>}
                </p>
              </div>
            </div>

            {/* Priority Badge */}
            <span className={cn("text-[9px] px-2 py-0.5 rounded-full border shrink-0 inline-flex items-center gap-1", prio.style)}>
              <span>{prio.emoji}</span>
              <span>{prio.label}</span>
            </span>
          </div>

          {/* Middle Row: Destination & Service Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {meta.destination && (
              <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-md inline-flex items-center gap-1.5 shadow-2xs">
                <CountryFlag emoji={meta.destination_emoji} destinationName={meta.destination} className="w-3.5 h-2.5" />
                <span className="truncate max-w-[130px]">{meta.destination}</span>
              </span>
            )}

            {task.service_id && (
              <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border", col.light)}>
                {getServiceName(task.service_id)}
              </span>
            )}
          </div>

          {/* Bottom Row: Date & Agent Indicator */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
            {/* Date + Relative time */}
            <div className="flex items-center gap-1 font-medium">
              <Calendar size={10} className="text-muted-foreground/60" />
              <span>{creationDate}</span>
              {relativeTime && (
                <span className="font-bold text-foreground/70">
                  ({relativeTime})
                </span>
              )}
            </div>

            {/* Agent Avatar */}
            {(() => {
              const assignedAgent = agentsList.find(a => a.id === meta.agent_id || a.nom === meta.agent_nom);
              return (
                <div className="flex items-center gap-1.5" title={meta.agent_nom ? `Agent en charge : ${meta.agent_nom}` : 'Non assigné'}>
                  <UserAvatar 
                    user={assignedAgent} 
                    name={meta.agent_nom} 
                    size="xs" 
                    className="shadow-2xs"
                  />
                  <span className="text-[10px] font-semibold text-foreground/80 truncate max-w-[70px]">
                    {meta.agent_nom ? meta.agent_nom.split(' ')[0] : 'Libre'}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    );
  };

  // Render Mini Task Card for Vente & Omra sub-zones (showing only client name)
  const renderMiniTaskCard = (task, type = 'vente') => {
    const clientName = task.clients?.nom || task.nom_prospect || 'Client inconnu';
    const isVente = type === 'vente';

    return (
      <div
        key={task.id}
        onClick={() => handleCardClick(task)}
        className={cn(
          "group relative p-2 mb-1.5 rounded-xl border transition-all duration-200 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-xs flex items-center justify-between gap-1.5",
          isVente
            ? "bg-card hover:bg-emerald-500/10 border-emerald-500/30 text-foreground"
            : "bg-card hover:bg-violet-500/10 border-violet-500/30 text-foreground"
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <GripVertical size={11} className="text-muted-foreground/30 group-hover:text-muted-foreground/70 shrink-0" />
          <div className={cn(
            "w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black",
            isVente 
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" 
              : "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
          )}>
            <User size={9} />
          </div>
          <h4 className="font-extrabold text-[11px] truncate group-hover:text-primary transition-colors leading-tight">
            {clientName}
          </h4>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      {/* ── Page Header & KPI Summary ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="text-primary animate-pulse" size={24} />
              <span>Pipeline des Devis</span>
            </h1>
            <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20 shadow-2xs">
              {filteredAndSortedPipeline.length} {filteredAndSortedPipeline.length > 1 ? 'devis actifs' : 'devis actif'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Gérez vos demandes de devis, opportunités commerciales et conversions de ventes en temps réel.
          </p>
        </div>

        {/* Header Action Bar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Mode Switcher (Kanban / Liste) */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/80 shadow-2xs">
            <button 
              type="button"
              onClick={() => setViewMode('kanban')} 
              className={cn(
                "px-3 py-1.5 text-xs font-extrabold rounded-lg flex items-center gap-1.5 transition-all duration-200", 
                viewMode === 'kanban' 
                  ? "bg-background text-foreground shadow-xs border border-border/60" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40"
              )}
            >
              <LayoutGrid size={14} className={viewMode === 'kanban' ? "text-primary" : ""} />
              <span>Kanban</span>
            </button>
            <button 
              type="button"
              onClick={() => setViewMode('list')} 
              className={cn(
                "px-3 py-1.5 text-xs font-extrabold rounded-lg flex items-center gap-1.5 transition-all duration-200", 
                viewMode === 'list' 
                  ? "bg-background text-foreground shadow-xs border border-border/60" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40"
              )}
            >
              <List size={14} className={viewMode === 'list' ? "text-primary" : ""} />
              <span>Liste</span>
            </button>
          </div>

          {/* Simulateur Button */}
          <Button 
            variant="outline" 
            onClick={() => navigate('/simulateur-devis')} 
            className="h-9 gap-1.5 border-emerald-500/30 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 font-bold text-xs shadow-2xs"
          >
            <Calculator size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>Simulateur</span>
          </Button>

          {/* Nouveau Devis Button (Button-in-Button architecture) */}
          <Button 
            onClick={handleCreate} 
            className="h-9 font-extrabold text-xs pl-3.5 pr-2.5 gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <span>Nouveau Devis</span>
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Plus size={13} />
            </span>
          </Button>
        </div>
      </div>

      {/* ── KPI Quick Strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3 bg-card/60 border rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Devis</p>
            <p className="text-lg font-black text-foreground">{metrics.total}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">
            📋
          </div>
        </div>

        <div className="p-3 bg-card/60 border rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">En Traitement</p>
            <p className="text-lg font-black text-amber-600 dark:text-amber-400">{metrics.enCours}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs">
            ⏳
          </div>
        </div>

        <div className="p-3 bg-card/60 border rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Devis Envoyés</p>
            <p className="text-lg font-black text-violet-600 dark:text-violet-400">{metrics.envoye}</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center font-bold text-xs">
            🚀
          </div>
        </div>

        <div className="p-3 bg-card/60 border rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Conversion</p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{metrics.conversionRate}%</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
            💎
          </div>
        </div>
      </div>

      {/* ── Filters & Sorting Toolbar (Comfortable, Modern, No Truncation) ─────────────────── */}
      <div className="bg-card/80 backdrop-blur-md rounded-2xl border border-border/80 p-3.5 shadow-2xs space-y-3 mb-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Left: Quick Search & "Mes devis" Toggle */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                placeholder="Rechercher devis, client, agent, destination..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-9 pl-9 pr-8 text-xs bg-background border-border/80 rounded-xl font-medium focus-visible:ring-primary/20"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Toggle "Mes devis" */}
            <button
              type="button"
              onClick={() => setFilterMyQuotes(prev => !prev)}
              className={cn(
                "h-9 px-3.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 border shrink-0",
                filterMyQuotes
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-background text-foreground/80 hover:bg-muted/50 border-border/80"
              )}
            >
              <User size={14} className={filterMyQuotes ? "text-primary-foreground" : "text-muted-foreground"} />
              <span>Mes devis</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-black",
                filterMyQuotes ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}>
                {myQuotesCount}
              </span>
            </button>
          </div>

          {/* Right: Dropdown Filters & Sorting (Comfortable min-widths) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Date */}
            <div className="min-w-[145px] flex-1 sm:flex-initial">
              <Select
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="h-9 text-xs bg-background border-border/80 rounded-xl font-semibold px-3 pr-7"
              >
                <option value="all">📅 Toutes les dates</option>
                <option value="today">📅 Aujourd'hui</option>
                <option value="week">📅 7 derniers jours</option>
                <option value="month">📅 30 derniers jours</option>
              </Select>
            </div>

            {/* Filter Priorité */}
            <div className="min-w-[145px] flex-1 sm:flex-initial">
              <Select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                className="h-9 text-xs bg-background border-border/80 rounded-xl font-semibold px-3 pr-7"
              >
                <option value="all">⚡ Toute priorité</option>
                <option value="Urgente">🔥 Urgente</option>
                <option value="Haute">⚡ Haute</option>
                <option value="Moyenne">🔹 Moyenne</option>
                <option value="Basse">⚪ Basse</option>
              </Select>
            </div>

            {/* Filter Destination (with real country flags) */}
            <div className="min-w-[170px] flex-1 sm:flex-initial">
              <DestinationSelect
                value={filterDestination}
                onChange={(nom) => setFilterDestination(nom)}
                destinations={destinationsList}
                placeholder="🌍 Destinations"
                allowAll={true}
                mode="name"
              />
            </div>

            {/* Trie / Sort Order */}
            <div className="min-w-[185px] flex-1 sm:flex-initial">
              <Select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="h-9 text-xs bg-primary/5 border-primary/30 rounded-xl font-bold text-primary px-3 pr-7"
              >
                <option value="date_desc">📅 Date : Plus récents</option>
                <option value="date_asc">📅 Date : Plus anciens</option>
                <option value="prio_desc">⚡ Priorité : Urgente ➔ Basse</option>
                <option value="prio_asc">⚡ Priorité : Basse ➔ Urgente</option>
              </Select>
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-bold gap-1 px-3 rounded-xl shrink-0"
                title="Effacer tous les filtres"
              >
                <X size={13} /> Réinitialiser
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Main View (Kanban or Table) ───────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 gap-3">
          <Loader2 className="animate-spin text-primary" size={36} />
          <p className="text-xs font-semibold text-muted-foreground animate-pulse">Chargement du pipeline...</p>
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban Board View (Fixed 100vh height with internal column scrolling) */
        <div className="flex gap-4 pb-2 overflow-x-auto h-[calc(100vh-275px)] min-h-[460px] select-none">
          {COLUMNS.map(col => {
            const kpi = getColumnKPI(col.id);

            return (
              <div key={col.id} className="flex flex-col w-[300px] min-w-[300px] max-w-[300px] h-full flex-shrink-0 rounded-2xl bg-muted/30 border border-border/70 p-2.5 overflow-hidden">
                {/* Column Header (Fixed Pinned at Top) */}
                <div className="p-3 pb-2 mb-2 rounded-xl bg-card border border-border/40 shadow-2xs space-y-1.5 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2.5 h-2.5 rounded-full shadow-xs", col.dot || col.color)} />
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                        {col.title}
                      </h3>
                    </div>
                    {!col.isSplit && (
                      <span className="text-[10px] font-black text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/40">
                        {columnsState[col.id]?.length || 0}
                      </span>
                    )}
                  </div>
                  {kpi && (
                    <p className={cn("text-[10px] font-bold", kpi.color)}>
                      {kpi.label}
                    </p>
                  )}
                </div>

                {/* Split Column (Conversion Vente & Omra) with independent inner scroll */}
                {col.isSplit ? (
                  <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden">
                    {/* Vente Sub-Zone */}
                    <div className="flex-1 min-h-0 bg-emerald-500/5 rounded-xl border border-emerald-500/20 p-2 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between mb-1.5 px-1 shrink-0">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                          <Briefcase size={11} /> Vente
                        </h4>
                        <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-1.5 rounded-full">
                          {columnsState['converti_vente']?.length || 0}
                        </span>
                      </div>
                      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
                        <ReactSortable
                          list={columnsState['converti_vente'] || []}
                          setList={(newList) => handleSetList('converti_vente', newList)}
                          group="pipeline"
                          animation={200}
                          ghostClass="opacity-40"
                          dragClass="cursor-grabbing"
                          className="min-h-[10px]"
                        >
                          {(showAllVentes 
                            ? (columnsState['converti_vente'] || []) 
                            : (columnsState['converti_vente'] || []).slice(0, 4)
                          ).map(task => renderMiniTaskCard(task, 'vente'))}
                        </ReactSortable>

                        {/* + n ventes card */}
                        {(columnsState['converti_vente']?.length || 0) > 4 && (
                          <button
                            type="button"
                            onClick={() => setShowAllVentes(prev => !prev)}
                            className="w-full p-2 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] font-extrabold text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-2xs mt-1"
                          >
                            {showAllVentes ? (
                              <span>Réduire (afficher 4)</span>
                            ) : (
                              <>
                                <Plus size={12} />
                                <span>+ {(columnsState['converti_vente']?.length || 0) - 4} ventes</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Omra Sub-Zone */}
                    <div className="flex-1 min-h-0 bg-violet-500/5 rounded-xl border border-violet-500/20 p-2 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between mb-1.5 px-1 shrink-0">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-300 flex items-center gap-1">
                          <span>🕋</span> Omra
                        </h4>
                        <span className="text-[10px] font-black bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/30 px-1.5 rounded-full">
                          {columnsState['converti_omra']?.length || 0}
                        </span>
                      </div>
                      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
                        <ReactSortable
                          list={columnsState['converti_omra'] || []}
                          setList={(newList) => handleSetList('converti_omra', newList)}
                          group="pipeline"
                          animation={200}
                          ghostClass="opacity-40"
                          dragClass="cursor-grabbing"
                          className="min-h-[10px]"
                        >
                          {(showAllOmra 
                            ? (columnsState['converti_omra'] || []) 
                            : (columnsState['converti_omra'] || []).slice(0, 4)
                          ).map(task => renderMiniTaskCard(task, 'omra'))}
                        </ReactSortable>

                        {/* + n ventes omra card */}
                        {(columnsState['converti_omra']?.length || 0) > 4 && (
                          <button
                            type="button"
                            onClick={() => setShowAllOmra(prev => !prev)}
                            className="w-full p-2 rounded-xl border border-dashed border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 text-violet-800 dark:text-violet-300 text-[11px] font-extrabold text-center cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-2xs mt-1"
                          >
                            {showAllOmra ? (
                              <span>Réduire (afficher 4)</span>
                            ) : (
                              <>
                                <Plus size={12} />
                                <span>+ {(columnsState['converti_omra']?.length || 0) - 4} ventes omra</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard Column Sortable with inner vertical scroll */
                  <ReactSortable
                    list={columnsState[col.id] || []}
                    setList={(newList) => handleSetList(col.id, newList)}
                    group="pipeline"
                    animation={200}
                    ghostClass="opacity-40"
                    dragClass="cursor-grabbing"
                    className="flex-1 min-h-0 overflow-y-auto px-0.5 pb-2 space-y-0.5 rounded-xl"
                  >
                    {(columnsState[col.id] || []).map(task => renderTaskCard(task, col))}
                  </ReactSortable>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* List / Table View */
        <div className="bg-card rounded-2xl border border-border/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-black uppercase text-[10px] tracking-wider border-b border-border/70">
                <tr>
                  <th className="px-6 py-4">Nom du Devis</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Destination</th>
                  <th className="px-6 py-4">Priorité</th>
                  <th className="px-6 py-4">Agent assigné</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4">Date de création</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-medium">
                {filteredAndSortedPipeline.map(task => {
                  const meta = getQuoteMeta(task);
                  const prio = getPriorityBadge(meta.priorite);
                  const clientName = task.clients?.nom || task.nom_prospect || 'Client inconnu';

                  let col = COLUMNS.find(c => c.id === task.status);
                  if (!col && task.status === 'converti_vente') col = COLUMNS.find(c => c.id === 'converti');
                  if (!col && task.status === 'converti_omra') col = COLUMNS.find(c => c.id === 'converti');
                  if (!col && task.status === 'ferme') col = COLUMNS.find(c => c.id === 'ferme');

                  return (
                    <tr 
                      key={task.id} 
                      onClick={() => handleCardClick(task)} 
                      className="hover:bg-muted/40 cursor-pointer transition-colors group"
                    >
                      <td className="px-6 py-4 font-bold text-foreground group-hover:text-primary transition-colors">
                        {meta.nom_devis}
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground/90">
                        {clientName}
                      </td>
                      <td className="px-6 py-4">
                        {meta.destination ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-md shadow-2xs">
                            <CountryFlag emoji={meta.destination_emoji} destinationName={meta.destination} className="w-4 h-3" />
                            <span>{meta.destination}</span>
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border", prio.style)}>
                          <span>{prio.emoji}</span>
                          <span>{prio.label}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const assignedAgent = agentsList.find(a => a.id === meta.agent_id || a.nom === meta.agent_nom);
                          return (
                            <div className="flex items-center gap-2">
                              <UserAvatar 
                                user={assignedAgent} 
                                name={meta.agent_nom} 
                                size="sm" 
                              />
                              <span className="text-xs font-semibold">{meta.agent_nom || 'Non assigné'}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("inline-block text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-wider", col?.light || 'bg-muted')}>
                          {col?.title || task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs font-medium">
                        {task.date_creation ? `${new Date(task.date_creation).toLocaleDateString('fr-FR')} (${getRelativeTime(task.date_creation)})` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="icon-sm" 
                            onClick={() => handleCardClick(task)}
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            title="Ouvrir le devis"
                          >
                            <Eye size={13} />
                          </Button>
                          {isAdmin && (
                            <Button 
                              variant="ghost" 
                              size="icon-sm" 
                              onClick={(e) => handleDelete(e, task.id)} 
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                              title="Supprimer le devis"
                            >
                              <Trash2 size={13} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredAndSortedPipeline.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground italic">
                      Aucun devis correspondant aux critères de recherche et filtres actifs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modals & Dialogs ────────────────────────────────────────────────── */}
      <ProspectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave} 
        prospect={selectedProspect} 
        isNew={isNew} 
        servicesList={servicesList} 
        clientsList={clientsList} 
      />

      {pendingVenteClient !== null && (() => {
        const c = clientsList.find(c => c.id === pendingVenteClient);
        return (
          <VenteForm 
            onClose={() => setPendingVenteClient(null)} 
            initialData={{ client_id: c?.id, client_nom: c?.nom }} 
            onSave={async (venteData) => {
              const { error } = await supabase.from('ventes').insert([venteData]);
              if (!error) {
                setPendingVenteClient(null);
              } else {
                alert("Erreur lors de la création de la vente : " + error.message);
              }
            }}
          />
        );
      })()}

      {omraModalOpen && (
        <Dialog open={true} onOpenChange={() => setOmraModalOpen(false)}>
          <DialogContent className="max-w-md" onClose={() => setOmraModalOpen(false)}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-500/10 text-violet-600">
                  <LayoutGrid size={18} />
                </div>
                Sélectionner le Groupe Omra
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1.5">
                Dans quel groupe souhaitez-vous enregistrer ce client ?
              </p>
            </DialogHeader>
            <div className="px-6 pb-2">
              <Label className="text-sm font-medium mb-2 block">Groupe Omra</Label>
              <Select value={selectedOmraGroupId} onChange={e => setSelectedOmraGroupId(e.target.value)}>
                <option value="">-- Choisir un groupe --</option>
                {omraGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.nom} ({g.statut})</option>
                ))}
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOmraModalOpen(false)}>Annuler</Button>
              <Button onClick={handleConfirmOmraGroup}>Continuer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
};

export default Pipeline;
