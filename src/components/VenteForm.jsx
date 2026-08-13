import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Search, Loader2, Pencil, Sparkles, Plane, Building2, 
  FileText, Bus, Compass, Shield, Coins, TrendingUp, CheckCircle2, User, 
  Calendar, Layers, Tag, DollarSign, Calculator, ChevronDown, HelpCircle, 
  Package, ArrowUpRight, Check, X, CreditCard, ShieldCheck, Users, ArrowRight, Globe, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ClientForm from './ClientForm';
import DestinationSelect from '@/components/DestinationSelect';
import CountryFlag from '@/components/CountryFlag';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// Helper to assign a fitting emoji based on service name
export const getServiceEmoji = (name = '') => {
  const lower = name.toLowerCase();
  if (lower.includes('billet') || lower.includes('vol') || lower.includes('avion') || lower.includes('air') || lower.includes('ticket')) return '✈️';
  if (lower.includes('hotel') || lower.includes('hôtel') || lower.includes('heberg') || lower.includes('chambre') || lower.includes('nuit')) return '🏨';
  if (lower.includes('visa') || lower.includes('formalit') || lower.includes('consul') || lower.includes('evisa')) return '📑';
  if (lower.includes('transfert') || lower.includes('transport') || lower.includes('bus') || lower.includes('vtc') || lower.includes('navette')) return '🚐';
  if (lower.includes('excursion') || lower.includes('activit') || lower.includes('visite') || lower.includes('circuit') || lower.includes('guide') || lower.includes('safari')) return '🏖️';
  if (lower.includes('assurance')) return '🛡️';
  if (lower.includes('omra') || lower.includes('hajj') || lower.includes('pelerin')) return '🕋';
  if (lower.includes('package') || lower.includes('sejour') || lower.includes('séjour') || lower.includes('voyage')) return '📦';
  if (lower.includes('croisi') || lower.includes('bateau') || lower.includes('ferry')) return '🚢';
  if (lower.includes('train')) return '🚆';
  if (lower.includes('location') || lower.includes('voiture') || lower.includes('auto')) return '🚗';
  return '🏷️';
};

const createEmptyArticle = (categorie = 'Billeterie', defaultDest = '') => ({
  id: 'art_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
  categorie,
  service_id: '',
  destination: defaultDest,
  designation: '',
  prix_achat: '',
  commission: '',
  prix_vente: '',
  fournisseur_id: '',
  notes: ''
});

