import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  X, Sparkles, Send, CheckCircle2, Plane, Compass, 
  Stamp, Hotel, Palmtree, Users, Plus, Minus, Trash2, 
  Train, Star, Loader2, Building2, ArrowLeftRight, Calendar,
  ChevronDown, Search, Check, MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Master airport lists with rich details
const DEPARTURE_AIRPORTS = [
  { code: 'ALG', city: 'Alger', name: 'Aéroport Houari Boumédiène', country: 'Algérie', flag: '🇩🇿' },
  { code: 'ORN', city: 'Oran', name: 'Aéroport Ahmed Ben Bella', country: 'Algérie', flag: '🇩🇿' },
  { code: 'CZL', city: 'Constantine', name: 'Aéroport Mohamed Boudiaf', country: 'Algérie', flag: '🇩🇿' },
  { code: 'BJA', city: 'Béjaïa', name: 'Aéroport Abane Ramdane', country: 'Algérie', flag: '🇩🇿' },
  { code: 'AAE', city: 'Annaba', name: 'Aéroport Rabah Bitat', country: 'Algérie', flag: '🇩🇿' },
  { code: 'TLM', city: 'Tlemcen', name: 'Aéroport Zenata', country: 'Algérie', flag: '🇩🇿' },
  { code: 'QSF', city: 'Sétif', name: 'Aéroport 8 Mai 1945', country: 'Algérie', flag: '🇩🇿' },
  { code: 'BSK', city: 'Biskra', name: 'Aéroport Mohamed Khider', country: 'Algérie', flag: '🇩🇿' },
  { code: 'GHA', city: 'Ghardaïa', name: 'Aéroport Noumérat - Moufdi Zakaria', country: 'Algérie', flag: '🇩🇿' },
];

const ARRIVAL_AIRPORTS = [
  { code: 'IST', city: 'Istanbul', name: 'Aéroport d\'Istanbul (IST / SAW)', country: 'Turquie', flag: '🇹🇷' },
  { code: 'PAR', city: 'Paris', name: 'Paris (CDG / Orly)', country: 'France', flag: '🇫🇷' },
  { code: 'JED', city: 'Djeddah', name: 'King Abdulaziz Intl (JED)', country: 'Arabie Saoudite', flag: '🇸🇦' },
  { code: 'MED', city: 'Médine', name: 'Prince Mohammad Bin Abdulaziz (MED)', country: 'Arabie Saoudite', flag: '🇸🇦' },
  { code: 'DXB', city: 'Dubaï', name: 'Aéroport International de Dubaï (DXB)', country: 'Émirats Arabes Unis', flag: '🇦🇪' },
  { code: 'DOH', city: 'Doha', name: 'Hamad International (DOH)', country: 'Qatar', flag: '🇶🇦' },
  { code: 'KUL', city: 'Kuala Lumpur', name: 'Kuala Lumpur Intl (KUL)', country: 'Malaisie', flag: '🇲🇾' },
  { code: 'TUN', city: 'Tunis', name: 'Tunis-Carthage (TUN)', country: 'Tunisie', flag: '🇹🇳' },
  { code: 'CAI', city: 'Le Caire', name: 'Aéroport International du Caire (CAI)', country: 'Égypte', flag: '🇪🇬' },
  { code: 'BCN', city: 'Barcelone', name: 'El Prat (BCN)', country: 'Espagne', flag: '🇪🇸' },
  { code: 'MAD', city: 'Madrid', name: 'Adolfo Suárez Barajas (MAD)', country: 'Espagne', flag: '🇪🇸' },
  { code: 'LON', city: 'Londres', name: 'Heathrow / Gatwick (LON)', country: 'Royaume-Uni', flag: '🇬🇧' },
  { code: 'CMN', city: 'Casablanca', name: 'Mohammed V (CMN)', country: 'Maroc', flag: '🇲🇦' },
];

// Static default master data for Omra
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

