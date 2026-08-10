import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  X, Sparkles, Send, CheckCircle2, Plane, Compass, 
  Stamp, Hotel, Palmtree, Users, Plus, Minus, Trash2, 
  Train, Star, Loader2, Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Static default master data to ensure INSTANT rendering with 0 network delay
const DEFAULT_OMRA_GROUPS = [
  { 
    id: 'grp-1', 
    nom: 'Omra Confort Septembre 1447', 
    date_depart: '2026-09-05', 
    date_retour: '2026-09-20',
    hotels: [{ id: '1', nom: 'Hôtel Fairmont Makkah 5★' }, { id: '2', nom: 'Hôtel Pullman Zamzam Madina 5★' }]
  },
  { 
    id: 'grp-2', 
    nom: 'Omra VIP Octobre 1447', 
    date_depart: '2026-10-10', 
    date_retour: '2026-10-25',
    hotels: [{ id: '3', nom: 'Hôtel Swissôtel Al Maqam 5★' }, { id: '4', nom: 'Hôtel Oberoi Madina 5★' }]
  },
  { 
    id: 'grp-3', 
    nom: 'Omra Vacances Scolaires Novembre', 
    date_depart: '2026-11-01', 
    date_retour: '2026-11-15',
    hotels: [{ id: '5', nom: 'Hôtel Al Shohada Makkah 5★' }]
  }
];

const DEFAULT_HOTELS = [
  { id: 'h1', nom: 'Fairmont Makkah Clock Royal Tower 5★', ville: 'Makkah' },
  { id: 'h2', nom: 'Swissôtel Al Maqam Makkah 5★', ville: 'Makkah' },
  { id: 'h3', nom: 'Pullman Zamzam Madina 5★', ville: 'Medina' },
  { id: 'h4', nom: 'Anwar Al Madinah Mövenpick 5★', ville: 'Medina' }
];

let _cachedOmraGroups = null;
let _cachedHotels = null;
let _isFetchingMaster = false;