const VenteForm = ({ onClose, onSave, initialData }) => {
  const [clients, setClients] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [fournisseursList, setFournisseursList] = useState([]);
  const [destinationsList, setDestinationsList] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Visa catalogue data
  const [visaCountries, setVisaCountries] = useState([]);
  const [visaTypes, setVisaTypes] = useState([]);

  // Airlines data
  const [airlines, setAirlines] = useState([]);

  // Form Global Fields
  const [dateVente, setDateVente] = useState(() => {
    if (initialData?.date_vente) {
      try { return format(new Date(initialData.date_vente), 'yyyy-MM-dd'); } catch {}
    }
    return format(new Date(), 'yyyy-MM-dd');
  });
  const [clientId, setClientId] = useState(initialData?.client_id || '');
  const [destination, setDestination] = useState(() => {
    if (initialData?.destination) return initialData.destination;
    if (initialData?.articles && Array.isArray(initialData.articles) && initialData.articles[0]?.destination) {
      return initialData.articles[0].destination;
    }
    if (initialData?.details) {
      const match = initialData.details.match(/\[(?:🌍|Destination:?)\s*([^\]]+)\]/i);
      if (match) return match[1].trim();
    }
    return '';
  });
  const [etat, setEtat] = useState(initialData?.etat || 'Payé');
  const [observations, setObservations] = useState('');

  // Passagers list (Determines PAX Count)
  const [personnes, setPersonnes] = useState(() => {
    if (initialData?._visaMeta?.passagers && Array.isArray(initialData._visaMeta.passagers) && initialData._visaMeta.passagers.length > 0) {
      return initialData._visaMeta.passagers.map(p => ({ nom: p.nom || '', passport: p.passport || '' }));
    }
    return [];
  });

  // Effective PAX count: at least 1 (the main client) or the number of added passengers
  const paxCount = Math.max(1, personnes.length);

  // Multi-Articles Array
  const [articles, setArticles] = useState(() => {
    if (initialData?.articles && Array.isArray(initialData.articles) && initialData.articles.length > 0) {
      return initialData.articles.map(a => {
        const pa = a.prix_achat !== undefined ? a.prix_achat : (a.tarif_base || '');
        const pv = a.prix_vente !== undefined ? a.prix_vente : (a.total || '');
        let comm = a.commission !== undefined ? a.commission : '';
        if (comm === '' && pa !== '' && pv !== '') {
          comm = (parseFloat(pv) || 0) - (parseFloat(pa) || 0);
        }

        return {
          id: a.id || 'art_' + Math.random().toString(36).substring(2, 7),
          categorie: a.categorie || 'Billeterie',
          service_id: a.service_id || '',
          destination: a.destination || initialData?.destination || '',
          designation: a.designation || a.description || '',
          prix_achat: pa,
          commission: comm,
          prix_vente: pv,
          fournisseur_id: a.fournisseur_id || '',
          notes: a.notes || ''
        };
      });
    }
    return [createEmptyArticle('Billeterie', initialData?.destination || '')];
  });

  // Autocomplete client state
  const [clientSearch, setClientSearch] = useState(initialData?.client_nom || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    fetchFormData();
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchFormData = async () => {
    setLoadingData(true);
    const [cRes, sRes, fRes, dRes, vcRes, vtRes, aRes] = await Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('services').select('*').order('created_at'),
      supabase.from('fournisseurs').select('*').order('created_at'),
      supabase.from('destinations').select('*').order('nom', { ascending: true }),
      supabase.from('visa_countries').select('*').order('nom'),
      supabase.from('visa_types').select('*').order('nom'),
      supabase.from('airlines').select('*').order('nom')
    ]);
    if (cRes.data) setClients(cRes.data);
    if (sRes.data) setServicesList(sRes.data);
    if (fRes.data) setFournisseursList(fRes.data);
    if (dRes.data) setDestinationsList(dRes.data);
    if (vcRes.data) setVisaCountries(vcRes.data);
    if (vtRes.data) setVisaTypes(vtRes.data);
    if (aRes.data) setAirlines(aRes.data);
    setLoadingData(false);
  };

  // ── DYNAMIC CATEGORIES DIRECT FROM MASTER DATA (SERVICES TABLE) ─────
  const availableCategories = useMemo(() => {
    const masterServices = (servicesList || []).map(s => ({
      id: s.id,
      nom: s.nom,
      label: `${getServiceEmoji(s.nom)} ${s.nom}`,
      emoji: getServiceEmoji(s.nom),
      isMasterData: true
    }));

    const defaultCategories = [
      { id: 'cat_billet', nom: 'Billeterie', emoji: '✈️' },
      { id: 'cat_hotel', nom: 'Hôtel', emoji: '🏨' },
      { id: 'cat_visa', nom: 'Visa', emoji: '📑' },
      { id: 'cat_transfert', nom: 'Transfert', emoji: '🚐' },
      { id: 'cat_excursion', nom: 'Excursion', emoji: '🏖️' },
      { id: 'cat_assurance', nom: 'Assurance Voyage', emoji: '🛡️' },
      { id: 'cat_omra', nom: 'Omra', emoji: '🕋' },
      { id: 'cat_package', nom: 'Séjour / Package', emoji: '📦' }
    ];

    if (masterServices.length === 0) {
      return defaultCategories.map(d => ({ ...d, label: `${d.emoji} ${d.nom}` }));
    }

    const combined = [...masterServices];
    const hasAutre = combined.some(s => s.nom.toLowerCase().includes('autre'));
    if (!hasAutre) {
      combined.push({ id: 'cat_autre', nom: 'Autre Prestation', label: '⚙️ Autre Prestation', emoji: '⚙️' });
    }

    return combined;
  }, [servicesList]);

  // Adjust first article's category if initial was default and Master Data services loaded
  useEffect(() => {
    if (servicesList.length > 0 && (!initialData || !initialData.articles)) {
      setArticles(prev => {
        if (prev.length === 1 && (!prev[0].designation || prev[0].designation === '') && prev[0].categorie === 'Billeterie') {
          const firstService = servicesList[0];
          return [{
            ...prev[0],
            categorie: firstService.nom,
            service_id: firstService.id
          }];
        }
        return prev;
      });
    }
  }, [servicesList]);

  const selectedClient = clients.find(c => c.id === clientId);

  const handleSelectClient = (client) => {
    setClientSearch(client.nom);
    setClientId(client.id);
    setShowDropdown(false);

    if (personnes.length === 0) {
      setPersonnes([{ nom: client.nom, passport: client.passport || '' }]);
    }
  };

  const handleSaveNewClient = async (newClientData) => {
    const { data, error } = await supabase.from('clients').insert([newClientData]).select();
    if (!error && data && data[0]) {
      const inserted = data[0];
      setClients(prev => [inserted, ...prev]);
      setClientSearch(inserted.nom);
      setClientId(inserted.id);
      setIsAddingClient(false);
      if (personnes.length === 0) {
        setPersonnes([{ nom: inserted.nom, passport: inserted.passport || '' }]);
      }
    }
  };

  // ── ARTICLES MANAGEMENT & BIDIRECTIONAL PRICING ─────────────────────
  const handleAddArticle = (categoryName) => {
    const defaultCat = categoryName || (availableCategories[0]?.nom || 'Billeterie');
    const matchedService = servicesList.find(s => s.nom.toLowerCase() === defaultCat.toLowerCase());
    const newArt = {
      ...createEmptyArticle(defaultCat, destination),
      service_id: matchedService?.id || ''
    };
    setArticles(prev => [...prev, newArt]);
  };

  const handleRemoveArticle = (index) => {
    if (articles.length === 1) {
      const defaultCat = availableCategories[0]?.nom || 'Billeterie';
      const matchedService = servicesList.find(s => s.nom.toLowerCase() === defaultCat.toLowerCase());
      setArticles([{
        ...createEmptyArticle(defaultCat, destination),
        service_id: matchedService?.id || ''
      }]);
      return;
    }
    setArticles(prev => prev.filter((_, i) => i !== index));
  };

  // Bidirectional price & commission calculation
  const handleUpdateArticle = (index, field, value) => {
    setArticles(prev => {
      const updated = [...prev];
      const art = { ...updated[index] };

      if (field === 'categorie') {
        art.categorie = value;
        const matched = servicesList.find(s => s.nom.toLowerCase() === value.toLowerCase());
        art.service_id = matched?.id || '';
      } else if (field === 'prix_achat') {
        art.prix_achat = value;
        const pa = parseFloat(value) || 0;
        const comm = parseFloat(art.commission);
        const pv = parseFloat(art.prix_vente);

        if (!isNaN(comm) && art.commission !== '') {
          art.prix_vente = (pa + comm) === 0 && value === '' ? '' : (pa + comm);
        } else if (!isNaN(pv) && art.prix_vente !== '') {
          art.commission = (pv - pa);
        }
      } else if (field === 'commission') {
        art.commission = value;
        const comm = parseFloat(value) || 0;
        const pa = parseFloat(art.prix_achat) || 0;
        art.prix_vente = value === '' ? (pa ? pa : '') : (pa + comm);
      } else if (field === 'prix_vente') {
        art.prix_vente = value;
        const pv = parseFloat(value) || 0;
        const pa = parseFloat(art.prix_achat) || 0;
        art.commission = value === '' ? '' : (pv - pa);
      } else {
        art[field] = value;
      }

      updated[index] = art;
      return updated;
    });
  };

  // Quick preset helper to auto-fill prices if Visa or Airline is selected
  const handleQuickVisaSelect = (index, visaTypeId) => {
    const vt = visaTypes.find(v => v.id === visaTypeId);
    if (vt) {
      const pa = parseFloat(vt.tarif_base) || 0;
      const pv = parseFloat(vt.tarif_vente) || 0;
      const comm = pv - pa;

      setArticles(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          designation: `Visa ${vt.nom}`,
          prix_achat: pa || '',
          commission: comm || '',
          prix_vente: pv || ''
        };
        return updated;
      });
    }
  };

  const handleQuickAirlineSelect = (index, airlineId) => {
    const al = airlines.find(a => a.id === airlineId);
    if (al) {
      setArticles(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          designation: `Vol ${al.nom} (${al.code_iata})`,
          notes: al.commission ? `Comm. indicative: ${al.commission} DZD` : ''
        };
        return updated;
      });
    }
  };

  // ── PASSAGERS (PAX) MANAGEMENT ────────────────────────────────────
  const handleAddPersonne = () => {
    setPersonnes(prev => [...prev, { nom: '', passport: '' }]);
  };

  const handleRemovePersonne = (idx) => {
    setPersonnes(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdatePersonne = (idx, field, val) => {
    setPersonnes(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  // ── FINANCIAL TOTALS CALCULATION (GLOBAL & PER PAX) ────────────────
  const financialTotals = useMemo(() => {
    let totalAchat = 0;
    let totalVente = 0;
    let totalCommission = 0;

    articles.forEach(art => {
      const pa = parseFloat(art.prix_achat) || 0;
      const pv = parseFloat(art.prix_vente) || 0;
      const comm = parseFloat(art.commission) || (pv - pa);

      totalAchat += pa;
      totalVente += pv;
      totalCommission += comm;
    });

    const marge = totalVente - totalAchat;
    const tauxMarge = totalVente > 0 ? Math.round((marge / totalVente) * 100) : 0;

    const achatPerPax = paxCount > 0 ? Math.round(totalAchat / paxCount) : totalAchat;
    const ventePerPax = paxCount > 0 ? Math.round(totalVente / paxCount) : totalVente;
    const commPerPax = paxCount > 0 ? Math.round(totalCommission / paxCount) : totalCommission;

    return { 
      totalAchat, 
      totalVente, 
      totalCommission, 
      marge, 
      tauxMarge,
      achatPerPax,
      ventePerPax,
      commPerPax
    };
  }, [articles, paxCount]);

  // ── SUBMIT HANDLER ────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!clientId) {
      alert("Veuillez sélectionner ou créer un client.");
      return;
    }

    const validArticles = articles.filter(a => a.designation.trim() !== '' || a.prix_vente !== '');
    if (validArticles.length === 0) {
      alert("Veuillez renseigner au moins un article avec une désignation ou un prix.");
      return;
    }

    const destPrefix = destination ? `[🌍 ${destination}] ` : '';
    const summaryDetails = validArticles.map(a => {
      const artDest = a.destination && a.destination !== destination ? ` (${a.destination})` : '';
      return `[${a.categorie}] ${a.designation || 'Prestation'}${artDest}`;
    }).join(' | ');

    const fullDetails = observations.trim() 
      ? `${destPrefix}${summaryDetails} (${paxCount} Pax) — Remarque: ${observations.trim()}` 
      : `${destPrefix}${summaryDetails} (${paxCount} Pax)`;

    const firstArticle = validArticles[0];
    const matchedService = servicesList.find(s => 
      s.id === firstArticle.service_id || s.nom.toLowerCase() === firstArticle.categorie.toLowerCase()
    );
    const primaryServiceId = matchedService?.id || (servicesList[0]?.id || null);
    const primaryFournisseurId = firstArticle.fournisseur_id || (fournisseursList[0]?.id || null);

    const cleanArticles = validArticles.map(a => {
      const pa = parseFloat(a.prix_achat) || 0;
      const pv = parseFloat(a.prix_vente) || 0;
      const comm = parseFloat(a.commission) || (pv - pa);
      const matched = servicesList.find(s => s.id === a.service_id || s.nom.toLowerCase() === a.categorie.toLowerCase());

      return {
        id: a.id,
        categorie: a.categorie,
        service_id: matched?.id || a.service_id || null,
        destination: a.destination || destination || '',
        designation: a.designation.trim() || 'Article',
        quantite: paxCount,
        pax_count: paxCount,
        prix_achat: pa,
        prix_achat_unit: paxCount > 0 ? pa / paxCount : pa,
        commission: comm,
        commission_unit: paxCount > 0 ? comm / paxCount : comm,
        prix_vente: pv,
        prix_vente_unit: paxCount > 0 ? pv / paxCount : pv,
        total_achat: pa,
        total_vente: pv,
        fournisseur_id: a.fournisseur_id || null,
        notes: a.notes || ''
      };
    });

    const clientNomToSave = selectedClient?.nom || clientSearch || 'Client';

    const saveData = {
      id: initialData?.id,
      date_vente: dateVente,
      client_id: clientId,
      client_nom: clientNomToSave,
      destination: destination,
      details: fullDetails,
      service_id: primaryServiceId,
      fournisseur_id: primaryFournisseurId,
      tarif_base: financialTotals.totalAchat,
      commission: financialTotals.marge,
      total: financialTotals.totalVente,
      etat: etat,
      articles: cleanArticles,
      _visaMeta: {
        passagers: personnes.length > 0 ? personnes : [{ nom: clientNomToSave, passport: '' }]
      }
    };

    onSave(saveData);
  };

  const filteredClients = clients.filter(c => c.nom.toLowerCase().includes(clientSearch.toLowerCase()));

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[1020px] p-0 overflow-hidden rounded-[28px] border border-border/80 shadow-2xl bg-card" onClose={onClose}>
        
        {/* ── Outer Shell & Header ────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white px-7 py-5 border-b border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 shadow-2xs">
                  {initialData ? 'Édition Vente' : 'Transaction Commerciale'}
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  Tous Services & Destinations
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center font-black text-sm shadow-inner border border-white/15">
                  {initialData ? <Pencil size={15} /> : <Plus size={16} />}
                </div>
                <span>{initialData ? 'Modifier la Vente' : 'Nouvelle Vente (Multi-Articles)'}</span>
              </h2>
            </div>

            {/* KPI Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {destination && (
                <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-center backdrop-blur-md flex items-center gap-1.5">
                  <CountryFlag countryName={destination} className="w-4 h-3 rounded-xs shadow-2xs" />
                  <span className="text-xs font-bold text-white">{destination}</span>
                </div>
              )}
              <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-center backdrop-blur-md">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Pax</span>
                <span className="text-sm font-black text-sky-400 flex items-center justify-center gap-1">
                  <Users size={13} /> {paxCount} Pax
                </span>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-center backdrop-blur-md">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Prestations</span>
                <span className="text-sm font-black text-emerald-400">
                  {articles.length} {articles.length > 1 ? 'articles' : 'article'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {loadingData ? (
          <div className="flex flex-col justify-center items-center h-72 space-y-3 bg-background">
            <Loader2 className="animate-spin text-primary" size={34} />
            <p className="text-xs text-muted-foreground font-semibold">Chargement des données & services masterdata...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 bg-background">
            <div className="p-6 sm:p-7 overflow-y-auto max-h-[66vh] space-y-5">

              {/* ── ROW 1: CLIENT, DESTINATION, DATE & STATUT ─────────────────── */}
              <div className="p-1 rounded-2xl bg-gradient-to-b from-muted/60 to-muted/20 border border-border/70 shadow-xs">
                <div className="p-4 bg-card rounded-[14px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {/* 1. Client Selector with Autocomplete */}
                  <div className="space-y-1.5 relative" ref={wrapperRef}>
                    <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User size={13} className="text-primary" />
                        Client <span className="text-red-500">*</span>
                      </span>
                      {selectedClient && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          ✓ Vérifié
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                      <Input
                        className="pl-8.5 h-10 bg-muted/20 focus-visible:bg-transparent text-xs font-bold rounded-xl border-border/80"
                        placeholder="Rechercher un client..."
                        value={clientSearch}
                        onChange={e => { 
                          setClientSearch(e.target.value); 
                          setShowDropdown(true); 
                          if (clientId) setClientId(''); 
                        }}
                        onFocus={() => setShowDropdown(true)}
                      />
                    </div>
                    {showDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border/80 rounded-xl shadow-2xl z-50 max-h-[220px] overflow-y-auto">
                        {filteredClients.map(c => (
                          <div 
                            key={c.id} 
                            onClick={() => handleSelectClient(c)}
                            className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-muted transition-colors border-b border-border/40 last:border-0"
                          >
                            <div>
                              <span className="font-bold text-xs text-foreground block">{c.nom}</span>
                              {c.telephone && <span className="text-[10px] text-muted-foreground">{c.telephone}</span>}
                            </div>
                            <span className={cn(
                              "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                              c.type === 'Entreprise' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            )}>
                              {c.type || 'Particulier'}
                            </span>
                          </div>
                        ))}
                        {filteredClients.length === 0 && clientSearch && (
                          <div className="px-4 py-3 text-xs text-muted-foreground italic">Aucun client trouvé.</div>
                        )}
                        <div 
                          onClick={() => { setShowDropdown(false); setIsAddingClient(true); }}
                          className="flex items-center gap-2 px-4 py-2.5 cursor-pointer text-primary font-extrabold text-xs bg-primary/5 hover:bg-primary/10 transition-colors border-t border-border/40"
                        >
                          <Plus size={14} /> Créer un nouveau client
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Destination (Directement depuis Master Data) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Globe size={13} className="text-blue-500" />
                        Destination <span className="text-[10px] text-muted-foreground font-normal">(Master Data)</span>
                      </span>
                      {destination && (
                        <CountryFlag 
                          destinationName={destination} 
                          className="w-4 h-3 rounded-xs shadow-2xs" 
                        />
                      )}
                    </Label>
                    <DestinationSelect
                      value={destination}
                      onChange={(val) => {
                        const newDest = val === 'all' ? '' : val;
                        setDestination(newDest);
                        setArticles(prev => prev.map(a => a.destination ? a : { ...a, destination: newDest }));
                      }}
                      destinations={destinationsList}
                      placeholder="Sélectionner une destination..."
                      allowAll={false}
                      size="default"
                      mode="name"
                      showArabic={true}
                      className="w-full"
                    />
                  </div>

                  {/* 3. Date de vente */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Calendar size={13} className="text-teal-600" />
                      Date de Vente <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      type="date" 
                      required 
                      value={dateVente} 
                      onChange={e => setDateVente(e.target.value)} 
                      className="h-10 bg-muted/20 focus-visible:bg-transparent text-xs font-bold rounded-xl border-border/80" 
                    />
                  </div>

                  {/* 4. Statut de Paiement */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      État du Règlement
                    </Label>
                    <Select 
                      value={etat} 
                      onChange={e => setEtat(e.target.value)} 
                      className="h-10 bg-muted/20 text-xs font-extrabold rounded-xl border-border/80"
                    >
                      <option value="Payé">🟢 Payé intégralement</option>
                      <option value="Reservé">🟡 Réservé / Acompte</option>
                      <option value="Annulé">🔴 Annulé / Non réglé</option>
                    </Select>
                  </div>
                </div>
              </div>

              {/* ── ROW 2: PASSAGERS & VOYAGEURS (DETERMINES TOTAL PAX) ────────── */}
              <div className="p-1 rounded-2xl bg-gradient-to-b from-sky-500/10 via-muted/30 to-muted/10 border border-sky-500/20 shadow-xs space-y-2">
                <div className="p-4 bg-card rounded-[14px] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                        <Users size={15} className="text-sky-600 dark:text-sky-400" />
                        <span>Voyageurs & Passagers ({personnes.length} enregistrés · Total {paxCount} Pax)</span>
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Les montants totaux sont divisés par <strong>{paxCount} Pax</strong> pour le calcul unitaire.
                      </p>
                    </div>

                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAddPersonne} 
                      className="h-7 text-xs font-bold gap-1.5 rounded-xl border-sky-500/30 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                    >
                      <Plus size={13} /> Ajouter un voyageur
                    </Button>
                  </div>

                  {personnes.length === 0 ? (
                    <div className="py-2.5 px-3 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/50 dark:border-sky-800/30 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        👤 <strong>Client seul (1 Pax)</strong> : <em>{clientSearch || 'Client principal'}</em>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleAddPersonne}
                        className="h-6 text-[11px] font-bold text-sky-600 hover:text-sky-700"
                      >
                        + Ajouter des accompagnateurs
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {personnes.map((p, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <span className="text-[10px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 px-2 py-1 rounded-lg border border-sky-200 dark:border-sky-800 shrink-0">
                            Pax #{i + 1}
                          </span>
                          <Input
                            placeholder={`Nom et prénom du voyageur ${i + 1}`}
                            value={p.nom}
                            onChange={e => handleUpdatePersonne(i, 'nom', e.target.value)}
                            className="h-8.5 text-xs bg-muted/20 rounded-xl flex-1 font-medium"
                          />
                          <Input
                            placeholder="N° Passeport (optionnel)"
                            value={p.passport}
                            onChange={e => handleUpdatePersonne(i, 'passport', e.target.value)}
                            className="h-8.5 text-xs bg-muted/20 rounded-xl w-44 font-mono text-center"
                          />
                          <Button 
                            type="button" 
                            variant="destructive" 
                            size="icon-sm" 
                            className="h-8.5 w-8.5 rounded-xl shrink-0"
                            onClick={() => handleRemovePersonne(i)}
                            title="Supprimer ce voyageur"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── ROW 3: ARTICLES MULTIPLES & SERVICES ──────────────────────── */}
              <div className="space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border/60 pb-2.5">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                      <Layers size={16} className="text-primary" />
                      <span>Prestations & Articles ({articles.length})</span>
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Tarifs totaux divisés sur <strong>{paxCount} Pax</strong> · Commission et Tarif Vente synchronisés.
                    </p>
                  </div>

                  {/* Quick Add Presets dynamically generated from Master Data */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1">Raccourcis :</span>
                    {availableCategories.slice(0, 6).map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleAddArticle(cat.nom)}
                        className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-muted/50 hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-border/70 transition-all duration-150 flex items-center gap-1.5 shadow-2xs active:scale-[0.97]"
                      >
                        <span className="text-xs">{cat.emoji}</span>
                        <span className="truncate max-w-[110px]">{cat.nom}</span>
                      </button>
                    ))}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAddArticle(availableCategories[0]?.nom || 'Autre')}
                      className="h-7 text-xs font-bold gap-1 rounded-xl shadow-2xs ml-1"
                    >
                      <Plus size={13} /> Ajouter
                    </Button>
                  </div>
                </div>

                {/* Articles List Rows */}
                <div className="space-y-3">
                  {articles.map((art, idx) => {
                    const pa = parseFloat(art.prix_achat) || 0;
                    const pv = parseFloat(art.prix_vente) || 0;
                    const comm = parseFloat(art.commission) || (pv - pa);
                    
                    const paPax = paxCount > 0 ? Math.round(pa / paxCount) : pa;
                    const pvPax = paxCount > 0 ? Math.round(pv / paxCount) : pv;
                    const commPax = paxCount > 0 ? Math.round(comm / paxCount) : comm;

                    const isVisa = (art.categorie || '').toLowerCase().includes('visa');
                    const isBillet = (art.categorie || '').toLowerCase().includes('billet') || (art.categorie || '').toLowerCase().includes('vol');

                    return (
                      <div 
                        key={art.id || idx} 
                        className="p-1 rounded-2xl bg-gradient-to-b from-muted/70 to-muted/20 border border-border/70 hover:border-primary/40 transition-all duration-200 shadow-xs group"
                      >
                        <div className="p-3.5 bg-card rounded-[14px] border border-border/40 space-y-3">
                          
                          {/* Row Top Grid: Category, Description, Achat Total, Commission, Vente Total */}
                          <div className="grid grid-cols-12 gap-2.5 items-start">
                            
                            {/* 1. Category / Master Data Service */}
                            <div className="col-span-12 sm:col-span-3">
                              <Label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                                Catégorie #{idx + 1}
                              </Label>
                              <Select
                                value={art.categorie}
                                onChange={e => handleUpdateArticle(idx, 'categorie', e.target.value)}
                                className="h-9 text-xs font-extrabold bg-muted/30 rounded-xl"
                              >
                                {availableCategories.map(cat => (
                                  <option key={cat.id} value={cat.nom}>
                                    {cat.emoji} {cat.nom}
                                  </option>
                                ))}
                              </Select>
                            </div>

                            {/* 2. Designation / Description */}
                            <div className="col-span-12 sm:col-span-3">
                              <Label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                                Description
                              </Label>
                              <Input
                                placeholder={
                                  isBillet ? 'Ex: Vol Alger - Paris A/R' :
                                  isVisa ? 'Ex: Visa Tourisme 90j' :
                                  art.categorie.toLowerCase().includes('hotel') ? 'Ex: Hôtel 4* 5 nuits' :
                                  art.categorie.toLowerCase().includes('transfert') ? 'Ex: Navette Aéroport' :
                                  `Ex: Prestation ${art.categorie}`
                                }
                                value={art.designation}
                                onChange={e => handleUpdateArticle(idx, 'designation', e.target.value)}
                                className="h-9 text-xs font-semibold bg-background rounded-xl focus-visible:bg-transparent"
                              />
                            </div>

                            {/* 3. Tarif Achat Total (DZD) */}
                            <div className="col-span-4 sm:col-span-2">
                              <div className="flex items-center justify-between mb-1">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase block">
                                  Achat Total
                                </Label>
                                {paxCount > 1 && pa > 0 && (
                                  <span className="text-[9px] font-bold text-slate-500">
                                    {paPax.toLocaleString('fr-DZ')}/pax
                                  </span>
                                )}
                              </div>
                              <Input
                                type="number"
                                placeholder="0"
                                value={art.prix_achat}
                                onChange={e => handleUpdateArticle(idx, 'prix_achat', e.target.value)}
                                className="h-9 text-xs font-bold text-slate-700 dark:text-slate-300 bg-background rounded-xl"
                              />
                            </div>

                            {/* 4. Commission / Marge (Modifiable !) */}
                            <div className="col-span-4 sm:col-span-2">
                              <div className="flex items-center justify-between mb-1">
                                <Label className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase block">
                                  Commission
                                </Label>
                                {paxCount > 1 && comm !== 0 && (
                                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                                    {commPax.toLocaleString('fr-DZ')}/pax
                                  </span>
                                )}
                              </div>
                              <Input
                                type="number"
                                placeholder="0"
                                value={art.commission}
                                onChange={e => handleUpdateArticle(idx, 'commission', e.target.value)}
                                className="h-9 text-xs font-extrabold text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/50 rounded-xl"
                              />
                            </div>

                            {/* 5. Tarif Vente Total (Modifiable !) */}
                            <div className="col-span-4 sm:col-span-2">
                              <div className="flex items-center justify-between mb-1">
                                <Label className="text-[10px] font-black text-primary uppercase block">
                                  Vente Total
                                </Label>
                                {paxCount > 1 && pv > 0 && (
                                  <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                                    {pvPax.toLocaleString('fr-DZ')}/pax
                                  </span>
                                )}
                              </div>
                              <Input
                                type="number"
                                placeholder="0"
                                value={art.prix_vente}
                                onChange={e => handleUpdateArticle(idx, 'prix_vente', e.target.value)}
                                className="h-9 text-xs font-black text-primary bg-primary/5 border-primary/30 rounded-xl"
                              />
                            </div>
                          </div>

                          {/* Line Bottom Meta: Supplier, Quick Catalogs, Per Pax Pills, Delete */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs flex-wrap gap-2">
                            
                            {/* Supplier & Quick Links */}
                            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                              <span className="text-[10px] font-bold text-muted-foreground">Fournisseur :</span>
                              <Select
                                value={art.fournisseur_id || ''}
                                onChange={e => handleUpdateArticle(idx, 'fournisseur_id', e.target.value)}
                                className="h-7 text-[11px] bg-muted/40 max-w-[170px] rounded-lg"
                              >
                                <option value="">-- Par défaut --</option>
                                {fournisseursList.map(f => (
                                  <option key={f.id} value={f.id}>{f.nom}</option>
                                ))}
                              </Select>

                              {/* Quick Visa Link Helper */}
                              {isVisa && visaTypes.length > 0 && (
                                <Select
                                  onChange={e => handleQuickVisaSelect(idx, e.target.value)}
                                  className="h-7 text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300 rounded-lg max-w-[160px]"
                                >
                                  <option value="">⚡ Catalogue Visa</option>
                                  {visaTypes.map(vt => (
                                    <option key={vt.id} value={vt.id}>{vt.nom} ({Number(vt.tarif_vente||0).toLocaleString('fr-DZ')} DZD)</option>
                                  ))}
                                </Select>
                              )}

                              {/* Quick Airline Link Helper */}
                              {isBillet && airlines.length > 0 && (
                                <Select
                                  onChange={e => handleQuickAirlineSelect(idx, e.target.value)}
                                  className="h-7 text-[10px] bg-sky-50 text-sky-800 border-sky-300 rounded-lg max-w-[150px]"
                                >
                                  <option value="">⚡ Compagnie Aérienne</option>
                                  {airlines.map(al => (
                                    <option key={al.id} value={al.id}>{al.code_iata} - {al.nom}</option>
                                  ))}
                                </Select>
                              )}
                            </div>

                            {/* Line Financial Indicators with Per-Pax Breakdown */}
                            <div className="flex items-center gap-3">
                              {paxCount > 1 && (
                                <span className="text-[10px] font-bold bg-muted/70 text-foreground px-2 py-0.5 rounded-lg border border-border/70">
                                  {paxCount} Pax : {pvPax.toLocaleString('fr-DZ')} DZD / pax
                                </span>
                              )}

                              <span className={cn(
                                "text-[10px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs",
                                comm >= 0 
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" 
                                  : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                              )}>
                                Marge : {comm >= 0 ? '+' : ''}{comm.toLocaleString('fr-DZ')} DZD
                              </span>

                              <button
                                type="button"
                                onClick={() => handleRemoveArticle(idx)}
                                className="text-muted-foreground/60 hover:text-destructive p-1 rounded-lg hover:bg-destructive/10 transition-colors ml-1"
                                title="Supprimer cet article"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Article Button */}
                <button
                  type="button"
                  onClick={() => handleAddArticle(availableCategories[0]?.nom || 'Autre')}
                  className="w-full py-2.5 rounded-2xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-extrabold text-xs flex items-center justify-center gap-2 transition-all duration-200 shadow-2xs active:scale-[0.99]"
                >
                  <Plus size={15} />
                  <span>Ajouter une ligne de prestation</span>
                </button>
              </div>

              {/* ── ROW 4: OBSERVATIONS / REMARQUES ───────────────────────────── */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Remarques & Modalités Spécifiques (Optionnel)</Label>
                <Input
                  placeholder="Ex: Bagage 23kg inclus, confirmation immédiate reçue par email..."
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                  className="h-10 text-xs bg-muted/20 rounded-xl border-border/80"
                />
              </div>

              {/* ── FINANCIAL SUMMARY HUD (GLOBAL & DIVISÉ PAR PAX) ───────────── */}
              <div className="relative rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-5 border border-slate-800/90 shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-1/4 w-48 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  
                  {/* Total Achat */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                        Total Achat
                      </span>
                      {paxCount > 1 && (
                        <span className="text-[9px] font-bold text-slate-400">
                          {financialTotals.achatPerPax.toLocaleString('fr-DZ')} / pax
                        </span>
                      )}
                    </div>
                    <span className="text-base sm:text-lg font-bold text-slate-200 font-mono">
                      {financialTotals.totalAchat.toLocaleString('fr-DZ')} <span className="text-[10px] font-sans text-slate-500">DZD</span>
                    </span>
                  </div>

                  {/* Total Commission */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400 block">
                        Marge Commission
                      </span>
                      {paxCount > 1 && (
                        <span className="text-[9px] font-extrabold text-amber-300">
                          {financialTotals.commPerPax.toLocaleString('fr-DZ')} / pax
                        </span>
                      )}
                    </div>
                    <span className="text-base sm:text-lg font-black text-amber-400 font-mono">
                      {financialTotals.totalCommission.toLocaleString('fr-DZ')} <span className="text-[10px] font-sans text-amber-500">DZD</span>
                    </span>
                  </div>

                  {/* Total Vente */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400 block">
                        Total Vente TTC
                      </span>
                      {paxCount > 1 && (
                        <span className="text-[9px] font-black text-emerald-300">
                          {financialTotals.ventePerPax.toLocaleString('fr-DZ')} / pax
                        </span>
                      )}
                    </div>
                    <span className="text-base sm:text-xl font-black text-emerald-400 font-mono">
                      {financialTotals.totalVente.toLocaleString('fr-DZ')} <span className="text-[10px] font-sans text-emerald-500">DZD</span>
                    </span>
                  </div>

                  {/* Taux de Marge */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-sky-400 block mb-1">
                      Taux de Marge
                    </span>
                    <span className="text-base sm:text-lg font-black text-sky-400 font-mono">
                      {financialTotals.tauxMarge}%
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* ── FOOTER: BUTTON-IN-BUTTON ARCHITECTURE ────────────────────── */}
            <div className="px-7 py-4.5 border-t border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-semibold">Total Client ({paxCount} Pax) :</span>
                <span className="text-base font-black text-foreground font-mono">
                  {financialTotals.totalVente.toLocaleString('fr-DZ')} DZD
                </span>
                {paxCount > 1 && (
                  <span className="text-xs text-muted-foreground">
                    ({financialTotals.ventePerPax.toLocaleString('fr-DZ')} DZD / pax)
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2.5">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose} 
                  className="h-10 px-5 text-xs font-bold rounded-xl"
                >
                  Annuler
                </Button>

                {/* Primary CTA with Nested Trailing Icon */}
                <button
                  type="submit"
                  className="h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs rounded-xl shadow-md transition-all duration-200 flex items-center gap-3 group active:scale-[0.98]"
                >
                  <span>Enregistrer la Vente</span>
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                    <Check size={13} className="text-white" />
                  </div>
                </button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
      {isAddingClient && <ClientForm onClose={() => setIsAddingClient(false)} onSave={handleSaveNewClient} />}
    </Dialog>
  );
};

export default VenteForm;
