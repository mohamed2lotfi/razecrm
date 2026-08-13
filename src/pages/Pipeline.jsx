import React, { useState, useEffect, useMemo } from 'react';
import { ReactSortable } from 'react-sortablejs';
import { 
  Plus, Phone, GripVertical, Loader2, LayoutGrid, List, Trash2, 
  XCircle, Calculator, Calendar, User, MapPin, Flame, Clock, 
  ArrowUpRight, Sparkles, Filter, ArrowUpDown, Search, X, UserCheck, Check,
  TrendingUp, Send, CheckCircle2, ShieldAlert, ChevronRight, Eye, Briefcase,
  MessageCircle, Copy, PhoneCall, Zap, Edit3, ArrowRightLeft, ExternalLink, ShieldCheck, FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProspectModal from '@/components/ProspectModal';
import VenteForm from '@/components/VenteForm';
import ClientDossierModal from '@/components/ClientDossierModal';
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

  // ── RIGHT-CLICK CONTEXT MENU STATE ────────────────────────────────
  const [contextMenu, setContextMenu] = useState(null); // { x: number, y: number, task: object }
  const [toastMessage, setToastMessage] = useState(null);
  const [dossierClient, setDossierClient] = useState(null);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);

  const [columnsState, setColumnsState] = useState({
    nouvelle: [], en_cours: [], envoye: [], converti_vente: [], converti_omra: [], ferme: []
  });
  const [showAllVentes, setShowAllVentes] = useState(false);
  const [showAllOmra, setShowAllOmra] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Listeners to close context menu on click outside, scroll, or escape
  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    const handleKeyDown = (e) => { if (e.key === 'Escape') setContextMenu(null); };

    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('scroll', handleCloseMenu, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('scroll', handleCloseMenu, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const showToast = (text) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 3000);
  };

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
    const movedItems = newList.filter(item => item.status !== colId);
    
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
    if (e) e.stopPropagation();
    if (window.confirm('Voulez-vous vraiment supprimer ce devis ?')) {
      const { error } = await supabase.from('pipeline').delete().eq('id', id);
      if (!error) {
        setPipelineData(prev => prev.filter(p => p.id !== id));
        showToast("Devis supprimé avec succès");
      } else {
        alert("Erreur de suppression: " + error.message);
      }
    }
  };
  
  const handleSave = async (prospectData) => {
    const id = prospectData.id;

    // S'assurer que nom_prospect n'est jamais null (contrainte NOT NULL SQL)
    let computedNom = prospectData.nom_prospect;
    if (!computedNom || !computedNom.trim()) {
      if (prospectData.client_id) {
        const foundClient = clientsList.find(c => c.id === prospectData.client_id);
        computedNom = foundClient?.nom || 'Client';
      } else {
        computedNom = 'Client Prospect';
      }
    }

    // Whitelist only real PostgreSQL columns of 'pipeline' (strip chosen, selected, clients, etc.)
    const cleanPayload = {
      nom_prospect: computedNom,
      client_id: prospectData.client_id || null,
      service_id: prospectData.service_id || null,
      phone: prospectData.phone || null,
      status: prospectData.status || 'nouvelle',
      details_demande: prospectData.details_demande || '',
      details_devis: prospectData.details_devis || '',
      devis_ia: prospectData.devis_ia || ''
    };

    if (!id) {
      cleanPayload.date_creation = prospectData.date_creation || new Date().toISOString();
    }

    if (id) {
      const { data, error } = await supabase
        .from('pipeline')
        .update(cleanPayload)
        .eq('id', id)
        .select('*, clients(*)');
      
      if (!error && data) {
        setPipelineData(prev => prev.map(p => p.id === id ? data[0] : p));
        showToast("Devis mis à jour avec succès !");
      } else if (error) {
        alert("Erreur lors de la mise à jour: " + error.message);
      }
    } else {
      const { data, error } = await supabase
        .from('pipeline')
        .insert([cleanPayload])
        .select('*, clients(*)');
      
      if (!error && data) {
        setPipelineData(prev => [data[0], ...prev]);
        showToast("Nouveau devis créé avec succès !");
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

  // ── RIGHT CLICK CONTEXT MENU HANDLERS ─────────────────────────────
  const handleContextMenu = (e, task) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 260;
    const menuHeight = 440;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 12);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 12);

    setContextMenu({ x, y, task });
  };

  const handleQuickStatusChange = async (task, targetStatus) => {
    setContextMenu(null);
    setPipelineData(prev => prev.map(p => p.id === task.id ? { ...p, status: targetStatus } : p));
    
    await supabase.from('pipeline').update({ status: targetStatus }).eq('id', task.id);
    showToast(`Statut mis à jour : ${targetStatus}`);

    if (targetStatus === 'converti_vente') {
      setPendingVenteClient(task.client_id || null);
    } else if (targetStatus === 'converti_omra') {
      setSelectedOmraClientId(task.client_id || null);
      setOmraModalOpen(true);
    }
  };

  const handleQuickPriorityChange = async (task, newPriority) => {
    setContextMenu(null);
    let detailsObj = {};
    try {
      if (task.details_devis && task.details_devis.trim().startsWith('{')) {
        detailsObj = JSON.parse(task.details_devis);
      }
    } catch {}

    detailsObj.priorite = newPriority;
    const updatedDetails = JSON.stringify(detailsObj);

    setPipelineData(prev => prev.map(p => p.id === task.id ? { ...p, details_devis: updatedDetails } : p));
    await supabase.from('pipeline').update({ details_devis: updatedDetails }).eq('id', task.id);
    showToast(`Priorité : ${newPriority}`);
  };

  const handleCopyText = (text, message = 'Copié dans le presse-papier !') => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    showToast(message);
    setContextMenu(null);
  };

  const handleOpenWhatsApp = (phone, task) => {
    setContextMenu(null);
    let cleanPhone = (phone || task.phone || task.clients?.telephone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '213' + cleanPhone.substring(1);
    if (!cleanPhone) {
      alert("Aucun numéro de téléphone renseigné pour ce client.");
      return;
    }
    const meta = getQuoteMeta(task);
    const msg = encodeURIComponent(`Bonjour, concernant votre devis pour ${meta.destination || 'votre voyage'}...`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const handleOpenClientDossier = (task) => {
    setContextMenu(null);
    const client = task.clients || clientsList.find(c => c.id === task.client_id);
    if (client) {
      setDossierClient(client);
      setIsDossierModalOpen(true);
    } else {
      alert("Aucune fiche client trouvée pour ce devis.");
    }
  };

  // Render Kanban Task Card with Double-Bezel Hardware aesthetic
  const renderTaskCard = (task, col) => {
    const meta = getQuoteMeta(task);
    const prio = getPriorityBadge(meta.priorite);
    const clientName = task.clients?.nom || task.nom_prospect || 'Client inconnu';
    const clientPhone = task.clients?.telephone || task.phone || '';
    const creationDate = task.date_creation ? new Date(task.date_creation).toLocaleDateString('fr-FR') : '';
    const relativeTime = getRelativeTime(task.date_creation);

    return (
      <div
        key={task.id}
        onClick={() => handleCardClick(task)}
        onContextMenu={(e) => handleContextMenu(e, task)}
        className="group relative p-1 mb-2.5 rounded-2xl bg-gradient-to-b from-muted/70 to-muted/20 border border-border/70 hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 select-none"
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

  // Render Mini Task Card for Vente & Omra sub-zones
  const renderMiniTaskCard = (task, type = 'vente') => {
    const clientName = task.clients?.nom || task.nom_prospect || 'Client inconnu';
    const isVente = type === 'vente';

    return (
      <div
        key={task.id}
        onClick={() => handleCardClick(task)}
        onContextMenu={(e) => handleContextMenu(e, task)}
        className={cn(
          "group relative p-2 mb-1.5 rounded-xl border transition-all duration-200 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-xs flex items-center justify-between gap-1.5 select-none",
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
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white border border-slate-700 text-xs font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-3 backdrop-blur-md">
          <CheckCircle2 size={15} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

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
            Gérez vos demandes de devis, opportunités commerciales et conversions de ventes en temps réel. Clic droit pour le menu rapide.
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

          <Button 
            onClick={handleCreate} 
            className="font-bold text-xs h-10 px-5 gap-2 shadow-sm rounded-xl"
          >
            <Plus size={16} /> 
            <span>Nouveau Devis</span>
          </Button>
        </div>
      </div>

      {/* ── KPI Metrics Cards Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
            <FileText size={18} />
          </div>
          <div>
            <div className="text-xl font-black text-foreground">{metrics.total}</div>
            <div className="text-[11px] font-bold text-muted-foreground">Total Devis</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
            <Clock size={18} />
          </div>
          <div>
            <div className="text-xl font-black text-foreground">{metrics.enCours}</div>
            <div className="text-[11px] font-bold text-muted-foreground">En Traitement</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-black">
            <Send size={18} />
          </div>
          <div>
            <div className="text-xl font-black text-foreground">{metrics.envoye}</div>
            <div className="text-[11px] font-bold text-muted-foreground">Devis Envoyés</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
            <TrendingUp size={18} />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span>{metrics.convertis}</span>
              <span className="text-xs font-bold text-muted-foreground">({metrics.conversionRate}%)</span>
            </div>
            <div className="text-[11px] font-bold text-muted-foreground">Ventes Conclues</div>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Toolbar (Strict Single Line) ─────────────────────────── */}
      <div className="bg-card p-2 sm:p-2.5 rounded-2xl border border-border/80 shadow-xs mb-6 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max lg:min-w-0 w-full flex-nowrap">
          
          {/* Search bar (Flexible) */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher devis, client, destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8.5 pr-7 h-8.5 text-xs bg-muted/40 rounded-xl border-border/80"
            />
            {searchTerm && (
              <button 
                type="button"
                onClick={() => setSearchTerm('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Toggle: Mes Devis */}
          <button
            type="button"
            onClick={() => setFilterMyQuotes(p => !p)}
            className={cn(
              "h-8.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap",
              filterMyQuotes 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-background text-muted-foreground hover:text-foreground border-border hover:bg-muted/40"
            )}
          >
            <User size={12} />
            <span>Mes devis ({myQuotesCount})</span>
          </button>

          {/* Filter: Priorité */}
          <Select 
            value={filterPriority} 
            onChange={e => setFilterPriority(e.target.value)}
            className="h-8.5 text-xs bg-background rounded-xl border-border w-[125px] shrink-0"
          >
            <option value="all">Priorité : Tous</option>
            <option value="Urgente">🔥 Urgente</option>
            <option value="Haute">⚡ Haute</option>
            <option value="Moyenne">🔹 Moyenne</option>
            <option value="Basse">⚪ Basse</option>
          </Select>

          {/* Filter: Date */}
          <Select 
            value={filterDate} 
            onChange={e => setFilterDate(e.target.value)}
            className="h-8.5 text-xs bg-background rounded-xl border-border w-[120px] shrink-0"
          >
            <option value="all">Date : Toutes</option>
            <option value="today">Aujourd'hui</option>
            <option value="week">7 derniers jours</option>
            <option value="month">30 derniers jours</option>
          </Select>

          {/* Sort By */}
          <Select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            className="h-8.5 text-xs bg-background rounded-xl border-border w-[130px] shrink-0"
          >
            <option value="date_desc">📅 Plus récents</option>
            <option value="date_asc">📅 Plus anciens</option>
            <option value="prio_desc">🔥 Priorité max</option>
            <option value="prio_asc">⚪ Priorité min</option>
          </Select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-8.5 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0 whitespace-nowrap"
              title="Effacer tous les filtres"
            >
              <X size={12} className="mr-1" />
              <span>Effacer</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Main View: Kanban Board or List ──────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <Loader2 className="animate-spin text-primary" size={32} />
          <span className="text-xs text-muted-foreground font-medium">Chargement du pipeline...</span>
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban Board Horizontal Layout */
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start h-[calc(100vh-320px)] min-h-[480px]">
          {COLUMNS.map(col => {
            const kpi = getColumnKPI(col.id);

            return (
              <div key={col.id} className="flex flex-col w-[300px] min-w-[300px] max-w-[300px] h-full flex-shrink-0 rounded-2xl bg-muted/30 border border-border/70 p-2.5 overflow-hidden">
                {/* Column Header */}
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

                {/* Split Column (Conversion Vente & Omra) */}
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
                  /* Standard Column Sortable */
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
                      onContextMenu={(e) => handleContextMenu(e, task)}
                      className="hover:bg-muted/40 cursor-pointer transition-colors group select-none"
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

      {/* ── FLOATING RIGHT-CLICK CONTEXT MENU (DROPDOWN INTERNE) ─────────────── */}
      {contextMenu && (() => {
        const { task, x, y } = contextMenu;
        const meta = getQuoteMeta(task);
        const clientName = task.clients?.nom || task.nom_prospect || 'Client';
        const clientPhone = task.clients?.telephone || task.phone || '';

        return (
          <div
            style={{ top: `${y}px`, left: `${x}px` }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-50 w-64 rounded-2xl bg-slate-900/95 dark:bg-slate-900/98 text-white border border-slate-700/80 shadow-2xl backdrop-blur-xl p-1.5 animate-in fade-in zoom-in-95 duration-150 select-none text-xs space-y-1 font-medium"
          >
            {/* Header Preview */}
            <div className="px-3 py-2 border-b border-slate-800 space-y-0.5">
              <div className="flex items-center justify-between gap-1">
                <span className="font-black text-white truncate text-xs">{meta.nom_devis}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {meta.priorite}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                <User size={10} className="text-emerald-400" />
                <span>{clientName}</span>
                {clientPhone && <span className="font-mono text-[10px]">({clientPhone})</span>}
              </p>
            </div>

            {/* Main Actions */}
            <div className="space-y-0.5 pt-1">
              <button
                type="button"
                onClick={() => { setContextMenu(null); handleCardClick(task); }}
                className="w-full px-2.5 py-1.5 rounded-xl hover:bg-emerald-600 text-slate-200 hover:text-white flex items-center gap-2 transition-colors text-left font-bold"
              >
                <Edit3 size={13} className="text-emerald-400" />
                <span>Ouvrir / Modifier le Devis</span>
              </button>

              {clientPhone && (
                <button
                  type="button"
                  onClick={() => handleOpenWhatsApp(clientPhone, task)}
                  className="w-full px-2.5 py-1.5 rounded-xl hover:bg-emerald-600 text-slate-200 hover:text-white flex items-center gap-2 transition-colors text-left"
                >
                  <MessageCircle size={13} className="text-emerald-400" />
                  <span>Contacter sur WhatsApp</span>
                </button>
              )}

              {clientPhone && (
                <button
                  type="button"
                  onClick={() => handleCopyText(clientPhone, `N° ${clientPhone} copié !`)}
                  className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2 transition-colors text-left"
                >
                  <Copy size={13} className="text-slate-400" />
                  <span>Copier Téléphone ({clientPhone})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleCopyText(meta.nom_devis, 'Titre du devis copié !')}
                className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2 transition-colors text-left"
              >
                <Copy size={13} className="text-slate-400" />
                <span>Copier Titre du Devis</span>
              </button>

              {(task.client_id || task.clients) && (
                <button
                  type="button"
                  onClick={() => handleOpenClientDossier(task)}
                  className="w-full px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2 transition-colors text-left"
                >
                  <ExternalLink size={13} className="text-blue-400" />
                  <span>Voir Fiche Client 360°</span>
                </button>
              )}
            </div>

            {/* Quick Priority Sub-Section */}
            <div className="pt-1.5 border-t border-slate-800/80 px-2 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Changer Priorité
              </span>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { id: 'Urgente', label: '🔥 Urgente' },
                  { id: 'Haute', label: '⚡ Haute' },
                  { id: 'Moyenne', label: '🔹 Moyenne' },
                  { id: 'Basse', label: '⚪ Basse' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleQuickPriorityChange(task, p.id)}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold text-left transition-colors border",
                      meta.priorite === p.id 
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40" 
                        : "bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700/50"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Status Sub-Section */}
            <div className="pt-1.5 border-t border-slate-800/80 px-2 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Déplacer vers
              </span>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { id: 'nouvelle', label: '🔵 Demande' },
                  { id: 'en_cours', label: '🟡 En cours' },
                  { id: 'envoye', label: '🟣 Envoyé' },
                  { id: 'converti_vente', label: '🟢 Vente' },
                  { id: 'converti_omra', label: '🕋 Omra' },
                  { id: 'ferme', label: '🔴 Fermé' }
                ].map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleQuickStatusChange(task, s.id)}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold text-left transition-colors border",
                      task.status === s.id 
                        ? "bg-primary/20 text-primary-foreground border-primary/40" 
                        : "bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700/50"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Delete Action */}
            <div className="pt-1.5 border-t border-slate-800/80">
              <button
                type="button"
                onClick={(e) => { setContextMenu(null); handleDelete(e, task.id); }}
                className="w-full px-2.5 py-1.5 rounded-xl hover:bg-rose-950/80 text-rose-300 hover:text-rose-200 flex items-center gap-2 transition-colors text-left font-bold"
              >
                <Trash2 size={13} className="text-rose-400" />
                <span>Supprimer ce Devis</span>
              </button>
            </div>
          </div>
        );
      })()}

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

      {isDossierModalOpen && dossierClient && (
        <ClientDossierModal
          isOpen={isDossierModalOpen}
          onClose={() => setIsDossierModalOpen(false)}
          client={dossierClient}
          onOpenDevis={(devis) => {
            setIsDossierModalOpen(false);
            handleCardClick(devis);
          }}
        />
      )}

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
                showToast("Vente créée avec succès !");
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
