import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, MessageCircle, Sparkles, Send, Mail, Loader2, Search, Plus, 
  Calculator, BedDouble, Plane, Building2, Stamp, MapPin, Bus, 
  Baby, Award, CheckCircle2, ChevronDown, ChevronUp, Trash2, Check, 
  RefreshCw, DollarSign, Percent, Users, FileText, Home, Flag, User, Flame,
  Clock, Calendar, MessageSquare, ArrowUpRight, Copy, Share2, Layers, Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ClientForm from '@/components/ClientForm';
import CountryFlag from '@/components/CountryFlag';
import DestinationSelect from '@/components/DestinationSelect';
import UserAvatar from '@/components/UserAvatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// Round to nearest 1,000 DZD
const round1000 = (val) => Math.round((Number(val) || 0) / 1000) * 1000;

// Format numbers nicely without decimals
const fmtDZD = (n) => Number(Math.round(n || 0)).toLocaleString('fr-DZ', {
  maximumFractionDigits: 0
});

const PRIORITES = [
  { id: 'Basse', label: 'Basse', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { id: 'Moyenne', label: 'Moyenne', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'Haute', label: 'Haute', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'Urgente', label: 'Urgente 🔥', color: 'bg-red-100 text-red-800 border-red-300' }
];

const STATUTS = [
  { id: 'nouvelle', label: 'Demande Devis', color: 'bg-blue-100 text-blue-800' },
  { id: 'en_cours', label: 'En cours', color: 'bg-amber-100 text-amber-800' },
  { id: 'envoye', label: 'Devis envoyé', color: 'bg-violet-100 text-violet-800' },
  { id: 'converti_vente', label: 'Converti (Vente)', color: 'bg-emerald-100 text-emerald-800' },
  { id: 'converti_omra', label: 'Converti (Omra)', color: 'bg-teal-100 text-teal-800' },
  { id: 'ferme', label: 'Fermé / Perdu', color: 'bg-red-100 text-red-800' }
];

const ProspectModal = ({ isOpen, onClose, onSave, prospect, isNew, servicesList, clientsList = [] }) => {
  const { user, profile, role } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState('demande'); // 'demande' | 'offre' | 'simulations' | 'remarques' | 'reponse'

  // Tab 1: Form & Metadata State
  const [formData, setFormData] = useState({
    client_id: '', service_id: '',
    details_demande: '', details_devis: '', devis_ia: '', status: 'nouvelle'
  });
  const [nomDevis, setNomDevis] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [destinationNom, setDestinationNom] = useState('');
  const [destinationEmoji, setDestinationEmoji] = useState('📍');
  const [dateDepart, setDateDepart] = useState('');
  const [dateRetour, setDateRetour] = useState('');
  const [priorite, setPriorite] = useState('Moyenne');
  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [assignedAgentNom, setAssignedAgentNom] = useState('');

  // Master data lists
  const [destinationsList, setDestinationsList] = useState([]);
  const [agentsList, setAgentsList] = useState([]);

  // Tab 2: Internal Offer Options
  const [devisOptions, setDevisOptions] = useState([{ text: '', images: [] }]);
  const [previewImage, setPreviewImage] = useState(null);

  // Tab 3: Multiple Simulations State
  const [simulationsList, setSimulationsList] = useState([]);
  const [activeSimulationId, setActiveSimulationId] = useState(null);
  const [simulationName, setSimulationName] = useState('Simulation Standard');

  // Simulator Calculator Inputs
  const [simChambres, setSimChambres] = useState([
    { id: 'ch_1', nom: 'Chambre 1', type: 'Double', adultes: 2, chd: 0, inf: 0 }
  ]);
  const [simBilletMode, setSimBilletMode] = useState('personne');
  const [simBilletAdulte, setSimBilletAdulte] = useState('');
  const [simBilletChd, setSimBilletChd] = useState('');
  const [simBilletGroupeTotal, setSimBilletGroupeTotal] = useState('');
  const [simHotelTotal, setSimHotelTotal] = useState('');
  const [simVisaMode, setSimVisaMode] = useState('personne');
  const [simVisaParPersonne, setSimVisaParPersonne] = useState('');
  const [simVisaGroupeTotal, setSimVisaGroupeTotal] = useState('');
  const [simExcursionsTotal, setSimExcursionsTotal] = useState('');
  const [simTransfertTotal, setSimTransfertTotal] = useState('');
  const [simInfTotal, setSimInfTotal] = useState('');
  const [simMargeMode, setSimMargeMode] = useState('personne');
  const [simMargeValeur, setSimMargeValeur] = useState('');

  // Tab 4: Quote Remarks State
  const [remarquesDevis, setRemarquesDevis] = useState([]);
  const [nouvelleRemarqueDevis, setNouvelleRemarqueDevis] = useState('');

  // Tab 5: AI Quote & Response State
  const [aiQuoteText, setAiQuoteText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  // AI Prompt Customization Parameters Modal
  const [showAIConfigModal, setShowAIConfigModal] = useState(false);
  const [aiLangue, setAiLangue] = useState('fr'); // 'fr' | 'ar' | 'en'
  const [aiSource, setAiSource] = useState('all'); // 'all' | 'options_only' | 'simulations_only' | 'opt_X' | 'sim_X' | 'sim_active'
  const [aiForme, setAiForme] = useState('pro'); // 'pro' | 'direct' | 'commercial'
  const [aiEmojis, setAiEmojis] = useState(true);
  const [aiExtraInstructions, setAiExtraInstructions] = useState('');

  // Client Selection / Form State
  const [clientSearch, setClientSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const wrapperRef = useRef(null);

  const activeAgentName = profile?.nom || user?.email?.split('@')[0] || 'Agent';
  const activeAgentRole = role || profile?.role || 'agent';

  // Load master data (destinations & agents)
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const { data: dData } = await supabase.from('destinations').select('*').order('nom', { ascending: true });
        if (dData) setDestinationsList(dData);

        const { data: pData } = await supabase.from('profiles').select('*').order('nom', { ascending: true });
        if (pData) setAgentsList(pData);
      } catch (err) {
        console.warn('Error fetching master data:', err);
      }
    };
    fetchMasterData();
  }, []);

  // Handle click outside client search
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize or populate modal data
  useEffect(() => {
    if (prospect) {
      setFormData(prospect);
      if (prospect.client_id) {
        const c = clientsList.find(c => c.id === prospect.client_id);
        if (c) setClientSearch(c.nom);
      } else {
        setClientSearch(prospect.nom_prospect || '');
      }

      if (prospect.devis_ia) {
        setAiQuoteText(prospect.devis_ia);
      }

      try {
        if (prospect.details_devis && prospect.details_devis.trim().startsWith('{')) {
          const parsed = JSON.parse(prospect.details_devis);

          setNomDevis(parsed.nom_devis || '');
          setDestinationNom(parsed.destination || '');
          setDestinationId(parsed.destination_id || '');
          setDestinationEmoji(parsed.destination_emoji || '📍');
          setDateDepart(parsed.date_depart || '');
          setDateRetour(parsed.date_retour || '');
          setPriorite(parsed.priorite || 'Moyenne');
          setAssignedAgentId(parsed.agent_id || '');
          setAssignedAgentNom(parsed.agent_nom || '');

          // Options
          let newOpts = parsed.options && parsed.options.length ? parsed.options.map(opt => {
            if (typeof opt === 'string') return { text: opt, images: [] };
            const images = (opt.images || []).map(img => {
              if (typeof img === 'string') return { id: Math.random().toString(), url: img };
              return img;
            });
            return { ...opt, images };
          }) : [{ text: '', images: [] }];
          setDevisOptions(newOpts);

          // Simulations list (Multiple simulations support)
          if (Array.isArray(parsed.simulations) && parsed.simulations.length > 0) {
            setSimulationsList(parsed.simulations);
            loadSimulationIntoInputs(parsed.simulations[0]);
          } else if (parsed.simulation) {
            const singleSim = {
              id: 'sim_1',
              nom: 'Simulation 1',
              date: new Date().toISOString(),
              ...parsed.simulation
            };
            setSimulationsList([singleSim]);
            loadSimulationIntoInputs(singleSim);
          } else {
            setSimulationsList([]);
            resetSimulatorInputs();
          }

          // Remarques list on quote
          if (Array.isArray(parsed.remarques)) {
            setRemarquesDevis(parsed.remarques);
          } else {
            setRemarquesDevis([]);
          }

        } else {
          setDevisOptions([{ text: prospect.details_devis || '', images: [] }]);
          setSimulationsList([]);
          setRemarquesDevis([]);
          setNomDevis('');
          setDestinationNom('');
          setDestinationId('');
          setDestinationEmoji('📍');
          setDateDepart('');
          setDateRetour('');
          setPriorite('Moyenne');
          setAssignedAgentId('');
          setAssignedAgentNom('');
          resetSimulatorInputs();
        }
      } catch (e) {
        setDevisOptions([{ text: prospect.details_devis || '', images: [] }]);
        setSimulationsList([]);
        setRemarquesDevis([]);
      }
    } else {
      // New quote
      setFormData({ client_id: '', service_id: '', details_demande: '', details_devis: '', devis_ia: '', status: 'nouvelle' });
      setNomDevis('');
      setDestinationNom('');
      setDestinationId('');
      setDestinationEmoji('📍');
      setDateDepart('');
      setDateRetour('');
      setPriorite('Moyenne');
      setAssignedAgentId(user?.id || '');
      setAssignedAgentNom(activeAgentName);
      setDevisOptions([{ text: '', images: [] }]);
      setSimulationsList([]);
      setRemarquesDevis([]);
      setAiQuoteText('');
      setClientSearch('');
      resetSimulatorInputs();
    }
  }, [prospect, isOpen, clientsList, user, profile]);

  // Fetch from dedicated tables (devis_simulations & devis_remarques) if they exist
  useEffect(() => {
    const fetchDedicatedData = async (pipelineId) => {
      try {
        const [simRes, remRes] = await Promise.all([
          supabase.from('devis_simulations').select('*').eq('pipeline_id', pipelineId).order('created_at', { ascending: false }),
          supabase.from('devis_remarques').select('*').eq('pipeline_id', pipelineId).order('created_at', { ascending: false })
        ]);

        if (!simRes.error && simRes.data && simRes.data.length > 0) {
          const loadedSims = simRes.data.map(s => ({
            id: s.id,
            nom: s.nom,
            date: s.created_at,
            chambres: s.chambres || [],
            paxCounts: s.pax_counts || {},
            calculation: s.calculation || {},
            costItems: s.cost_items || {}
          }));
          setSimulationsList(loadedSims);
          loadSimulationIntoInputs(loadedSims[0]);
        }

        if (!remRes.error && remRes.data && remRes.data.length > 0) {
          setRemarquesDevis(remRes.data.map(r => ({
            id: r.id,
            auteur_nom: r.auteur_nom,
            auteur_id: r.auteur_id,
            auteur_role: r.auteur_role,
            texte: r.remarque,
            created_at: r.created_at
          })));
        }
      } catch (err) {
        console.warn('Dedicated tables fallback to JSON:', err);
      }
    };

    if (prospect?.id && isOpen) {
      fetchDedicatedData(prospect.id);
    }
  }, [prospect?.id, isOpen]);

  const loadSimulationIntoInputs = (sim) => {
    if (!sim) return;
    setActiveSimulationId(sim.id);
    setSimulationName(sim.nom || 'Simulation');
    if (sim.chambres) setSimChambres(sim.chambres);
    if (sim.costItems) {
      const c = sim.costItems;
      if (c.billetMode) setSimBilletMode(c.billetMode);
      if (c.billetAdulte !== undefined) setSimBilletAdulte(c.billetAdulte);
      if (c.billetChd !== undefined) setSimBilletChd(c.billetChd);
      if (c.billetGroupeTotal !== undefined) setSimBilletGroupeTotal(c.billetGroupeTotal);
      if (c.hotelTotal !== undefined) setSimHotelTotal(c.hotelTotal);
      if (c.visaMode) setSimVisaMode(c.visaMode);
      if (c.visaParPersonne !== undefined) setSimVisaParPersonne(c.visaParPersonne);
      if (c.visaGroupeTotal !== undefined) setSimVisaGroupeTotal(c.visaGroupeTotal);
      if (c.excursionsTotal !== undefined) setSimExcursionsTotal(c.excursionsTotal);
      if (c.transfertTotal !== undefined) setSimTransfertTotal(c.transfertTotal);
      if (c.infTotal !== undefined) setSimInfTotal(c.infTotal);
      if (c.margeMode) setSimMargeMode(c.margeMode);
      if (c.margeValeur !== undefined) setSimMargeValeur(c.margeValeur);
    }
  };

  const resetSimulatorInputs = () => {
    setActiveSimulationId(null);
    setSimulationName(`Simulation ${simulationsList.length + 1}`);
    setSimChambres([{ id: 'ch_1', nom: 'Chambre 1', type: 'Double', adultes: 2, chd: 0, inf: 0 }]);
    setSimBilletMode('personne');
    setSimBilletAdulte('');
    setSimBilletChd('');
    setSimBilletGroupeTotal('');
    setSimHotelTotal('');
    setSimVisaMode('personne');
    setSimVisaParPersonne('');
    setSimVisaGroupeTotal('');
    setSimExcursionsTotal('');
    setSimTransfertTotal('');
    setSimInfTotal('');
    setSimMargeMode('personne');
    setSimMargeValeur('');
  };

  // --- Simulator Calculations (Rounded to 1,000 DZD) ---
  const simPaxCounts = useMemo(() => {
    let adultes = 0;
    let chd = 0;
    let inf = 0;

    simChambres.forEach(ch => {
      adultes += Number(ch.adultes || 0);
      chd += Number(ch.chd || 0);
      inf += Number(ch.inf || 0);
    });

    const payingPax = adultes + chd;
    const totalPax = adultes + chd + inf;

    return { adultes, chd, inf, payingPax, totalPax };
  }, [simChambres]);

  const simCalculation = useMemo(() => {
    const { adultes, chd, inf, payingPax } = simPaxCounts;

    let costBillet = 0;
    if (simBilletMode === 'personne') {
      const bAdulte = Number(simBilletAdulte || 0);
      const bChd = simBilletChd !== '' ? Number(simBilletChd) : bAdulte;
      costBillet = (adultes * bAdulte) + (chd * bChd);
    } else {
      costBillet = Number(simBilletGroupeTotal || 0);
    }

    const costHotel = Number(simHotelTotal || 0);

    let costVisa = 0;
    if (simVisaMode === 'personne') {
      costVisa = (adultes + chd) * Number(simVisaParPersonne || 0);
    } else {
      costVisa = Number(simVisaGroupeTotal || 0);
    }

    const costExcursions = Number(simExcursionsTotal || 0);
    const costTransfert = Number(simTransfertTotal || 0);
    const costInfTotal = inf > 0 ? Number(simInfTotal || 0) : 0;

    const totalCoutRevient = costBillet + costHotel + costVisa + costExcursions + costTransfert + costInfTotal;

    let montantMarge = 0;
    const valMarge = Number(simMargeValeur || 0);
    if (simMargeMode === 'personne') {
      montantMarge = payingPax * valMarge;
    } else if (simMargeMode === 'groupe') {
      montantMarge = valMarge;
    } else if (simMargeMode === 'pourcentage') {
      montantMarge = totalCoutRevient * (valMarge / 100);
    }

    const totalDevisBrut = totalCoutRevient + montantMarge;

    const totalHorsHotelEtInf = totalDevisBrut - costHotel - costInfTotal;
    const baseHorsHotelParPax = payingPax > 0 ? (totalHorsHotelEtInf / payingPax) : 0;

    const nbChambres = Math.max(1, simChambres.length);
    const coutHotelParChambre = costHotel / nbChambres;
    const margeHotelParChambre = simMargeMode === 'pourcentage' ? (coutHotelParChambre * (valMarge / 100)) : 0;
    const prixChambreMoyen = coutHotelParChambre + margeHotelParChambre;

    const prixInf = inf > 0 ? round1000(costInfTotal / inf) : 0;

    const chambresCalculees = simChambres.map(ch => {
      const nbLits = Number(ch.adultes || 0) + Number(ch.chd || 0);
      const chAdultes = Number(ch.adultes || 0);
      const chChd = Number(ch.chd || 0);
      const chInf = Number(ch.inf || 0);

      const baseChambreHorsInf = (baseHorsHotelParPax * nbLits) + prixChambreMoyen;

      let prixAdulte = 0;
      let prixChd = 0;

      if (nbLits > 0) {
        const rawAdulte = (baseChambreHorsInf + (chChd * 10000)) / nbLits;
        prixAdulte = round1000(rawAdulte);
        prixChd = Math.max(0, prixAdulte - 10000);
      }

      const sousTotal = (chAdultes * prixAdulte) + (chChd * prixChd) + (chInf * prixInf);

      return {
        ...ch,
        nbLits,
        prixAdulte,
        prixChd,
        prixInf,
        sousTotal
      };
    });

    const typesMap = {};
    chambresCalculees.forEach(ch => {
      if (!typesMap[ch.type]) {
        typesMap[ch.type] = {
          type: ch.type,
          prixAdulte: ch.prixAdulte,
          prixChd: ch.prixChd,
          prixInf: ch.prixInf,
          nbChambres: 1,
          totalPax: ch.adultes + ch.chd + ch.inf
        };
      } else {
        typesMap[ch.type].nbChambres += 1;
        typesMap[ch.type].totalPax += ch.adultes + ch.chd + ch.inf;
      }
    });

    const tarifsParType = Object.values(typesMap);
    const totalDevis = round1000(chambresCalculees.reduce((sum, c) => sum + c.sousTotal, 0));

    return {
      costBillet: round1000(costBillet),
      costHotel: round1000(costHotel),
      costVisa: round1000(costVisa),
      costExcursions: round1000(costExcursions),
      costTransfert: round1000(costTransfert),
      costInfTotal: round1000(costInfTotal),
      totalCoutRevient: round1000(totalCoutRevient),
      montantMarge: round1000(montantMarge),
      totalDevis,
      prixInf,
      chambresCalculees,
      tarifsParType
    };
  }, [
    simChambres, simPaxCounts, simBilletMode, simBilletAdulte, simBilletChd, simBilletGroupeTotal,
    simHotelTotal, simVisaMode, simVisaParPersonne, simVisaGroupeTotal,
    simExcursionsTotal, simTransfertTotal, simInfTotal, simMargeMode, simMargeValeur
  ]);

  // Handle Save Current Simulation in Demande
  // Handle Save Current Simulation in Demande
  const handleSaveSimulationInList = async () => {
    const simId = activeSimulationId || `sim_${Date.now()}`;
    const simTitle = simulationName.trim() || `Simulation ${simulationsList.length + 1}`;

    const newSimObject = {
      id: simId,
      nom: simTitle,
      date: new Date().toISOString(),
      chambres: simChambres,
      paxCounts: simPaxCounts,
      calculation: simCalculation,
      costItems: {
        billetMode: simBilletMode,
        billetAdulte: simBilletAdulte,
        billetChd: simBilletChd,
        billetGroupeTotal: simBilletGroupeTotal,
        hotelTotal: simHotelTotal,
        visaMode: simVisaMode,
        visaParPersonne: simVisaParPersonne,
        visaGroupeTotal: simVisaGroupeTotal,
        excursionsTotal: simExcursionsTotal,
        transfertTotal: simTransfertTotal,
        infTotal: simInfTotal,
        margeMode: simMargeMode,
        margeValeur: simMargeValeur
      }
    };

    setSimulationsList(prev => {
      const idx = prev.findIndex(s => s.id === simId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newSimObject;
        return copy;
      }
      return [newSimObject, ...prev];
    });

    setActiveSimulationId(simId);

    // If quote exists in DB, persist directly to devis_simulations table
    if (prospect?.id) {
      try {
        const payload = {
          pipeline_id: prospect.id,
          client_id: formData.client_id || null,
          nom: simTitle,
          total_devis: simCalculation.totalDevis,
          chambres: simChambres,
          pax_counts: simPaxCounts,
          calculation: simCalculation,
          cost_items: newSimObject.costItems
        };

        if (simId && !simId.startsWith('sim_')) {
          await supabase.from('devis_simulations').update(payload).eq('id', simId);
        } else {
          const { data, error } = await supabase.from('devis_simulations').insert([payload]).select();
          if (!error && data && data[0]) {
            newSimObject.id = data[0].id;
            setActiveSimulationId(data[0].id);
            setSimulationsList(prev => prev.map(s => s.id === simId ? newSimObject : s));
          }
        }
      } catch (err) {
        console.warn('Could not persist to devis_simulations, using JSON fallback:', err);
      }
    }

    alert(`Simulation "${simTitle}" enregistrée avec succès dans la demande !`);
  };

  const handleDeleteSimulation = async (simId) => {
    if (window.confirm("Supprimer cette simulation ?")) {
      const updated = simulationsList.filter(s => s.id !== simId);
      setSimulationsList(updated);
      if (activeSimulationId === simId) {
        if (updated.length > 0) loadSimulationIntoInputs(updated[0]);
        else resetSimulatorInputs();
      }

      if (prospect?.id && !simId.startsWith('sim_')) {
        try {
          await supabase.from('devis_simulations').delete().eq('id', simId);
        } catch (err) {}
      }
    }
  };

  // Helper text format for simulation
  const formatSimulationText = (sim) => {
    const calc = sim.calculation || simCalculation;
    const pax = sim.paxCounts || simPaxCounts;
    const chs = sim.chambres || simChambres;
    const title = sim.nom || simulationName;

    return `🌟 *PROPOSITION : ${title.toUpperCase()}* 🌟
👥 Composition : ${chs.length} Chambre(s) | ${pax.totalPax} Passagers (${pax.adultes} Adulte(s)${pax.chd > 0 ? `, ${pax.chd} Enfant(s)` : ''}${pax.inf > 0 ? `, ${pax.inf} Bébé(s)` : ''})

🏨 *GRILLE DES TARIFS PAR TYPE DE CHAMBRE (Arrondis à 1 000 DZD) :*
${calc.tarifsParType?.map(t => ` • 🏠 *Chambre ${t.type}* : 
   - 👤 Adulte : *${fmtDZD(t.prixAdulte)} DZD* / pers
   ${pax.chd > 0 ? `- 🧒 Enfant (CHD) : *${fmtDZD(t.prixChd)} DZD* / enfant (-10 000 DZD)\n` : ''}`).join('') || ''}${pax.inf > 0 ? ` • 👶 *Bébé (INF) :* ${fmtDZD(calc.prixInf)} DZD / bébé\n` : ''}
💵 *MONTANT ESTIMATIF :* *${fmtDZD(calc.totalDevis)} DZD*`;
  };

  // Import simulation into offer option or AI text
  const handleImportSimIntoOption = (sim) => {
    const text = formatSimulationText(sim);
    setDevisOptions(prev => {
      if (prev.length === 0 || (prev.length === 1 && !prev[0].text.trim())) {
        return [{ text, images: prev[0]?.images || [] }];
      }
      return [...prev, { text, images: [] }];
    });
    setActiveTab('offre');
  };

  // Tab 4: Add Remarks on Quote
  const handleAddRemarqueDevis = async (e) => {
    e.preventDefault();
    if (!nouvelleRemarqueDevis.trim()) return;

    const tempId = `rem_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newEntry = {
      id: tempId,
      auteur_nom: activeAgentName,
      auteur_id: user?.id || null,
      auteur_role: activeAgentRole,
      auteur_avatar_url: profile?.avatar_url || null,
      texte: nouvelleRemarqueDevis.trim(),
      created_at: new Date().toISOString()
    };

    setRemarquesDevis(prev => [newEntry, ...prev]);
    setNouvelleRemarqueDevis('');

    // If quote exists in DB, persist to devis_remarques table
    if (prospect?.id) {
      try {
        const { data, error } = await supabase.from('devis_remarques').insert([{
          pipeline_id: prospect.id,
          auteur_nom: activeAgentName,
          auteur_id: user?.id || null,
          auteur_role: activeAgentRole,
          remarque: newEntry.texte
        }]).select();

        if (!error && data && data[0]) {
          setRemarquesDevis(prev => prev.map(r => r.id === tempId ? { ...r, id: data[0].id } : r));
        }
      } catch (err) {
        console.warn('Could not insert in devis_remarques table, keeping local:', err);
      }
    }
  };

  const handleDeleteRemarqueDevis = async (remId) => {
    if (window.confirm("Supprimer cette remarque interne ?")) {
      setRemarquesDevis(prev => prev.filter(r => r.id !== remId));

      if (prospect?.id && !remId.startsWith('rem_')) {
        try {
          await supabase.from('devis_remarques').delete().eq('id', remId);
        } catch (err) {}
      }
    }
  };

  // Tab 5: Generate AI Quote with Custom Prompt Parameters
  const handleGenerateAI = async () => {
    setIsGenerating(true);
    let apiKey = '';
    let systemPrompt = '';
    let aiModel = 'models/gemini-1.5-flash-latest';

    try {
      const { data } = await supabase.from('ai_settings').select('*').eq('id', 1).single();
      if (data) {
        apiKey = data.api_key;
        systemPrompt = data.system_prompt;
        aiModel = data.model_name || 'models/gemini-1.5-flash-latest';
      }
    } catch (e) {
      console.error(e);
    }

    if (!apiKey) {
      alert("Veuillez configurer votre clé API Google AI (Gemini) dans les Paramètres > Master Data.");
      setIsGenerating(false);
      return;
    }

    // Default System Prompt template if empty
    if (!systemPrompt) {
      systemPrompt = `Tu es un conseiller en voyage expert et commercial de haut niveau pour une agence de voyages réputée.
Rédige une proposition commerciale complète, claire et séduisante prête à être envoyée directement au client via WhatsApp / Email.

Paramètres de rédaction :
- Langue : [langue]
- Style et Forme : [forme]
- Emojis : [emojis]
- Instructions spécifiques : [instructions_extra]

Informations du client et de la demande :
- Nom du client : [client_nom]
- Destination : [destination]
- Titre du devis : [titre_devis]
- Détails de la demande client : [client reques]

Offres et Chiffrages à présenter :
[agent offre]

RÈGLE ABSOLUE : 
Rédige directement le message final au client (ex: "Bonjour M./Mme..."), sans brouillon, sans analyse préalable et sans métadonnées.`;
    }

    try {
      const serviceName = servicesList.find(s => s.id === formData.service_id)?.nom || '';
      
      // Determine Selected Content based on aiSource
      let selectedOfferContent = '';

      if (aiSource === 'all') {
        const optionsText = devisOptions.filter(o => o.text.trim() !== '').map((o, idx) => `Option ${idx + 1} :\n${o.text}`).join('\n\n');
        const simulationsText = simulationsList.map((s, idx) => `[Simulation ${idx + 1} - ${s.nom}] :\n${formatSimulationText(s)}`).join('\n\n');
        selectedOfferContent = [optionsText, simulationsText].filter(Boolean).join('\n\n');
      } else if (aiSource === 'options_only') {
        selectedOfferContent = devisOptions.filter(o => o.text.trim() !== '').map((o, idx) => `Option ${idx + 1} :\n${o.text}`).join('\n\n');
      } else if (aiSource === 'simulations_only') {
        selectedOfferContent = simulationsList.map((s, idx) => `[Simulation ${idx + 1} - ${s.nom}] :\n${formatSimulationText(s)}`).join('\n\n');
      } else if (aiSource.startsWith('opt_')) {
        const optIdx = parseInt(aiSource.replace('opt_', ''), 10);
        const opt = devisOptions[optIdx];
        selectedOfferContent = opt ? `Option ${optIdx + 1} :\n${opt.text}` : '';
      } else if (aiSource.startsWith('sim_')) {
        const simId = aiSource.replace('sim_', '');
        const sim = simulationsList.find(s => s.id === simId) || simulationsList[0];
        selectedOfferContent = sim ? `[Simulation - ${sim.nom}] :\n${formatSimulationText(sim)}` : '';
      } else if (aiSource === 'sim_active') {
        selectedOfferContent = `[Simulation Actuelle - ${simulationName}] :\n${formatSimulationText({ nom: simulationName, calculation: simCalculation, paxCounts: simPaxCounts, chambres: simChambres })}`;
      }

      const selectedClient = clientsList.find(c => c.id === formData.client_id);
      const clientName = selectedClient ? selectedClient.nom : (formData.nom_prospect || 'Client');

      // Map language with strict directives
      let langueText = '';
      let systemLanguageInstruction = '';
      let languageEnforcement = '';

      if (aiLangue === 'ar') {
        langueText = 'اللغة العربية الفصحى (Arabe)';
        systemLanguageInstruction = `أنت مستشار سياحي محترف ومسؤول مبيعات في وكالة أسفار "المختار للسياحة والأسفار".
يجب عليك كتابة الرسالة التجارية النهائية كاملة حصرياً باللغة العربية الفصحى الأنيقة والجذابة الموجهة للعميل (WhatsApp / Email).
قواعد صارمة جداً:
1. اكتب كل شيء باللغة العربية الفصحى (ترجم جميع الخيارات والأسعار والمعلومات إلى العربية).
2. لا تكتب أي خطة أو مسودة أو تقييم. ابدأ مباشرة بالتحية مثل (السلام عليكم ورحمة الله وبركاته... أو أهلاً وسهلاً بكم...).
3. اختم الرسالة بعبارة راقية بالعربية مثل: "نحن في خدمتكم ورهن إشارتكم لأي معلومات إضافية أو تأكيد الحجز. شكراً لاختياركم وكالة المختار للسياحة والأسفار 😊".`;
        languageEnforcement = `\n\n🚨 [OBLIGATION ABSOLUE DE LANGUE] : Rédige l'INTÉGRALITÉ du message EXCLUSIVEMENT en ARABE (اللغة العربية الفصحى). Tout le texte généré (salutation, détails de l'offre, prix, formule de fin) doit être en arabe élégant et impeccable. Aucune phrase en français.`;
      } else if (aiLangue === 'en') {
        langueText = 'English (Anglais)';
        systemLanguageInstruction = `You are a professional travel sales consultant for "El Mokhtar Travel".