export const QuoteSimulatorModal = ({ isOpen, onClose, initialData }) => {
  const { user, clientProfile } = useClientAuth();
  const { t, isArabic } = useLanguage();
  
  const [activeTab, setActiveTab] = useState('omra');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [omraGroups, setOmraGroups] = useState(_cachedOmraGroups || DEFAULT_OMRA_GROUPS);
  const [hotelsList, setHotelsList] = useState(_cachedHotels || DEFAULT_HOTELS);

  const [contactInfo, setContactInfo] = useState({
    nom: '',
    telephone: '',
    email: '',
    wilaya: '',
    remarques: ''
  });

  const [omraForm, setOmraForm] = useState({
    mode: 'organise', // 'organise' | 'a_la_carte'
    groupe_id: DEFAULT_OMRA_GROUPS[0].id,
    groupe_nom: DEFAULT_OMRA_GROUPS[0].nom,
    hotel_choisi: '',

    // À la carte
    parcours: 'makkah_medina', // 'makkah_medina' | 'makkah_only'
    hotel_makkah: '',
    hotel_medina: '',
    date_arrivee: '',
    date_depart: '',
    nuits_medine: 4,
    nuits_makkah: 6,
    vol_itineraire: 'MED-JED',
    option_vip: false,

    // Chambres
    chambres: {
      single: 0,
      double: 1,
      triple: 0,
      quadruple: 0,
      quintuple: 0
    },

    // Enfants
    enfants: [],

    // Train
    train_haramain: false
  });

  const [otherForms, setOtherForms] = useState({
    vols: { depart: 'Alger (ALG)', destination: 'Djeddah (JED)', date_aller: '', date_retour: '', passagers: 1 },
    hotels: { ville: 'Makkah', date_arrivee: '', date_depart: '', categorie: '5' },
    visas: { pays: 'Arabie Saoudite (Omra / Tourisme)', nbr_personnes: 1 },
    packages: { destination: 'Turquie', date_souhaitee: '', nbr_personnes: 2 }
  });

  // Fetch Supabase data once silently in background
  useEffect(() => {
    if (!_cachedOmraGroups && !_isFetchingMaster) {
      _isFetchingMaster = true;
      Promise.all([
        supabase.from('omra_groupes').select('*').order('date_depart', { ascending: true }),
        supabase.from('hotels').select('*').order('nom', { ascending: true })
      ]).then(([gRes, hRes]) => {
        if (gRes.data && gRes.data.length > 0) {
          _cachedOmraGroups = gRes.data;
          setOmraGroups(gRes.data);
        }
        if (hRes.data && hRes.data.length > 0) {
          _cachedHotels = hRes.data;
          setHotelsList(hRes.data);
        }
      }).catch(console.error)
      .finally(() => { _isFetchingMaster = false; });
    }
  }, []);

  useEffect(() => {
    if (initialData) {
      if (initialData.type === 'omra') {
        setActiveTab('omra');
        if (initialData.nom) {
          setOmraForm(prev => ({
            ...prev,
            groupe_nom: initialData.nom,
            remarques: `Formule demandée : ${initialData.nom}`
          }));
        }
      } else if (initialData.type === 'visa') {
        setActiveTab('visas');
      } else if (initialData.type === 'package') {
        setActiveTab('packages');
      }
    }

    if (clientProfile) {
      setContactInfo(prev => ({
        ...prev,
        nom: prev.nom || clientProfile.nom || '',
        email: prev.email || clientProfile.email || '',
        telephone: prev.telephone || clientProfile.clientData?.telephone || ''
      }));
    }
  }, [initialData, clientProfile, isOpen]);

  // Find currently selected group object
  const selectedGroupObj = useMemo(() => {
    return omraGroups.find(g => g.id === omraForm.groupe_id) || omraGroups[0] || null;
  }, [omraGroups, omraForm.groupe_id]);

  // Extract hotels for selected group
  const groupHotelsList = useMemo(() => {
    if (!selectedGroupObj || !Array.isArray(selectedGroupObj.hotels) || selectedGroupObj.hotels.length === 0) {
      return hotelsList;
    }
    return selectedGroupObj.hotels.map(h => {
      if (typeof h === 'string') return { id: h, nom: h };
      return {
        id: h.hotelId || h.id || h.nom || h.location,
        nom: h.location || h.nom || h.hotelId || 'Hôtel du groupe'
      };
    });
  }, [selectedGroupObj, hotelsList]);

  // Total Beds / Adults
  const totalBeds = useMemo(() => {
    return (omraForm.chambres.single * 1) + 
           (omraForm.chambres.double * 2) + 
           (omraForm.chambres.triple * 3) + 
           (omraForm.chambres.quadruple * 4) + 
           (omraForm.chambres.quintuple * 5);
  }, [omraForm.chambres]);

  const handleChambreQtyChange = useCallback((type, delta) => {
    setOmraForm(prev => {
      const current = prev.chambres[type] || 0;
      const nextVal = Math.max(0, current + delta);
      return {
        ...prev,
        chambres: {
          ...prev.chambres,
          [type]: nextVal
        }
      };
    });
  }, []);

  const handleAddEnfant = useCallback(() => {
    setOmraForm(prev => ({
      ...prev,
      enfants: [...prev.enfants, { id: Math.random().toString(), age: 4 }]
    }));
  }, []);

  const handleRemoveEnfant = useCallback((id) => {
    setOmraForm(prev => ({
      ...prev,
      enfants: prev.enfants.filter(e => e.id !== id)
    }));
  }, []);

  const handleEnfantAgeChange = useCallback((id, age) => {
    setOmraForm(prev => ({
      ...prev,
      enfants: prev.enfants.map(e => e.id === id ? { ...e, age: parseInt(age, 10) } : e)
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let structuredDetails = {};
      let resumeText = '';

      if (activeTab === 'omra') {
        const chambresSummary = Object.entries(omraForm.chambres)
          .filter(([_, qty]) => qty > 0)
          .map(([type, qty]) => `${qty} ${type}`)
          .join(', ');

        const enfantsSummary = omraForm.enfants.length > 0
          ? `${omraForm.enfants.length} enfant(s) sans lit (${omraForm.enfants.map(e => `${e.age} ans`).join(', ')})`
          : 'Aucun enfant';

        structuredDetails = {
          service_type: 'omra',
          omra_mode: omraForm.mode,
          groupe_id: omraForm.mode === 'organise' ? omraForm.groupe_id : null,
          groupe_nom: omraForm.mode === 'organise' ? omraForm.groupe_nom : null,
          hotel_choisi: omraForm.mode === 'organise' ? omraForm.hotel_choisi : null,
          parcours: omraForm.mode === 'a_la_carte' ? omraForm.parcours : null,
          hotel_makkah: omraForm.mode === 'a_la_carte' ? omraForm.hotel_makkah : null,
          hotel_medina: omraForm.mode === 'a_la_carte' && omraForm.parcours === 'makkah_medina' ? omraForm.hotel_medina : null,
          date_arrivee: omraForm.mode === 'a_la_carte' ? omraForm.date_arrivee : null,
          date_depart: omraForm.mode === 'a_la_carte' ? omraForm.date_depart : null,
          nuits_medine: omraForm.mode === 'a_la_carte' && omraForm.parcours === 'makkah_medina' ? omraForm.nuits_medine : null,
          nuits_makkah: omraForm.mode === 'a_la_carte' && omraForm.parcours === 'makkah_medina' ? omraForm.nuits_makkah : null,
          vol_itineraire: omraForm.mode === 'a_la_carte' ? omraForm.vol_itineraire : null,
          option_vip: omraForm.mode === 'a_la_carte' ? omraForm.option_vip : false,
          chambres: omraForm.chambres,
          total_lits: totalBeds,
          enfants_sans_lit: omraForm.enfants,
          train_haramain: omraForm.train_haramain,
          wilaya: contactInfo.wilaya,
          remarques: contactInfo.remarques
        };

        const hotelInfoText = omraForm.mode === 'organise'
          ? (omraForm.hotel_choisi ? `Hôtel: ${omraForm.hotel_choisi}` : 'Formule standard')
          : (omraForm.parcours === 'makkah_medina' 
              ? `Hôtels: [Médine: ${omraForm.hotel_medina || 'À définir'}, Makkah: ${omraForm.hotel_makkah || 'À définir'}]`
              : `Hôtel Makkah: ${omraForm.hotel_makkah || 'À définir'}`);

        resumeText = `[DEVIS OMRA] Mode: ${omraForm.mode === 'organise' ? `Organisé (${omraForm.groupe_nom || 'Groupe'})` : `À la carte (${omraForm.parcours})`} | ${hotelInfoText} | Chambres: ${chambresSummary || 'Non spécifié'} (${totalBeds} lits) | Enfants: ${enfantsSummary} | Train Haramain: ${omraForm.train_haramain ? 'OUI' : 'NON'} ${omraForm.option_vip ? '| VIP: OUI' : ''} | Remarques: ${contactInfo.remarques || 'Aucune'}`;
      } else {
        structuredDetails = {
          service_type: activeTab,
          data: otherForms[activeTab],
          wilaya: contactInfo.wilaya,
          remarques: contactInfo.remarques
        };
        resumeText = `[DEVIS ${activeTab.toUpperCase()}] Détails: ${JSON.stringify(otherForms[activeTab])} | Remarques: ${contactInfo.remarques || 'Aucune'}`;
      }

      let matchedServiceId = null;
      const { data: servicesData } = await supabase.from('services').select('id, nom');
      if (servicesData) {
        const found = servicesData.find(s => s.nom.toLowerCase().includes(activeTab.toLowerCase()));
        if (found) matchedServiceId = found.id;
      }

      const { error } = await supabase.from('pipeline').insert([{
        nom_prospect: contactInfo.nom,
        email: contactInfo.email || null,
        phone: contactInfo.telephone,
        service_id: matchedServiceId,
        details_demande: resumeText,
        details_devis: JSON.stringify(structuredDetails),
        status: 'nouvelle',
        client_id: clientProfile?.clientId || null
      }]);

      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error('Erreur envoi devis:', err);
      alert('Une erreur est survenue lors de l\'envoi de votre demande de devis.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'omra', label: t('quote_tab_omra'), icon: Compass },
    { id: 'vols', label: t('quote_tab_vols'), icon: Plane },
    { id: 'hotels', label: t('quote_tab_hotels'), icon: Hotel },
    { id: 'visas', label: t('quote_tab_visas'), icon: Stamp },
    { id: 'packages', label: t('quote_tab_packages'), icon: Palmtree }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-white/15 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden relative text-slate-900 dark:text-white max-h-[92vh] flex flex-col will-change-transform"
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        
        {/* ── Modal Header ────────────────────────────────────────────── */}
        <div className="bg-slate-50 dark:bg-[#1a1a1a] p-5 sm:p-6 border-b border-slate-200 dark:border-white/10 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 rtl:right-auto rtl:left-5 w-8 h-8 rounded-full bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors z-20"
          >
            <X size={16} />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">
            <Sparkles size={12} />
            <span>{t('quote_badge')}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('quote_title')}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-lg">
            {t('quote_sub')}
          </p>

          {/* 5 Main Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-4">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 border",
                    isSelected
                      ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                      : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                  )}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Modal Content Body ────────────────────────────────────────── */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">
          {submitted ? (
            <div className="py-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-brand-500/20 text-brand-500 border border-brand-500/30 flex items-center justify-center mb-5">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{t('quote_success_title')}</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mb-8">
                {t('quote_success_sub')}
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  onClose();
                }}
                className="px-8 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md transition-all"
              >
                {t('quote_close')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* ══════════ 1. ONGLET OMRA DÉTAILLÉ ══════════ */}
              {activeTab === 'omra' && (
                <div className="space-y-6">
                  
                  {/* Mode Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      {t('quote_omra_mode')}
                    </label>
                    <div className="grid grid-cols-2 gap-2.5 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200/80 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => setOmraForm({ ...omraForm, mode: 'organise' })}
                        className={cn(
                          "py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-2",
                          omraForm.mode === 'organise'
                            ? "bg-white dark:bg-[#222] text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-white/10"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        )}
                      >
                        <Users size={14} className={omraForm.mode === 'organise' ? "text-brand-500" : ""} />
                        <span>{t('quote_omra_mode_organise')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOmraForm({ ...omraForm, mode: 'a_la_carte' })}
                        className={cn(
                          "py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-2",
                          omraForm.mode === 'a_la_carte'
                            ? "bg-white dark:bg-[#222] text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-white/10"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        )}
                      >
                        <Sparkles size={14} className={omraForm.mode === 'a_la_carte' ? "text-amber-500" : ""} />
                        <span>{t('quote_omra_mode_a_la_carte')}</span>
                      </button>
                    </div>
                  </div>

                  {/* ── Sub-Form: Organisé ── */}
                  {omraForm.mode === 'organise' && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                          {t('quote_omra_group_select')}
                        </label>
                        <select
                          value={omraForm.groupe_id}
                          onChange={e => {
                            const found = omraGroups.find(g => g.id === e.target.value);
                            setOmraForm({
                              ...omraForm,
                              groupe_id: e.target.value,
                              groupe_nom: found ? found.nom : '',
                              hotel_choisi: (found?.hotels && found.hotels[0]?.location) || (found?.hotels && found.hotels[0]?.nom) || ''
                            });
                          }}
                          className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-brand-500"
                        >
                          {omraGroups.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.nom} {g.date_depart ? `(Départ: ${g.date_depart})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Select one of group's hotels */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                          {t('quote_omra_group_hotel_select')}
                        </label>
                        <select
                          value={omraForm.hotel_choisi}
                          onChange={e => setOmraForm({ ...omraForm, hotel_choisi: e.target.value })}
                          className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-brand-500"
                        >
                          <option value="">{t('quote_omra_group_hotel_all')}</option>
                          {groupHotelsList.map((h, i) => (
                            <option key={h.id || i} value={h.nom}>
                              🏨 {h.nom}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* ── Sub-Form: À la carte / Sur-mesure ── */}
                  {omraForm.mode === 'a_la_carte' && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/5 space-y-4">
                      
                      {/* Parcours */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                          {t('quote_omra_parcours')}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setOmraForm({ ...omraForm, parcours: 'makkah_medina' })}
                            className={cn(
                              "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center",
                              omraForm.parcours === 'makkah_medina'
                                ? "bg-brand-500 text-white border-brand-500 shadow-xs"
                                : "bg-white dark:bg-[#1c1c1c] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10"
                            )}
                          >
                            {t('quote_omra_makkah_medina')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setOmraForm({ ...omraForm, parcours: 'makkah_only' })}
                            className={cn(
                              "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center",
                              omraForm.parcours === 'makkah_only'
                                ? "bg-brand-500 text-white border-brand-500 shadow-xs"
                                : "bg-white dark:bg-[#1c1c1c] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10"
                            )}
                          >
                            {t('quote_omra_makkah_only')}
                          </button>
                        </div>
                      </div>

                      {/* Custom Hotel Inputs based on Parcours */}
                      {omraForm.parcours === 'makkah_only' ? (
                        <div>
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                            {t('quote_omra_hotel_makkah_label')}
                          </label>
                          <input
                            type="text"
                            placeholder={isArabic ? 'مثال: فيرمونت برج الساعة، سويس أوتيل المقام، أو فندق 5 نجوم...' : 'Ex: Fairmont Clock Tower, Swissôtel Al Maqam, ou hôtel 4★/5★...'}
                            value={omraForm.hotel_makkah}
                            onChange={e => setOmraForm({ ...omraForm, hotel_makkah: e.target.value })}
                            className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 text-xs font-medium focus:outline-none focus:border-brand-500"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                              {t('quote_omra_hotel_medina_label')}
                            </label>
                            <input
                              type="text"
                              placeholder={isArabic ? 'مثال: بولمان زمزم المدينة، موفنبيك أنوار المدينة...' : 'Ex: Pullman Zamzam Madina, Oberoi, Mövenpick...'}
                              value={omraForm.hotel_medina}
                              onChange={e => setOmraForm({ ...omraForm, hotel_medina: e.target.value })}
                              className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 text-xs font-medium focus:outline-none focus:border-brand-500"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                              {t('quote_omra_hotel_makkah_label')}
                            </label>
                            <input
                              type="text"
                              placeholder={isArabic ? 'مثال: فيرمونت مكة، سويس أوتيل، فندق الشهداء...' : 'Ex: Fairmont Makkah, Swissôtel, Al Shohada...'}
                              value={omraForm.hotel_makkah}
                              onChange={e => setOmraForm({ ...omraForm, hotel_makkah: e.target.value })}
                              className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 text-xs font-medium focus:outline-none focus:border-brand-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* Dates d'arrivée & de départ */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                            {t('quote_omra_date_arrival')}
                          </label>
                          <input
                            type="date"
                            value={omraForm.date_arrivee}
                            onChange={e => setOmraForm({ ...omraForm, date_arrivee: e.target.value })}
                            className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                            {t('quote_omra_date_departure')}
                          </label>
                          <input
                            type="date"
                            value={omraForm.date_depart}
                            onChange={e => setOmraForm({ ...omraForm, date_depart: e.target.value })}
                            className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                          />
                        </div>
                      </div>

                      {/* Répartition des nuits */}
                      {omraForm.parcours === 'makkah_medina' && (
                        <div className="p-3 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200/80 dark:border-white/5 space-y-2">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                            {t('quote_omra_nights_split')}
                          </span>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-[10px] text-slate-500 block mb-1">{t('quote_omra_nights_medina')}</span>
                              <input
                                type="number"
                                min="1"
                                max="30"
                                value={omraForm.nuits_medine}
                                onChange={e => setOmraForm({ ...omraForm, nuits_medine: parseInt(e.target.value, 10) || 0 })}
                                className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block mb-1">{t('quote_omra_nights_makkah')}</span>
                              <input
                                type="number"
                                min="1"
                                max="30"
                                value={omraForm.nuits_makkah}
                                onChange={e => setOmraForm({ ...omraForm, nuits_makkah: parseInt(e.target.value, 10) || 0 })}
                                className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Itinéraire du Vol */}
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                          {t('quote_omra_flight_route')}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setOmraForm({ ...omraForm, vol_itineraire: 'MED-JED' })}
                            className={cn(
                              "py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5",
                              omraForm.vol_itineraire === 'MED-JED'
                                ? "bg-brand-500 text-white border-brand-500 shadow-xs"
                                : "bg-white dark:bg-[#1c1c1c] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10"
                            )}
                          >
                            <Plane size={13} />
                            <span>MED ➔ JED</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOmraForm({ ...omraForm, vol_itineraire: 'JED-JED' })}
                            className={cn(
                              "py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5",
                              omraForm.vol_itineraire === 'JED-JED'
                                ? "bg-brand-500 text-white border-brand-500 shadow-xs"
                                : "bg-white dark:bg-[#1c1c1c] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10"
                            )}
                          >
                            <Plane size={13} />
                            <span>JED ➔ JED</span>
                          </button>
                        </div>
                      </div>

                      {/* Option VIP */}
                      <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={omraForm.option_vip}
                          onChange={e => setOmraForm({ ...omraForm, option_vip: e.target.checked })}
                          className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                        />
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-amber-900 dark:text-amber-300 block flex items-center gap-1">
                            <Star size={13} className="text-amber-500 fill-amber-500" />
                            {t('quote_omra_vip_transfer')}
                          </span>
                        </div>
                      </label>

                    </div>
                  )}

                  {/* ── Configuration des Chambres ── */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        {t('quote_rooms_title')}
                      </label>
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
                        {totalBeds} {isArabic ? 'سرير / بالغ' : (totalBeds > 1 ? 'lits / adultes' : 'lit / adulte')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { key: 'single', label: t('quote_room_single') },
                        { key: 'double', label: t('quote_room_double') },
                        { key: 'triple', label: t('quote_room_triple') },
                        { key: 'quadruple', label: t('quote_room_quadruple') },
                        { key: 'quintuple', label: t('quote_room_quintuple') },
                      ].map(rm => {
                        const qty = omraForm.chambres[rm.key] || 0;
                        return (
                          <div 
                            key={rm.key}
                            className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between"
                          >
                            <div>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-tight">
                                {rm.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleChambreQtyChange(rm.key, -1)}
                                disabled={qty === 0}
                                className="w-7 h-7 rounded-lg bg-white dark:bg-[#202020] border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-all active:scale-95"
                              >
                                <Minus size={12} />
                              </button>

                              <span className="w-6 text-center text-xs font-black font-mono">
                                {qty}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleChambreQtyChange(rm.key, 1)}
                                className="w-7 h-7 rounded-lg bg-white dark:bg-[#202020] border border-slate-200 dark:border-white/10 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold transition-all active:scale-95"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Enfants sans lit ── */}
                  <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {t('quote_children_title')}
                      </span>
                      <button
                        type="button"
                        onClick={handleAddEnfant}
                        className="px-3 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-bold transition-colors flex items-center gap-1.5"
                      >
                        <Plus size={13} />
                        <span>{t('quote_add_child')}</span>
                      </button>
                    </div>

                    {omraForm.enfants.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">
                        {isArabic ? 'لم يتم إضافة أطفال بدون سرير.' : 'Aucun enfant sans lit ajouté.'}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {omraForm.enfants.map((enf, idx) => (
                          <div 
                            key={enf.id}
                            className="p-2.5 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 flex items-center justify-between gap-2"
                          >
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {isArabic ? `الطفل ${idx + 1}` : `Enfant ${idx + 1}`}
                            </span>

                            <div className="flex items-center gap-2">
                              <select
                                value={enf.age}
                                onChange={e => handleEnfantAgeChange(enf.id, e.target.value)}
                                className="h-8 px-2 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white"
                              >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(age => (
                                  <option key={age} value={age}>
                                    {age} {t('quote_years_old')}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => handleRemoveEnfant(enf.id)}
                                className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center justify-center transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Option Train Haramain ── */}
                  <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={omraForm.train_haramain}
                      onChange={e => setOmraForm({ ...omraForm, train_haramain: e.target.checked })}
                      className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                    />
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <Train size={16} className="text-brand-500" />
                      <span>{t('quote_omra_train_haramain')}</span>
                    </div>
                  </label>

                </div>
              )}

              {/* ══════════ 2. AUTRES ONGLETS ══════════ */}
              {activeTab === 'vols' && (
                <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold block mb-1">Ville de Départ</label>
                      <input
                        type="text"
                        value={otherForms.vols.depart}
                        onChange={e => setOtherForms({ ...otherForms, vols: { ...otherForms.vols, depart: e.target.value } })}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Destination</label>
                      <input
                        type="text"
                        value={otherForms.vols.destination}
                        onChange={e => setOtherForms({ ...otherForms, vols: { ...otherForms.vols, destination: e.target.value } })}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 text-xs font-bold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold block mb-1">Date Aller</label>
                      <input
                        type="date"
                        value={otherForms.vols.date_aller}
                        onChange={e => setOtherForms({ ...otherForms, vols: { ...otherForms.vols, date_aller: e.target.value } })}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Date Retour</label>
                      <input
                        type="date"
                        value={otherForms.vols.date_retour}
                        onChange={e => setOtherForms({ ...otherForms, vols: { ...otherForms.vols, date_retour: e.target.value } })}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'hotels' && (
                <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold block mb-1">Ville / Lieu</label>
                      <input
                        type="text"
                        value={otherForms.hotels.ville}
                        onChange={e => setOtherForms({ ...otherForms, hotels: { ...otherForms.hotels, ville: e.target.value } })}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Catégorie souhaitée</label>
                      <select
                        value={otherForms.hotels.categorie}
                        onChange={e => setOtherForms({ ...otherForms, hotels: { ...otherForms.hotels, categorie: e.target.value } })}
                        className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 text-xs font-bold"
                      >
                        <option value="5">5 Étoiles Luxe</option>
                        <option value="4">4 Étoiles Supérieur</option>
                        <option value="3">3 Étoiles Standard</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'visas' && (
                <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5">
                  <div>
                    <label className="text-xs font-bold block mb-1">Pays / Destination Visa</label>
                    <input
                      type="text"
                      value={otherForms.visas.pays}
                      onChange={e => setOtherForms({ ...otherForms, visas: { ...otherForms.visas, pays: e.target.value } })}
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'packages' && (
                <div className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5">
                  <div>
                    <label className="text-xs font-bold block mb-1">Séjour / Destination souhaitée</label>
                    <input
                      type="text"
                      value={otherForms.packages.destination}
                      onChange={e => setOtherForms({ ...otherForms, packages: { ...otherForms.packages, destination: e.target.value } })}
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              {/* ══════════ COORDONNÉES CLIENT & REMARQUES ══════════ */}
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-4">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                  {isArabic ? 'معلومات التواصل' : 'Vos Coordonnées'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      {t('quote_fullname')}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={isArabic ? 'مثال: محمد بوعلام' : 'Ex: Karim Benali'}
                      value={contactInfo.nom}
                      onChange={e => setContactInfo({ ...contactInfo, nom: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-medium focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      {t('quote_phone')}
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="05 / 06 / 07 ..."
                      value={contactInfo.telephone}
                      onChange={e => setContactInfo({ ...contactInfo, telephone: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-medium focus:outline-none focus:border-brand-500"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      {t('quote_email')}
                    </label>
                    <input
                      type="email"
                      placeholder="nom@exemple.com"
                      value={contactInfo.email}
                      onChange={e => setContactInfo({ ...contactInfo, email: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-medium focus:outline-none focus:border-brand-500"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      {t('quote_wilaya')}
                    </label>
                    <input
                      type="text"
                      placeholder={isArabic ? 'الجزائر، وهران، سطيف...' : 'Alger, Oran, Sétif...'}
                      value={contactInfo.wilaya}
                      onChange={e => setContactInfo({ ...contactInfo, wilaya: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-medium focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {t('quote_details')}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={isArabic ? 'أي تفاصيل إضافية تود إخبارنا بها...' : 'Précisez vos souhaits (proximité, chambres communicantes, etc.)...'}
                    value={contactInfo.remarques}
                    onChange={e => setContactInfo({ ...contactInfo, remarques: e.target.value })}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-medium focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* ── Submit Button ── */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-[0.99] text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{t('quote_sending')}</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>{t('quote_submit')}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};

export default QuoteSimulatorModal;
