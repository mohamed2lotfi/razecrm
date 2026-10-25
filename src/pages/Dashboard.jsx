import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { 
  LayoutDashboard, KanbanSquare, Plane, Coins, Bell, RefreshCw, 
  Calendar, Users, Building2, Phone, MessageCircle, ArrowUpRight, 
  CheckCircle2, AlertTriangle, ShieldAlert, Clock, Sparkles, Plus, 
  ChevronRight, ArrowRight, Check, Eye, AlertCircle, TrendingUp,
  Wallet, ExternalLink, Filter, UserCheck, Flame, Zap, BedDouble,
  Search, CreditCard, CheckCheck
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
import { buildChambresPhysiques, computeGroupRoomStats } from '@/lib/omraRoomUtils';
import OmraGroupRoomSummary from '@/components/OmraGroupRoomSummary';

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
          const [enrRes, payRes, hotelsRes] = await Promise.all([
            supabase.from('omra_enregistrements').select('id, groupe_id, hotel_id, type_chambre, chambre_id, pelerins, enfants_sans_lit, total_net, total_brut, total_commission, reduction, paiement_rabatteur').in('groupe_id', groupIds),
            supabase.from('omra_paiements').select('id, groupe_id, montant_dzd').in('groupe_id', groupIds),
            supabase.from('hotels').select('*')
          ]);

          const enrData = enrRes.data || [];
          const payData = payRes.data || [];
          const hotelsMaster = hotelsRes.data || [];

          const enrichedGroups = upcomingGroups.map(g => {
            const groupEnrs = enrData.filter(e => e.groupe_id === g.id);
            const groupPays = payData.filter(p => p.groupe_id === g.id);

            // Calcul des chambres physiques et des lits vides (Hommes/Femmes)
            const groupChambres = buildChambresPhysiques(groupEnrs);
            const roomStats = computeGroupRoomStats(groupChambres, g.hotels, hotelsMaster);

            let totalPax = 0;
            let paxHommes = 0;
            let paxFemmes = 0;
            let nbrChd = 0;
            let totalDu = 0;

            groupEnrs.forEach(enr => {
              (enr.pelerins || []).forEach(p => {
                if (p.sexe === 'F') paxFemmes++;
                else paxHommes++;
                if (p.chd) nbrChd++;
              });
              (enr.enfants_sans_lit || []).forEach(enf => {
                if (enf.sexe === 'F') paxFemmes++;
                else paxHommes++;
                nbrChd++;
              });

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
              paxHommes,
              paxFemmes,
              nbrChd,
              nbrPlaces,
              placesRestantes,
              totalDu,
              encaisse,
              reste,
              roomStats
            };
          });

          setOmraGroups(enrichedGroups);
        } else {
          setOmraGroups([]);
        }
      }

      // 3. Ventes non payées / Créances
      try {
        let salesRes = await supabase
          .from('ventes')
          .select('id, date_vente, client_nom, client_id, details, destination, total, etat, created_at, created_by, service_id, client:clients(id, telephone, email)')
          .order('date_vente', { ascending: false, nullsFirst: false });

        if (salesRes.error) {
          salesRes = await supabase
            .from('ventes')
            .select('id, date_vente, client_nom, client_id, details, destination, total, etat, created_at, created_by, service_id')
            .order('date_vente', { ascending: false, nullsFirst: false });
        }

        const { data: payData } = await supabase
          .from('vente_paiements')
          .select('vente_id, montant_dzd');

        const salesData = salesRes.data || [];
        const payList = payData || [];

        const payMap = {};
        payList.forEach(p => {
          if (p.vente_id) {
            payMap[p.vente_id] = (payMap[p.vente_id] || 0) + (Number(p.montant_dzd) || 0);
          }
        });

        const enrichedSales = salesData.map(v => {
          const total = Number(v.total) || 0;
          const paye = payMap[v.id] || 0;
          const reste = Math.max(0, total - paye);
          const telFromDetails = v.details?.match(/(?:0|\+213)[5-7][0-9]{8}/)?.[0];
          const telephone = v.client?.telephone || telFromDetails || '';
          const code = `VTE-${v.id ? v.id.slice(0, 6).toUpperCase() : 'REC'}`;

          return {
            ...v,
            total,
            paye,
            reste,
            telephone,
            code
          };
        }).filter(v => {
          if (v.etat === 'Remboursé' || v.etat === 'Annulé') return false;
          return v.reste > 0;
        });

        setUnpaidVentes(enrichedSales);
      } catch (salesCatchErr) {
        console.error("Erreur chargement créances ventes dashboard:", salesCatchErr);
        setUnpaidVentes([]);
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

  // In-memory quick filter & search states
  const [devisFilter, setDevisFilter] = useState('all'); // 'all' | 'urgent' | 'nouvelle' | 'en_cours'
  const [devisSearch, setDevisSearch] = useState('');
  
  const [omraFilter, setOmraFilter] = useState('all'); // 'all' | 'empty_beds' | 'imminent'
  
  const [ventesFilter, setVentesFilter] = useState('all'); // 'all' | 'partiel' | 'non_paye'
  const [ventesSearch, setVentesSearch] = useState('');

  const [alertsFilter, setAlertsFilter] = useState('all'); // 'all' | 'urgent'

  // KPIs calculations
  const totalCreancesVentes = useMemo(() => {
    return unpaidVentes.reduce((sum, v) => sum + (v.reste || 0), 0);
  }, [unpaidVentes]);

  const totalPlacesRestantesOmra = useMemo(() => {
    return omraGroups.reduce((sum, g) => sum + (g.placesRestantes || 0), 0);
  }, [omraGroups]);

  const totalHommesOmra = useMemo(() => {
    return omraGroups.reduce((sum, g) => sum + (g.paxHommes || 0), 0);
  }, [omraGroups]);

  const totalFemmesOmra = useMemo(() => {
    return omraGroups.reduce((sum, g) => sum + (g.paxFemmes || 0), 0);
  }, [omraGroups]);

  const totalLitsVidesOmra = useMemo(() => {
    return omraGroups.reduce((sum, g) => sum + (g.roomStats?.totalLitsVides || 0), 0);
  }, [omraGroups]);

  const totalLitsVidesHommesOmra = useMemo(() => {
    return omraGroups.reduce((sum, g) => sum + (g.roomStats?.litsVidesHommes || 0), 0);
  }, [omraGroups]);

  const totalLitsVidesFemmesOmra = useMemo(() => {
    return omraGroups.reduce((sum, g) => sum + (g.roomStats?.litsVidesFemmes || 0), 0);
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

  // Filtered lists for smooth interaction
  const filteredDevis = useMemo(() => {
    return devisList.filter(d => {
      if (devisFilter === 'urgent') {
        if (d.meta?.priorite !== 'Urgente' && d.meta?.priorite !== 'Haute') return false;
      } else if (devisFilter === 'nouvelle') {
        if (d.status !== 'nouvelle') return false;
      } else if (devisFilter === 'en_cours') {
        if (d.status !== 'en_cours' && d.status !== 'envoye') return false;
      }
      if (devisSearch.trim()) {
        const q = devisSearch.toLowerCase();
        const nom = (d.nom_prospect || d.meta?.nom_devis || '').toLowerCase();
        const dest = (d.meta?.destination || '').toLowerCase();
        const tel = (d.phone || '').toLowerCase();
        if (!nom.includes(q) && !dest.includes(q) && !tel.includes(q)) return false;
      }
      return true;
    });
  }, [devisList, devisFilter, devisSearch]);

  const filteredOmra = useMemo(() => {
    return omraGroups.filter(g => {
      if (omraFilter === 'empty_beds') {
        return (g.roomStats?.totalLitsVides || 0) > 0;
      }
      if (omraFilter === 'imminent') {
        if (!g.date_depart) return false;
        const diffDays = Math.ceil((new Date(g.date_depart) - new Date()) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 14;
      }
      return true;
    });
  }, [omraGroups, omraFilter]);

  const filteredVentes = useMemo(() => {
    return unpaidVentes.filter(v => {
      if (ventesFilter === 'partiel') {
        if (!((v.paye || 0) > 0)) return false;
      } else if (ventesFilter === 'non_paye') {
        if ((v.paye || 0) > 0) return false;
      }
      if (ventesSearch.trim()) {
        const q = ventesSearch.toLowerCase();
        const nom = (v.client_nom || '').toLowerCase();
        const code = (v.code || '').toLowerCase();
        const tel = (v.telephone || '').toLowerCase();
        const details = (v.details || '').toLowerCase();
        const dest = (v.destination || '').toLowerCase();
        if (!nom.includes(q) && !code.includes(q) && !tel.includes(q) && !details.includes(q) && !dest.includes(q)) return false;
      }
      return true;
    });
  }, [unpaidVentes, ventesFilter, ventesSearch]);

  const filteredAlerts = useMemo(() => {
    return agentAlerts.filter(a => {
      if (alertsFilter === 'urgent') {
        return a.alert?.priority === 'urgent' || a.alert?.priority === 'high';
      }
      return true;
    });
  }, [agentAlerts, alertsFilter]);

  // Flight countdown badge generator
  const getFlightCountdown = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return { label: "Aujourd'hui", badge: "bg-rose-500 text-white font-black animate-pulse" };
    if (diffDays === 1) return { label: "Demain", badge: "bg-amber-500 text-slate-950 font-black" };
    if (diffDays < 0) return { label: "Passé", badge: "bg-slate-200 text-slate-600 font-semibold" };
    if (diffDays <= 7) return { label: `J-${diffDays}`, badge: "bg-rose-50 text-rose-700 border border-rose-200/90 font-black" };
    if (diffDays <= 15) return { label: `J-${diffDays}`, badge: "bg-amber-50 text-amber-800 border border-amber-200/90 font-black" };
    return { label: `Dans ${diffDays}j`, badge: "bg-slate-100 text-slate-600 border border-slate-200 font-bold" };
  };

  return (
    <Layout fullHeight={true}>
      <div className="flex flex-col h-full overflow-hidden gap-2.5">
        
        {/* ── 1. Top Header & KPI Strip ───────────────────────────── */}
        <div className="flex flex-col gap-2 shrink-0">
          
          {/* Executive Command Bar (Obsidian Titanium Island) */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white px-4 py-2.5 shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            {/* Ambient diffused atmospheric glow */}
            <div className="absolute -top-12 -right-12 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 left-1/3 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Left: User Identity & Live Beacon */}
            <div className="flex items-center gap-3 relative z-10">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner">
                  <LayoutDashboard size={18} />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-pulse" />
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                    Bonjour, {profile?.nom || user?.email?.split('@')[0] || 'Agent'}
                  </h1>
                  <span className={cn(
                    "text-[9.5px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider shadow-2xs",
                    isAdmin ? "bg-purple-500/20 text-purple-300 border-purple-400/30" : "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                  )}>
                    {isAdmin ? 'Administrateur' : 'Agent Commercial'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                  <span className="flex items-center gap-1.5 capitalize font-medium">
                    <Calendar size={11} className="text-slate-400" /> {formattedToday}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Cockpit en direct
                  </span>
                </div>
              </div>
            </div>

            {/* Center: Live Operational Ribbon */}
            <div className="hidden xl:flex items-center gap-2 text-[10.5px] bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl shadow-inner relative z-10">
              <span className="flex items-center gap-1 font-bold text-slate-300">
                <Plane size={11} className="text-emerald-400" /> {omraGroups.length} vols
              </span>
              <span className="text-white/20">|</span>
              <span className="flex items-center gap-1 font-extrabold text-amber-300" title="Total lits vacants Omra">
                <BedDouble size={11} className="text-amber-400" /> {totalLitsVidesOmra} lits vides ({totalLitsVidesHommesOmra}H • {totalLitsVidesFemmesOmra}F)
              </span>
              <span className="text-white/20">|</span>
              <span className="flex items-center gap-1 font-bold text-slate-300">
                <KanbanSquare size={11} className="text-blue-400" /> {devisList.length} devis
              </span>
              <span className="text-white/20">|</span>
              <span className="flex items-center gap-1 font-bold text-slate-300">
                <Coins size={11} className="text-amber-400" /> {fmtCompactDZD(totalCreancesVentes)}
              </span>
            </div>

            {/* Right: Quick Action Island (Button-in-Button Pattern) */}
            <div className="flex items-center gap-2 relative z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="h-8 px-2.5 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all haptic-tap"
                title="Actualiser les données"
              >
                <RefreshCw size={13} className={cn("mr-1.5", refreshing && "animate-spin text-emerald-400")} />
                Actualiser
              </Button>
              <Button
                size="sm"
                onClick={() => setIsAlertModalOpen(true)}
                className="h-8 px-3 text-xs bg-white/10 hover:bg-white/15 text-white border border-white/15 font-bold rounded-xl shadow-xs transition-all haptic-tap"
              >
                <Plus size={13} className="mr-1 text-slate-300" /> Alerte
              </Button>
              <button
                onClick={() => {
                  setSelectedProspect(null);
                  setIsProspectModalOpen(true);
                }}
                className="h-8 pl-3.5 pr-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl shadow-xs transition-all flex items-center gap-2 group haptic-tap cursor-pointer"
              >
                <span className="text-xs">Nouveau Devis</span>
                <span className="w-5 h-5 rounded-lg bg-slate-950/15 flex items-center justify-center transition-transform group-hover:scale-110">
                  <Plus size={12} className="text-slate-950 stroke-[3]" />
                </span>
              </button>
            </div>
          </div>

          {/* 4 Quick KPI Summary Cards (Double-Bezel Architecture) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
            {/* KPI 1: Devis */}
            <div 
              onClick={() => navigate('/pipeline')}
              className="p-1 rounded-2xl bg-slate-100/75 border border-slate-200/80 hover:border-blue-300/90 transition-all duration-300 cursor-pointer shadow-2xs hover:shadow-xs group haptic-tap"
            >
              <div className="p-3 bg-white rounded-xl flex items-center justify-between border border-slate-100/90 shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Devis en Attente
                  </span>
                  <p className="text-xl font-black text-slate-900 tracking-tight leading-none tabular-nums">
                    {devisList.length} <span className="text-[11px] font-bold text-slate-400">dossiers</span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">Pipeline commercial actif</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-2xs">
                  <ArrowUpRight size={15} />
                </div>
              </div>
            </div>

            {/* KPI 2: Omra & Lits Vides */}
            <div 
              onClick={() => navigate('/omra')}
              className="p-1 rounded-2xl bg-slate-100/75 border border-slate-200/80 hover:border-emerald-300/90 transition-all duration-300 cursor-pointer shadow-2xs hover:shadow-xs group haptic-tap"
            >
              <div className="p-3 bg-white rounded-xl flex items-center justify-between border border-slate-100/90 shadow-2xs">
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Prochains Vols Omra
                  </span>
                  <p className="text-xl font-black text-slate-900 tracking-tight leading-none tabular-nums">
                    {omraGroups.length} <span className="text-[11px] font-bold text-slate-400">vols</span>
                  </p>
                  <div className="flex items-center gap-1 pt-0.5 text-[9.5px] flex-wrap">
                    <span className="font-bold text-sky-800 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200/80 tabular-nums">👨 {totalHommesOmra} H</span>
                    <span className="font-bold text-rose-800 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200/80 tabular-nums">👩 {totalFemmesOmra} F</span>
                    <span className="font-black text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shadow-2xs tabular-nums" title="Total lits vides ventilés par genre">
                      🛏️ {totalLitsVidesOmra} v. ({totalLitsVidesHommesOmra}H • {totalLitsVidesFemmesOmra}F)
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs ml-2">
                  <ArrowUpRight size={15} />
                </div>
              </div>
            </div>

            {/* KPI 3: Ventes Créances */}
            <div 
              onClick={() => navigate('/ventes')}
              className="p-1 rounded-2xl bg-slate-100/75 border border-slate-200/80 hover:border-amber-300/90 transition-all duration-300 cursor-pointer shadow-2xs hover:shadow-xs group haptic-tap"
            >
              <div className="p-3 bg-white rounded-xl flex items-center justify-between border border-slate-100/90 shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Créances Ventes
                  </span>
                  <p className="text-xl font-black text-slate-900 tracking-tight leading-none tabular-nums font-mono">
                    {fmtCompactDZD(totalCreancesVentes)}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {unpaidVentes.length} dossier{unpaidVentes.length > 1 ? 's' : ''} en attente
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 border border-amber-100 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-2xs">
                  <ArrowUpRight size={15} />
                </div>
              </div>
            </div>

            {/* KPI 4: Alertes */}
            <div 
              onClick={() => setIsAlertModalOpen(true)}
              className="p-1 rounded-2xl bg-slate-100/75 border border-slate-200/80 hover:border-purple-300/90 transition-all duration-300 cursor-pointer shadow-2xs hover:shadow-xs group haptic-tap"
            >
              <div className="p-3 bg-white rounded-xl flex items-center justify-between border border-slate-100/90 shadow-2xs">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-purple-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                    Mes Alertes & Tâches
                  </span>
                  <p className="text-xl font-black text-slate-900 tracking-tight leading-none tabular-nums">
                    {agentAlerts.length} <span className="text-[11px] font-bold text-purple-700">({urgentAlertsCount} urgentes)</span>
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">Rappels opérationnels</p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-800 border border-purple-100 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-2xs">
                  <ArrowUpRight size={15} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Main 2x2 Bento Grid ──────────────────────────────── */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          
          {/* ── Quadrant 1: Devis en Attente (The Deal Cockpit) ────── */}
          <div className="p-1 rounded-2xl bg-slate-100/70 border border-slate-200/85 shadow-2xs flex flex-col h-full overflow-hidden">
            <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden border border-slate-100/90">
              
              {/* Card Header & Filter Chips */}
              <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/70 flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-100/80 text-blue-700 border border-blue-200/60 flex items-center justify-center">
                      <KanbanSquare size={13} />
                    </div>
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Devis en Attente</h2>
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 border border-blue-200/80 tabular-nums">
                      {filteredDevis.length}
                    </span>
                    {!isAdmin && (
                      <span className="text-[10px] text-slate-400 font-medium italic hidden sm:inline">(Mes dossiers)</span>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => navigate('/pipeline')}
                    className="text-[11px] font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors haptic-tap"
                  >
                    Pipeline <ChevronRight size={13} />
                  </button>
                </div>

                {/* Filter tabs row + mini search */}
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-1 text-[10px]">
                    {[
                      { id: 'all', label: 'Tous' },
                      { id: 'urgent', label: 'Urgents' },
                      { id: 'nouvelle', label: 'Demandes' },
                      { id: 'en_cours', label: 'En cours' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setDevisFilter(tab.id)}
                        className={cn(
                          "px-2 py-0.5 rounded-md font-bold transition-all haptic-tap",
                          devisFilter === tab.id
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-32 sm:w-36">
                    <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filtrer..."
                      value={devisSearch}
                      onChange={(e) => setDevisSearch(e.target.value)}
                      className="w-full pl-6 pr-2 py-0.5 text-[10.5px] rounded-md border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Card Content - Scrollable list */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
                {filteredDevis.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <KanbanSquare size={32} className="opacity-20 mb-2" />
                    <p className="text-xs font-bold text-slate-700">Aucun devis trouvé</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {devisSearch ? "Modifiez votre recherche" : "Tous vos devis sont traités ou convertis."}
                    </p>
                  </div>
                ) : (
                  filteredDevis.map((devis) => {
                    const statusInfo = STATUS_PILLS[devis.status] || STATUS_PILLS.nouvelle;
                    const priorityInfo = PRIORITY_BADGES[devis.meta.priorite] || PRIORITY_BADGES.Moyenne;

                    return (
                      <div 
                        key={devis.id}
                        onClick={() => {
                          setSelectedProspect(devis);
                          setIsProspectModalOpen(true);
                        }}
                        className="p-2.5 rounded-xl border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/20 bg-white transition-all cursor-pointer flex flex-col gap-1.5 shadow-2xs group haptic-tap"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-5 h-5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-black text-[10px] flex items-center justify-center shrink-0">
                              {(devis.nom_prospect || devis.meta.nom_devis || 'D')[0]?.toUpperCase()}
                            </span>
                            <span className="text-xs font-black text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                              {devis.nom_prospect || devis.meta.nom_devis}
                            </span>
                            {devis.meta.destination && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded-md border border-slate-200 shrink-0">
                                <CountryFlag countryName={devis.meta.destination} emoji={devis.meta.destination_emoji} size={11} />
                                {devis.meta.destination}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className={cn("text-[9px] px-1.5 py-0.2 rounded-md border font-black uppercase tracking-wider", priorityInfo.color)}>
                              {priorityInfo.label}
                            </span>
                            <span className={cn("text-[9px] px-1.5 py-0.2 rounded-md border font-bold", statusInfo.bg)}>
                              {statusInfo.label}
                            </span>
                          </div>
                        </div>

                        {devis.details_demande && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {devis.details_demande}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            {devis.phone && (
                              <span className="flex items-center gap-1 text-slate-600 font-semibold">
                                <Phone size={10} className="text-slate-400" /> {devis.phone}
                              </span>
                            )}
                            {devis.meta.agent_nom && isAdmin && (
                              <span className="text-slate-500">Agent : <b>{devis.meta.agent_nom}</b></span>
                            )}
                          </div>
                          <span className="flex items-center gap-1 font-medium">
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
          </div>

          {/* ── Quadrant 2: Situations Prochains Vols Omra ─────────── */}
          <div className="p-1 rounded-2xl bg-slate-100/70 border border-slate-200/85 shadow-2xs flex flex-col h-full overflow-hidden">
            <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden border border-slate-100/90">
              
              {/* Card Header & Empty Beds Indicator Bar */}
              <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/70 flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100/80 text-emerald-800 border border-emerald-200/60 flex items-center justify-center">
                      <Plane size={13} />
                    </div>
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Prochains Vols Omra</h2>
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/80 tabular-nums">
                      {filteredOmra.length}
                    </span>
                    <div className="hidden sm:flex items-center gap-1 ml-1 text-[9px] font-bold">
                      <span className="px-1.5 py-0.2 rounded-full bg-sky-50 text-sky-800 border border-sky-200 tabular-nums">👨 {totalHommesOmra} H</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-800 border border-rose-200 tabular-nums">👩 {totalFemmesOmra} F</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-900 border border-amber-300 font-black shadow-2xs tabular-nums" title="Lits vides totaux (Hommes • Femmes)">
                        🛏️ {totalLitsVidesOmra} v. ({totalLitsVidesHommesOmra}H • {totalLitsVidesFemmesOmra}F)
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => navigate('/omra')}
                    className="text-[11px] font-black text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition-colors haptic-tap"
                  >
                    Gérer Omra <ChevronRight size={13} />
                  </button>
                </div>

                {/* Filter tabs row */}
                <div className="flex items-center gap-1 text-[10px] pt-0.5">
                  {[
                    { id: 'all', label: 'Tous les vols' },
                    { id: 'empty_beds', label: 'Avec lits vacants' },
                    { id: 'imminent', label: 'Départs < 14 jours' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setOmraFilter(tab.id)}
                      className={cn(
                        "px-2 py-0.5 rounded-md font-bold transition-all haptic-tap",
                        omraFilter === tab.id
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Content - Scrollable list */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2.5">
                {filteredOmra.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <Plane size={32} className="opacity-20 mb-2" />
                    <p className="text-xs font-bold text-slate-700">Aucun vol correspondant</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Modifiez vos filtres ou planifiez un nouveau vol.</p>
                  </div>
                ) : (
                  filteredOmra.map((grp) => {
                    const percentFilled = grp.nbrPlaces > 0 ? Math.min(100, Math.round((grp.totalPax / grp.nbrPlaces) * 100)) : 0;
                    const countdown = getFlightCountdown(grp.date_depart);

                    return (
                      <div 
                        key={grp.id}
                        onClick={() => navigate(`/omra/group/${grp.id}`)}
                        className="p-3 rounded-xl border border-slate-200/90 hover:border-emerald-400/90 hover:bg-emerald-50/20 bg-white transition-all cursor-pointer flex flex-col gap-2.5 shadow-2xs group haptic-tap"
                      >
                        {/* Top row: Carrier Pill + Title + Depart Date + Gender count */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono text-[10px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md border border-emerald-200/90 tracking-wider shrink-0 shadow-2xs">
                              {grp.compagnie || 'VOL'}
                            </span>
                            <span className="text-xs font-black text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                              {grp.nom}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            {countdown && (
                              <span className={cn("text-[9.5px] px-1.5 py-0.2 rounded-md shadow-2xs tabular-nums", countdown.badge)}>
                                {countdown.label}
                              </span>
                            )}
                            <span className="text-[9.5px] font-extrabold px-1.5 py-0.2 rounded-full bg-sky-50 text-sky-800 border border-sky-200 tabular-nums" title="Pèlerins Hommes">
                              👨 {grp.paxHommes || 0} H
                            </span>
                            <span className="text-[9.5px] font-extrabold px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-800 border border-rose-200 tabular-nums" title="Pèlerines Femmes">
                              👩 {grp.paxFemmes || 0} F
                            </span>
                            {grp.nbrChd > 0 && (
                              <span className="text-[9.5px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-50 text-amber-800 border border-amber-200 tabular-nums" title="Enfants (CHD)">
                                🧒 {grp.nbrChd}
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-200/70">
                              <Calendar size={10} className="text-slate-400" />
                              {grp.date_depart || 'À définir'}
                            </span>
                          </div>
                        </div>

                        {/* Middle row: Places Progress & Financial Stats */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                          {/* Places Info */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-500 font-medium">Places : <b className="text-slate-900 tabular-nums">{grp.totalPax} / {grp.nbrPlaces}</b></span>
                              <span className={cn("font-black tabular-nums", grp.placesRestantes > 0 ? "text-emerald-700" : "text-rose-600")}>
                                {grp.placesRestantes} rest.
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={cn("h-full rounded-full transition-all duration-300", percentFilled >= 100 ? "bg-rose-500" : "bg-emerald-500")}
                                style={{ width: `${percentFilled}%` }}
                              />
                            </div>
                          </div>

                          {/* Finance Info */}
                          <div className="flex flex-col items-end justify-center font-mono">
                            <div className="flex items-center gap-1 text-[10px]">
                              <span className="text-slate-400">Encaissé:</span>
                              <span className="font-extrabold text-emerald-800 tabular-nums">{fmtCompactDZD(grp.encaisse)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px]">
                              <span className="text-slate-400">Reste:</span>
                              <span className={cn("font-extrabold tabular-nums", grp.reste > 0 ? "text-rose-600" : "text-slate-500")}>
                                {fmtCompactDZD(grp.reste)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom row: Répartition des chambres par hôtel & Lits vides (Femmes / Hommes) */}
                        <div className="pt-2 border-t border-slate-100">
                          <OmraGroupRoomSummary roomStats={grp.roomStats} variant="compact" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── Quadrant 3: Ventes Non Payées / Créances ──────────── */}
          <div className="p-1 rounded-2xl bg-slate-100/70 border border-slate-200/85 shadow-2xs flex flex-col h-full overflow-hidden">
            <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden border border-slate-100/90">
              
              {/* Card Header & Filter Chips */}
              <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/70 flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-100/80 text-amber-800 border border-amber-200/60 flex items-center justify-center">
                      <Coins size={13} />
                    </div>
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Créances & Impayés</h2>
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-200/80 tabular-nums">
                      {filteredVentes.length}
                    </span>
                  </div>

                  <button 
                    onClick={() => navigate('/ventes')}
                    className="text-[11px] font-black text-amber-800 hover:text-amber-950 flex items-center gap-1 transition-colors haptic-tap"
                  >
                    Toutes les ventes <ChevronRight size={13} />
                  </button>
                </div>

                {/* Filter tabs row + mini search */}
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-1 text-[10px]">
                    {[
                      { id: 'all', label: 'Toutes' },
                      { id: 'partiel', label: 'Acomptes' },
                      { id: 'non_paye', label: '100% Impayé' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setVentesFilter(tab.id)}
                        className={cn(
                          "px-2 py-0.5 rounded-md font-bold transition-all haptic-tap",
                          ventesFilter === tab.id
                            ? "bg-amber-600 text-white shadow-2xs"
                            : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-32 sm:w-36">
                    <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Client, code..."
                      value={ventesSearch}
                      onChange={(e) => setVentesSearch(e.target.value)}
                      className="w-full pl-6 pr-2 py-0.5 text-[10.5px] rounded-md border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Card Content - Scrollable list */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
                {filteredVentes.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <CheckCircle2 size={32} className="text-emerald-500/40 mb-2" />
                    <p className="text-xs font-bold text-slate-700">Aucune créance en attente</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {ventesSearch ? "Modifiez votre recherche" : "Toutes les ventes sont totalement payées."}
                    </p>
                  </div>
                ) : (
                  filteredVentes.map((vente) => {
                    const isPartiel = (vente.paye || 0) > 0;

                    return (
                      <div 
                        key={vente.id}
                        onClick={() => setActivePaymentVente(vente)}
                        className="p-2.5 rounded-xl border border-slate-200/80 hover:border-amber-400 hover:bg-amber-50/20 bg-white transition-all cursor-pointer flex flex-col gap-1.5 shadow-2xs group haptic-tap"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200 shrink-0">
                              {vente.code || 'VTE'}
                            </span>
                            <span className="text-xs font-black text-slate-900 group-hover:text-amber-900 transition-colors truncate">
                              {vente.client_nom || 'Client particulier'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={cn(
                              "text-[9px] font-black px-1.5 py-0.2 rounded-md border uppercase tracking-wider",
                              isPartiel ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200"
                            )}>
                              {isPartiel ? 'Acompte' : 'Non Payé'}
                            </span>
                          </div>
                        </div>

                        {vente.details && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {vente.details}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100">
                          <div className="flex items-center gap-2 flex-wrap">
                            {vente.destination && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                <CountryFlag destinationName={vente.destination} className="w-3.5 h-2.5 rounded-2xs inline-block" />
                                <span>{vente.destination}</span>
                              </span>
                            )}
                            {vente.telephone && (
                              <span className="flex items-center gap-1 text-slate-600 font-semibold">
                                <Phone size={10} className="text-slate-400" /> {vente.telephone}
                              </span>
                            )}
                            <span className="text-slate-400 font-mono">
                              Total : <b>{fmtCompactDZD(vente.total)}</b>
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-medium">Reste :</span>
                            <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 shadow-2xs font-mono tabular-nums">
                              {fmtCompactDZD(vente.reste)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePaymentVente(vente);
                              }}
                              className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white rounded-md text-[9px] font-black transition-all flex items-center gap-0.5"
                              title="Encaisser immédiatement"
                            >
                              <CreditCard size={10} />
                              <span>Encaisser</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ── Quadrant 4: Prochaines Alertes de l'Agent ──────────── */}
          <div className="p-1 rounded-2xl bg-slate-100/70 border border-slate-200/85 shadow-2xs flex flex-col h-full overflow-hidden">
            <div className="flex flex-col h-full bg-white rounded-xl overflow-hidden border border-slate-100/90">
              
              {/* Card Header & Filter Chips */}
              <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/70 flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-100/80 text-purple-700 border border-purple-200/60 flex items-center justify-center">
                      <Bell size={13} />
                    </div>
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider">Alertes & Tâches</h2>
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 border border-purple-200/80 tabular-nums">
                      {filteredAlerts.length}
                    </span>
                  </div>

                  <button 
                    onClick={() => setIsAlertModalOpen(true)}
                    className="text-[11px] font-black text-purple-700 hover:text-purple-900 flex items-center gap-1 transition-colors haptic-tap"
                  >
                    <Plus size={13} /> Nouvelle alerte
                  </button>
                </div>

                {/* Filter tabs row */}
                <div className="flex items-center gap-1 text-[10px] pt-0.5">
                  {[
                    { id: 'all', label: 'Toutes les alertes' },
                    { id: 'urgent', label: 'Urgentes uniquement' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setAlertsFilter(tab.id)}
                      className={cn(
                        "px-2 py-0.5 rounded-md font-bold transition-all haptic-tap",
                        alertsFilter === tab.id
                          ? "bg-purple-600 text-white shadow-2xs"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Content - Scrollable list */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
                {filteredAlerts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <Bell size={32} className="opacity-20 mb-2" />
                    <p className="text-xs font-bold text-slate-700">Aucune alerte active</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Vous êtes complètement à jour dans vos tâches !</p>
                  </div>
                ) : (
                  filteredAlerts.map((item) => {
                    const alert = item.alert;
                    if (!alert) return null;
                    const priority = ALERT_PRIORITY_STYLES[alert.priority] || ALERT_PRIORITY_STYLES.normal;

                    return (
                      <div 
                        key={item.id}
                        className="p-2.5 rounded-xl border border-slate-200/80 hover:border-purple-300 hover:bg-purple-50/20 bg-white transition-all flex items-start justify-between gap-2.5 shadow-2xs group haptic-tap"
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={cn("text-[9px] px-1.5 py-0.2 rounded-md border font-black uppercase flex items-center gap-1 tracking-wider", priority.bg)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", priority.dot)} />
                              {priority.label}
                            </span>
                            {alert.entity_type && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-bold uppercase">
                                {alert.entity_type}
                              </span>
                            )}
                            {alert.alert_at && (
                              <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 ml-auto">
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

                        {/* Quick Mark Done Button */}
                        <Button
                          size="icon-sm"
                          variant="outline"
                          onClick={(e) => handleMarkAlertDone(item.id, e)}
                          className="h-7 w-7 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 border-slate-200 shrink-0 transition-all haptic-tap"
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
          onPaiementsUpdated={loadDashboardData}
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
