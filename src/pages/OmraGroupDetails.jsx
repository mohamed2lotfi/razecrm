import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { 
  Plus, ArrowLeft, Users, Building2, Phone, Utensils, 
  Tag, UserPlus, Plane, Calendar, Trash2, Pencil, 
  Baby, CreditCard, ArrowRightLeft, BedDouble, FileText,
  User, Wallet, Calculator, TrendingUp, Table, Loader2,
  Printer, Edit2, Upload, File, ChevronDown, CheckCircle,
  AlertCircle, RefreshCw, DollarSign, Search, ChevronLeft, ChevronRight
} from 'lucide-react';
import ClientForm from '@/components/ClientForm';
import { ReactSortable } from "react-sortablejs";

const CHAMBRE_CAPACITY = {
  'CH5': 5, 'CH4': 4, 'CH3': 3, 'CH2': 2, 'Single': 1
};

const CHAMBRE_KEYS = {
  'CH5': 'ch5', 'CH4': 'ch4', 'CH3': 'ch3', 'CH2': 'ch2', 'Single': 'single'
};

const CHAMBRE_LABELS = {
  'CH5': 'Quintuple', 'CH4': 'Quadruple', 'CH3': 'Triple', 'CH2': 'Double', 'Single': 'Single'
};

const DEVISES = ['DZD', 'SAR', 'USD', 'EUR'];

// --- Mapping Functions ---
const mapEnregistrementToCamel = (row, interList) => ({
  id: row.id,
  groupeId: row.groupe_id,
  chambreId: row.chambre_id,
  hotelId: row.hotel_id,
  typeChambre: row.type_chambre,
  pelerins: row.pelerins || [],
  enfantsSansLit: row.enfants_sans_lit || [],
  intermediaire: interList.find(i => i.id === row.intermediaire_id)?.nom || '',
  paiementRabatteur: row.paiement_rabatteur,
  commissionCustom: row.commission_custom,
  telephone: row.telephone,
  note: row.note,
  reduction: row.reduction,
  totalChambre: row.total_chambre,
  totalResto: row.total_resto,
  totalEnfantsSansLit: row.total_enfants_sans_lit,
  totalBrut: row.total_brut,
  totalCommission: row.total_commission,
  totalNet: row.total_net,
  clientId: row.client_id,
  dateCreation: row.date_creation
});

const mapCamelToEnregistrement = (cam, interList) => ({
  groupe_id: cam.groupeId,
  chambre_id: cam.chambreId,
  hotel_id: cam.hotelId,
  type_chambre: cam.typeChambre,
  pelerins: cam.pelerins || [],
  enfants_sans_lit: cam.enfantsSansLit || [],
  intermediaire_id: interList.find(i => i.nom === cam.intermediaire)?.id || null,
  paiement_rabatteur: cam.paiementRabatteur,
  commission_custom: cam.commissionCustom === '' || cam.commissionCustom === undefined ? null : Number(cam.commissionCustom),
  telephone: cam.telephone,
  note: cam.note,
  reduction: cam.reduction === '' || cam.reduction === undefined ? 0 : Number(cam.reduction),
  total_chambre: Number(cam.totalChambre) || 0,
  total_resto: Number(cam.totalResto) || 0,
  total_enfants_sans_lit: Number(cam.totalEnfantsSansLit) || 0,
  total_brut: Number(cam.totalBrut) || 0,
  total_commission: Number(cam.totalCommission) || 0,
  total_commission: Number(cam.totalCommission) || 0,
  total_net: Number(cam.totalNet) || 0,
  client_id: cam.clientId || null,
  date_creation: cam.dateCreation || new Date().toISOString()
});

const mapPaiementToCamel = (row) => ({
  id: row.id,
  groupeId: row.groupe_id,
  enregistrementId: row.enregistrement_id,
  nomClient: row.nom_client,
  datePaiement: row.date_paiement,
  numBon: row.num_bon,
  montantOriginal: row.montant_original,
  devise: row.devise,
  tauxChange: row.taux_change,
  montantDZD: row.montant_dzd,
  paiementRabatteur: row.paiement_rabatteur
});

const mapCamelToPaiement = (cam) => ({
  groupe_id: cam.groupeId,
  enregistrement_id: cam.enregistrementId,
  nom_client: cam.nomClient,
  date_paiement: cam.datePaiement,
  num_bon: cam.numBon,
  montant_original: cam.montantOriginal === '' ? 0 : Number(cam.montantOriginal),
  devise: cam.devise,
  taux_change: cam.tauxChange === '' ? null : Number(cam.tauxChange),
  montant_dzd: cam.montantDZD === '' ? 0 : Number(cam.montantDZD),
  paiement_rabatteur: cam.paiementRabatteur
});

const mapCommissionToCamel = (row, interList) => ({
  id: row.id,
  groupeId: row.groupe_id,
  intermediaire: interList.find(i => i.id === row.intermediaire_id)?.nom || '',
  montant: row.montant,
  date: row.date,
  note: row.note
});

const mapCamelToCommission = (cam, interList) => ({
  groupe_id: cam.groupeId,
  intermediaire_id: interList.find(i => i.nom === cam.intermediaire)?.id || null,
  montant: cam.montant === '' ? 0 : Number(cam.montant),
  date: cam.date,
  note: cam.note
});

const OmraGroupDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [groupes, setGroupes] = useState([]);
  const [intermediaires, setIntermediaires] = useState([]);
  const [enregistrements, setEnregistrements] = useState([]);
  const [paiements, setPaiements] = useState([]);
  const [depenses, setDepenses] = useState([]);
  const [paiementsCommissions, setPaiementsCommissions] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const urlClientId = searchParams.get('clientId');
  const urlOpenForm = searchParams.get('openForm');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUUID) {
      setLoading(false);
      return;
    }
    const [grp, inter, enr, pai, com, hotelsData, clientsData, outRes, envRes, subEnvRes] = await Promise.all([
      supabase.from('omra_groupes').select('*'),
      supabase.from('intermediaires').select('*'),
      supabase.from('omra_enregistrements').select('*').eq('groupe_id', id),
      supabase.from('omra_paiements').select('*').eq('groupe_id', id),
      supabase.from('omra_paiements_commissions').select('*').eq('groupe_id', id),
      supabase.from('hotels').select('*'),
      supabase.from('clients').select('*').order('nom', { ascending: true }),
      supabase.from('outcomes').select('*'),
      supabase.from('outcomes_enveloppes').select('*'),
      supabase.from('outcomes_sous_enveloppes').select('*')
    ]);
    
    if (grp.data) setGroupes(grp.data);
    const iList = inter.data || [];
    setIntermediaires(iList);
    
    if (enr.data) setEnregistrements(enr.data.map(r => mapEnregistrementToCamel(r, iList)));
    if (pai.data) setPaiements(pai.data.map(mapPaiementToCamel));

    // Maps pour les enveloppes des dépenses Générales (Outcomes)
    const envObjMap = {};
    if (envRes?.data) envRes.data.forEach(e => { envObjMap[e.id] = e; });
    const subEnvObjMap = {};
    if (subEnvRes?.data) subEnvRes.data.forEach(se => { subEnvObjMap[se.id] = se; });

    const outcomesFormatted = (outRes?.data || []).map(o => {
      const envObj = envObjMap[o.enveloppe_id];
      const subEnvObj = subEnvObjMap[o.sous_enveloppe_id];
      const envName = envObj?.nom || '';
      const subEnvName = subEnvObj?.nom || '';
      const cat = `${subEnvName || envName}`.trim() || 'Autre';
      return {
        id: o.id,
        groupeId: o.groupe_id,
        groupeIds: o.groupe_ids || (o.groupe_id ? [o.groupe_id] : []),
        categorie: cat,
        subEnvCompagnie: subEnvObj?.compagnie || null,
        envType: envObj?.type_enveloppe || (envName.toLowerCase() === 'omra' ? 'omra' : 'standard'),
        montantDZD: Number(o.montant_dzd) || Number(o.montant) || 0,
        repartition_mode: o.repartition_mode || 'egal',
        source: 'outcomes'
      };
    });

    // Dépenses des groupes Omra basées exclusivement sur la table outcomes (enveloppes Omra)
    setDepenses(outcomesFormatted);

    if (com.data) setPaiementsCommissions(com.data.map(r => mapCommissionToCamel(r, iList)));
    if (hotelsData.data) setHotels(hotelsData.data);
    if (clientsData.data) setClients(clientsData.data);
    
    setLoading(false);
  };
  
  const groupe = groupes.find(g => g.id === id);
  const groupeEnregistrements = enregistrements;
  const groupePaiements = paiements;
  const groupePaiementsCommissions = paiementsCommissions;

  const [activeTab, setActiveTab] = useState('enregistrements'); // enregistrements | chambres | paiements | commissions | finance
  const [activeListHotelId, setActiveListHotelId] = useState('');

  useEffect(() => {
    if (groupe?.hotels?.[0]?.hotelId && !activeListHotelId) {
      setActiveListHotelId(groupe.hotels[0].hotelId);
    }
  }, [groupe, activeListHotelId]);

  // Finance Tab State
  const [financeForm, setFinanceForm] = useState({
    tarifBillet: '',
    reductionChdVol: '',
    gratuites: ''
  });

  // Room Edit State
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [newRoomName, setNewRoomName] = useState('');

  useEffect(() => {
    if (groupe) {
      setFinanceForm({
        tarifBillet: groupe.tarif_billet || groupe.tarifBillet || '',
        reductionChdVol: groupe.reduction_chd_vol || groupe.reductionChdVol || '',
        gratuites: groupe.gratuites || ''
      });
    }
  }, [groupe]);

  const handleSaveFinance = async (e) => {
    e.preventDefault();
    if (!groupe) return;
    const updatedGroup = { 
      ...groupe, 
      tarif_billet: financeForm.tarifBillet,
      reduction_chd_vol: financeForm.reductionChdVol,
      gratuites: financeForm.gratuites
    };
    
    const { data, error } = await supabase.from('omra_groupes').update({
      tarif_billet: financeForm.tarifBillet || null,
      reduction_chd_vol: financeForm.reductionChdVol || null,
      gratuites: financeForm.gratuites || null
    }).eq('id', groupe.id).select();
    
    if (!error && data) {
      setGroupes(groupes.map(g => g.id === groupe.id ? data[0] : g));
      alert('Finances mises à jour avec succès.');
    } else {
      alert('Erreur: ' + error?.message);
    }
  };

  // --- Client Search State ---
  const [clientSearch, setClientSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const wrapperRef = React.useRef(null);

  // --- Chambres Pagination State ---
  const [currentChambrePage, setCurrentChambrePage] = useState(1);
  const CHAMBRES_PER_PAGE = 20;

  // --- Room Capacity Overrides (visual only, no DB impact) ---
  const [roomCapacityOverrides, setRoomCapacityOverrides] = useState({});
  const [editingCapacityRoomId, setEditingCapacityRoomId] = useState(null);
  const [newCapacityValue, setNewCapacityValue] = useState('');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredClients = clients.filter(c => 
    c.nom?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.telephone?.includes(clientSearch)
  );

  const handleSelectClient = (client) => {
    setClientSearch(client.nom);
    setFormData(prev => ({ ...prev, clientId: client.id }));
    setShowDropdown(false);
  };

  // --- Registration Modal State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const emptyForm = {
    hotelId: '',
    typeChambre: '',
    chambreId: '',
    pelerins: [],
    enfantsSansLit: [],
    intermediaire: '',
    paiementRabatteur: false,
    commissionCustom: '',
    clientId: '',
    telephone: '',
    note: '',
    reduction: ''
  };
  const [formData, setFormData] = useState(emptyForm);
  const [showTarifPerso, setShowTarifPerso] = useState({});
  const [existingOccupants, setExistingOccupants] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // --- Payment Modal State ---
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentEnregistrementId, setCurrentEnregistrementId] = useState(null);
  const emptyPaymentForm = {
    nomClient: '',
    datePaiement: new Date().toISOString().split('T')[0],
    numBon: '',
    montantOriginal: '',
    devise: 'DZD',
    tauxChange: '',
    paiementRabatteur: false
  };
  const [paymentFormData, setPaymentFormData] = useState(emptyPaymentForm);
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [commissionFormData, setCommissionFormData] = useState({ intermediaire: '', montant: '', date: '', note: '' });
  
  const selectedEnrForPayment = groupeEnregistrements.find(x => x.id === currentEnregistrementId);
  const hasPreviousPayments = groupePaiements.some(p => p.enregistrementId === currentEnregistrementId);

  // --- Effects for Registration Form ---
  useEffect(() => {
    if (urlOpenForm === 'true' && urlClientId && !loading && groupe) {
      setFormData({ ...emptyForm, clientId: urlClientId });
      
      const foundClient = clients.find(c => c.id === urlClientId);
      if (foundClient) setClientSearch(foundClient.nom);

      setIsModalOpen(true);
      navigate(`/omra/group/${id}`, { replace: true });
    }
  }, [urlOpenForm, urlClientId, loading, groupe, id, navigate, clients]);

  useEffect(() => {
    if (formData.typeChambre) {
      const capacity = CHAMBRE_CAPACITY[formData.typeChambre] || 0;
      const slotsAvailable = Math.max(0, capacity - existingOccupants.length);
      
      setFormData(prev => {
        const current = prev.pelerins || [];
        if (current.length === slotsAvailable) return prev; // Evite la réinitialisation si la taille est déjà correcte

        const next = Array.from({ length: slotsAvailable }).map((_, i) => 
          current[i] || { nom: '', sexe: 'H', restauration: false, chd: false, guide: false, tarifPerso: '' }
        );
        return { ...prev, pelerins: next };
      });
    }
  }, [formData.typeChambre, existingOccupants.length]);

  const selectedHotelConfig = groupe?.hotels?.find(h => h.hotelId === formData.hotelId);
  useEffect(() => {
    if (formData.intermediaire && selectedHotelConfig) {
      setFormData(prev => ({
        ...prev,
        commissionCustom: prev.commissionCustom || selectedHotelConfig.commission || ''
      }));
    }
  }, [formData.intermediaire, formData.hotelId, selectedHotelConfig]);

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Loader2 className="animate-spin text-primary" size={48} />
          <h2 className="text-xl font-bold text-muted-foreground">Chargement des données...</h2>
        </div>
      </Layout>
    );
  }

  if (!groupe) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="text-6xl opacity-20">🕌</div>
          <h2 className="text-xl font-bold text-muted-foreground">Groupe introuvable</h2>
          <Button variant="outline" onClick={() => navigate('/omra')}>
            <ArrowLeft size={16} className="mr-2" /> Retour aux groupes
          </Button>
        </div>
      </Layout>
    );
  }

  // --- Calculate Totals for Registration ---
  const prixParPersonneBase = selectedHotelConfig && formData.typeChambre 
    ? Number(selectedHotelConfig[CHAMBRE_KEYS[formData.typeChambre]]) || 0 
    : 0;
  const prixRestauration = selectedHotelConfig ? Number(selectedHotelConfig.restauration) || 0 : 0;
  const reductionChd = selectedHotelConfig ? Number(selectedHotelConfig.reductionChd) || 0 : 0;

  let totalChambre = 0;
  const pelerinsValides = formData.pelerins.filter(p => p.nom.trim() !== '');

  pelerinsValides.forEach(p => {
    if (p.guide) {
      // Un guide ne paie rien (0 DZD)
    } else if (p.tarifPerso !== '' && p.tarifPerso !== undefined && p.tarifPerso !== null) {
      totalChambre += Number(p.tarifPerso);
    } else {
      totalChambre += p.chd ? Math.max(0, prixParPersonneBase - reductionChd) : prixParPersonneBase;
    }
  });

  const nbRestauration = pelerinsValides.filter(p => p.restauration && !p.guide).length;
  const totalResto = prixRestauration * nbRestauration;
  const totalEnfantsSansLit = formData.enfantsSansLit.reduce((sum, e) => sum + (Number(e.tarif) || 0), 0);
  const totalBrut = totalChambre + totalResto + totalEnfantsSansLit;
  const reductionGlobale = Number(formData.reduction) || 0;
  
  const commissionUnitaire = Number(formData.commissionCustom) || 0;
  const pelerinsPourCommission = pelerinsValides.filter(p => !p.guide).length;
  const totalCommission = (commissionUnitaire * pelerinsPourCommission);
  const totalNet = formData.paiementRabatteur 
    ? Math.max(0, totalBrut - reductionGlobale - totalCommission)
    : Math.max(0, totalBrut - reductionGlobale);

  // --- Stats Totals ---
  const caTotalBrut = groupeEnregistrements.reduce((sum, e) => sum + (e.totalBrut || 0), 0);
  const grandTotalCommission = groupeEnregistrements.reduce((sum, e) => sum + (e.totalCommission || 0), 0);
  const caSansCommission = caTotalBrut - grandTotalCommission;
  const grandTotalReduction = groupeEnregistrements.reduce((sum, e) => sum + (Number(e.reduction) || 0), 0);
  
  const grandTotalDue = groupeEnregistrements.reduce((sum, e) => {
    const net = e.paiementRabatteur 
      ? Math.max(0, (e.totalBrut || 0) - (e.totalCommission || 0) - (Number(e.reduction) || 0))
      : Math.max(0, (e.totalBrut || 0) - (Number(e.reduction) || 0));
    return sum + net;
  }, 0);
  const grandTotalEncaisse = groupePaiements.reduce((sum, p) => sum + (p.montantDZD || 0), 0);
  const grandTotalRestant = Math.max(0, grandTotalDue - grandTotalEncaisse);
  
  // --- PAX Stats ---
  const allPelerins = groupeEnregistrements.flatMap(e => [
    ...(e.pelerins || []),
    ...(e.enfantsSansLit || []).map(enf => ({ ...enf, chd: true })) // Force chd: true pour Enfant Sans Lit
  ]);
  const paxEnregistres = allPelerins.length;
  const paxTotal = Number(groupe.nbr_places) || 0;
  const paxHommes = allPelerins.filter(p => p.sexe === 'H').length;
  const paxFemmes = allPelerins.filter(p => p.sexe === 'F').length;
  const nbrChd = allPelerins.filter(p => p.chd).length;
  const paxRestauration = allPelerins.filter(p => p.restauration).length;
  const grandTotalRestaurationDZD = groupeEnregistrements.reduce((sum, e) => sum + (e.totalResto || 0), 0);

  // --- Calculate Airline Due (Option Hybride) ---
  const tarifBillet = Number(groupe.tarif_billet) || 0;
  const reductionChdVol = Number(groupe.reduction_chd_vol) || 0;
  const gratuites = Number(groupe.gratuites) || 0;
  const nbrPlaces = Number(groupe.nbr_places) || 0;

  const totalBilletInitial = Math.max(0, (nbrPlaces - gratuites) * tarifBillet);
  const totalDueCompagnie = Math.max(0, totalBilletInitial - (nbrChd * reductionChdVol));

  // Ventilation Dépenses pour ce groupe (Mode Égal vs Prorata PAX)
  const groupeDepenses = depenses.filter(d => {
    const ids = d.groupeIds || (d.groupeId ? [d.groupeId] : []);
    return ids.includes(id);
  });

  const calcDepenseForCurrentGroup = (d) => {
    const ids = d.groupeIds || (d.groupeId ? [d.groupeId] : []);
    if (!ids.includes(id)) return 0;
    if (ids.length <= 1 || d.repartition_mode !== 'pax') {
      return (d.montantDZD || 0) / (ids.length || 1);
    }
    const totalPaxAllGroups = ids.reduce((acc, gId) => {
      const gObj = groupes.find(x => x.id === gId);
      return acc + (Number(gObj?.nbr_places) || 1);
    }, 0);
    const currentPax = Number(groupe?.nbr_places) || 1;
    return (d.montantDZD || 0) * (currentPax / (totalPaxAllGroups || 1));
  };

  const grandTotalDepenses = groupeDepenses.reduce((sum, d) => sum + calcDepenseForCurrentGroup(d), 0);

  // Dépenses spécifiques aux billets (Compagnie liée ou filtre souple sur la catégorie)
  const isBilletCategory = (d) => {
    if (!d) return false;
    const cat = String(d.categorie || '').toLowerCase();
    const subComp = d.subEnvCompagnie ? String(d.subEnvCompagnie).toLowerCase() : '';
    const groupComp = groupe?.compagnie ? String(groupe.compagnie).toLowerCase() : '';

    // 1. Si la sous-enveloppe est liée spécifiquement à la compagnie du groupe Omra (ex: SV == SV)
    if (subComp && groupComp && (groupComp.includes(subComp) || subComp.includes(groupComp))) {
      return true;
    }
    // 2. Si la sous-enveloppe est liée à n'importe quelle compagnie aérienne enregistrée
    if (subComp) {
      return true;
    }
    // 3. Filtre de secours sur les mots clés de la catégorie
    return cat.includes('billet') || cat.includes('vol') || cat.includes('flight') || cat.includes('aérien') || cat.includes('aerien') || cat.includes('compagnie');
  };

  const depensesBillets = groupeDepenses
    .filter(d => isBilletCategory(d))
    .reduce((sum, d) => sum + calcDepenseForCurrentGroup(d), 0);
  
  const resteAPayerCompagnie = Math.max(0, totalDueCompagnie - depensesBillets);

  // Bénéfice Net = CA sans Commission - Réductions - Dépenses
  const totalVentes = caTotalBrut - grandTotalReduction;
  const margeNette = caSansCommission - grandTotalReduction - grandTotalDepenses;

  // --- Chambres Virtuelles Aggregation ---
  const chambresPhysiques = {};
  groupeEnregistrements.forEach(enr => {
    (enr.pelerins || []).forEach((p, idx) => {
      const cId = p.chambreId || enr.chambreId || enr.id;
      if (!chambresPhysiques[cId]) {
        chambresPhysiques[cId] = {
          chambreId: cId,
          hotelId: enr.hotelId,
          typeChambre: enr.typeChambre,
          occupants: [],
          enregistrements: []
        };
      }
      if (!chambresPhysiques[cId].enregistrements.find(e => e.id === enr.id)) {
        chambresPhysiques[cId].enregistrements.push(enr);
      }
      chambresPhysiques[cId].occupants.push({ ...p, isEnfantSansLit: false, sourceEnrId: enr.id, pelerinIdx: idx });
    });

    (enr.enfantsSansLit || []).forEach((enf, idx) => {
      const cId = enf.chambreId || enr.chambreId || enr.id;
      if (!chambresPhysiques[cId]) {
        chambresPhysiques[cId] = {
          chambreId: cId,
          hotelId: enr.hotelId,
          typeChambre: enr.typeChambre,
          occupants: [],
          enregistrements: []
        };
      }
      if (!chambresPhysiques[cId].enregistrements.find(e => e.id === enr.id)) {
        chambresPhysiques[cId].enregistrements.push(enr);
      }
      chambresPhysiques[cId].occupants.push({ ...enf, isEnfantSansLit: true, sourceEnrId: enr.id, enfantIdx: idx });
    });
  });
  const listeChambresPhysiques = Object.values(chambresPhysiques);

  // --- Commissions Aggregation ---
  const commissionsByIntermediaire = {};
  groupeEnregistrements.forEach(enr => {
    if (enr.intermediaire) {
      if (!commissionsByIntermediaire[enr.intermediaire]) {
        commissionsByIntermediaire[enr.intermediaire] = {
          nom: enr.intermediaire,
          pelerins: 0,
          totalCommission: 0,
          retenueSource: 0, // paiementRabatteur === true
        };
      }
      const pelerinsCount = enr.pelerins?.length || 0;
      commissionsByIntermediaire[enr.intermediaire].pelerins += pelerinsCount;
      commissionsByIntermediaire[enr.intermediaire].totalCommission += (enr.totalCommission || 0);
      if (enr.paiementRabatteur) {
        commissionsByIntermediaire[enr.intermediaire].retenueSource += (enr.totalCommission || 0);
      }
    }
  });

  const listeCommissions = Object.values(commissionsByIntermediaire).map(c => {
    const payeAgence = groupePaiementsCommissions.filter(p => p.intermediaire === c.nom).reduce((sum, p) => sum + p.montant, 0);
    const resteAPayer = Math.max(0, c.totalCommission - c.retenueSource - payeAgence);
    return { ...c, payeAgence, resteAPayer };
  });

  // --- Drag and Drop Handlers ---
  const handleDragEnd = async (evt) => {
    // Find the chambre containers reliably via closest
    const fromContainer = evt.from.closest('[data-chambre]') || evt.from;
    const toContainer = evt.to.closest('[data-chambre]') || evt.to;
    const fromChambreId = fromContainer.dataset.chambre;
    const toChambreId = toContainer.dataset.chambre;
    
    if (!fromChambreId || !toChambreId || fromChambreId === toChambreId) return;

    const itemEl = evt.item;
    const sourceEnrId = itemEl.dataset.enrid;
    const occupantIdx = parseInt(itemEl.dataset.idx, 10);
    const isEnfant = itemEl.dataset.isenfant === 'true';

    if (!sourceEnrId) return;

    const enr = groupeEnregistrements.find(e => e.id === sourceEnrId);
    if (!enr) return;

    let localPayload = {};  // camelCase for React state
    let dbPayload = {};     // snake_case for Supabase

    if (isEnfant) {
      const updatedEnfants = [...(enr.enfantsSansLit || [])];
      updatedEnfants[occupantIdx] = { ...updatedEnfants[occupantIdx], chambreId: toChambreId };
      localPayload.enfantsSansLit = updatedEnfants;
      dbPayload.enfants_sans_lit = updatedEnfants;
    } else {
      const updatedPelerins = [...(enr.pelerins || [])];
      updatedPelerins[occupantIdx] = { ...updatedPelerins[occupantIdx], chambreId: toChambreId };
      localPayload.pelerins = updatedPelerins;
      dbPayload.pelerins = updatedPelerins;
    }

    // Update local state immediately
    setEnregistrements(prev => prev.map(e => e.id === sourceEnrId ? { ...e, ...localPayload } : e));

    // Persist to Supabase
    const { error } = await supabase.from('omra_enregistrements').update(dbPayload).eq('id', sourceEnrId);
    if (error) {
      alert("Erreur lors du déplacement : " + error.message);
    }
  };

  // --- Registration Handlers ---
  const handleCreateNewRoom = () => {
    setFormData(emptyForm);
    setExistingOccupants([]);
    setShowTarifPerso({});
    setEditingId(null);
    setClientSearch('');
    setIsModalOpen(true);
  };

  const handleCompleteRoom = (chambre) => {
    setFormData({
      ...emptyForm,
      hotelId: chambre.hotelId,
      typeChambre: chambre.typeChambre,
      chambreId: chambre.chambreId,
    });
    // Filter out enfantsSansLit so they don't consume a bed slot
    setExistingOccupants(chambre.occupants.filter(o => !o.isEnfantSansLit));
    setShowTarifPerso({});
    setEditingId(null);
    setClientSearch('');
    setIsModalOpen(true);
  };

  const handleEdit = (enr) => {
    const otherOccupants = groupeEnregistrements
      .filter(e => (e.chambreId === enr.chambreId || e.chambreId === enr.id) && e.id !== enr.id)
      .flatMap(e => e.pelerins);

    setExistingOccupants(otherOccupants);
    setFormData({
      ...enr,
      enfantsSansLit: enr.enfantsSansLit || [],
    });

    const showTarif = {};
    enr.pelerins.forEach((p, idx) => {
      if (p.tarifPerso !== undefined && p.tarifPerso !== null && p.tarifPerso !== '') {
        showTarif[idx] = true;
      }
    });
    setShowTarifPerso(showTarif);
    
    const foundClient = clients.find(c => c.id === enr.clientId);
    setClientSearch(foundClient ? foundClient.nom : '');
    
    setEditingId(enr.id);
    setIsModalOpen(true);
  };

  const handlePelerinChange = (idx, field, value) => {
    setFormData(prev => {
      const next = [...prev.pelerins];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, pelerins: next };
    });
  };

  const handleAddEnfantSansLit = () => {
    setFormData(prev => ({
      ...prev,
      enfantsSansLit: [...prev.enfantsSansLit, { nom: '', tarif: '' }]
    }));
  };

  const handleEnfantSansLitChange = (idx, field, value) => {
    setFormData(prev => {
      const next = [...prev.enfantsSansLit];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, enfantsSansLit: next };
    });
  };

  const handleRemoveEnfantSansLit = (idx) => {
    setFormData(prev => ({
      ...prev,
      enfantsSansLit: prev.enfantsSansLit.filter((_, i) => i !== idx)
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const isNew = !editingId;
    const chambreIdToUse = formData.chambreId || (isNew ? Date.now().toString() : editingId);
    
    const record = {
      ...formData,
      pelerins: formData.pelerins.filter(p => p.nom.trim() !== ''),
      chambreId: chambreIdToUse,
      groupeId: id,
      totalChambre,
      totalResto,
      totalEnfantsSansLit,
      totalBrut,
      totalCommission: totalCommission,
      totalNet,
      dateCreation: formData.dateCreation || new Date().toISOString()
    };

    const payload = mapCamelToEnregistrement(record, intermediaires);

    if (editingId) {
      const { data, error } = await supabase.from('omra_enregistrements').update(payload).eq('id', editingId).select();
      if (!error && data) {
        setEnregistrements(enregistrements.map(e => e.id === editingId ? mapEnregistrementToCamel(data[0], intermediaires) : e));
      } else {
        alert('Erreur: ' + error?.message);
      }
    } else {
      const { data, error } = await supabase.from('omra_enregistrements').insert([payload]).select();
      if (!error && data) {
        setEnregistrements([mapEnregistrementToCamel(data[0], intermediaires), ...enregistrements]);
      } else {
        alert('Erreur: ' + error?.message);
      }
    }
    
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleDelete = async (recordId) => {
    const { error } = await supabase.from('omra_enregistrements').delete().eq('id', recordId);
    if (!error) {
      setEnregistrements(enregistrements.filter(e => e.id !== recordId));
    } else {
      alert('Erreur: ' + error.message);
    }
  };

  // --- Payment Handlers ---
  const handleOpenPayment = (enr) => {
    const firstPelerin = enr.pelerins?.[0]?.nom || '';
    setPaymentFormData({
      ...emptyPaymentForm,
      nomClient: firstPelerin
    });
    setCurrentEnregistrementId(enr.id);
    setIsPaymentModalOpen(true);
  };

  const handleOpenPaymentGlobal = () => {
    setPaymentFormData(emptyPaymentForm);
    setCurrentEnregistrementId('');
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!currentEnregistrementId) {
      alert("Veuillez sélectionner un enregistrement.");
      return;
    }

    if (paymentFormData.devise !== 'DZD' && (!paymentFormData.tauxChange || Number(paymentFormData.tauxChange) <= 0)) {
      alert("Veuillez saisir un taux de change valide supérieur à 0 pour la devise " + paymentFormData.devise + ".");
      return;
    }

    let montantDZD = Number(paymentFormData.montantOriginal);
    if (paymentFormData.devise !== 'DZD') {
      montantDZD = Number(paymentFormData.montantOriginal) * Number(paymentFormData.tauxChange);
    }
    const record = {
      ...paymentFormData,
      groupeId: id,
      enregistrementId: currentEnregistrementId,
      montantOriginal: Number(paymentFormData.montantOriginal),
      tauxChange: paymentFormData.devise === 'DZD' ? null : Number(paymentFormData.tauxChange),
      montantDZD
    };
    
    const payload = mapCamelToPaiement(record);

    const { data, error } = await supabase.from('omra_paiements').insert([payload]).select();
    if (!error && data) {
      const savedPaiement = mapPaiementToCamel(data[0]);
      setPaiements([savedPaiement, ...paiements]);

      // Check if it's the first payment and update the enregistrement's paiementRabatteur
      const enr = groupeEnregistrements.find(x => x.id === currentEnregistrementId);
      const hasPreviousPayments = groupePaiements.some(p => p.enregistrementId === currentEnregistrementId);
      if (enr && !hasPreviousPayments && enr.intermediaire) {
        const newTotalNet = paymentFormData.paiementRabatteur
          ? Math.max(0, (enr.totalBrut || 0) - (enr.totalCommission || 0) - (Number(enr.reduction) || 0))
          : Math.max(0, (enr.totalBrut || 0) - (Number(enr.reduction) || 0));

        const updatedEnr = { ...enr, paiementRabatteur: paymentFormData.paiementRabatteur, totalNet: newTotalNet };
        const { error: enrError } = await supabase.from('omra_enregistrements').update({ 
          paiement_rabatteur: paymentFormData.paiementRabatteur,
          total_net: newTotalNet
        }).eq('id', enr.id);
        if (!enrError) {
           setEnregistrements(enregistrements.map(x => x.id === enr.id ? updatedEnr : x));
        }
      }

      setIsPaymentModalOpen(false);
    } else {
      alert('Erreur: ' + error?.message);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    const { error } = await supabase.from('omra_paiements').delete().eq('id', paymentId);
    if (!error) {
      setPaiements(paiements.filter(p => p.id !== paymentId));
    } else {
      alert('Erreur: ' + error.message);
    }
  };

  // --- Commission Payment Handlers ---
  const handleOpenCommissionPayment = (intermediaireName, resteAPayer) => {
    setCommissionFormData({
      intermediaire: intermediaireName,
      montant: resteAPayer.toString(),
      date: new Date().toISOString().split('T')[0],
      note: ''
    });
    setIsCommissionModalOpen(true);
  };

  const handleSaveCommissionPayment = async (e) => {
    e.preventDefault();
    const record = {
      ...commissionFormData,
      groupeId: id,
      montant: Number(commissionFormData.montant)
    };
    
    const payload = mapCamelToCommission(record, intermediaires);
    if (!payload.intermediaire_id) {
       alert("L'intermédiaire sélectionné n'existe pas en base de données.");
       return;
    }

    const { data, error } = await supabase.from('omra_paiements_commissions').insert([payload]).select();
    if (!error && data) {
      setPaiementsCommissions([mapCommissionToCamel(data[0], intermediaires), ...paiementsCommissions]);
      setIsCommissionModalOpen(false);
    } else {
      alert('Erreur: ' + error?.message);
    }
  };

  const handleDeleteCommissionPayment = async (paymentId) => {
    const { error } = await supabase.from('omra_paiements_commissions').delete().eq('id', paymentId);
    if (!error) {
      setPaiementsCommissions(paiementsCommissions.filter(p => p.id !== paymentId));
    } else {
      alert('Erreur: ' + error.message);
    }
  };

  // --- Helpers ---
  const fmtDZD = (n) => Number(n).toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const getEnregistrementPaid = (enrId) => {
    return paiements.filter(p => p.enregistrementId === enrId).reduce((sum, p) => sum + p.montantDZD, 0);
  };
  const getEnregistrementName = (enrId) => {
    const enr = enregistrements.find(e => e.id === enrId);
    return enr ? (enr.pelerins?.[0]?.nom || 'Chambre sans nom') : '—';
  };
  const getHotelName = (hId) => {
    const h = hotels.find(x => x.id === hId);
    return h ? h.nom : hId;
  };

  const handleUpdateRoomName = async (oldRoomId, occupantsInRoom) => {
    if (!newRoomName.trim()) {
      setEditingRoomId(null);
      return;
    }

    const trimmedName = newRoomName.trim();
    // Get unique enregistrement IDs from the occupants
    const enrIds = [...new Set(occupantsInRoom.map(occ => occ.sourceEnrId).filter(Boolean))];

    const newEnrState = [...enregistrements];

    for (const enrId of enrIds) {
      const enrIdx = newEnrState.findIndex(e => e.id === enrId);
      if (enrIdx === -1) continue;
      const originalEnr = newEnrState[enrIdx];

      let hasChange = false;
      const updatedPelerins = (originalEnr.pelerins || []).map(p => {
        const currentChambreId = p.chambreId || originalEnr.chambreId || originalEnr.id;
        if (currentChambreId === oldRoomId) {
          hasChange = true;
          return { ...p, chambreId: trimmedName };
        }
        return p;
      });

      const updatedEnfants = (originalEnr.enfantsSansLit || []).map(enf => {
        const currentChambreId = enf.chambreId || originalEnr.chambreId || originalEnr.id;
        if (currentChambreId === oldRoomId) {
          hasChange = true;
          return { ...enf, chambreId: trimmedName };
        }
        return enf;
      });

      if (hasChange) {
        newEnrState[enrIdx] = { ...originalEnr, pelerins: updatedPelerins, enfantsSansLit: updatedEnfants, chambreId: trimmedName };

        const { error } = await supabase.from('omra_enregistrements').update({
          pelerins: updatedPelerins,
          enfants_sans_lit: updatedEnfants,
          chambre_id: trimmedName
        }).eq('id', enrId);

        if (error) {
          alert('Erreur lors de la sauvegarde du numéro de chambre: ' + error.message);
        }
      }
    }

    // Migrate capacity override to new name
    if (roomCapacityOverrides[oldRoomId] !== undefined) {
      setRoomCapacityOverrides(prev => {
        const next = { ...prev };
        next[trimmedName] = next[oldRoomId];
        delete next[oldRoomId];
        return next;
      });
    }

    setEnregistrements(newEnrState);
    setEditingRoomId(null);
  };

  const typesChambresDisponibles = Object.keys(CHAMBRE_CAPACITY).filter(k => {
    if (!selectedHotelConfig) return false;
    const prix = Number(selectedHotelConfig[CHAMBRE_KEYS[k]]);
    return prix > 0;
  });

  const isForeignCurrencyPayment = paymentFormData.devise !== 'DZD';
  const computedDZD_Payment = isForeignCurrencyPayment 
    ? (Number(paymentFormData.montantOriginal) || 0) * (Number(paymentFormData.tauxChange) || 0)
    : (Number(paymentFormData.montantOriginal) || 0);

  // Tabs structure
  const tabs = [
    { id: 'enregistrements', label: 'Enregistrements', icon: FileText },
    { id: 'vueliste', label: 'Vue Liste', icon: Table },
    { id: 'chambres', label: 'Chambres (Occupation)', icon: BedDouble },
    { id: 'paiements', label: 'Historique Paiements', icon: CreditCard },
    { id: 'commissions', label: 'Commissions', icon: User },
    { id: 'finance', label: 'Bilan Financier', icon: Wallet },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* ── Header ─────────────────────────────────── */}
        <div className="rounded-xl bg-sidebar p-6 md:p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div>
              <button 
                onClick={() => navigate('/omra')} 
                className="flex items-center gap-1.5 text-white/60 text-xs font-medium hover:text-white/90 transition-colors mb-3"
              >
                <ArrowLeft size={14} /> Retour aux groupes
              </button>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2">{groupe.nom}</h1>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-white/70">
                <span className="flex items-center gap-1.5"><Plane size={14} /> {groupe.compagnie}</span>
                <span className="flex items-center gap-1.5"><Calendar size={14} /> {groupe.date_depart || '-'} → {groupe.date_retour || '-'}</span>
                <span className="flex items-center gap-1.5"><Users size={14} /> {groupe.nbr_places || 0} places</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              {activeTab === 'enregistrements' && (
                <Button onClick={handleCreateNewRoom} className="bg-white/15 hover:bg-white/25 text-white border border-white/20">
                  <Plus size={16} className="mr-2" /> Ajouter un enregistrement
                </Button>
              )}
              {activeTab === 'paiements' && (
                <Button onClick={handleOpenPaymentGlobal} className="bg-white/15 hover:bg-white/25 text-white border border-white/20">
                  <Plus size={16} className="mr-2" /> Ajouter un paiement
                </Button>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-x-6 gap-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Pax Enregistrés</p>
              <p className="text-2xl font-extrabold">{paxEnregistres} <span className="text-sm font-normal text-white/40">/ {paxTotal}</span></p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Hommes</p>
              <p className="text-2xl font-extrabold text-blue-200">{paxHommes}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Femmes</p>
              <p className="text-2xl font-extrabold text-pink-200">{paxFemmes}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Enfants (CHD)</p>
              <p className="text-2xl font-extrabold text-amber-200">{nbrChd}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Restauration</p>
              <p className="text-2xl font-extrabold text-orange-200">{paxRestauration} <span className="text-xs font-normal text-white/50 block md:inline mt-1 md:mt-0 md:ml-1">({fmtDZD(grandTotalRestaurationDZD)} DZD)</span></p>
            </div>

            <div className="w-full h-px bg-white/10 my-1 xl:hidden" />
            
            <div className="flex-1 flex justify-end gap-x-6">
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Total Dû</p>
                <p className="text-lg md:text-xl font-extrabold text-white">{fmtDZD(grandTotalDue)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Encaissé</p>
                <p className="text-lg md:text-xl font-extrabold text-emerald-400">{fmtDZD(grandTotalEncaisse)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Reste</p>
                <p className="text-lg md:text-xl font-extrabold text-red-400">{fmtDZD(grandTotalRestant)}</p>
              </div>
            </div>
            
            <div className="w-px h-8 bg-white/10 hidden xl:block" />
            
            {/* Nouveau Bloc : Total Compagnie */}
            <div className="hidden xl:block">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Total Dû Comp. Aérienne</p>
              <p className="text-xl font-bold text-sky-400">{fmtDZD(totalDueCompagnie)} <span className="text-sm font-normal text-sky-400/50">DZD</span></p>
            </div>
            <div className="w-px h-8 bg-white/10 hidden xl:block" />
            
            {/* Nouveau Bloc : Dépenses et Marge */}
            <div className="hidden xl:block">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Total Dépenses (Prorata)</p>
              <p className="text-xl font-bold text-orange-400">{fmtDZD(grandTotalDepenses)} <span className="text-sm font-normal text-orange-400/50">DZD</span></p>
            </div>
            <div className="w-px h-8 bg-white/10 hidden xl:block" />
            <div className="hidden xl:block">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Marge Nette</p>
              <p className={cn("text-xl font-bold", margeNette >= 0 ? "text-emerald-400" : "text-destructive")}>
                {fmtDZD(margeNette)} <span className={cn("text-sm font-normal", margeNette >= 0 ? "text-emerald-400/50" : "text-destructive/50")}>DZD</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Tabs Navigation ── */}
        <div className="flex gap-1 border-b overflow-x-auto pb-px">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap",
                  isActive 
                    ? "text-primary border-primary bg-primary/5" 
                    : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/30"
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab Content: Enregistrements ── */}
        {activeTab === 'enregistrements' && (
          <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-black/5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground text-[11px] uppercase tracking-wider font-bold">
                    <th className="px-5 py-3.5 text-left">Hôtel & Chambre</th>
                    <th className="px-5 py-3.5 text-left min-w-[250px]">Pèlerins liés à cet enr.</th>
                    <th className="px-5 py-3.5 text-left">Intermédiaire</th>
                    <th className="px-5 py-3.5 text-left">Contact</th>
                    <th className="px-5 py-3.5 text-right">Paiement / Total</th>
                    <th className="px-3 py-3.5 w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {groupeEnregistrements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <div className="text-5xl mb-3 opacity-10">🕌</div>
                        <p className="text-muted-foreground font-medium">Aucun enregistrement pour ce groupe</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Cliquez sur "Ajouter un enregistrement" pour commencer</p>
                      </td>
                    </tr>
                  ) : (
                    groupeEnregistrements.map((enr) => {
                      const paye = getEnregistrementPaid(enr.id);
                      const reste = enr.totalNet - paye;
                      const isFullyPaid = reste <= 0;

                      return (
                        <tr key={enr.id} className="hover:bg-muted/20 transition-colors group">
                          <td className="px-5 py-4 align-top">
                            <p className="font-semibold text-foreground">{enr.hotelId}</p>
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/8 px-2 py-0.5 rounded-full">
                              <Building2 size={10} /> {enr.typeChambre}
                            </span>
                          </td>
                          <td className="px-5 py-4 align-top">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex flex-wrap gap-1.5">
                                {enr.pelerins?.map((p, idx) => (
                                  <span key={idx} className="inline-flex items-center gap-1.5 bg-muted/60 text-foreground px-2.5 py-1 rounded-md text-xs font-medium border">
                                    <span className={cn("w-1.5 h-1.5 rounded-full", p.sexe === 'F' ? "bg-pink-400" : "bg-blue-400")} title={p.sexe === 'F' ? 'Femme' : 'Homme'}></span>
                                    {p.nom || 'Sans nom'}
                                    {p.chd && <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded">CHD</span>}
                                    {p.restauration && <Utensils size={10} className="text-orange-500 ml-0.5" />}
                                  </span>
                                ))}
                              </div>
                              {enr.enfantsSansLit?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {enr.enfantsSansLit.map((e, idx) => (
                                    <span key={`bb-${idx}`} className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border-amber-200 border px-2.5 py-1 rounded-md text-xs font-medium">
                                      <Baby size={12} /> {e.nom || 'Bébé'}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 align-top text-muted-foreground">
                            {enr.intermediaire ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">{enr.intermediaire}</span>
                                {enr.paiementRabatteur && enr.totalCommission > 0 && (
                                  <span className="text-[10px] text-orange-600 mt-0.5">- {enr.totalCommission.toLocaleString()} DZD (Comm.)</span>
                                )}
                              </div>
                            ) : '—'}
                          </td>
                          <td className="px-5 py-4 align-top">
                            {enr.telephone ? (
                              <span className="flex items-center gap-1.5 text-muted-foreground"><Phone size={12} /> {enr.telephone}</span>
                            ) : '—'}
                          </td>
                          <td className="px-5 py-4 align-top text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-bold text-foreground text-base">{fmtDZD(enr.totalNet)}</span>
                              {paye > 0 && (
                                <span className="text-xs font-medium text-emerald-600">Payé : {fmtDZD(paye)}</span>
                              )}
                              {reste > 0 && paye > 0 && (
                                <span className="text-xs font-medium text-orange-600">Reste : {fmtDZD(reste)}</span>
                              )}
                              {isFullyPaid && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase mt-1">Réglé</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <div className="flex flex-col gap-2">
                              <Button variant="outline" size="sm" className="w-full text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 hover:text-emerald-800" onClick={() => handleOpenPayment(enr)}>
                                <CreditCard size={14} className="mr-1.5" /> Payer
                              </Button>
                              <div className="flex gap-2">
                                <Button variant="outline" size="icon-sm" className="flex-1 h-8 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" onClick={() => handleEdit(enr)}>
                                  <Pencil size={14} />
                                </Button>
                                <Button variant="outline" size="icon-sm" className="flex-1 h-8 text-destructive border-red-100 hover:bg-destructive/10" onClick={() => handleDelete(enr.id)}>
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ── Tab Content: Vue Liste ── */}
        {activeTab === 'vueliste' && (
          <div className="space-y-4">
            {groupe.hotels && groupe.hotels.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {groupe.hotels.map((h, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveListHotelId(h.hotelId)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap",
                      (activeListHotelId === h.hotelId || (!activeListHotelId && idx === 0))
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                    )}
                  >
                    <Building2 size={14} className="inline-block mr-1.5" />
                    {getHotelName(h.hotelId)}
                  </button>
                ))}
              </div>
            )}
            
            <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-black/5 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-gray-100 text-gray-700 text-xs uppercase font-bold border-b-2 border-gray-300">
                    <tr>
                      <th className="px-4 py-3 border border-gray-200">Chambre</th>
                      <th className="px-4 py-3 border border-gray-200">Nom</th>
                      <th className="px-4 py-3 border border-gray-200 text-center">Genre</th>
                      <th className="px-4 py-3 border border-gray-200 text-right">Tarif Lit</th>
                      <th className="px-4 py-3 border border-gray-200 text-right">Réduction</th>
                      <th className="px-4 py-3 border border-gray-200 text-right">Commission</th>
                      <th className="px-4 py-3 border border-gray-200 text-right text-blue-700">Total Dû</th>
                      <th className="px-4 py-3 border border-gray-200 text-right text-emerald-700">Total Payé</th>
                      <th className="px-4 py-3 border border-gray-200 text-right text-red-600">Reste</th>
                      <th className="px-4 py-3 border border-gray-200 text-center">Etat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(() => {
                      const currentHotelId = activeListHotelId || groupe.hotels?.[0]?.hotelId;
                      const hotelEnregistrements = groupeEnregistrements.filter(e => e.hotelId === currentHotelId);
                      
                      if (hotelEnregistrements.length === 0) {
                        return (
                          <tr>
                            <td colSpan={10} className="px-4 py-8 text-center text-gray-500">Aucun enregistrement pour cet hôtel.</td>
                          </tr>
                        );
                      }

                      return hotelEnregistrements.map((enr, iEnr) => {
                      let remainingPaymentToDistribute = getEnregistrementPaid(enr.id);
                      const enrHotelConfig = groupe?.hotels?.find(h => h.hotelId === enr.hotelId);
                      
                      const tousPelerins = [
                        ...(enr.pelerins || []),
                        ...(enr.enfantsSansLit || []).map(enf => ({ ...enf, tarifPerso: enf.tarif, chd: true, isEnfantSansLit: true }))
                      ];
                      
                      const passagersPayants = tousPelerins.filter(p => !p.guide);
                      const reductionPartagee = Number(enr.reduction || 0) / (passagersPayants.length || 1);
                      
                      return tousPelerins.map((pelerin, index) => {
                        const tarifLit = pelerin.guide 
                          ? 0 
                          : (pelerin.isEnfantSansLit 
                              ? Number(pelerin.tarifPerso) 
                              : (pelerin.tarifPerso ? Number(pelerin.tarifPerso) : (Number(enrHotelConfig?.[CHAMBRE_KEYS[enr.typeChambre]]) || 0)));
                        
                        let reduction = (pelerin.guide || !pelerin.chd || pelerin.isEnfantSansLit) ? 0 : (Number(enrHotelConfig?.reductionChd) || 0);
                        if (!pelerin.guide) reduction += reductionPartagee;
                        
                        let extraCosts = 0;
                        if (pelerin.restauration && !pelerin.guide && !pelerin.isEnfantSansLit) extraCosts += Number(enrHotelConfig?.restauration || 0);
                        
                        const commission = (pelerin.guide || pelerin.isEnfantSansLit) ? 0 : Number(enr.commissionCustom || 0);
                        
                        let totalDu = tarifLit - reduction + extraCosts;
                        if (enr.paiementRabatteur) {
                          totalDu -= commission;
                        }
                        totalDu = Math.max(0, totalDu);
                        
                        const totalPaye = Math.min(totalDu, remainingPaymentToDistribute);
                        remainingPaymentToDistribute -= totalPaye;
                        
                        const reste = totalDu - totalPaye;
                        
                        let etat = 'pending';
                        let etatColor = 'bg-red-500 text-white';
                        if (reste === 0 && totalDu > 0) {
                          etat = 'payé';
                          etatColor = 'bg-green-500 text-white';
                        } else if (totalDu === 0 && reste === 0) {
                          etat = 'payé';
                          etatColor = 'bg-green-500 text-white';
                        } else if (totalPaye > 0) {
                          etat = 'versement';
                          etatColor = 'bg-amber-500 text-white';
                        }

                        return (
                          <tr key={`${enr.id}-${index}`} className="hover:bg-gray-50 transition-colors">
                            {index === 0 && (
                              <td rowSpan={tousPelerins.length} className="px-4 py-3 border border-gray-200 font-bold align-middle text-center bg-gray-50">
                                <div>{enr.chambreId ? `Chambre N°${enr.chambreId}` : 'Non attribuée'}</div>
                                <div className="text-xs font-medium text-gray-500 mt-0.5">{enr.typeChambre}</div>
                              </td>
                            )}
                            <td className="px-4 py-2 border border-gray-200 font-medium">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span>{pelerin.nom}</span>
                                {pelerin.isEnfantSansLit && (
                                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 text-[9px] font-bold rounded uppercase">Sans Lit</span>
                                )}
                                {pelerin.chd && !pelerin.isEnfantSansLit && (
                                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded uppercase">CHD</span>
                                )}
                                {pelerin.restauration && (
                                  <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 text-[9px] font-bold rounded uppercase">Resto</span>
                                )}
                                {pelerin.guide && (
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[9px] font-bold rounded uppercase">Guide</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 border border-gray-200 text-center">{pelerin.sexe || 'H'}</td>
                            <td className="px-4 py-2 border border-gray-200 text-right">{fmtDZD(tarifLit)}</td>
                            <td className="px-4 py-2 border border-gray-200 text-right">{fmtDZD(reduction)}</td>
                            <td className="px-4 py-2 border border-gray-200 text-right">{fmtDZD(commission)}</td>
                            <td className="px-4 py-2 border border-gray-200 text-right font-bold text-blue-700 bg-blue-50/30">{fmtDZD(totalDu)}</td>
                            <td className="px-4 py-2 border border-gray-200 text-right font-bold text-emerald-700 bg-emerald-50/30">{fmtDZD(totalPaye)}</td>
                            <td className="px-4 py-2 border border-gray-200 text-right font-bold text-red-600 bg-red-50/30">{fmtDZD(reste)}</td>
                            <td className={cn("px-4 py-2 border border-gray-200 text-center font-bold text-xs uppercase tracking-wider", etatColor)}>
                              {etat}
                            </td>
                          </tr>
                        );
                      });
                    });
                  })()}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ── Tab Content: Chambres ── */}
        {activeTab === 'chambres' && (
          <div className="space-y-6">
            {groupe.hotels && groupe.hotels.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {groupe.hotels.map((h, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveListHotelId(h.hotelId)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap",
                      (activeListHotelId === h.hotelId || (!activeListHotelId && idx === 0))
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                    )}
                  >
                    <Building2 size={14} className="inline-block mr-1.5" />
                    {getHotelName(h.hotelId)}
                  </button>
                ))}
              </div>
            )}
            
            {(() => {
              const currentHotelId = activeListHotelId || groupe.hotels?.[0]?.hotelId;
              const chambresHotel = listeChambresPhysiques.filter(c => c.hotelId === currentHotelId);
              
              if (chambresHotel.length === 0) {
                return (
                  <Card>
                    <CardContent className="p-12 text-center text-muted-foreground">
                      <BedDouble size={32} className="mx-auto mb-3 opacity-20" />
                      <p>Aucune chambre n'est actuellement occupée dans cet hôtel.</p>
                    </CardContent>
                  </Card>
                );
              }

              const totalChambres = chambresHotel.length;
              const totalPages = Math.ceil(totalChambres / CHAMBRES_PER_PAGE);
              const currentChambres = chambresHotel.slice((currentChambrePage - 1) * CHAMBRES_PER_PAGE, currentChambrePage * CHAMBRES_PER_PAGE);

              return (
                <div>
                  {/* Summary bar */}
                  <div className="flex items-center gap-4 mb-5 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <BedDouble size={16} className="text-primary" />
                      <span className="font-semibold">{totalChambres}</span> chambres
                    </div>
                    <div className="w-px h-4 bg-border" />
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users size={16} className="text-primary" />
                      <span className="font-semibold">{chambresHotel.reduce((s, c) => s + c.occupants.length, 0)}</span> pèlerins
                    </div>
                    {totalPages > 1 && (
                      <>
                        <div className="w-px h-4 bg-border" />
                        <span className="text-muted-foreground text-xs">Page {currentChambrePage} / {totalPages}</span>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                    {currentChambres.map((chambre) => {
                      const defaultCapacity = CHAMBRE_CAPACITY[chambre.typeChambre] || 1;
                      const capacity = roomCapacityOverrides[chambre.chambreId] ?? defaultCapacity;
                      const occupants = chambre.occupants;
                      const occupantsForCapacity = occupants.filter(o => !o.isEnfantSansLit);
                      const isFull = occupantsForCapacity.length >= capacity;
                      const isOverbooked = occupantsForCapacity.length > capacity;
                      const isNonAttribuee = chambre.chambreId === chambre.enregistrements[0]?.id;
                      
                      const sortableList = occupants.map((occ) => ({
                        id: `${occ.sourceEnrId}-${occ.isEnfantSansLit ? 'enf' : 'pel'}-${occ.isEnfantSansLit ? occ.enfantIdx : occ.pelerinIdx}`,
                        ...occ
                      }));

                      return (
                        <Card key={chambre.chambreId} className={cn(
                          "flex flex-col overflow-hidden border shadow-md hover:shadow-lg transition-shadow ring-2",
                          isOverbooked 
                            ? "ring-red-400/50 border-red-300" 
                            : isFull
                              ? "ring-emerald-400/50 border-emerald-300"
                              : "ring-orange-400/50 border-orange-300"
                        )}>
                          {/* Header */}
                          <div className={cn(
                            "flex items-center justify-between px-3 py-2.5 border-b",
                            isOverbooked ? "bg-red-50" : isFull ? "bg-emerald-50/60" : "bg-muted/30"
                          )}>
                             <div className="flex items-center gap-2 min-w-0">
                                <div className={cn(
                                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                                  isOverbooked ? "bg-red-100 text-red-600" : isFull ? "bg-emerald-100 text-emerald-600" : "bg-primary/10 text-primary"
                                )}>
                                  <BedDouble size={14} />
                                </div>
                                <div className="min-w-0">
                                  {editingRoomId === chambre.chambreId ? (
                                    <div className="flex items-center gap-1">
                                      <Input 
                                        autoFocus 
                                        size="sm" 
                                        className="h-6 text-xs w-16 rounded-md" 
                                        value={newRoomName} 
                                        onChange={e => setNewRoomName(e.target.value)} 
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') handleUpdateRoomName(chambre.chambreId, chambre.occupants);
                                          if (e.key === 'Escape') setEditingRoomId(null);
                                        }} 
                                      />
                                      <button className="text-emerald-600 hover:text-emerald-800" onClick={() => handleUpdateRoomName(chambre.chambreId, chambre.occupants)}>
                                        <CheckCircle size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <h3 className="font-bold text-xs truncate text-foreground">
                                        {isNonAttribuee ? 'N/A' : `N°${chambre.chambreId}`}
                                      </h3>
                                      <button 
                                        onClick={() => {
                                          setEditingRoomId(chambre.chambreId);
                                          setNewRoomName(isNonAttribuee ? '' : chambre.chambreId);
                                        }}
                                        className="text-muted-foreground/40 hover:text-primary transition-colors"
                                      >
                                        <Pencil size={10} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                             </div>
                             <div className="flex items-center gap-1.5 shrink-0">
                               <span className={cn(
                                 "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md",
                                 isOverbooked
                                   ? "bg-red-100 text-red-700"
                                   : isFull 
                                     ? "bg-emerald-100 text-emerald-700" 
                                     : "bg-primary/10 text-primary"
                               )}>
                                 {chambre.typeChambre}
                               </span>
                               {editingCapacityRoomId === chambre.chambreId ? (
                                 <div className="flex items-center gap-0.5">
                                   <Input 
                                     autoFocus 
                                     type="number" min="1" max="10"
                                     className="h-5 w-8 text-[10px] text-center p-0 rounded" 
                                     value={newCapacityValue} 
                                     onChange={e => setNewCapacityValue(e.target.value)}
                                     onKeyDown={e => {
                                       if (e.key === 'Enter') {
                                         const val = parseInt(newCapacityValue, 10);
                                         if (val > 0) setRoomCapacityOverrides(prev => ({ ...prev, [chambre.chambreId]: val }));
                                         setEditingCapacityRoomId(null);
                                       }
                                       if (e.key === 'Escape') setEditingCapacityRoomId(null);
                                     }}
                                   />
                                 </div>
                               ) : (
                                 <button 
                                   onClick={() => {
                                     setEditingCapacityRoomId(chambre.chambreId);
                                     setNewCapacityValue(String(capacity));
                                   }}
                                   title="Modifier la capacité"
                                   className={cn(
                                     "text-[10px] font-extrabold cursor-pointer hover:underline",
                                     isOverbooked ? "text-red-600" : isFull ? "text-emerald-600" : "text-orange-500"
                                   )}
                                 >
                                   {occupantsForCapacity.length}/{capacity}
                                 </button>
                               )}
                             </div>
                          </div>

                          {/* Occupants list with Drag & Drop */}
                          <div data-chambre={chambre.chambreId} className="flex-1 flex flex-col">
                          <ReactSortable
                            list={sortableList}
                            setList={() => {}}
                            group="chambres"
                            onEnd={handleDragEnd}
                            animation={200}
                            ghostClass="opacity-30"
                            className="flex-1 p-1.5 min-h-[100px] flex flex-col gap-1"
                          >
                            {sortableList.map(occ => (
                              <div 
                                 key={occ.id}
                                 data-enrid={occ.sourceEnrId}
                                 data-idx={occ.isEnfantSansLit ? occ.enfantIdx : occ.pelerinIdx}
                                 data-isenfant={occ.isEnfantSansLit}
                                 className={cn(
                                   "flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all",
                                   "hover:shadow-sm hover:border-primary/30 hover:bg-primary/5",
                                   "bg-background border-border/60"
                                 )}
                                 title={`Glisser ${occ.nom} vers une autre chambre`}
                              >
                                {/* Gender icon */}
                                <div className={cn(
                                  "w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold",
                                  occ.isEnfantSansLit
                                    ? "bg-amber-100 text-amber-600"
                                    : occ.sexe === 'F' 
                                      ? "bg-pink-100 text-pink-600" 
                                      : "bg-blue-100 text-blue-600"
                                )}>
                                  {occ.isEnfantSansLit ? <Baby size={10} /> : <User size={10} />}
                                </div>
                                {/* Name */}
                                <span className="text-xs font-semibold text-foreground truncate flex-1">{occ.nom}</span>
                                {/* Tags */}
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {occ.chd && !occ.isEnfantSansLit && (
                                    <span className="w-4 h-4 rounded bg-amber-100 text-amber-700 flex items-center justify-center" title="Enfant (CHD)">
                                      <Baby size={9} />
                                    </span>
                                  )}
                                  {occ.restauration && (
                                    <span className="w-4 h-4 rounded bg-orange-100 text-orange-600 flex items-center justify-center" title="Restauration">
                                      <Utensils size={9} />
                                    </span>
                                  )}
                                  {occ.guide && (
                                    <span className="w-4 h-4 rounded bg-blue-100 text-blue-700 flex items-center justify-center" title="Guide">
                                      <Tag size={9} />
                                    </span>
                                  )}
                                  {occ.isEnfantSansLit && (
                                    <span className="text-[8px] font-bold text-amber-600 uppercase">BB</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </ReactSortable>
                          
                          {/* Empty slots placeholders */}
                          {occupantsForCapacity.length < capacity && (
                            <div className="px-1.5 pb-1.5 flex flex-col gap-1">
                              {Array.from({ length: capacity - occupantsForCapacity.length }).map((_, i) => (
                                <button
                                  key={`empty-${i}`}
                                  onClick={() => handleCompleteRoom(chambre)}
                                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 w-full rounded-lg border border-dashed border-muted-foreground/40 bg-muted/10 text-muted-foreground hover:bg-primary/5 hover:border-primary/40 hover:text-primary transition-colors text-[11px] font-medium"
                                >
                                  <Plus size={12} /> Compléter
                                </button>
                              ))}
                            </div>
                          )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-3 text-xs"
                        onClick={() => setCurrentChambrePage(p => Math.max(1, p - 1))}
                        disabled={currentChambrePage === 1}
                      >
                        <ChevronLeft size={14} className="mr-1" /> Précédent
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }).map((_, i) => (
                           <button 
                             key={i} 
                             className={cn(
                               "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                               currentChambrePage === i + 1 
                                 ? "bg-primary text-primary-foreground shadow-md" 
                                 : "text-muted-foreground hover:bg-muted"
                             )}
                             onClick={() => setCurrentChambrePage(i + 1)}
                           >
                             {i + 1}
                           </button>
                        ))}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-3 text-xs"
                        onClick={() => setCurrentChambrePage(p => Math.min(totalPages, p + 1))}
                        disabled={currentChambrePage === totalPages}
                      >
                        Suivant <ChevronRight size={14} className="ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Tab Content: Paiements ── */}
        {activeTab === 'paiements' && (
          <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-black/5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-[11px] uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Client / Pèlerin principal</th>
                    <th className="px-5 py-3.5">N° Bon</th>
                    <th className="px-5 py-3.5 text-right">Montant (Origine)</th>
                    <th className="px-5 py-3.5 text-right">Taux</th>
                    <th className="px-5 py-3.5 text-right text-emerald-600">Montant DZD</th>
                    <th className="px-3 py-3.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {groupePaiements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <div className="text-5xl mb-3 opacity-10">💳</div>
                        <p className="text-muted-foreground font-medium">Aucun paiement enregistré pour ce groupe.</p>
                      </td>
                    </tr>
                  ) : (
                    groupePaiements.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/20 transition-colors group/row">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar size={14} />
                            {new Date(p.datePaiement).toLocaleDateString('fr-FR')}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold">{p.nomClient}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Lié à : {getEnregistrementName(p.enregistrementId)}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">
                          {p.numBon || '—'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-semibold">{p.montantOriginal.toLocaleString('fr-DZ')}</span>
                          <span className="text-xs text-muted-foreground ml-1">{p.devise}</span>
                        </td>
                        <td className="px-5 py-4 text-right text-muted-foreground">
                          {p.tauxChange ? p.tauxChange.toLocaleString('fr-DZ') : '—'}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-emerald-600 text-base">
                          {p.montantDZD.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-4">
                          <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover/row:opacity-100 transition-opacity text-destructive hover:bg-destructive/10" onClick={() => handleDeletePayment(p.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ── Tab Content: Commissions ── */}
        {activeTab === 'commissions' && (
          <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-black/5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-[11px] uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-5 py-3.5">Intermédiaire</th>
                    <th className="px-5 py-3.5 text-center">Pèlerins</th>
                    <th className="px-5 py-3.5 text-right">Total Commission</th>
                    <th className="px-5 py-3.5 text-right">Retenue à la source</th>
                    <th className="px-5 py-3.5 text-right text-emerald-600">Payé (Agence)</th>
                    <th className="px-5 py-3.5 text-right text-destructive">Reste à Payer</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {listeCommissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <div className="text-5xl mb-3 opacity-10">🤝</div>
                        <p className="text-muted-foreground font-medium">Aucun intermédiaire n'est enregistré pour ce groupe.</p>
                      </td>
                    </tr>
                  ) : (
                    listeCommissions.map((c, i) => (
                      <React.Fragment key={i}>
                        <tr className="hover:bg-muted/20 transition-colors bg-white">
                          <td className="px-5 py-4 font-bold text-gray-800">{c.nom}</td>
                          <td className="px-5 py-4 text-center font-semibold">{c.pelerins}</td>
                          <td className="px-5 py-4 text-right">{fmtDZD(c.totalCommission)} DZD</td>
                          <td className="px-5 py-4 text-right text-muted-foreground">{c.retenueSource > 0 ? fmtDZD(c.retenueSource) + ' DZD' : '—'}</td>
                          <td className="px-5 py-4 text-right text-emerald-600 font-semibold">{c.payeAgence > 0 ? fmtDZD(c.payeAgence) + ' DZD' : '—'}</td>
                          <td className="px-5 py-4 text-right font-bold text-destructive">{c.resteAPayer > 0 ? fmtDZD(c.resteAPayer) + ' DZD' : '—'}</td>
                          <td className="px-5 py-4 text-right">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              disabled={c.resteAPayer <= 0}
                              className={cn(
                                "text-xs",
                                c.resteAPayer > 0 ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200" : "opacity-50"
                              )}
                              onClick={() => handleOpenCommissionPayment(c.nom, c.resteAPayer)}
                            >
                              Payer
                            </Button>
                          </td>
                        </tr>
                        {/* Historique des paiements de cet intermédiaire */}
                        {groupePaiementsCommissions.filter(p => p.intermediaire === c.nom).length > 0 && (
                          <tr className="bg-gray-50/50">
                            <td colSpan={7} className="px-8 py-3 text-xs border-l-4 border-l-emerald-400">
                              <p className="font-semibold text-gray-500 mb-2">Historique des règlements :</p>
                              <div className="space-y-1">
                                {groupePaiementsCommissions.filter(p => p.intermediaire === c.nom).map(p => (
                                  <div key={p.id} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                                    <div className="flex items-center gap-3">
                                      <span className="text-gray-500"><Calendar size={12} className="inline mr-1"/>{new Date(p.date).toLocaleDateString('fr-FR')}</span>
                                      {p.note && <span className="text-gray-400 italic">"{p.note}"</span>}
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <span className="font-bold text-emerald-600">{fmtDZD(p.montant)} DZD</span>
                                      <button onClick={() => handleDeleteCommissionPayment(p.id)} className="text-red-400 hover:text-red-600" title="Supprimer ce paiement">
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ── Tab Content: Bilan Financier ── */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            <Card className="border-0 shadow-lg ring-1 ring-black/5">
              <div className="p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Plane size={20} className="text-sky-500" />
                  Configuration du Bloc Siège (Vols)
                </h3>
                <form onSubmit={handleSaveFinance} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                  <div className="space-y-2">
                    <Label>Tarif Billet Adulte (DZD)</Label>
                    <Input 
                      type="number" min="0" placeholder="Ex: 120000"
                      value={financeForm.tarifBillet}
                      onChange={e => setFinanceForm({...financeForm, tarifBillet: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Réduction CHD (DZD)</Label>
                    <Input 
                      type="number" min="0" placeholder="Ex: 25000"
                      value={financeForm.reductionChdVol}
                      onChange={e => setFinanceForm({...financeForm, reductionChdVol: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gratuités (Nombre)</Label>
                    <Input 
                      type="number" min="0" placeholder="Ex: 2"
                      value={financeForm.gratuites}
                      onChange={e => setFinanceForm({...financeForm, gratuites: e.target.value})}
                    />
                  </div>
                  <div className="pb-0.5">
                    <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white">
                      Enregistrer
                    </Button>
                  </div>
                </form>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg ring-1 ring-black/5 p-6 bg-gradient-to-br from-white to-gray-50">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
                  <Calculator size={20} className="text-gray-500" /> Détails des Charges & Engagements
                </h3>
                <div className="space-y-4">
                  {/* Engagement Vol */}
                  <div className="p-3 rounded-lg bg-sky-50 shadow-sm border border-sky-100 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-sky-800">Coût estimé Vols (Info)</span>
                      <span className="font-bold text-sky-600">{fmtDZD(totalDueCompagnie)} DZD</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-sky-700/70">Payé via Dépenses (Cat. Billets) :</span>
                      <span className="font-medium text-sky-700">{fmtDZD(depensesBillets)} DZD</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-sky-200/50">
                      <span className="text-xs font-bold text-sky-900 uppercase">Reste à payer Compagnie</span>
                      <span className="font-bold text-red-500">{fmtDZD(resteAPayerCompagnie)} DZD</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-lg bg-white shadow-sm border">
                    <span className="text-sm font-medium text-gray-600">Commissions Intermédiaires</span>
                    <span className="font-bold text-gray-600">{fmtDZD(grandTotalCommission)} DZD</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white shadow-sm border">
                    <span className="text-sm font-medium text-gray-600">Dépenses Agence (Toutes cat.)</span>
                    <span className="font-bold text-orange-500">{fmtDZD(grandTotalDepenses)} DZD</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-100 border border-gray-200 mt-2">
                    <span className="text-sm font-bold text-gray-700 uppercase">Total Charges (Déduites)</span>
                    <span className="font-extrabold text-gray-800">{fmtDZD(grandTotalCommission + grandTotalDepenses)} DZD</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic mt-2">
                    * Le coût estimé des vols n'est pas déduit automatiquement pour éviter les doublons avec vos saisies de dépenses.
                  </p>
                </div>
              </Card>
              
              <Card className="border-0 shadow-lg ring-1 ring-black/5 p-6 bg-gradient-to-br from-emerald-50 to-white">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-emerald-800">
                  <TrendingUp size={20} className="text-emerald-500" /> Bilan & Résultat Financier
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white shadow-sm border border-emerald-100">
                    <span className="text-sm font-medium text-gray-600">Chiffre d'Affaires Total (Brut)</span>
                    <span className="font-extrabold text-blue-600">{fmtDZD(caTotalBrut)} DZD</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white shadow-sm border border-amber-100">
                    <span className="text-sm font-medium text-gray-600">Total Commissions Intermédiaires</span>
                    <span className="font-bold text-amber-600">-{fmtDZD(grandTotalCommission)} DZD</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-50/50 shadow-sm border border-emerald-200">
                    <span className="text-sm font-bold text-emerald-900">CA Net de Commissions</span>
                    <span className="font-extrabold text-emerald-700">{fmtDZD(caSansCommission)} DZD</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white shadow-sm border border-red-100">
                    <span className="text-sm font-medium text-gray-600">- Total Dépenses & Réductions</span>
                    <span className="font-bold text-destructive">-{fmtDZD(grandTotalDepenses + grandTotalReduction)} DZD</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-xl bg-emerald-600 text-white shadow-md mt-4">
                    <div className="flex flex-col">
                      <span className="font-bold uppercase tracking-wide text-xs">Bénéfice Net Réel</span>
                      <span className="text-[10px] text-emerald-100">(CA sans Comm. - Dépenses - Réductions)</span>
                    </div>
                    <span className="font-extrabold text-2xl">{fmtDZD(margeNette)} DZD</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
        
        {/* ── Modal Enregistrement ───────────────────────────────────── */}
        <Dialog open={isModalOpen} onOpenChange={(v) => { setIsModalOpen(v); if(!v) setEditingId(null); }}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden" onClose={() => { setIsModalOpen(false); setEditingId(null); }}>
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-5 border-b">
              <DialogHeader>
                <DialogTitle className="text-2xl font-extrabold flex items-center gap-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary">
                    {editingId ? <Pencil size={18} /> : <UserPlus size={18} />}
                  </div>
                  {editingId ? 'Modifier l\'enregistrement' : (formData.chambreId ? 'Compléter la chambre' : 'Enregistrer une chambre')}
                </DialogTitle>
                <DialogDescription>Groupe : {groupe.nom}</DialogDescription>
              </DialogHeader>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                
                {/* Hotel + Room type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label className="text-sm font-bold text-foreground">Hôtel <span className="text-red-500">*</span></Label>
                    {(!groupe.hotels || groupe.hotels.length === 0) ? (
                      <p className="text-sm text-destructive bg-destructive/5 p-3 rounded-lg border border-destructive/10">Aucun hôtel assigné.</p>
                    ) : (
                      <Select 
                        required 
                        value={formData.hotelId} 
                        disabled={!!formData.chambreId}
                        onChange={e => {
                          setFormData({...formData, hotelId: e.target.value, typeChambre: ''});
                        }}
                      >
                        <option value="">Choisir un hôtel…</option>
                        {groupe.hotels.map((h, i) => <option key={i} value={h.hotelId}>{getHotelName(h.hotelId)}</option>)}
                      </Select>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type de chambre <span className="text-destructive">*</span></Label>
                    <Select 
                      required 
                      disabled={!formData.hotelId || !!formData.chambreId} // Verrouillé si on complète
                      value={formData.typeChambre} 
                      onChange={e => setFormData({...formData, typeChambre: e.target.value})}
                    >
                      <option value="">Choisir un type…</option>
                      {typesChambresDisponibles.map(k => (
                        <option key={k} value={k}>{CHAMBRE_LABELS[k]} — {k} ({CHAMBRE_CAPACITY[k]} pers.)</option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Lien Client (Facultatif) */}
                <div className="space-y-1.5 pt-2 relative" ref={wrapperRef}>
                  <Label>Lier à un client (Facultatif)</Label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9 h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                      placeholder="Rechercher un client..."
                      value={clientSearch}
                      onChange={e => { setClientSearch(e.target.value); setShowDropdown(true); if (formData.clientId) setFormData(prev => ({ ...prev, clientId: '' })); }}
                      onFocus={() => setShowDropdown(true)}
                    />
                  </div>
                  {showDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-background border rounded-lg shadow-lg z-50 max-h-[220px] overflow-y-auto overflow-x-hidden">
                      {filteredClients.map(c => (
                        <div key={c.id} onClick={() => handleSelectClient(c)}
                          className="flex items-center justify-between px-3 py-3 cursor-pointer hover:bg-muted transition-colors border-b border-border/50 last:border-0">
                          <span className="font-medium text-sm text-foreground">{c.nom} {c.telephone ? `(${c.telephone})` : ''}</span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${c.type === 'Entreprise' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {c.type || 'Particulier'}
                          </span>
                        </div>
                      ))}
                      {filteredClients.length === 0 && clientSearch && (
                        <div className="px-4 py-3 text-sm text-muted-foreground italic bg-muted/10">Aucun client trouvé.</div>
                      )}
                      <div onClick={() => { setShowDropdown(false); setIsAddingClient(true); }}
                        className="flex items-center gap-2 px-4 py-3 cursor-pointer text-primary font-bold text-sm bg-primary/5 hover:bg-primary/10 transition-colors border-t">
                        <Plus size={16} /> Ajouter un nouveau client
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground italic mt-1">
                    Lier ce dossier d'enregistrement à un client existant pour le retrouver dans ses statistiques de fidélité.
                  </p>
                </div>

                {/* Pèlerins */}
                {formData.typeChambre && (
                  <div className="rounded-xl border bg-muted/10 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Users size={15} className="text-primary" />
                        Pèlerins de la chambre ({existingOccupants.length + pelerinsValides.length} sur {CHAMBRE_CAPACITY[formData.typeChambre]})
                      </p>
                      {reductionChd > 0 && (
                        <span className="text-[10px] font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">
                          Réduction CHD dispo : -{reductionChd.toLocaleString()} DZD
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {/* Affichage des pèlerins existants (Grisés) */}
                      {existingOccupants.map((occ, idx) => (
                        <div key={`exist-${idx}`} className="flex flex-col gap-2 p-3 bg-muted/40 border border-dashed rounded-lg opacity-70">
                          <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
                            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-muted-foreground/20 text-muted-foreground text-xs font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <Input
                              disabled
                              value={occ.nom + (occ.sexe ? ` (${occ.sexe})` : '')}
                              className="flex-1 min-w-[150px] h-9 cursor-not-allowed bg-muted font-medium"
                            />
                            <div className="text-xs text-muted-foreground font-medium italic pr-4">
                              (Déjà enregistré)
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Affichage des nouveaux inputs */}
                      {formData.pelerins.map((p, idx) => {
                        const displayNumber = existingOccupants.length + idx + 1;
                        return (
                          <div key={`new-${idx}`} className="flex flex-col gap-2 p-3 bg-background border rounded-lg shadow-sm border-primary/20">
                            <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
                              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                                {displayNumber}
                              </span>
                              
                              <Input
                                placeholder={`Nom du Pèlerin ${displayNumber}`}
                                value={p.nom}
                                onChange={e => handlePelerinChange(idx, 'nom', e.target.value)}
                                className="flex-1 min-w-[150px] h-9"
                              />
                              
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex bg-muted/50 border rounded-md p-0.5 shrink-0">
                                  <button
                                    type="button"
                                    className={cn("px-2 py-1 text-[10px] font-bold rounded-sm transition-colors", p.sexe !== 'F' ? "bg-background text-blue-600 shadow-sm" : "text-muted-foreground")}
                                    onClick={() => handlePelerinChange(idx, 'sexe', 'H')}
                                  >
                                    H
                                  </button>
                                  <button
                                    type="button"
                                    className={cn("px-2 py-1 text-[10px] font-bold rounded-sm transition-colors", p.sexe === 'F' ? "bg-background text-pink-600 shadow-sm" : "text-muted-foreground")}
                                    onClick={() => handlePelerinChange(idx, 'sexe', 'F')}
                                  >
                                    F
                                  </button>
                                </div>

                                <label className="flex items-center gap-1.5 cursor-pointer select-none bg-muted/40 hover:bg-muted/70 border rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors">
                                  <input
                                    type="checkbox"
                                    className="w-3.5 h-3.5 rounded text-blue-500"
                                    checked={p.chd}
                                    onChange={e => handlePelerinChange(idx, 'chd', e.target.checked)}
                                  />
                                  CHD
                                </label>

                                <label className="flex items-center gap-1.5 cursor-pointer select-none bg-muted/40 hover:bg-muted/70 border rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors">
                                  <input
                                    type="checkbox"
                                    className="w-3.5 h-3.5 accent-orange-500 rounded"
                                    checked={p.restauration}
                                    onChange={e => handlePelerinChange(idx, 'restauration', e.target.checked)}
                                  />
                                  <Utensils size={12} className="text-orange-500" />
                                </label>

                                <Button 
                                  type="button" 
                                  variant={showTarifPerso[idx] ? "default" : "outline"} 
                                  size="icon-sm"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setShowTarifPerso(prev => ({...prev, [idx]: !prev[idx]}));
                                    if (showTarifPerso[idx]) {
                                      handlePelerinChange(idx, 'tarifPerso', ''); // Reset on hide
                                    }
                                  }}
                                  title="Tarif personnalisé"
                                >
                                  <Pencil size={12} />
                                </Button>
                              </div>
                            </div>

                            {/* Tarif personnalisé Row */}
                            {showTarifPerso[idx] && (
                              <div className="flex items-center gap-3 pl-10 pt-1 border-t border-dashed mt-1">
                                <Tag size={12} className="text-muted-foreground" />
                                <Label className="text-xs text-muted-foreground whitespace-nowrap">Tarif manuel :</Label>
                                <Input
                                  type="number"
                                  placeholder="Montant en DZD"
                                  value={p.tarifPerso}
                                  onChange={e => handlePelerinChange(idx, 'tarifPerso', e.target.value)}
                                  className="h-8 text-xs max-w-[150px]"
                                  disabled={p.guide}
                                />
                                
                                <div className="ml-2 h-5 border-l border-border mx-2"></div>
                                
                                <label className="flex items-center gap-1.5 cursor-pointer select-none bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md px-2.5 py-1.5 text-xs font-bold text-blue-800 transition-colors" title="Marquer comme Guide (0 DZD)">
                                  <input
                                    type="checkbox"
                                    className="w-3.5 h-3.5 rounded text-blue-600"
                                    checked={p.guide}
                                    onChange={e => {
                                      handlePelerinChange(idx, 'guide', e.target.checked);
                                      if (e.target.checked) handlePelerinChange(idx, 'tarifPerso', '');
                                    }}
                                  />
                                  GUIDE (0 DZD)
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Enfants sans lit */}
                    <div className="pt-3 mt-3 border-t">
                      <div className="flex items-center justify-between mb-3">
                        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <Baby size={15} className="text-amber-500" />
                          Enfants sans lit ({formData.enfantsSansLit.length})
                        </p>
                        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleAddEnfantSansLit}>
                          <Plus size={12} className="mr-1" /> Ajouter
                        </Button>
                      </div>
                      
                      {formData.enfantsSansLit.length > 0 && (
                        <div className="space-y-2">
                          {formData.enfantsSansLit.map((enfant, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-amber-50/50 p-2 border border-amber-100 rounded-lg">
                              <Input 
                                placeholder="Nom du bébé/enfant" 
                                className="h-8 text-xs flex-1 bg-white"
                                value={enfant.nom}
                                onChange={e => handleEnfantSansLitChange(idx, 'nom', e.target.value)}
                              />
                              <Input 
                                type="number" 
                                placeholder="Tarif (DZD)" 
                                className="h-8 text-xs w-[120px] bg-white"
                                value={enfant.tarif}
                                onChange={e => handleEnfantSansLitChange(idx, 'tarif', e.target.value)}
                              />
                              <Button type="button" variant="ghost" size="icon-sm" className="text-destructive h-8 w-8 hover:bg-destructive/10" onClick={() => handleRemoveEnfantSansLit(idx)}>
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* Extra info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10 p-4 rounded-xl border">
                  
                  {/* Intermédiaire logic */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold border-b pb-2">Commission & Intermédiaire</h4>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Intermédiaire</Label>
                        <Select value={formData.intermediaire} onChange={e => setFormData({...formData, intermediaire: e.target.value})}>
                          <option value="">Aucun</option>
                          {intermediaires.map((int, i) => <option key={i} value={int.nom}>{int.nom} ({int.type})</option>)}
                        </Select>
                      </div>
                      
                      {formData.intermediaire && (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Commission par nouvelle place (DZD)</Label>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              value={formData.commissionCustom} 
                              onChange={e => setFormData({...formData, commissionCustom: e.target.value})} 
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold border-b pb-2">Informations Diverses</h4>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Téléphone Contact</Label>
                        <Input placeholder="N° de contact" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Note / Remarque</Label>
                        <Textarea placeholder="Remarque facultative…" value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} className="min-h-[50px] text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1.5"><Tag size={12} className="text-orange-500" /> Réduction Globale (DZD)</Label>
                        <Input type="number" min="0" placeholder="0" value={formData.reduction} onChange={e => setFormData({...formData, reduction: e.target.value})} />
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* ── Sticky Footer / Calculator ── */}
              <div className="shrink-0 border-t bg-sidebar text-white px-6 py-4 rounded-b-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                    <div>
                      <p className="text-white/40 font-bold uppercase tracking-widest mb-0.5">Chambre</p>
                      <p className="text-white font-mono text-sm">{totalChambre.toLocaleString('fr-DZ')} <span className="text-white/30">DZD</span></p>
                    </div>
                    {totalResto > 0 && (
                      <>
                        <div className="w-px h-6 bg-white/10" />
                        <div>
                          <p className="text-white/40 font-bold uppercase tracking-widest mb-0.5">Resto</p>
                          <p className="text-white font-mono text-sm">{totalResto.toLocaleString('fr-DZ')} <span className="text-white/30">DZD</span></p>
                        </div>
                      </>
                    )}
                    {totalEnfantsSansLit > 0 && (
                      <>
                        <div className="w-px h-6 bg-white/10" />
                        <div>
                          <p className="text-white/40 font-bold uppercase tracking-widest mb-0.5">BB Sans Lit</p>
                          <p className="text-white font-mono text-sm">{totalEnfantsSansLit.toLocaleString('fr-DZ')} <span className="text-white/30">DZD</span></p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="text-right flex flex-col items-end">
                      <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-0.5">Net à Payer (Pour ce groupe de {pelerinsValides.length} pers.)</p>
                      <p className="text-xl font-extrabold text-emerald-400 leading-none tabular-nums">{fmtDZD(totalNet)}</p>
                      {reductionGlobale > 0 && (
                        <p className="text-[10px] text-orange-400 mt-1 leading-none">-{reductionGlobale.toLocaleString('fr-DZ')} (Réd.)</p>
                      )}
                      {formData.paiementRabatteur && totalCommission > 0 && (
                        <p className="text-[10px] text-blue-300 mt-1 leading-none">-{totalCommission.toLocaleString('fr-DZ')} (Comm.)</p>
                      )}
                    </div>
                    <Button type="submit" disabled={pelerinsValides.length === 0} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg h-11 px-6 text-sm font-bold">
                      Valider l'enregistrement
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Modal Paiement ───────────────────────────────────── */}
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent className="max-w-xl p-0 overflow-hidden" onClose={() => setIsPaymentModalOpen(false)}>
            <div className="bg-gradient-to-r from-emerald-100/50 via-emerald-50/30 to-transparent px-6 py-5 border-b">
              <DialogHeader>
                <DialogTitle className="text-2xl font-extrabold flex items-center gap-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600">
                    <CreditCard size={18} />
                  </div>
                  Ajouter un paiement
                </DialogTitle>
                <DialogDescription>Saisissez les détails du paiement pour cet enregistrement</DialogDescription>
              </DialogHeader>
            </div>
            <form onSubmit={handleSavePayment} className="flex flex-col min-h-0 flex-1">
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div className="space-y-2.5 md:col-span-2">
                    <Label className="text-sm font-bold text-foreground">Sélectionner le Client / Enregistrement <span className="text-red-500">*</span></Label>
                    <Select 
                      required
                      value={currentEnregistrementId || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCurrentEnregistrementId(val);
                        const enr = groupeEnregistrements.find(x => x.id === val);
                        if(enr) {
                          setPaymentFormData({...paymentFormData, nomClient: enr.pelerins?.[0]?.nom || ''});
                        }
                      }}
                      className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                    >
                      <option value="">Sélectionnez un enregistrement...</option>
                      {groupeEnregistrements.map(enr => (
                        <option key={enr.id} value={enr.id}>
                          {enr.pelerins?.[0]?.nom || 'Client sans nom'} (Chambre: {getHotelName(enr.hotelId)} - {enr.typeChambre}) - Reste à payer: {fmtDZD(enr.totalNet - getEnregistrementPaid(enr.id))} DZD
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-sm font-bold text-foreground">Nom sur le reçu (Client)</Label>
                    <Input 
                      required 
                      placeholder="Nom et Prénom"
                      value={paymentFormData.nomClient}
                      onChange={e => setPaymentFormData({...paymentFormData, nomClient: e.target.value})}
                      className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                    />
                  </div>

                  {selectedEnrForPayment?.intermediaire && (
                    <div className="space-y-2.5 md:col-span-2">
                      <Label className="text-sm font-bold text-foreground">Source du Paiement (Commission)</Label>
                      {!hasPreviousPayments ? (
                        <Select 
                          value={paymentFormData.paiementRabatteur ? "rabatteur" : "client"} 
                          onChange={e => setPaymentFormData({...paymentFormData, paiementRabatteur: e.target.value === "rabatteur"})}
                        >
                          <option value="client">Client (Plein tarif : l'agence devra la commission)</option>
                          <option value="rabatteur">Rabatteur (Net de commission : {selectedEnrForPayment.totalCommission} DZD retenus à la source)</option>
                        </Select>
                      ) : (
                        <div className="p-3 bg-muted/30 border rounded-md text-sm text-muted-foreground flex items-center gap-2">
                          <Tag size={14} className="text-primary"/> 
                          Le mode de paiement a été fixé lors du 1er versement : 
                          <span className="font-bold text-foreground">
                            {selectedEnrForPayment.paiementRabatteur ? "Rabatteur" : "Client"}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <Label className="text-sm font-bold text-foreground">Date du paiement <span className="text-red-500">*</span></Label>
                    <Input 
                      type="date" 
                      required 
                      value={paymentFormData.datePaiement}
                      onChange={e => setPaymentFormData({...paymentFormData, datePaiement: e.target.value})}
                      className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                    />
                  </div>
                  <div className="space-y-2.5 md:col-span-2">
                    <Label className="text-sm font-bold text-foreground">N° de Bon (Facultatif)</Label>
                    <Input 
                      placeholder="Ex: BON-12345"
                      value={paymentFormData.numBon}
                      onChange={e => setPaymentFormData({...paymentFormData, numBon: e.target.value})}
                      className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                    />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-600 mb-4">Détails du montant</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="space-y-2.5">
                      <Label className="text-sm font-bold text-foreground">Montant <span className="text-red-500">*</span></Label>
                      <Input 
                        type="number" 
                        required min="0" step="any" placeholder="0.00"
                        value={paymentFormData.montantOriginal}
                        onChange={e => setPaymentFormData({...paymentFormData, montantOriginal: e.target.value})}
                        className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                      />
                    </div>
                    <div className="space-y-2.5">
                      <Label className="text-sm font-bold text-foreground">Devise <span className="text-red-500">*</span></Label>
                      <Select 
                        value={paymentFormData.devise}
                        onChange={e => setPaymentFormData({...paymentFormData, devise: e.target.value})}
                        className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                      >
                        {DEVISES.map(d => <option key={d} value={d}>{d}</option>)}
                      </Select>
                    </div>
                    {isForeignCurrencyPayment && (
                      <div className="space-y-2.5">
                        <Label className="text-sm font-bold text-foreground">Taux <span className="text-red-500">*</span></Label>
                        <Input 
                          type="number" required min="0.0001" step="any" placeholder="Ex: 145"
                          value={paymentFormData.tauxChange}
                          onChange={e => setPaymentFormData({...paymentFormData, tauxChange: e.target.value})}
                          className={`h-11 bg-muted/20 focus-visible:bg-transparent transition-colors ${isForeignCurrencyPayment && (!paymentFormData.tauxChange || Number(paymentFormData.tauxChange) <= 0) ? 'border-red-500 ring-2 ring-red-200' : ''}`}
                        />
                      </div>
                    )}
                  </div>

                  {isForeignCurrencyPayment && (!paymentFormData.tauxChange || Number(paymentFormData.tauxChange) <= 0) && (
                    <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs font-bold flex items-center gap-2">
                      ⚠️ Veuillez saisir un taux de change valide pour convertir le paiement en DZD.
                    </div>
                  )}

                  <div className="mt-6 bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex items-center justify-between">
                    <div className="text-sm text-emerald-800 flex items-center gap-2 font-medium">
                      <ArrowRightLeft size={16} /> Net en DZD :
                    </div>
                    <div className="text-xl font-extrabold text-emerald-600">
                      {computedDZD_Payment.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm">DZD</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-3 shrink-0 rounded-b-xl">
                <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)} className="h-11 px-6">Annuler</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-8">Confirmer le paiement</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Modal Paiement Commission ───────────────────────────────────── */}
        <Dialog open={isCommissionModalOpen} onOpenChange={setIsCommissionModalOpen}>
          <DialogContent className="max-w-md p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-100/50 via-emerald-50/30 to-transparent px-6 py-5 border-b">
              <DialogHeader>
                <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
                  Règlement Commission
                </DialogTitle>
                <DialogDescription>Enregistrer un paiement à l'intermédiaire {commissionFormData.intermediaire}</DialogDescription>
              </DialogHeader>
            </div>
            <form onSubmit={handleSaveCommissionPayment} className="p-6 space-y-6">
              <div className="space-y-5">
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-foreground">Date du règlement <span className="text-red-500">*</span></Label>
                  <Input 
                    type="date" 
                    required 
                    value={commissionFormData.date}
                    onChange={e => setCommissionFormData({...commissionFormData, date: e.target.value})}
                    className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-foreground">Montant Payé (DZD) <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number" 
                    required min="0" step="any"
                    value={commissionFormData.montant}
                    onChange={e => setCommissionFormData({...commissionFormData, montant: e.target.value})}
                    className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-foreground">Note / Remarque (Facultatif)</Label>
                  <Input 
                    placeholder="Moyen de paiement, chèque..."
                    value={commissionFormData.note}
                    onChange={e => setCommissionFormData({...commissionFormData, note: e.target.value})}
                    className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setIsCommissionModalOpen(false)} className="h-11 px-6">Annuler</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-8">Enregistrer le paiement</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      </div>
      <Dialog open={isAddingClient} onOpenChange={setIsAddingClient}>
        <DialogContent className="max-w-3xl p-0" onClose={() => setIsAddingClient(false)}>
          <ClientForm 
            onClose={() => setIsAddingClient(false)} 
            onSave={async (newClient) => {
              const { data, error } = await supabase.from('clients').insert([newClient]).select();
              if (error) {
                alert("Erreur: " + error.message);
              } else if (data) {
                setClients(prev => [...prev, data[0]]);
                handleSelectClient(data[0]);
                setIsAddingClient(false);
              }
            }} 
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default OmraGroupDetails;