You must write the complete final commercial proposal EXCLUSIVELY in English for the client (WhatsApp / Email).
CRITICAL RULES:
1. Write everything in professional, persuasive English (translate all details and costs to English).
2. Do NOT write any drafts, plans, or reasoning. Start directly with the greeting ("Hello / Dear...").
3. End with a polite closing phrase like: "We remain at your full disposal for any further information or reservation. Thank you for choosing El Mokhtar Travel 😊".`;
        languageEnforcement = `\n\n🚨 [MANDATORY LANGUAGE RULE] : Write the ENTIRE message EXCLUSIVELY in ENGLISH. Every part of the message must be in English.`;
      } else {
        langueText = 'Français';
        systemLanguageInstruction = `Tu es un conseiller voyage commercial expert pour l'agence "El Mokhtar Travel".
Tu rédiges la proposition commerciale finale EXCLUSIVEMENT en français prête à être envoyée au client via WhatsApp / Email.
RÈGLES CRITIQUES :
1. Rédige l'intégralité du texte en français soigné, chaleureux et persuasif.
2. N'inclus AUCUN plan, aucun en-tête ni brouillon. Commence directement par la salutation ("Bonjour...", "Salam Alaykoum...").
3. Termine par une formule de politesse comme : "Nous restons à votre entière disposition pour toute information complémentaire ou éventuelle réservation. Merci de choisir l'agence El Mokhtar Travel 😊".`;
        languageEnforcement = `\n\n🚨 [OBLIGATION DE LANGUE] : Rédige l'intégralité du message en français.`;
      }
      
      // Map tone / style
      const formeText = aiForme === 'direct' 
        ? 'Direct, concis, percutant et synthétique (idéal pour lecture rapide WhatsApp)' 
        : aiForme === 'commercial' 
        ? 'Commercial, captivant, vendeur et persuasif avec mise en avant des points forts et avantages' 
        : 'Professionnel, formel, courtois, élégant et chaleureux';

      // Map emojis
      const emojisText = aiEmojis 
        ? 'Oui, utilise des emojis pertinents et esthétiques pour aérer le message et valoriser les sections' 
        : 'Non, n\'utilise AUCUN emoji (style épuré, sobre et formel)';

      // Build a clean user prompt — avoid bullet lists that the model might echo back
      const userPromptDetails = `Rédige le message final pour le client.

Langue : ${langueText}
Ton : ${formeText}
Emojis : ${emojisText}
Client : ${clientName}
Titre : ${nomDevis || 'Offre Voyage'}
Destination : ${destinationNom || 'Non spécifiée'}

Demande du client :
${formData.details_demande || 'Non spécifié'}

Offres de l'agence :
${selectedOfferContent || 'Tarifs et disponibilités sur demande'}
${aiExtraInstructions ? `\nConsignes supplémentaires : ${aiExtraInstructions}` : ''}
${languageEnforcement}`;

      const requestBody = {
        system_instruction: {
          parts: [{
            text: `${systemLanguageInstruction}

OUTPUT FORMAT (MANDATORY):
You must respond with a single JSON object: {"message": "<the complete client-facing message>"}
The "message" value must contain ONLY the final text that will be sent directly to the client.
It must NOT contain any section labels (like "Greeting:", "Intro:", "Closing:"), bullet-point plans, reasoning steps, or review checklists.
Start the message directly with the greeting. End it with the closing phrase. Nothing else.`
          }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPromptDetails }]
          }
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          response_schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'The complete final commercial message for the client via WhatsApp or Email. Must start with the greeting and end with the polite closing phrase. No drafts, no metadata, no section headers.'
              }
            },
            required: ['message']
          },
          temperature: 0.6,
          topP: 0.95,
          maxOutputTokens: 2048
        }
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${aiModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const resData = await response.json();
      const rawGeneratedText = resData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (rawGeneratedText) {
        let extractedMessage = '';

        try {
          let jsonStr = rawGeneratedText.trim();
          if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }

          const parsed = JSON.parse(jsonStr);
          if (parsed && typeof parsed.message === 'string') {
            extractedMessage = parsed.message.trim();
          } else if (parsed && typeof parsed.texte === 'string') {
            extractedMessage = parsed.texte.trim();
          } else if (parsed && typeof parsed.response === 'string') {
            extractedMessage = parsed.response.trim();
          } else if (parsed && typeof parsed.devis === 'string') {
            extractedMessage = parsed.devis.trim();
          } else if (parsed && typeof parsed === 'object') {
            const firstStrVal = Object.values(parsed).find(v => typeof v === 'string');
            extractedMessage = firstStrVal ? firstStrVal.trim() : rawGeneratedText.trim();
          } else {
            extractedMessage = String(parsed).trim();
          }
        } catch (err) {
          // Fallback if JSON parsing fails
          extractedMessage = rawGeneratedText.trim();
        }

        // Post-processor: detect and fix degenerate token repetition loops
        const dedupeRepeats = (text) => {
          if (!text) return text;
          // Detect repeated words (Arabic or Latin) appearing 3+ times in immediate succession
          let cleaned = text.replace(/([^\s,;.،؟!]+)(?:\s+\1){2,}/gu, '$1');
          // If a repetition cascade occurred, cut off the trailing loop
          const cascadeMatch = text.match(/([^\s,;.،؟!]+)(?:\s+\1){4,}/u);
          if (cascadeMatch && cascadeMatch.index !== undefined) {
            const safePrefix = text.substring(0, cascadeMatch.index).trim();
            if (safePrefix.length > 20) {
              cleaned = safePrefix;
            }
          }
          return cleaned.trim();
        };

        extractedMessage = dedupeRepeats(extractedMessage);

        setAiQuoteText(extractedMessage);
        setFormData(prev => ({ ...prev, devis_ia: extractedMessage }));
        setShowAIConfigModal(false);
      } else {
        alert("Erreur lors de la génération IA: " + JSON.stringify(resData));
      }
    } catch (error) {
      console.error(error);
      alert("Erreur API Gemini: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWhatsApp = (text) => {
    let cleanPhone = formData.phone?.replace(/[^0-9]/g, '') || '';
    if (cleanPhone.startsWith('0')) cleanPhone = '213' + cleanPhone.substring(1);
    const msg = encodeURIComponent(text || aiQuoteText || '');
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const handleEmail = (text) => {
    const subject = encodeURIComponent(`Votre Proposition Devis ${nomDevis ? `— ${nomDevis}` : ''}`);
    const body = encodeURIComponent(text || aiQuoteText || '');
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2500);
  };

  // Submit & Save Demande Devis
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_id) {
      alert("Veuillez sélectionner ou créer un client.");
      return;
    }

    setIsSaving(true);

    // Save options & images
    const optionsToSave = [];
    for (let opt of devisOptions) {
      if (!opt.text.trim() && (!opt.images || opt.images.length === 0)) continue;
      
      let finalImages = [];
      for (let img of (opt.images || [])) {
        if (img.file) {
          const ext = img.file.name.split('.').pop() || 'png';
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          const { data, error } = await supabase.storage.from('prospect_devis_images').upload(fileName, img.file);
          if (!error) {
            const { data: publicUrlData } = supabase.storage.from('prospect_devis_images').getPublicUrl(fileName);
            finalImages.push(publicUrlData.publicUrl);
          }
        } else if (img.url) {
          finalImages.push(img.url);
        }
      }
      optionsToSave.push({ text: opt.text, images: finalImages });
    }

    const defaultNomDevis = nomDevis.trim() || `Devis ${destinationNom ? `${destinationNom} - ` : ''}${clientSearch || 'Client'}`;

    const detailsObject = {
      nom_devis: defaultNomDevis,
      destination: destinationNom || null,
      destination_id: destinationId || null,
      destination_emoji: destinationEmoji || '📍',
      date_depart: dateDepart || null,
      date_retour: dateRetour || null,
      priorite: priorite || 'Moyenne',
      agent_id: assignedAgentId || user?.id || null,
      agent_nom: assignedAgentNom || activeAgentName,
      options: optionsToSave,
      simulations: simulationsList,
      remarques: remarquesDevis
    };

    onSave({ 
      ...formData, 
      details_devis: JSON.stringify(detailsObject),
      devis_ia: aiQuoteText 
    });
    setIsSaving(false);
  };

  // Autocomplete client filter
  const filteredClients = clientsList.filter(c => c.nom.toLowerCase().includes(clientSearch.toLowerCase()));

  // Handlers for Options
  const handleOptionChange = (idx, value) => {
    const newOpts = [...devisOptions];
    newOpts[idx].text = value;
    setDevisOptions(newOpts);
  };

  const addOption = () => setDevisOptions(prev => [...prev, { text: '', images: [] }]);
  const removeOption = (idx) => setDevisOptions(prev => prev.filter((_, i) => i !== idx));

  const handlePasteImage = (e, idx) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const newOpts = [...devisOptions];
            newOpts[idx].images.push({ id: Date.now().toString(), file, base64: event.target.result });
            setDevisOptions(newOpts);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const removeImage = (optIdx, imgIdx) => {
    const newOpts = [...devisOptions];
    newOpts[optIdx].images = newOpts[optIdx].images.filter((_, i) => i !== imgIdx);
    setDevisOptions(newOpts);
  };

  const handleUpdateSimChambre = (id, field, value) => {
    setSimChambres(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, [field]: value };
      if (field === 'adultes' || field === 'chd') {
        const beds = Number(updated.adultes || 0) + Number(updated.chd || 0);
        if (beds === 1) updated.type = 'Single';
        else if (beds === 2) updated.type = 'Double';
        else if (beds === 3) updated.type = 'Triple';
        else if (beds === 4) updated.type = 'Quadruple';
        else if (beds >= 5) updated.type = `Chambre ${beds} Lits`;
      }
      return updated;
    }));
  };

  const handleAddSimChambre = () => {
    const nextIdx = simChambres.length + 1;
    setSimChambres(prev => [
      ...prev,
      { id: `ch_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, nom: `Chambre ${nextIdx}`, type: 'Double', adultes: 2, chd: 0, inf: 0 }
    ]);
  };

  const handleRemoveSimChambre = (id) => {
    if (simChambres.length <= 1) return;
    setSimChambres(prev => prev.filter(c => c.id !== id));
  };

  if (!isOpen) return null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[920px] p-0 overflow-hidden rounded-2xl shadow-2xl border-border" onClose={onClose}>
        
        {/* ── Dialog Header with Navigation Tabs ──────────────────── */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-6 pb-0 border-b border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md border border-emerald-400/30">
                <FileText size={22} />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2 flex-wrap">
                  <span>{isNew ? 'Nouvelle Demande de Devis' : (nomDevis || 'Détails du Devis')}</span>
                  {destinationNom && (
                    <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30 inline-flex items-center gap-1.5 shadow-2xs">
                      <CountryFlag emoji={destinationEmoji} destinationName={destinationNom} className="w-4 h-3" />
                      <span>{destinationNom}</span>
                    </span>
                  )}
                </DialogTitle>
                <p className="text-xs text-slate-300/80 mt-0.5">
                  Gérez la demande, vos offres internes, simulations tarifaires, notes d'équipe et réponse client.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border", 
                priorite === 'Urgente' ? "bg-red-500/20 text-red-300 border-red-400/30" : "bg-blue-500/20 text-blue-300 border-blue-400/30")}>
                Priorité : {priorite}
              </span>
            </div>
          </div>

          {/* 5 Tabs Header */}
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-white/10 pt-2 -mb-[1px]">
            <button
              type="button"
              onClick={() => setActiveTab('demande')}
              className={cn(
                "px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-2 border-b-2",
                activeTab === 'demande'
                  ? "bg-white text-slate-900 border-primary shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-white/10 border-transparent"
              )}
            >
              <FileText size={14} className={activeTab === 'demande' ? "text-primary" : ""} />
              1. Demande Client
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('offre')}
              className={cn(
                "px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-2 border-b-2",
                activeTab === 'offre'
                  ? "bg-white text-slate-900 border-primary shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-white/10 border-transparent"
              )}
            >
              <Briefcase size={14} className={activeTab === 'offre' ? "text-primary" : ""} />
              2. Offre Interne ({devisOptions.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('simulations')}
              className={cn(
                "px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-2 border-b-2",
                activeTab === 'simulations'
                  ? "bg-white text-slate-900 border-emerald-600 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-white/10 border-transparent"
              )}
            >
              <Calculator size={14} className={activeTab === 'simulations' ? "text-emerald-600" : "text-emerald-400"} />
              3. Simulations ({simulationsList.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('remarques')}
              className={cn(
                "px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-2 border-b-2",
                activeTab === 'remarques'
                  ? "bg-white text-slate-900 border-primary shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-white/10 border-transparent"
              )}
            >
              <MessageSquare size={14} className={activeTab === 'remarques' ? "text-primary" : ""} />
              4. Remarques ({remarquesDevis.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reponse')}
              className={cn(
                "px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition-all flex items-center gap-2 border-b-2",
                activeTab === 'reponse'
                  ? "bg-white text-slate-900 border-indigo-600 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-white/10 border-transparent"
              )}
            >
              <Sparkles size={14} className={activeTab === 'reponse' ? "text-indigo-600" : "text-indigo-400"} />
              5. Réponse & IA
            </button>
          </div>
        </div>

        {/* ── Form and Tabs Body ───────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 overflow-y-auto max-h-[62vh] space-y-5 bg-background">
            
            {/* ═════════════════════════════════════════════════════════
                TAB 1 : DEMANDE CLIENT
            ═════════════════════════════════════════════════════════ */}
            {activeTab === 'demande' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Row 1: Titre Devis & Client */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <FileText size={14} className="text-primary" />
                      Nom / Titre du Devis <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      className="h-10 bg-muted/20 focus-visible:bg-transparent text-xs font-bold"
                      placeholder="Ex: Omra Ramadan Confort - Famille Benali"
                      value={nomDevis}
                      onChange={e => setNomDevis(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5 relative" ref={wrapperRef}>
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <User size={14} className="text-primary" />
                      Client Associé <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9 h-10 bg-muted/20 focus-visible:bg-transparent text-xs"
                        placeholder="Rechercher un client..."
                        value={clientSearch}
                        onChange={e => { 
                          setClientSearch(e.target.value); 
                          setShowDropdown(true); 
                          if (formData.client_id) setFormData(p => ({ ...p, client_id: '' })); 
                        }}
                        onFocus={() => setShowDropdown(true)}
                      />
                    </div>
                    {showDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-background border rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
                        {filteredClients.map(c => (
                          <div key={c.id} onClick={() => { setClientSearch(c.nom); setFormData(p => ({ ...p, client_id: c.id })); setShowDropdown(false); }}
                            className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted text-xs border-b last:border-0">
                            <span className="font-bold">{c.nom}</span>
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-muted font-bold">{c.type || 'Particulier'}</span>
                          </div>
                        ))}
                        <div onClick={() => { setShowDropdown(false); setIsAddingClient(true); }}
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer text-primary font-bold text-xs bg-primary/5 hover:bg-primary/10 border-t">
                          <Plus size={14} /> Ajouter un nouveau client
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2: Destination, Service, Dates, Priorité, Agent */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  {/* Destination */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <MapPin size={12} className="text-emerald-600" /> Destination
                    </Label>
                    <DestinationSelect
                      value={destinationId || ''}
                      onChange={(id, dest) => {
                        setDestinationId(id);
                        if (dest) {
                          setDestinationNom(dest.nom);
                          setDestinationEmoji(dest.emoji || '📍');
                        } else {
                          setDestinationNom('');
                          setDestinationEmoji('📍');
                        }
                      }}
                      destinations={destinationsList}
                      placeholder="-- Choisir Destination --"
                      allowAll={false}
                      mode="id"
                      showArabic={true}
                      className="w-full"
                    />
                  </div>

                  {/* Service */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Plane size={12} className="text-blue-600" /> Service
                    </Label>
                    <Select 
                      name="service_id" 
                      value={formData.service_id || ''} 
                      onChange={e => setFormData(p => ({ ...p, service_id: e.target.value }))} 
                      className="h-9 text-xs bg-white"
                    >
                      <option value="">-- Choisir service --</option>
                      {servicesList.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                    </Select>
                  </div>

                  {/* Agent en charge */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <User size={12} className="text-purple-600" /> Agent assigné
                    </Label>
                    <Select
                      value={assignedAgentId || ''}
                      onChange={e => {
                        const id = e.target.value;
                        setAssignedAgentId(id);
                        const a = agentsList.find(item => item.id === id);
                        setAssignedAgentNom(a ? (a.nom || a.email?.split('@')[0]) : '');
                      }}
                      className="h-9 text-xs bg-white"
                    >
                      <option value="">-- Non assigné --</option>
                      {agentsList.map(a => (
                        <option key={a.id} value={a.id}>👤 {a.nom || a.email?.split('@')[0]}</option>
                      ))}
                    </Select>
                  </div>

                  {/* Priorité */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Flame size={12} className="text-amber-600" /> Priorité
                    </Label>
                    <Select
                      value={priorite || 'Moyenne'}
                      onChange={e => setPriorite(e.target.value)}
                      className="h-9 text-xs bg-white font-bold"
                    >
                      {PRIORITES.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </Select>
                  </div>

                  {/* Dates */}
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Calendar size={12} className="text-teal-600" /> Date de départ prévue
                    </Label>
                    <Input
                      type="date"
                      value={dateDepart}
                      onChange={e => setDateDepart(e.target.value)}
                      className="h-9 text-xs bg-white"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Calendar size={12} className="text-teal-600" /> Date de retour prévue
                    </Label>
                    <Input
                      type="date"
                      value={dateRetour}
                      onChange={e => setDateRetour(e.target.value)}
                      className="h-9 text-xs bg-white"
                    />
                  </div>
                </div>

                {/* Expression du besoin */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Détails & Expression du besoin client</Label>
                  <Textarea 
                    name="details_demande" 
                    rows={4} 
                    placeholder="Décrivez en détail la demande du client (nombre de personnes, hôtels souhaités, budget, contraintes particulières...)"
                    value={formData.details_demande} 
                    onChange={e => setFormData(p => ({ ...p, details_demande: e.target.value }))} 
                    className="resize-none bg-muted/20 text-xs leading-relaxed" 
                  />
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════
                TAB 2 : OFFRE INTERNE (OPTIONS)
            ═════════════════════════════════════════════════════════ */}
            {activeTab === 'offre' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Options de l'offre commerciale</h3>
                    <p className="text-[11px] text-muted-foreground">Ajoutez les différentes variantes de tarifs et formules pour ce client.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addOption} className="h-8 text-xs font-bold gap-1 text-primary">
                    <Plus size={13} /> Ajouter une option
                  </Button>
                </div>

                <div className="space-y-3">
                  {devisOptions.map((opt, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-primary/20 bg-slate-50/50 space-y-2.5 relative group">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-primary uppercase">Option {idx + 1}</span>
                        {devisOptions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeOption(idx)}
                            className="text-slate-400 hover:text-red-600 text-xs flex items-center gap-1 font-bold"
                          >
                            <Trash2 size={12} /> Supprimer
                          </button>
                        )}
                      </div>

                      <Textarea 
                        rows={4} 
                        placeholder="Détail de l'option (hôtels, vols, prix par personne, ou COLLEZ une capture Ctrl+V)..."
                        value={opt.text} 
                        onChange={(e) => handleOptionChange(idx, e.target.value)} 
                        onPaste={(e) => handlePasteImage(e, idx)}
                        className="bg-white text-xs resize-none leading-relaxed" 
                      />

                      {/* Image attachments */}
                      {opt.images && opt.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1 border-t">
                          {opt.images.map((img, imgIdx) => (
                            <div key={imgIdx} className="relative w-16 h-16 rounded-lg overflow-hidden border shadow-2xs group/img">
                              <img src={img.url || img.base64} alt={`Img ${imgIdx}`} className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewImage(img.url || img.base64)} />
                              <button type="button" onClick={() => removeImage(idx, imgIdx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════
                TAB 3 : SIMULATIONS DE DEVIS (MULTI-SIMULATION)
            ═════════════════════════════════════════════════════════ */}
            {activeTab === 'simulations' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                
                {/* List of Saved Simulations for this Quote */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Simulations enregistrées pour cette demande ({simulationsList.length})
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={resetSimulatorInputs}
                      className="h-8 text-xs font-bold gap-1.5 bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs"
                    >
                      <Plus size={13} /> Nouvelle Simulation
                    </Button>
                  </div>

                  {simulationsList.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {simulationsList.map(sim => (
                        <div 
                          key={sim.id}
                          className={cn(
                            "p-3 rounded-xl border text-xs space-y-1.5 transition-all shadow-2xs cursor-pointer",
                            activeSimulationId === sim.id
                              ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-400/40"
                              : "bg-white hover:border-emerald-300"
                          )}
                          onClick={() => loadSimulationIntoInputs(sim)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900">{sim.nom}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-emerald-700 text-xs">
                                {fmtDZD(sim.calculation?.totalDevis)} DZD
                              </span>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDeleteSimulation(sim.id); }}
                                className="text-slate-300 hover:text-red-600 p-0.5"
                                title="Supprimer cette simulation"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>{sim.paxCounts?.totalPax || 0} pax ({sim.chambres?.length || 1} ch.)</span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleImportSimIntoOption(sim); }}
                              className="text-emerald-700 font-bold hover:underline"
                            >
                              ➔ Insérer dans l'offre
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-center bg-slate-50 rounded-xl border border-dashed text-xs text-slate-500">
                      Aucune simulation enregistrée. Configurez le simulateur ci-dessous et cliquez sur "Enregistrer cette Simulation dans la Demande".
                    </div>
                  )}
                </div>

                {/* Active Simulator Section */}
                <div className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/30 space-y-4 shadow-sm">
                  
                  {/* Simulator Header & Pax Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200">
                    <div className="flex items-center gap-2 flex-1">
                      <Calculator size={20} className="text-emerald-600 shrink-0" />
                      <Input
                        value={simulationName}
                        onChange={e => setSimulationName(e.target.value)}
                        placeholder="Nom de la simulation (ex: Formule 4* Confort)"
                        className="h-9 text-xs font-black bg-white max-w-[280px] shadow-2xs border-emerald-300"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-extrabold px-2.5 py-1 bg-white text-emerald-800 rounded-lg border border-emerald-300 shadow-2xs">
                        👥 {simPaxCounts.totalPax} Pax ({simPaxCounts.adultes} A &bull; {simPaxCounts.chd} C &bull; {simPaxCounts.inf} I)
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddSimChambre}
                        className="h-9 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                      >
                        <Plus size={14} /> Ajouter Chambre
                      </Button>
                    </div>
                  </div>

                  {/* Rooms list */}
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {simChambres.map((ch, idx) => (
                      <div key={ch.id} className="p-2.5 rounded-xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-2xs">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <Input 
                            value={ch.nom} 
                            onChange={e => handleUpdateSimChambre(ch.id, 'nom', e.target.value)} 
                            className="h-8 text-xs font-bold w-24 bg-slate-50 border-slate-200" 
                          />
                          
                          {/* Room Type Selector with full comfortable height */}
                          <select
                            value={ch.type}
                            onChange={e => handleUpdateSimChambre(ch.id, 'type', e.target.value)}
                            className="h-8 text-xs font-semibold px-2.5 rounded-md border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="Single">Single (1 lit)</option>
                            <option value="Double">Double (2 lits)</option>
                            <option value="Triple">Triple (3 lits)</option>
                            <option value="Quadruple">Quadruple (4 lits)</option>
                            <option value="Familiale">Familiale (5+ lits)</option>
                          </select>
                        </div>

                        {/* Adultes / CHD / INF Stepper Controls */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Adultes */}
                          <div className="flex items-center bg-blue-50/80 border border-blue-200 rounded-lg p-0.5">
                            <span className="text-[10px] font-black text-blue-700 px-1.5">👤 A</span>
                            <button 
                              type="button" 
                              onClick={() => handleUpdateSimChambre(ch.id, 'adultes', Math.max(0, Number(ch.adultes || 0) - 1))}
                              className="w-5 h-6 rounded bg-white hover:bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center border border-blue-200 shadow-2xs"
                            >-</button>
                            <input 
                              type="number" 
                              min="0" 
                              value={ch.adultes} 
                              onChange={e => handleUpdateSimChambre(ch.id, 'adultes', Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-7 h-6 text-center text-xs font-black bg-transparent border-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                            />
                            <button 
                              type="button" 
                              onClick={() => handleUpdateSimChambre(ch.id, 'adultes', Number(ch.adultes || 0) + 1)}
                              className="w-5 h-6 rounded bg-white hover:bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center border border-blue-200 shadow-2xs"
                            >+</button>
                          </div>

                          {/* CHD */}
                          <div className="flex items-center bg-amber-50/80 border border-amber-200 rounded-lg p-0.5">
                            <span className="text-[10px] font-black text-amber-700 px-1.5">🧒 C</span>
                            <button 
                              type="button" 
                              onClick={() => handleUpdateSimChambre(ch.id, 'chd', Math.max(0, Number(ch.chd || 0) - 1))}
                              className="w-5 h-6 rounded bg-white hover:bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center border border-amber-200 shadow-2xs"
                            >-</button>
                            <input 
                              type="number" 
                              min="0" 
                              value={ch.chd} 
                              onChange={e => handleUpdateSimChambre(ch.id, 'chd', Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-7 h-6 text-center text-xs font-black bg-transparent border-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                            />
                            <button 
                              type="button" 
                              onClick={() => handleUpdateSimChambre(ch.id, 'chd', Number(ch.chd || 0) + 1)}
                              className="w-5 h-6 rounded bg-white hover:bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center border border-amber-200 shadow-2xs"
                            >+</button>
                          </div>

                          {/* INF */}
                          <div className="flex items-center bg-purple-50/80 border border-purple-200 rounded-lg p-0.5">
                            <span className="text-[10px] font-black text-purple-700 px-1.5">👶 I</span>
                            <button 
                              type="button" 
                              onClick={() => handleUpdateSimChambre(ch.id, 'inf', Math.max(0, Number(ch.inf || 0) - 1))}
                              className="w-5 h-6 rounded bg-white hover:bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center border border-purple-200 shadow-2xs"
                            >-</button>
                            <input 
                              type="number" 
                              min="0" 
                              value={ch.inf} 
                              onChange={e => handleUpdateSimChambre(ch.id, 'inf', Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-7 h-6 text-center text-xs font-black bg-transparent border-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                            />
                            <button 
                              type="button" 
                              onClick={() => handleUpdateSimChambre(ch.id, 'inf', Number(ch.inf || 0) + 1)}
                              className="w-5 h-6 rounded bg-white hover:bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center border border-purple-200 shadow-2xs"
                            >+</button>
                          </div>

                          {simChambres.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => handleRemoveSimChambre(ch.id)} 
                              className="text-slate-300 hover:text-red-600 p-1 transition-colors"
                              title="Supprimer la chambre"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Costs fields grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-emerald-200 text-xs">
                    
                    {/* Billet */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                      <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><Plane size={13} className="text-blue-600" /> Billet d'avion</span>
                        <button 
                          type="button" 
                          onClick={() => setSimBilletMode(simBilletMode === 'personne' ? 'groupe' : 'personne')} 
                          className="text-[10px] text-blue-600 font-black hover:underline"
                        >
                          {simBilletMode === 'personne' ? 'Par Pax' : 'Total Groupe'}
                        </button>
                      </Label>
                      {simBilletMode === 'personne' ? (
                        <div className="space-y-1.5">
                          <Input 
                            type="number" 
                            placeholder="Tarif Adulte (DZD)" 
                            value={simBilletAdulte} 
                            onChange={e => setSimBilletAdulte(e.target.value)} 
                            className="h-8 text-xs font-bold" 
                          />
                        </div>
                      ) : (
                        <Input 
                          type="number" 
                          placeholder="Total Groupe Billetterie (DZD)" 
                          value={simBilletGroupeTotal} 
                          onChange={e => setSimBilletGroupeTotal(e.target.value)} 
                          className="h-8 text-xs font-bold" 
                        />
                      )}
                    </div>

                    {/* Hotel */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                      <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Building2 size={13} className="text-emerald-600" /> Tarif Total Hôtel (DZD)
                      </Label>
                      <Input 
                        type="number" 
                        placeholder="Montant total hébergement" 
                        value={simHotelTotal} 
                        onChange={e => setSimHotelTotal(e.target.value)} 
                        className="h-8 text-xs font-bold" 
                      />
                    </div>

                    {/* Visa */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                      <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><Stamp size={13} className="text-amber-600" /> Frais de Visa</span>
                        <button 
                          type="button" 
                          onClick={() => setSimVisaMode(simVisaMode === 'personne' ? 'groupe' : 'personne')} 
                          className="text-[10px] text-amber-600 font-black hover:underline"
                        >
                          {simVisaMode === 'personne' ? 'Par Pax' : 'Total Groupe'}
                        </button>
                      </Label>
                      <Input 
                        type="number" 
                        placeholder={simVisaMode === 'personne' ? "Visa par personne (DZD)" : "Total visas (DZD)"} 
                        value={simVisaMode === 'personne' ? simVisaParPersonne : simVisaGroupeTotal} 
                        onChange={e => simVisaMode === 'personne' ? setSimVisaParPersonne(e.target.value) : setSimVisaGroupeTotal(e.target.value)} 
                        className="h-8 text-xs font-bold" 
                      />
                    </div>

                    {/* Excursions */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                      <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <MapPin size={13} className="text-purple-600" /> Excursions & Guide (DZD)
                      </Label>
                      <Input 
                        type="number" 
                        placeholder="Total excursions & visites" 
                        value={simExcursionsTotal} 
                        onChange={e => setSimExcursionsTotal(e.target.value)} 
                        className="h-8 text-xs font-bold" 
                      />
                    </div>

                    {/* Transferts */}
                    <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                      <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Bus size={13} className="text-teal-600" /> Transferts & Bus (DZD)
                      </Label>
                      <Input 
                        type="number" 
                        placeholder="Total transferts & transport" 
                        value={simTransfertTotal} 
                        onChange={e => setSimTransfertTotal(e.target.value)} 
                        className="h-8 text-xs font-bold" 
                      />
                    </div>

                    {/* Marge */}
                    <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-300 shadow-2xs space-y-1.5">
                      <Label className="text-xs font-bold text-emerald-950 flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><Award size={13} className="text-emerald-700" /> Marge Agence</span>
                        <button 
                          type="button" 
                          onClick={() => setSimMargeMode(simMargeMode === 'personne' ? 'groupe' : simMargeMode === 'groupe' ? 'pourcentage' : 'personne')} 
                          className="text-[10px] text-emerald-700 font-black hover:underline"
                        >
                          {simMargeMode === 'personne' ? 'Par Pax' : simMargeMode === 'groupe' ? 'Groupe Fixe' : '% Pourcentage'}
                        </button>
                      </Label>
                      <Input 
                        type="number" 
                        placeholder={simMargeMode === 'pourcentage' ? "Ex: 15 (%)" : "Montant marge (DZD)"} 
                        value={simMargeValeur} 
                        onChange={e => setSimMargeValeur(e.target.value)} 
                        className="h-8 text-xs font-black bg-white border-emerald-300" 
                      />
                    </div>

                    {/* Forfait bébés (si INF > 0) */}
                    {simPaxCounts.inf > 0 && (
                      <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-300 shadow-2xs space-y-1.5 sm:col-span-2 md:col-span-3">
                        <Label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                          <Baby size={14} className="text-purple-600" /> Total Forfait Bébés ({simPaxCounts.inf} INF)
                        </Label>
                        <Input 
                          type="number" 
                          placeholder="Montant total bébés (DZD)" 
                          value={simInfTotal} 
                          onChange={e => setSimInfTotal(e.target.value)} 
                          className="h-8 text-xs font-black bg-white border-purple-300" 
                        />
                      </div>
                    )}
                  </div>

                  {/* Room Type Rates & Save Simulation Button */}
                  <div className="space-y-3 pt-2">
                    {/* Grille par type de chambre */}
                    {simCalculation.tarifsParType?.length > 0 && (
                      <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                          Tarifs par Type de Chambre (Arrondis à 1 000 DZD) :
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {simCalculation.tarifsParType.map((t, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200/80 text-xs flex items-center justify-between">
                              <span className="font-extrabold text-slate-900">🏠 {t.type}</span>
                              <div className="text-right">
                                <span className="font-black text-emerald-700">{fmtDZD(t.prixAdulte)} DZD/A</span>
                                {simPaxCounts.chd > 0 && (
                                  <span className="text-[10px] text-amber-700 block font-semibold">{fmtDZD(t.prixChd)} DZD/C</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Total & Action Button */}
                    <div className="p-3.5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold text-emerald-200 block">Total Devis Calculé (Arrondi 1 000 DZD)</span>
                        <span className="text-xl font-black">{fmtDZD(simCalculation.totalDevis)} DZD</span>
                      </div>

                      <Button
                        type="button"
                        onClick={handleSaveSimulationInList}
                        className="bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs h-10 px-5 gap-2 shadow-sm"
                      >
                        <Check size={16} /> Enregistrer cette Simulation dans la Demande
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════
                TAB 4 : REMARQUES INTERNES (SUR LA DEMANDE DE DEVIS)
            ═════════════════════════════════════════════════════════ */}
            {activeTab === 'remarques' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-2">
                      <UserAvatar user={profile || user} size="xs" />
                      <span>Écrire une remarque interne en tant que :</span>
                      <b className="text-primary">{activeAgentName}</b> 
                      <span className="text-[10px] text-slate-500 uppercase font-bold">({activeAgentRole})</span>
                    </span>
                  </div>

                  <Textarea
                    rows={3}
                    placeholder="Ajoutez une note de suivi interne sur ce devis (ex: client rappelle à 14h, hésite entre deux hôtels...)"
                    value={nouvelleRemarqueDevis}
                    onChange={e => setNouvelleRemarqueDevis(e.target.value)}
                    className="bg-white text-xs resize-none leading-relaxed"
                  />

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={handleAddRemarqueDevis}
                      disabled={!nouvelleRemarqueDevis.trim()}
                      className="h-8 text-xs font-bold gap-1.5"
                    >
                      <Send size={13} /> Publier la remarque
                    </Button>
                  </div>
                </div>

                {/* Timeline of remarks */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Historique des remarques sur ce devis ({remarquesDevis.length})
                  </h4>

                  {remarquesDevis.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50/60 rounded-xl border border-dashed text-slate-400 text-xs">
                      <MessageCircle size={28} className="mx-auto mb-1.5 opacity-40" />
                      <p className="font-bold">Aucune remarque interne sur ce devis</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {remarquesDevis.map(r => {
                        const authorProfile = agentsList.find(a => a.id === r.auteur_id || a.nom === r.auteur_nom);
                        return (
                          <div key={r.id} className="p-3.5 rounded-xl border bg-white shadow-2xs space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <UserAvatar 
                                  user={authorProfile}
                                  avatarUrl={r.auteur_avatar_url || authorProfile?.avatar_url}
                                  name={r.auteur_nom}
                                  size="sm"
                                />
                                <span className="font-bold text-slate-900">{r.auteur_nom || 'Agent'}</span>
                                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-100 font-bold">{r.auteur_role || 'Agent'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400">
                                  {r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRemarqueDevis(r.id)}
                                  className="text-slate-300 hover:text-red-600 p-0.5"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed pl-8">{r.texte}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════
                TAB 5 : RÉPONSE & IA (GEMINI / WHATSAPP / GMAIL)
            ═════════════════════════════════════════════════════════ */}
            {activeTab === 'reponse' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-200 shadow-2xs">
                  <div>
                    <h3 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                      <Sparkles size={16} className="text-indigo-600" />
                      Génération Assistée par Gemini IA
                    </h3>
                    <p className="text-[11px] text-indigo-800/80 mt-0.5">
                      Personnalisez la langue (Arabe, Français, Anglais), la source, le ton et les emojis avant de générer.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => setShowAIConfigModal(true)}
                    disabled={isGenerating}
                    className="h-10 px-5 font-black text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm shrink-0"
                  >
                    {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    {isGenerating ? "Génération en cours..." : "Configurer & Générer avec l'IA ✨"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">Message / Devis Formaté prêt pour le Client</Label>
                    {aiQuoteText && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(aiQuoteText)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                      >
                        {copiedResponse ? <Check size={13} /> : <Copy size={13} />}
                        {copiedResponse ? "Copié !" : "Copier le texte"}
                      </button>
                    )}
                  </div>

                  <Textarea
                    rows={12}
                    placeholder="Cliquez sur 'Configurer & Générer avec l'IA' ci-dessus ou écrivez votre proposition finale ici..."
                    value={aiQuoteText}
                    onChange={e => setAiQuoteText(e.target.value)}
                    className="bg-white border-indigo-200 text-xs leading-relaxed font-mono shadow-2xs resize-none"
                  />
                </div>

                {/* Sending Action Buttons */}
                <div className="flex flex-wrap sm:flex-nowrap gap-3 pt-2">
                  <Button
                    type="button"
                    variant="success"
                    onClick={() => handleWhatsApp(aiQuoteText)}
                    className="flex-1 h-11 text-xs font-bold gap-2 shadow-sm"
                  >
                    <MessageCircle size={16} /> Envoyer via WhatsApp
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleEmail(aiQuoteText)}
                    className="flex-1 h-11 text-xs font-bold gap-2 bg-white border-slate-300 shadow-sm"
                  >
                    <Mail size={16} /> Envoyer via Gmail / Email
                  </Button>
                </div>
              </div>
            )}

          </div>

          {/* ── Dialog Footer ─────────────────────────────────────── */}
          <div className="px-6 py-4 border-t bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Statut du Devis :</span>
              <Select
                value={formData.status || 'nouvelle'}
                onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}
                className="h-8 text-xs bg-white font-bold max-w-[170px]"
              >
                {STATUTS.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </Select>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose} className="h-10 px-5 text-xs font-bold">
                Annuler
              </Button>
              <Button type="submit" disabled={isSaving} className="h-10 px-6 font-black text-xs gap-1.5 shadow-md">
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Enregistrer la Demande
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>

      {/* ── Modal de Personnalisation du Prompt IA ── */}
      <Dialog open={showAIConfigModal} onOpenChange={setShowAIConfigModal}>
        <DialogContent className="max-w-[560px] p-0 overflow-hidden rounded-2xl shadow-2xl border-indigo-200" onClose={() => setShowAIConfigModal(false)}>
          <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white px-6 py-5 border-b border-indigo-800/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md border border-white/20">
                <Sparkles size={20} />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-white">Paramètres de Rédaction IA (Gemini)</DialogTitle>
                <p className="text-xs text-indigo-200/80 mt-0.5">Personnalisez la langue, le contenu source, le ton et les options avant génération.</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 text-xs bg-background">
            
            {/* 1. Langue */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                🌐 Langue de Rédaction
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'fr', label: 'Français', flag: '🇫🇷' },
                  { id: 'ar', label: 'العربية', flag: '🇸🇦' },
                  { id: 'en', label: 'English', flag: '🇬🇧' },
                ].map(l => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setAiLangue(l.id)}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all",
                      aiLangue === l.id
                        ? "bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-400/40 shadow-xs"
                        : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                    )}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Contenu source */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                📦 Contenu Source à inclure dans la réponse
              </Label>
              <select
                value={aiSource}
                onChange={e => setAiSource(e.target.value)}
                className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              >
                <option value="all">🌟 Toutes les Offres et Simulations combinées</option>
                <option value="options_only">💼 Uniquement les Options de l'Offre Interne</option>
                <option value="simulations_only">🧮 Uniquement les Simulations Enregistrées</option>
                <option value="sim_active">🏠 Uniquement la Simulation Active en cours</option>
                
                {/* Specific options */}
                {devisOptions.map((opt, idx) => (
                  <option key={`opt_${idx}`} value={`opt_${idx}`}>
                    👉 Option {idx + 1} ({opt.text ? opt.text.substring(0, 30) + '...' : 'Texte vide'})
                  </option>
                ))}

                {/* Specific simulations */}
                {simulationsList.map((sim, idx) => (
                  <option key={`sim_${sim.id}`} value={`sim_${sim.id}`}>
                    👉 Simulation : {sim.nom} ({fmtDZD(sim.calculation?.totalDevis)} DZD)
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Forme & Ton du message */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                👔 Style & Ton du Message
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'pro', label: 'Professionnel', desc: 'Formel & Courtois', icon: '👔' },
                  { id: 'direct', label: 'Direct', desc: 'Concis & Rapide', icon: '⚡' },
                  { id: 'commercial', label: 'Commercial', desc: 'Vendeur & Persuasif', icon: '🌟' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAiForme(t.id)}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition-all",
                      aiForme === t.id
                        ? "bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-400/40 shadow-xs"
                        : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                    )}
                  >
                    <div className="font-extrabold text-xs flex items-center gap-1">
                      <span>{t.icon}</span> <span>{t.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Emojis */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                ✨ Formatage avec Emojis
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAiEmojis(true)}
                  className={cn(
                    "p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all",
                    aiEmojis
                      ? "bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-400/40"
                      : "bg-white text-slate-600 border-slate-200"
                  )}
                >
                  <span>✨ Oui (Visuel & Aéré)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAiEmojis(false)}
                  className={cn(
                    "p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all",
                    !aiEmojis
                      ? "bg-indigo-50 border-indigo-500 text-indigo-950 ring-2 ring-indigo-400/40"
                      : "bg-white text-slate-600 border-slate-200"
                  )}
                >
                  <span>📄 Non (Sobre & Sans Emojis)</span>
                </button>
              </div>
            </div>

            {/* 5. Instructions supplémentaires */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">
                Consignes spécifiques additionnelles (facultatif)
              </Label>
              <Input
                placeholder="Ex: Mentionner acompte de 30%, vol Emirates, visa offert..."
                value={aiExtraInstructions}
                onChange={e => setAiExtraInstructions(e.target.value)}
                className="h-9 text-xs bg-slate-50"
              />
            </div>

          </div>

          <div className="px-6 py-4 border-t bg-slate-50/80 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAIConfigModal(false)}
              className="h-10 text-xs font-bold"
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className="h-10 px-6 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md"
            >
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {isGenerating ? "Génération en cours..." : "Générer la Réponse"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isAddingClient && <ClientForm onClose={() => setIsAddingClient(false)} onSave={async (newClientData) => {
        const { data, error } = await supabase.from('clients').insert([newClientData]).select();
        if (!error && data && data[0]) {
          clientsList.push(data[0]);
          setClientSearch(data[0].nom);
          setFormData(p => ({ ...p, client_id: data[0].id }));
          setIsAddingClient(false);
        }
      }} />}

      {previewImage && (
        <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="max-w-3xl bg-transparent border-none shadow-none flex items-center justify-center [&>button]:hidden">
            <div className="relative">
              <button type="button" onClick={() => setPreviewImage(null)} className="absolute -top-3 -right-3 bg-background rounded-full p-1 shadow-lg border">
                <X size={18} />
              </button>
              <img src={previewImage} alt="Preview" className="max-h-[85vh] rounded-lg shadow-2xl" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
    </>
  );
};

export default ProspectModal;
