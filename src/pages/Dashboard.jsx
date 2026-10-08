import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { 
  LayoutDashboard, KanbanSquare, Plane, Coins, Bell, RefreshCw, 
  Calendar, Users, Building2, Phone, MessageCircle, ArrowUpRight, 
  CheckCircle2, AlertTriangle, ShieldAlert, Clock, Sparkles, Plus, 
  ChevronRight, ArrowRight, Check, Eye, AlertCircle, TrendingUp,
  Wallet, ExternalLink, Filter, UserCheck, Flame, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import CountryFlag from '@/components/CountryFlag';
import UserAvatar from '@/components/UserAvatar';
import ProspectModal from '@/components/ProspectModal';
import VentePaiementsModal from '@/components/VentePaiementsModal';
import CreateAlertModal from '@/components/CreateAlertModal';

const PRIORITY_BADGES = {
  'Urgente': { label: 'Urgente', color: 'bg-rose-50 text-rose-700 border-rose-200 font-black' },
  'Haute': { label: 'Haute', color: 'bg-amber-50 text-amber-800 border-amber-200 font-bold' },
  'Moyenne': { label: 'Moyenne', color: 'bg-blue-50 text-blue-700 border-blue-200 font-medium' },
  'Basse': { label: 'Basse', color: 'bg-slate-100 text-slate-600 border-slate-200 font-medium' }
};

const ALERT_PRIORITY_STYLES = {
  urgent: { label: 'Urgent', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500 animate-pulse' },
  high: { label: 'Haute', bg: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  normal: { label: 'Normale', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  low: { label: 'Basse', bg: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' }
};

const STATUS_PILLS = {
  nouvelle: { label: 'Demande', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  en_cours: { label: 'En cours', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  envoye: { label: 'Devis envoyé', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  converti: { label: 'Converti', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ferme: { label: 'Fermé', bg: 'bg-slate-100 text-slate-600 border-slate-200' }
};

const fmtDZD = (n) => {
  return Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DZD';
};

const fmtCompactDZD = (n) => {
  const num = Number(n || 0);
  if (num >= 1000000) return (num / 1000000).toFixed(2) + ' M DZD';
  if (num >= 1000) return Math.round(num).toLocaleString('fr-FR') + ' DZD';
  return num.toFixed(0) + ' DZD';
};

export default function Dashboard() {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [devisList, setDevisList] = useState([]);
  const [omraGroups, setOmraGroups] = useState([]);
  const [unpaidVentes, setUnpaidVentes] = useState([]);
  const [agentAlerts, setAgentAlerts] = useState([]);
  
  // Modals state
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [isProspectModalOpen, setIsProspectModalOpen] = useState(false);
  const [activePaymentVente, setActivePaymentVente] = useState(null);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  // Load all dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Pending quotes (Pipeline)
      const { data: pipelineData, error: pipelineErr } = await supabase
        .from('pipeline')
        .select('*')
        .in('status', ['nouvelle', 'en_cours', 'envoye'])
        .order('date_creation', { ascending: false })
        .limit(30);

      if (!pipelineErr && pipelineData) {
        // Parse metadata & filter for agent if not admin
        const parsedQuotes = pipelineData.map(item => {
          let meta = {
            nom_devis: item.nom_prospect || 'Devis sans titre',
            destination: '',
            destination_emoji: '📍',
            priorite: 'Moyenne',
            agent_nom: '',
            agent_id: ''
          };
          try {
            if (item.details_devis && typeof item.details_devis === 'string' && item.details_devis.trim().startsWith('{')) {
              const p = JSON.parse(item.details_devis);
              if (p.nom_devis) meta.nom_devis = p.nom_devis;
              if (p.destination) meta.destination = p.destination;
              if (p.destination_emoji) meta.destination_emoji = p.destination_emoji;
              if (p.priorite) meta.priorite = p.priorite;
              if (p.agent_nom) meta.agent_nom = p.agent_nom;
              if (p.agent_id) meta.agent_id = p.agent_id;
            }
          } catch (e) {}
          return { ...item, meta };
        });

        // If not admin, show user's devis first or filter
        if (!isAdmin && user?.id) {
          const userQuotes = parsedQuotes.filter(q => q.meta.agent_id === user.id || q.client_id === user.id);
          // If no quotes assigned specifically to user, show recent active quotes
          setDevisList(userQuotes.length > 0 ? userQuotes : parsedQuotes);
        } else {
          setDevisList(parsedQuotes);
        }
      }

      // 2. Prochains vols Omra (ignore past departures)
      const { data: groupsData, error: groupsErr } = await supabase
        .from('omra_groupes')
        .select('*')
        .order('date_depart', { ascending: true });

      if (!groupsErr && groupsData) {
        // Strict filter: date_depart >= todayStr or date_depart is null/future
        const upcomingGroups = groupsData.filter(g => {
          if (!g.date_depart) return true;
          return g.date_depart >= todayStr;
        }).slice(0, 15);

        const groupIds = upcomingGroups.map(g => g.id);

        if (groupIds.length > 0) {
          const [enrRes, payRes] = await Promise.all([
            supabase.from('omra_enregistrements').select('id, groupe_id, pelerins, enfants_sans_lit, total_net, total_brut, total_commission, reduction, paiement_rabatteur').in('groupe_id', groupIds),
            supabase.from('omra_paiements').select('id, groupe_id, montant_dzd').in('groupe_id', groupIds)
          ]);

          const enrData = enrRes.data || [];
          const payData = payRes.data || [];

          const enrichedGroups = upcomingGroups.map(g => {
            const groupEnrs = enrData.filter(e => e.groupe_id === g.id);
            const groupPays = payData.filter(p => p.groupe_id === g.id);

            let totalPax = 0;
            let totalDu = 0;

            groupEnrs.forEach(enr => {
              const pelCount = (enr.pelerins && Array.isArray(enr.pelerins)) ? enr.pelerins.length : 0;
              const enfCount = (enr.enfants_sans_lit && Array.isArray(enr.enfants_sans_lit)) ? enr.enfants_sans_lit.length : 0;
              totalPax += (pelCount + enfCount);

              const net = enr.total_net !== null && enr.total_net !== undefined
                ? Number(enr.total_net)
                : (enr.paiement_rabatteur 
                    ? Math.max(0, (Number(enr.total_brut) || 0) - (Number(enr.total_commission) || 0) - (Number(enr.reduction) || 0))
                    : Math.max(0, (Number(enr.total_brut) || 0) - (Number(enr.reduction) || 0)));
              totalDu += net;
            });

            const encaisse = groupPays.reduce((sum, p) => sum + (Number(p.montant_dzd) || 0), 0);
            const reste = Math.max(0, totalDu - encaisse);
            const nbrPlaces = Number(g.nbr_places) || 0;
            const placesRestantes = Math.max(0, nbrPlaces - totalPax);

            return {
              ...g,
              totalPax,
              nbrPlaces,
              placesRestantes,
              totalDu,
              encaisse,
              reste
            };
          });

          setOmraGroups(enrichedGroups);
        } else {
          setOmraGroups([]);
        }
      }

      // 3. Ventes non payées
      const { data: salesData, error: salesErr } = await supabase
        .from('ventes')
        .select('id, code, client_nom, telephone, details, total, etat, date_vente, created_at, created_by, service_id, client_id')
        .neq('etat', 'paye')
        .order('date_vente', { ascending: false, nullsFirst: false })
        .limit(25);

      if (!salesErr && salesData) {
        const saleIds = salesData.map(s => s.id);
        if (saleIds.length > 0) {
          const { data: payData } = await supabase
            .from('vente_paiements')
            .select('vente_id, montant_dzd')
            .in('vente_id', saleIds);

          const payMap = {};
          (payData || []).forEach(p => {
            payMap[p.vente_id] = (payMap[p.vente_id] || 0) + (Number(p.montant_dzd) || 0);
          });

          const enrichedSales = salesData.map(v => {
            const total = Number(v.total) || 0;
            const paye = payMap[v.id] || 0;
            const reste = Math.max(0, total - paye);
            return {
              ...v,
              total,
              paye,
              reste
            };
          }).filter(v => v.reste > 0 || v.etat !== 'paye');

          setUnpaidVentes(enrichedSales);
        } else {
          setUnpaidVentes([]);
        }
      }

      // 4. Prochaines alertes de l'agent
      if (user?.id) {
        const { data: alertsData, error: alertsErr } = await supabase
          .from('alert_recipients')
          .select(`
            id,
            is_seen,
            is_done,
            created_at,
            alert:alerts (
              id,
              title,
              content,
              priority,
              status,
              alert_at,
              entity_type,
              entity_id,
              created_at,
              created_by,
              author:profiles!alerts_created_by_fkey (nom)
            )
          `)
          .eq('recipient_id', user.id)
          .eq('is_done', false)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!alertsErr && alertsData) {
          const validAlerts = alertsData.filter(a => a.alert && a.alert.status !== 'archived');
          setAgentAlerts(validAlerts);
        }
      }

    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, isAdmin]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Quick mark alert as done
  const handleMarkAlertDone = async (recipientId, e) => {
    e.stopPropagation();
    try {
      setAgentAlerts(prev => prev.filter(a => a.id !== recipientId));
      await supabase
        .from('alert_recipients')
        .update({ is_done: true, done_at: new Date().toISOString() })
        .eq('id', recipientId);
    } catch (err) {
      console.error(err);
    }
  };

  // KPIs calculations
  const totalCreancesVentes = useMemo(() => {
    return unpaidVentes.reduce((sum, v) => sum + (v.reste || 0), 0);
  }, [unpaidVentes]);

  const totalPlacesRestantesOmra = useMemo(() => {
    return omraGroups.reduce((sum, g) => sum + (g.placesRestantes || 0), 0);
  }, [omraGroups]);

  const urgentAlertsCount = useMemo(() => {
    return agentAlerts.filter(a => a.alert?.priority === 'urgent' || a.alert?.priority === 'high').length;
  }, [agentAlerts]);

  // Current date formatted
  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  return (
    <Layout fullHeight={true}>
      <div className="flex flex-col h-full overflow-hidden gap-2.5">
        
        {/* ── 1. Top Header & KPI Strip ───────────────────────────── */}
        <div className="flex flex-col gap-2 shrink-0">
          
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xs border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                <LayoutDashboard size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold tracking-tight">
                    Bonjour, {profile?.nom || user?.email?.split('@')[0] || 'Agent'}
                  </h1>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                    isAdmin ? "bg-purple-500/20 text-purple-300 border-purple-400/30" : "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                  )}>
                    {isAdmin ? 'Administrateur' : 'Agent Commercial'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300/80 capitalize flex items-center gap-1.5">
                  <Calendar size={11} className="text-slate-400" /> {formattedToday}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="h-8 px-2.5 text-xs text-slate-200 hover:text-white hover:bg-white/10"
                title="Actualiser les données"
              >
                <RefreshCw size={13} className={cn("mr-1.5", refreshing && "animate-spin text-emerald-400")} />
                Actualiser
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAlertModalOpen(true)}
                className="h-8 px-3 text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold"
              >
                <Plus size={13} className="mr-1" /> Alerte
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedProspect(null);
                  setIsProspectModalOpen(true);
                }}
                className="h-8 px-3 text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-xs"
              >
                <Plus size={13} className="mr-1" /> Nouveau Devis
              </Button>
            </div>
          </div>

          {/* 4 Quick KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
            {/* KPI 1: Devis */}
            <div 
              onClick={() => navigate('/pipeline')}
              className="p-2.5 rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/70 to-white hover:border-blue-300 hover:shadow-xs cursor-pointer transition-all flex items-center justify-between"
            >
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider font-bold text-blue-800 flex items-center gap-1">
                  <KanbanSquare size={12} className="text-blue-600" /> Devis en Attente
                </span>
                <p className="text-lg font-black text-blue-950 leading-none">
                  {devisList.length} <span className="text-[11px] font-semibold text-blue-700">dossiers</span>
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                <ArrowUpRight size={15} />
              </div>
            </div>

            {/* KPI 2: Omra */}
            <div 
              onClick={() => navigate('/omra')}
              className="p-2.5 rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-white hover:border-emerald-300 hover:shadow-xs cursor-pointer transition-all flex items-center justify-between"
            >
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-800 flex items-center gap-1">
                  <Plane size={12} className="text-emerald-600" /> Prochains Vols Omra
                </span>
                <p className="text-lg font-black text-emerald-950 leading-none">
                  {omraGroups.length} <span className="text-[11px] font-semibold text-emerald-700">({totalPlacesRestantesOmra} places disp.)</span>
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                <ArrowUpRight size={15} />
              </div>
            </div>

            {/* KPI 3: Ventes Créances */}
            <div 
              onClick={() => navigate('/ventes')}
              className="p-2.5 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-white hover:border-amber-300 hover:shadow-xs cursor-pointer transition-all flex items-center justify-between"
            >
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-900 flex items-center gap-1">
                  <Coins size={12} className="text-amber-700" /> Créances Ventes
                </span>
                <p className="text-lg font-black text-amber-950 leading-none">
                  {fmtCompactDZD(totalCreancesVentes)}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                <ArrowUpRight size={15} />
              </div>
            </div>

            {/* KPI 4: Alertes */}
            <div 
              onClick={() => setIsAlertModalOpen(true)}
              className="p-2.5 rounded-xl border border-purple-200/80 bg-gradient-to-br from-purple-50/70 to-white hover:border-purple-300 hover:shadow-xs cursor-pointer transition-all flex items-center justify-between"
            >
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider font-bold text-purple-900 flex items-center gap-1">
                  <Bell size={12} className="text-purple-600" /> Mes Alertes & Tâches
                </span>
                <p className="text-lg font-black text-purple-950 leading-none">
                  {agentAlerts.length} <span className="text-[11px] font-semibold text-purple-700">({urgentAlertsCount} urgentes)</span>
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs shrink-0">
                <ArrowUpRight size={15} />
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Main 2x2 Bento Grid (Strictly 100vh Fits) ────────── */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3">
          
          {/* ── Quadrant 1: Devis en Attente ───────────────────────── */}
          <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* Card Header */}
            <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center">
                  <KanbanSquare size={13} />
                </div>
                <h2 className="text-xs font-bold text-slate-900">Devis en Attente</h2>
                <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 h-4 bg-blue-100 text-blue-800 border-0">
                  {devisList.length}
                </Badge>
                {!isAdmin && (
                  <span className="text-[10px] text-slate-500 italic hidden sm:inline">(Mes devis)</span>
                )}
              </div>
              <button 
                onClick={() => navigate('/pipeline')}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
              >
                Pipeline <ChevronRight size={13} />
              </button>
            </div>

            {/* Card Content - Scrollable list */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
              {devisList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <KanbanSquare size={28} className="opacity-20 mb-1.5" />
                  <p className="text-xs font-semibold text-slate-600">Aucun devis en attente</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tous vos devis sont traités ou convertis.</p>
                </div>
              ) : (
                devisList.map((devis) => {
                  const statusInfo = STATUS_PILLS[devis.status] || STATUS_PILLS.nouvelle;
                  const priorityInfo = PRIORITY_BADGES[devis.meta.priorite] || PRIORITY_BADGES.Moyenne;

                  return (
                    <div 
                      key={devis.id}
                      onClick={() => {
                        setSelectedProspect(devis);
                        setIsProspectModalOpen(true);
                      }}
                      className="p-2.5 rounded-lg border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/20 bg-white transition-all cursor-pointer flex flex-col gap-1.5 shadow-2xs group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                            {devis.nom_prospect || devis.meta.nom_devis}
                          </span>
                          {devis.meta.destination && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                              <CountryFlag countryName={devis.meta.destination} emoji={devis.meta.destination_emoji} size={11} />
                              {devis.meta.destination}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className={cn("text-[9px] px-1.5 py-0.2 rounded border uppercase", priorityInfo.color)}>
                            {priorityInfo.label}
                          </span>
                          <span className={cn("text-[9px] px-1.5 py-0.2 rounded border font-semibold", statusInfo.bg)}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>

                      {devis.details_demande && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {devis.details_demande}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          {devis.phone && (
                            <span className="flex items-center gap-1 text-slate-600 font-medium">
                              <Phone size={10} className="text-slate-400" /> {devis.phone}
                            </span>
                          )}
                          {devis.meta.agent_nom && isAdmin && (
                            <span className="text-slate-500">Agent: <b>{devis.meta.agent_nom}</b></span>
                          )}
                        </div>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {devis.date_creation ? new Date(devis.date_creation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Récemment'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Quadrant 2: Situations Prochains Vols Omra ─────────── */}
          <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* Card Header */}
            <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Plane size={13} />
                </div>
                <h2 className="text-xs font-bold text-slate-900">Prochains Vols Omra</h2>
                <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 h-4 bg-emerald-100 text-emerald-800 border-0">
                  {omraGroups.length}
                </Badge>
              </div>
              <button 
                onClick={() => navigate('/omra')}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 transition-colors"
              >
                Gérer Omra <ChevronRight size={13} />
              </button>
            </div>

            {/* Card Content - Scrollable list */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
              {omraGroups.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Plane size={28} className="opacity-20 mb-1.5" />
                  <p className="text-xs font-semibold text-slate-600">Aucun vol à venir</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tous les vols passés sont archivés.</p>
                </div>
              ) : (
                omraGroups.map((grp) => {
                  const percentFilled = grp.nbrPlaces > 0 ? Math.min(100, Math.round((grp.totalPax / grp.nbrPlaces) * 100)) : 0;
                  const percentPaid = grp.totalDu > 0 ? Math.min(100, Math.round((grp.encaisse / grp.totalDu) * 100)) : 0;

                  return (
                    <div 
                      key={grp.id}
                      onClick={() => navigate(`/omra/group/${grp.id}`)}
                      className="p-2.5 rounded-lg border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/20 bg-white transition-all cursor-pointer flex flex-col gap-2 shadow-2xs group"
                    >
                      {/* Top row: Title + Airline + Dates */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded border border-emerald-200 shrink-0">
                            {grp.compagnie || 'VOL'}
                          </span>
                          <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                            {grp.nom}
                          </span>
                        </div>
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                          <Calendar size={10} />
                          {grp.date_depart || 'Date à définir'}
                        </span>
                      </div>

                      {/* Middle row: Places Progress & Financial Stats */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                        {/* Places Info */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500">Places : <b>{grp.totalPax} / {grp.nbrPlaces}</b></span>
                            <span className={cn("font-bold", grp.placesRestantes > 0 ? "text-emerald-600" : "text-red-500")}>
                              {grp.placesRestantes} rest.
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full transition-all", percentFilled >= 100 ? "bg-red-500" : "bg-emerald-500")}
                              style={{ width: `${percentFilled}%` }}
                            />
                          </div>
                        </div>

                        {/* Finance Info */}
                        <div className="flex flex-col items-end justify-center">
                          <div className="flex items-center gap-1 text-[10px]">
                            <span className="text-slate-400">Encaissé:</span>
                            <span className="font-bold text-emerald-700">{fmtCompactDZD(grp.encaisse)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px]">
                            <span className="text-slate-400">Reste:</span>
                            <span className={cn("font-bold", grp.reste > 0 ? "text-red-600" : "text-slate-500")}>
                              {fmtCompactDZD(grp.reste)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Quadrant 3: Ventes Non Payées / Créances ──────────── */}
          <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* Card Header */}
            <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Coins size={13} />
                </div>
                <h2 className="text-xs font-bold text-slate-900">Ventes Non Payées & Créances</h2>
                <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 h-4 bg-amber-100 text-amber-900 border-0">
                  {unpaidVentes.length}
                </Badge>
              </div>
              <button 
                onClick={() => navigate('/ventes')}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 transition-colors"
              >
                Toutes les ventes <ChevronRight size={13} />
              </button>
            </div>

            {/* Card Content - Scrollable list */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
              {unpaidVentes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <CheckCircle2 size={28} className="text-emerald-500/40 mb-1.5" />
                  <p className="text-xs font-semibold text-slate-600">Aucune créance en attente</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Toutes les ventes sont totalement payées.</p>
                </div>
              ) : (
                unpaidVentes.map((vente) => {
                  const isPartiel = (vente.paye || 0) > 0;

                  return (
                    <div 
                      key={vente.id}
                      onClick={() => setActivePaymentVente(vente)}
                      className="p-2.5 rounded-lg border border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/20 bg-white transition-all cursor-pointer flex flex-col gap-1.5 shadow-2xs group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-[9px] font-bold text-slate-400 bg-slate-100 px-1 py-0.2 rounded shrink-0">
                            {vente.code || 'VTE'}
                          </span>
                          <span className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition-colors truncate">
                            {vente.client_nom || 'Client particulier'}
                          </span>
                        </div>
                        <span className={cn(
                          "text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase",
                          isPartiel ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200"
                        )}>
                          {isPartiel ? 'Versement' : 'Non Payé'}
                        </span>
                      </div>

                      {vente.details && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {vente.details}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          {vente.telephone && (
                            <span className="flex items-center gap-1 text-slate-600">
                              <Phone size={10} className="text-slate-400" /> {vente.telephone}
                            </span>
                          )}
                          <span className="text-slate-400">
                            Total: <b>{fmtCompactDZD(vente.total)}</b>
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-medium">Reste dû :</span>
                          <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                            {fmtCompactDZD(vente.reste)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Quadrant 4: Prochaines Alertes de l'Agent ──────────── */}
          <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* Card Header */}
            <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Bell size={13} />
                </div>
                <h2 className="text-xs font-bold text-slate-900">Mes Prochaines Alertes & Tâches</h2>
                <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 h-4 bg-purple-100 text-purple-800 border-0">
                  {agentAlerts.length}
                </Badge>
              </div>
              <button 
                onClick={() => setIsAlertModalOpen(true)}
                className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 transition-colors"
              >
                <Plus size={13} /> Ajouter alerte
              </button>
            </div>

            {/* Card Content - Scrollable list */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
              {agentAlerts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Bell size={28} className="opacity-20 mb-1.5" />
                  <p className="text-xs font-semibold text-slate-600">Aucune alerte active</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Vous êtes complètement à jour !</p>
                </div>
              ) : (
                agentAlerts.map((item) => {
                  const alert = item.alert;
                  if (!alert) return null;
                  const priority = ALERT_PRIORITY_STYLES[alert.priority] || ALERT_PRIORITY_STYLES.normal;

                  return (
                    <div 
                      key={item.id}
                      className="p-2.5 rounded-lg border border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/20 bg-white transition-all flex items-start justify-between gap-2.5 shadow-2xs group"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn("text-[9px] px-1.5 py-0.2 rounded border font-bold uppercase flex items-center gap-1", priority.bg)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", priority.dot)} />
                            {priority.label}
                          </span>
                          {alert.entity_type && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 font-semibold uppercase">
                              {alert.entity_type}
                            </span>
                          )}
                          {alert.alert_at && (
                            <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 ml-auto">
                              <Clock size={10} />
                              {new Date(alert.alert_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {alert.title}
                        </h4>

                        {alert.content && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {alert.content}
                          </p>
                        )}
                      </div>

                      {/* Mark Done Button */}
                      <Button
                        size="icon-sm"
                        variant="outline"
                        onClick={(e) => handleMarkAlertDone(item.id, e)}
                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 border-slate-200 shrink-0 transition-all"
                        title="Marquer comme fait"
                      >
                        <Check size={13} />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ── 3. Modals ────────────────────────────────────────────── */}
      {/* Prospect / Devis Modal */}
      {isProspectModalOpen && (
        <ProspectModal
          isOpen={isProspectModalOpen}
          onClose={() => {
            setIsProspectModalOpen(false);
            setSelectedProspect(null);
            loadDashboardData();
          }}
          prospect={selectedProspect}
          onSuccess={loadDashboardData}
        />
      )}

      {/* Payment Modal for unpaid sale */}
      {activePaymentVente && (
        <VentePaiementsModal
          isOpen={!!activePaymentVente}
          onClose={() => {
            setActivePaymentVente(null);
            loadDashboardData();
          }}
          vente={activePaymentVente}
          onPaymentSuccess={loadDashboardData}
        />
      )}

      {/* Create Alert Modal */}
      {isAlertModalOpen && (
        <CreateAlertModal
          isOpen={isAlertModalOpen}
          onClose={() => {
            setIsAlertModalOpen(false);
            loadDashboardData();
          }}
          onSuccess={loadDashboardData}
        />
      )}
    </Layout>
  );
}