// ── Searchable Dropdown Component for Airports ──────────────────────────────────────
const SearchableAirportSelect = ({ label, value, onChange, airports, placeholder, isArabic }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter airports based on search query
  const filteredAirports = useMemo(() => {
    if (!searchQuery.trim()) return airports;
    const q = searchQuery.toLowerCase();
    return airports.filter(a => 
      a.city.toLowerCase().includes(q) || 
      a.code.toLowerCase().includes(q) || 
      a.name.toLowerCase().includes(q) ||
      a.country.toLowerCase().includes(q)
    );
  }, [airports, searchQuery]);

  // Find currently selected airport object
  const selectedAirport = useMemo(() => {
    return airports.find(a => `${a.city} (${a.code})` === value || a.city === value || a.code === value);
  }, [airports, value]);

  const handleSelect = (airportStr) => {
    onChange(airportStr);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
        {label}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-12 px-3.5 rounded-2xl bg-white dark:bg-[#1c1c1c] border transition-all flex items-center justify-between gap-2 text-left rtl:text-right shadow-xs",
          isOpen 
            ? "border-brand-500 ring-2 ring-brand-500/20" 
            : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-sm shrink-0">
            {selectedAirport ? selectedAirport.flag : '✈️'}
          </div>
          <div className="truncate">
            <div className="text-xs font-black text-slate-900 dark:text-white leading-tight truncate">
              {value || placeholder}
            </div>
            {selectedAirport && (
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {selectedAirport.name}
              </div>
            )}
          </div>
        </div>
        <ChevronDown size={15} className={cn("text-slate-400 transition-transform duration-200 shrink-0", isOpen && "rotate-180")} />
      </button>

      {/* Floating Dropdown List */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/15 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in text-slate-900 dark:text-white">
          
          {/* Search Box inside Dropdown */}
          <div className="p-2 border-b border-slate-100 dark:border-white/10 relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-4" />
            <input
              type="text"
              autoFocus
              placeholder={isArabic ? 'ابحث عن مدينة أو مطار...' : 'Rechercher une ville ou un code...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rtl:pl-3 rtl:pr-9 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs font-medium focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* List Items */}
          <div className="max-h-56 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
            
            {/* Custom Write-in option if user typing custom city */}
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => handleSelect(searchQuery.trim())}
                className="w-full px-3 py-2.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-bold transition-colors flex items-center justify-between text-left rtl:text-right"
              >
                <div className="flex items-center gap-2">
                  <MapPin size={13} />
                  <span>{isArabic ? `استخدام "${searchQuery}"` : `Utiliser "${searchQuery}"`}</span>
                </div>
                <span className="text-[10px] opacity-75">{isArabic ? 'سائجة مخصصة' : 'Saisie libre'}</span>
              </button>
            )}

            {filteredAirports.map(item => {
              const fullLabel = `${item.city} (${item.code})`;
              const isSelected = value === fullLabel || value === item.city;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleSelect(fullLabel)}
                  className={cn(
                    "w-full px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between text-left rtl:text-right",
                    isSelected
                      ? "bg-brand-500 text-white font-bold"
                      : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base leading-none">{item.flag}</span>
                    <div className="truncate">
                      <span className="font-bold">{item.city}</span>{' '}
                      <span className={cn("font-mono text-[11px]", isSelected ? "text-white/80" : "text-brand-600 dark:text-brand-400 font-extrabold")}>
                        ({item.code})
                      </span>
                      <div className={cn("text-[10px] truncate", isSelected ? "text-white/80" : "text-slate-400")}>
                        {item.name}
                      </div>
                    </div>
                  </div>

                  {isSelected && <Check size={14} className="shrink-0" />}
                </button>
              );
            })}

            {filteredAirports.length === 0 && !searchQuery.trim() && (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                {isArabic ? 'لا توجد نتائج' : 'Aucun aéroport trouvé'}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export const QuoteSimulatorModal = ({ isOpen, onClose, initialData }) => {
  const { user, clientProfile } = useClientAuth();
  const { t, isArabic } = useLanguage();
  
  const [activeTab, setActiveTab] = useState('omra');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [omraGroups, setOmraGroups] = useState(_cachedOmraGroups || DEFAULT_OMRA_GROUPS);
  const [hotelsList, setHotelsList] = useState(_cachedHotels || DEFAULT_HOTELS);

  // General Client Info
  const [contactInfo, setContactInfo] = useState({
    nom: '',
    telephone: '',
    email: '',
    wilaya: '',
    remarques: ''
  });

  // 1. Omra Form State
  const [omraForm, setOmraForm] = useState({
    mode: 'organise',
    groupe_id: DEFAULT_OMRA_GROUPS[0].id,
    groupe_nom: DEFAULT_OMRA_GROUPS[0].nom,
    hotel_choisi: '',

    // À la carte
    parcours: 'makkah_medina',
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

    enfants: [],
    train_haramain: false
  });

  // 2. Flight (Vols) Form State
  const [flightForm, setFlightForm] = useState({
    trip_type: 'aller_retour',
    ville_depart: 'Alger (ALG)',
    ville_arrivee: 'Istanbul (IST)',
    date_aller: '',
    date_retour: '',
    classe: 'economique',
    passagers: {
      adultes: 1,
      enfants: 0,
      bebes: 0
    },
    compagnie_pref: ''
  });

  // Other Tabs Basic States
  const [otherForms, setOtherForms] = useState({
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
      } else if (initialData.type === 'vols') {
        setActiveTab('vols');
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

  // Selected Omra group
  const selectedGroupObj = useMemo(() => {
    return omraGroups.find(g => g.id === omraForm.groupe_id) || omraGroups[0] || null;
  }, [omraGroups, omraForm.groupe_id]);

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

  // Omra Total Beds
  const totalBeds = useMemo(() => {
    return (omraForm.chambres.single * 1) + 
           (omraForm.chambres.double * 2) + 
           (omraForm.chambres.triple * 3) + 
           (omraForm.chambres.quadruple * 4) + 
           (omraForm.chambres.quintuple * 5);
  }, [omraForm.chambres]);

  // Flight Total Passengers
  const totalPassengers = useMemo(() => {
    return (flightForm.passagers.adultes || 0) + 
           (flightForm.passagers.enfants || 0) + 
           (flightForm.passagers.bebes || 0);
  }, [flightForm.passagers]);

  const handleChambreQtyChange = useCallback((type, delta) => {
    setOmraForm(prev => {
      const current = prev.chambres[type] || 0;
      const nextVal = Math.max(0, current + delta);
      return {
        ...prev,
        chambres: { ...prev.chambres, [type]: nextVal }
      };
    });
  }, []);

  const handleFlightPaxChange = useCallback((type, delta) => {
    setFlightForm(prev => {
      const current = prev.passagers[type] || 0;
      const minVal = type === 'adultes' ? 1 : 0;
      const nextVal = Math.max(minVal, current + delta);
      return {
        ...prev,
        passagers: { ...prev.passagers, [type]: nextVal }
      };
    });
  }, []);

  const handleSwapCities = useCallback(() => {
    setFlightForm(prev => ({
      ...prev,
      ville_depart: prev.ville_arrivee,
      ville_arrivee: prev.ville_depart
    }));
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
      } else if (activeTab === 'vols') {
        const paxSummary = `${flightForm.passagers.adultes} Adulte(s), ${flightForm.passagers.enfants} Enfant(s), ${flightForm.passagers.bebes} Bébé(s)`;
        
        structuredDetails = {
          service_type: 'vols',
          trip_type: flightForm.trip_type,
          ville_depart: flightForm.ville_depart,
          ville_arrivee: flightForm.ville_arrivee,
          date_aller: flightForm.date_aller,
          date_retour: flightForm.trip_type === 'aller_retour' ? flightForm.date_retour : null,
          classe: flightForm.classe,
          passagers: flightForm.passagers,
          total_passagers: totalPassengers,
          compagnie_pref: flightForm.compagnie_pref || null,
          wilaya: contactInfo.wilaya,
          remarques: contactInfo.remarques
        };

        resumeText = `[DEVIS VOL] Trajet: ${flightForm.ville_depart} ➔ ${flightForm.ville_arrivee} (${flightForm.trip_type === 'aller_retour' ? 'Aller-Retour' : 'Aller Simple'}) | Dates: ${flightForm.date_aller || 'À fixer'} ${flightForm.trip_type === 'aller_retour' ? `➔ ${flightForm.date_retour || 'À fixer'}` : ''} | Classe: ${flightForm.classe} | Passagers: ${paxSummary} (${totalPassengers} pax) ${flightForm.compagnie_pref ? `| Compagnie: ${flightForm.compagnie_pref}` : ''} | Remarques: ${contactInfo.remarques || 'Aucune'}`;
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

                  {/* ── Sub-Form: À la carte ── */}
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
                            placeholder={isArabic ? 'مثال: فيرمونت برج الساعة، سويس أوتيل المقام...' : 'Ex: Fairmont Clock Tower, Swissôtel Al Maqam...'}
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
                              placeholder={isArabic ? 'مثال: بولمان زمزم المدينة، موفنبيك...' : 'Ex: Pullman Zamzam Madina, Oberoi...'}
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
                              placeholder={isArabic ? 'مثال: فيرمونت مكة، سويس أوتيل...' : 'Ex: Fairmont Makkah, Swissôtel...'}
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

              {/* ══════════ 2. ONGLET VOLS DÉTAILLÉ & ÉLÉGANT ══════════ */}
              {activeTab === 'vols' && (
                <div className="space-y-6">
                  
                  {/* Trip Type Selector: Aller-Retour vs Aller Simple */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      {t('quote_flight_trip_type')}
                    </label>
                    <div className="grid grid-cols-2 gap-2.5 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200/80 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => setFlightForm({ ...flightForm, trip_type: 'aller_retour' })}
                        className={cn(
                          "py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-2",
                          flightForm.trip_type === 'aller_retour'
                            ? "bg-white dark:bg-[#222] text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-white/10"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        )}
                      >
                        <ArrowLeftRight size={14} className={flightForm.trip_type === 'aller_retour' ? "text-brand-500" : ""} />
                        <span>{t('quote_flight_round_trip')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFlightForm({ ...flightForm, trip_type: 'aller_simple' })}
                        className={cn(
                          "py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-2",
                          flightForm.trip_type === 'aller_simple'
                            ? "bg-white dark:bg-[#222] text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-white/10"
                            : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        )}
                      >
                        <Plane size={14} className={flightForm.trip_type === 'aller_simple' ? "text-brand-500" : ""} />
                        <span>{t('quote_flight_one_way')}</span>
                      </button>
                    </div>
                  </div>

                  {/* High-End Searchable Dropdowns for Departure and Arrival */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-4 relative">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      
                      {/* Searchable Departure Dropdown */}
                      <SearchableAirportSelect
                        label={t('quote_flight_from')}
                        value={flightForm.ville_depart}
                        onChange={val => setFlightForm({ ...flightForm, ville_depart: val })}
                        airports={DEPARTURE_AIRPORTS}
                        placeholder={isArabic ? 'اختر مدينة الإقلاع...' : 'Choisir la ville de départ...'}
                        isArabic={isArabic}
                      />

                      {/* Searchable Arrival Dropdown */}
                      <SearchableAirportSelect
                        label={t('quote_flight_to')}
                        value={flightForm.ville_arrivee}
                        onChange={val => setFlightForm({ ...flightForm, ville_arrivee: val })}
                        airports={ARRIVAL_AIRPORTS}
                        placeholder={isArabic ? 'اختر وجهة الوصول...' : 'Choisir la destination...'}
                        isArabic={isArabic}
                      />

                    </div>

                    {/* Quick Swap Button in Center */}
                    <div className="flex items-center justify-center pt-1">
                      <button
                        type="button"
                        onClick={handleSwapCities}
                        className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#252525] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:text-brand-500 text-xs font-bold flex items-center gap-1.5 shadow-xs hover:scale-105 active:scale-95 transition-all"
                      >
                        <ArrowLeftRight size={13} className="text-brand-500" />
                        <span>{isArabic ? 'عكس الاتجاه' : 'Inverser le trajet'}</span>
                      </button>
                    </div>

                  </div>

                  {/* Flight Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {t('quote_flight_date_depart')}
                      </label>
                      <input
                        type="date"
                        required
                        value={flightForm.date_aller}
                        onChange={e => setFlightForm({ ...flightForm, date_aller: e.target.value })}
                        className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    {flightForm.trip_type === 'aller_retour' && (
                      <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          {t('quote_flight_date_return')}
                        </label>
                        <input
                          type="date"
                          required={flightForm.trip_type === 'aller_retour'}
                          value={flightForm.date_retour}
                          onChange={e => setFlightForm({ ...flightForm, date_retour: e.target.value })}
                          className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Flight Class: Éco vs Business vs First */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      {t('quote_flight_class')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'economique', label: t('quote_flight_class_eco') },
                        { key: 'business', label: t('quote_flight_class_business') },
                        { key: 'first', label: t('quote_flight_class_first') },
                      ].map(cl => (
                        <button
                          key={cl.key}
                          type="button"
                          onClick={() => setFlightForm({ ...flightForm, classe: cl.key })}
                          className={cn(
                            "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center",
                            flightForm.classe === cl.key
                              ? "bg-brand-500 text-white border-brand-500 shadow-xs"
                              : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
                          )}
                        >
                          {cl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Passengers Breakdown */}
                  <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        {t('quote_flight_passengers')}
                      </label>
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
                        {totalPassengers} {isArabic ? 'مسافر' : (totalPassengers > 1 ? 'passagers' : 'passager')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      
                      {/* Adults */}
                      <div className="p-3 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold block">{t('quote_flight_adults')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleFlightPaxChange('adultes', -1)}
                            disabled={flightForm.passagers.adultes <= 1}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#252525] border border-slate-200 dark:border-white/10 flex items-center justify-center text-xs font-bold disabled:opacity-30"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="w-5 text-center text-xs font-black font-mono">
                            {flightForm.passagers.adultes}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleFlightPaxChange('adultes', 1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#252525] border border-slate-200 dark:border-white/10 flex items-center justify-center text-xs font-bold text-brand-500"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Children */}
                      <div className="p-3 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold block">{t('quote_flight_children')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleFlightPaxChange('enfants', -1)}
                            disabled={flightForm.passagers.enfants <= 0}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#252525] border border-slate-200 dark:border-white/10 flex items-center justify-center text-xs font-bold disabled:opacity-30"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="w-5 text-center text-xs font-black font-mono">
                            {flightForm.passagers.enfants}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleFlightPaxChange('enfants', 1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#252525] border border-slate-200 dark:border-white/10 flex items-center justify-center text-xs font-bold text-brand-500"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Infants */}
                      <div className="p-3 rounded-xl bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold block">{t('quote_flight_infants')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleFlightPaxChange('bebes', -1)}
                            disabled={flightForm.passagers.bebes <= 0}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#252525] border border-slate-200 dark:border-white/10 flex items-center justify-center text-xs font-bold disabled:opacity-30"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="w-5 text-center text-xs font-black font-mono">
                            {flightForm.passagers.bebes}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleFlightPaxChange('bebes', 1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#252525] border border-slate-200 dark:border-white/10 flex items-center justify-center text-xs font-bold text-brand-500"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Compagnie Aérienne Préférée */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      {t('quote_flight_airline_pref')}
                    </label>
                    <input
                      type="text"
                      placeholder={isArabic ? 'مثال: الخطوط الجوية الجزائرية، السعودية، الخطوط التركية، القطرية...' : 'Ex: Air Algérie, Saudia, Turkish Airlines, Qatar Airways, Emirates...'}
                      value={flightForm.compagnie_pref}
                      onChange={e => setFlightForm({ ...flightForm, compagnie_pref: e.target.value })}
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-medium focus:outline-none focus:border-brand-500"
                    />
                  </div>

                </div>
              )}

              {/* ══════════ 3. AUTRES ONGLETS (Hotels, Visas, Packages) ══════════ */}
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
                    placeholder={isArabic ? 'أي تفاصيل إضافية تود إخبارنا بها...' : 'Précisez vos souhaits (bagages supplémentaires, repas spécial, etc.)...'}
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
