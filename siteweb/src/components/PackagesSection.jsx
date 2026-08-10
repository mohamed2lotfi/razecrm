import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Compass, Plane, Bus, Stamp, Hotel, Star, Calendar, Clock, 
  MapPin, Check, Sparkles, ArrowRight, ArrowLeft, Eye, X, 
  CheckCircle2, XCircle, Tag, BedDouble, Users, ShieldCheck, 
  ChevronRight, ChevronLeft, Filter, Layers
} from 'lucide-react';
import { cn, formatDZD } from '@/lib/utils';

// Helper to convert country code or string to real flag representation (works on Windows & all OS)
export const getCountryCode = (destOrEmoji) => {
  if (!destOrEmoji) return null;
  const str = String(destOrEmoji).trim().toUpperCase();
  const nameMap = {
    'SA': 'sa', 'ARABIE SAOUDITE': 'sa', 'المملكة العربية السعودية': 'sa',
    'EG': 'eg', 'ÉGYPTE': 'eg', 'EGYPTE': 'eg', 'مصر': 'eg',
    'AE': 'ae', 'ÉMIRATS ARABES UNIS (DUBAÏ)': 'ae', 'EMIRATS ARABES UNIS (DUBAI)': 'ae', 'DUBAI': 'ae', 'DUBAÏ': 'ae', 'الإمارات العربية المتحدة (دبي)': 'ae',
    'TR': 'tr', 'TURQUIE': 'tr', 'تركيا': 'tr',
    'MY': 'my', 'MALAISIE': 'my', 'ماليزيا': 'my',
    'ES': 'es', 'ESPAGNE': 'es', 'إسبانيا': 'es',
    'FR': 'fr', 'FRANCE': 'fr', 'فرنسا': 'fr',
    'TN': 'tn', 'TUNISIE': 'tn', 'تونس': 'tn',
    'TH': 'th', 'THAÏLANDE': 'th', 'THAILANDE': 'th', 'تايلاند': 'th',
    'MA': 'ma', 'MAROC': 'ma', 'المغرب': 'ma',
    'DZ': 'dz', 'ALGÉRIE': 'dz', 'ALGERIE': 'dz', 'الجزائر': 'dz',
    'QA': 'qa', 'QATAR': 'qa', 'قطر': 'qa',
    'IT': 'it', 'ITALIE': 'it', 'إيطاليا': 'it',
    'JO': 'jo', 'JORDANIE': 'jo', 'الأردن': 'jo',
    'GR': 'gr', 'GRÈCE': 'gr', 'GRECE': 'gr', 'اليونان': 'gr',
    'MV': 'mv', 'MALDIVES': 'mv', 'المالديف': 'mv'
  };

  if (nameMap[str]) return nameMap[str];
  return null;
};

export const RenderCountryFlag = ({ dest, className = "w-4 h-3" }) => {
  const code = getCountryCode(dest?.emoji) || getCountryCode(dest?.nom);
  if (code) {
    return (
      <img
        src={`https://flagcdn.com/w40/${code}.png`}
        alt=""
        className={cn("object-cover rounded-xs shadow-xs inline-block shrink-0", className)}
        loading="lazy"
      />
    );
  }
  return <span className="text-sm shrink-0 leading-none">{dest?.emoji || '✈️'}</span>;
};

// Helper to compute starting price from hotels room rates or general rate
export const getStartingPriceForHolidayPackage = (pkg) => {
  if (!pkg) return null;
  
  if (Array.isArray(pkg.hotels) && pkg.hotels.length > 0) {
    let minPrice = Infinity;
    pkg.hotels.forEach(h => {
      if (h.tarifs) {
        ['quadruple', 'triple', 'double', 'single'].forEach(k => {
          const val = parseFloat(String(h.tarifs[k] || '').replace(/\s+/g, ''));
          if (!isNaN(val) && val > 0 && val < minPrice) {
            minPrice = val;
          }
        });
      }
    });
    if (minPrice !== Infinity) return minPrice;
  }

  return 145000; // Fallback starting price
};

export const PackagesSection = ({ onSelectPackage, onOpenQuoteModal }) => {
  const { t, isArabic } = useLanguage();
  const [packages, setPackages] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [selectedDestId, setSelectedDestId] = useState('all');
  const [selectedType, setSelectedType] = useState('all'); // 'all' | 'organise' | 'a_la_carte'
  const [loading, setLoading] = useState(true);
  const [detailModalPackage, setDetailModalPackage] = useState(null);

  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  useEffect(() => {
    fetchPackagesData();
  }, []);

  const fetchPackagesData = async () => {
    setLoading(true);
    try {
      const [packRes, destRes] = await Promise.all([
        supabase.from('packages').select('*').eq('statut', 'actif').order('created_at', { ascending: false }),
        supabase.from('destinations').select('*').order('nom', { ascending: true })
      ]);

      if (destRes.data && destRes.data.length > 0) {
        setDestinations(destRes.data);
      } else {
        setDestinations([
          { id: 'turquie', nom: 'Turquie', nom_ar: 'تركيا', emoji: '🇹🇷' },
          { id: 'dubai', nom: 'Émirats Arabes Unis (Dubaï)', nom_ar: 'الإمارات العربية المتحدة (دبي)', emoji: '🇦🇪' },
          { id: 'malaisie', nom: 'Malaisie', nom_ar: 'ماليزيا', emoji: '🇲🇾' },
          { id: 'espagne', nom: 'Espagne', nom_ar: 'إسبانيا', emoji: '🇪🇸' },
          { id: 'egypte', nom: 'Égypte', nom_ar: 'مصر', emoji: '🇪🇬' },
          { id: 'tunisie', nom: 'Tunisie', nom_ar: 'تونس', emoji: '🇹🇳' }
        ]);
      }

      if (packRes.data && packRes.data.length > 0) {
        setPackages(packRes.data);
      } else {
        // Fallback curated showcase packages
        setPackages([
          {
            id: 'demo-turquie-istanbul-antalya',
            destination_id: 'turquie',
            nom: 'Splendeurs d\'Istanbul & Riviera d\'Antalya 5★',
            nom_ar: 'روائع إسطنبول وسحر أنطاليا 5 نجوم',
            type: 'organise',
            duree: '8 jours / 7 nuits',
            duree_ar: '8 أيام / 7 ليالي',
            date_debut_validite: '2026-08-15',
            date_fin_validite: '2026-11-30',
            billet_avion_inclus: true,
            compagnie_id: 'Turkish Airlines',
            departs: [
              { id: '1', label: 'Départ Septembre', date_depart: '2026-09-05', date_retour: '2026-09-12' },
              { id: '2', label: 'Départ Octobre', date_depart: '2026-10-03', date_retour: '2026-10-10' }
            ],
            transfert_inclus: true,
            visa_status: 'incluse',
            hotels: [
              {
                id: 'h1',
                nom: 'Crowne Plaza Istanbul Old City & Rixos Antalya',
                location: 'Istanbul & Antalya',
                etoiles: 5,
                formule: 'petit_dej',
                tarifs: { quadruple: 145000, triple: 155000, double: 168000, single: 215000 }
              }
            ],
            description: 'Un voyage inoubliable combinant l\'histoire fascinante des sultans à Istanbul et la détente absolue sur les plages turquoises d\'Antalya. Guide bilingue et croisière privée sur le Bosphore.',
            description_ar: 'برنامج ساحر يجمع بين عبق التاريخ في إسطنبول وجمال شواطئ الريفيرا في أنطاليا. مرافقة سياحية راقية وجولة بحرية خاصة في البوسفور.',
            inclusions: ['Vol aller-retour Alger - Istanbul avec Turkish Airlines', 'Hébergement 5★ avec petit-déjeuner buffet', 'Transferts aéroport - hôtel en van privé VIP', 'Excursion Bosphore & Îles des Princes', 'Visa officiel et assistance aéroport'],
            exclusions: ['Dépenses personnelles', 'Déjeuners et dîners libres'],
            image_url: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=1000&auto=format&fit=crop',
            en_vedette: true
          },
          {
            id: 'demo-dubai-luxe',
            destination_id: 'dubai',
            nom: 'Dubaï Évasion Futuriste & Safari Désert VIP',
            nom_ar: 'دبي المستقبل وسفاري الصحراء VIP',
            type: 'organise',
            duree: '7 jours / 6 nuits',
            duree_ar: '7 أيام / 6 ليالي',
            date_debut_validite: '2026-09-01',
            date_fin_validite: '2026-12-15',
            billet_avion_inclus: true,
            compagnie_id: 'Emirates',
            departs: [
              { id: '1', label: 'Départ 1', date_depart: '2026-09-15', date_retour: '2026-09-21' },
              { id: '2', label: 'Départ 2', date_depart: '2026-10-18', date_retour: '2026-10-24' }
            ],
            transfert_inclus: true,
            visa_status: 'incluse',
            hotels: [
              {
                id: 'h2',
                nom: 'Millennium Place Dubai Marina 4★ Sup',
                location: 'Dubaï Marina',
                etoiles: 4,
                formule: 'petit_dej',
                tarifs: { quadruple: 175000, triple: 185000, double: 198000, single: 255000 }
              }
            ],
            description: 'Découvrez les gratte-ciels spectaculaires de Dubaï, la fontaine du Burj Khalifa, une virée en yacht à la Marina et une soirée féérique en 4x4 au cœur du désert.',
            description_ar: 'اكتشف روعة دبي الحديثة، برج خليفة، جولة بحرية في المارينا وأمسية سفاري ساحرة في الصحراء بسيارات الدفع الرباعي.',
            inclusions: ['Vol aller-retour régulier', 'Hôtel 4★ Supérieur à Dubaï Marina', 'Safari 4x4 avec dîner spectacle barbecue', 'Croisière Marina Yacht VIP', 'Visa touristique Émirats inclus'],
            exclusions: ['Taxe de séjour Tourism Dirham', 'Dépenses personnelles'],
            image_url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1000&auto=format&fit=crop',
            en_vedette: true
          },
          {
            id: 'demo-malaisie-nature',
            destination_id: 'malaisie',
            nom: 'Malaisie Tropicale : Kuala Lumpur & Île de Langkawi',
            nom_ar: 'ماليزيا الاستوائية: كوالالمبور وجزيرة لانكاوي',
            type: 'organise',
            duree: '10 jours / 9 nuits',
            duree_ar: '10 أيام / 9 ليالي',
            date_debut_validite: '2026-09-01',
            date_fin_validite: '2026-12-31',
            billet_avion_inclus: true,
            compagnie_id: 'Qatar Airways',
            departs: [
              { id: '1', label: 'Départ Octobre', date_depart: '2026-10-10', date_retour: '2026-10-20' },
              { id: '2', label: 'Départ Novembre', date_depart: '2026-11-12', date_retour: '2026-11-22' }
            ],
            transfert_inclus: true,
            visa_status: 'none',
            hotels: [
              {
                id: 'h3',
                nom: 'Berjaya Times Square & Pelangi Beach Resort Langkawi',
                location: 'Kuala Lumpur & Langkawi',
                etoiles: 5,
                formule: 'petit_dej',
                tarifs: { quadruple: 235000, triple: 248000, double: 265000, single: 330000 }
              }
            ],
            description: 'Immersion au cœur de l\'Asie du Sud-Est entre modernité des tours Petronas et plages paradisiaques de Langkawi. Téléphérique SkyBridge et forêts tropicales.',
            description_ar: 'رحلة استوائية ممتعة بين برجي بتروناس الشهيرين وشواطئ لانكاوي الفيروزية الساحرة. تجربة التلفريك والغابات العذراء.',
            inclusions: ['Vol international et vols intérieurs vers Langkawi', 'Hôtels 5★ de luxe avec petit-déjeuner', 'Transferts privés terrestres et maritimes', 'Excursions avec guide francophone/arabophone'],
            exclusions: ['Assurance optionnelle', 'Repas non mentionnés'],
            image_url: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?q=80&w=1000&auto=format&fit=crop',
            en_vedette: false
          }
        ]);
      }
    } catch (err) {
      console.error("Erreur chargement packages:", err);
    } finally {
      setLoading(false);
    }
  };

  const getDestinationObj = (destId) => {
    return destinations.find(d => d.id === destId || d.nom.toLowerCase().includes(String(destId).toLowerCase())) || null;
  };

  const filteredPackages = packages.filter(pkg => {
    const matchesDest = selectedDestId === 'all' || pkg.destination_id === selectedDestId;
    const matchesType = selectedType === 'all' || pkg.type === selectedType;
    return matchesDest && matchesType;
  });

  const handleBookPackage = (pkg) => {
    if (onSelectPackage) {
      onSelectPackage({
        nom: isArabic && pkg.nom_ar ? pkg.nom_ar : pkg.nom,
        date_depart: pkg.departs?.[0]?.date_depart || '',
        duree: pkg.duree,
        type: 'package'
      });
    } else if (onOpenQuoteModal) {
      onOpenQuoteModal({
        type: 'package',
        nom: isArabic && pkg.nom_ar ? pkg.nom_ar : pkg.nom
      });
    }
  };

  return (
    <section id="packages" className="py-20 sm:py-28 relative bg-slate-50/70 dark:bg-[#0b0b0b] border-y border-slate-200/70 dark:border-white/5 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* ── Section Header ─────────────────────────────────────────────── */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-black uppercase tracking-wider shadow-sm">
            <Compass size={14} className="animate-spin-slow text-brand-500" />
            <span>{t('packages_badge')}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            {isArabic ? (
              <>اكتشف العالم مع باقاتنا <span className="text-brand-600 dark:text-brand-400">السياحية المميزة</span></>
            ) : (
              <>Évadez-vous avec nos <span className="text-brand-600 dark:text-brand-400">Packages Clé en Main</span></>
            )}
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
            {t('packages_subtitle')}
          </p>
        </div>

        {/* ── Filter Bar Control Center (Centered & Flag Optimized) ──────── */}
        <div className="mb-10 p-2 sm:p-3 bg-white/90 dark:bg-[#141414]/90 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-sm space-y-3">
          
          {/* Row 1: Centered Type Segmented Toggle */}
          <div className="flex flex-col sm:flex-row items-center justify-center relative py-1 px-2">
            
            {/* Centered Type Segmented Control */}
            <div className="inline-flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-inner">
              <button
                onClick={() => setSelectedType('all')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all text-center",
                  selectedType === 'all' 
                    ? "bg-white dark:bg-[#202020] text-slate-900 dark:text-white shadow-sm border border-slate-200/40 dark:border-white/10" 
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {t('packages_type_all')}
              </button>
              <button
                onClick={() => setSelectedType('organise')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all text-center",
                  selectedType === 'organise' 
                    ? "bg-white dark:bg-[#202020] text-slate-900 dark:text-white shadow-sm border border-slate-200/40 dark:border-white/10" 
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {t('packages_type_organise')}
              </button>
              <button
                onClick={() => setSelectedType('a_la_carte')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all text-center",
                  selectedType === 'a_la_carte' 
                    ? "bg-white dark:bg-[#202020] text-slate-900 dark:text-white shadow-sm border border-slate-200/40 dark:border-white/10" 
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {t('packages_type_a_la_carte')}
              </button>
            </div>

            {/* Results Count with Live Dot */}
            <div className="sm:absolute sm:right-3 sm:top-1/2 sm:-translate-y-1/2 mt-2 sm:mt-0 flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {filteredPackages.length} {isArabic ? 'برنامج متاح' : (filteredPackages.length > 1 ? 'séjours disponibles' : 'séjour disponible')}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-white/5" />

          {/* Row 2: Destination Pills Carousel (No scrollbar, smooth wrap/scroll) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1">
            <button
              onClick={() => setSelectedDestId('all')}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 shrink-0 border",
                selectedDestId === 'all'
                  ? "bg-slate-900 text-white dark:bg-brand-500 dark:text-white border-transparent shadow-md shadow-brand-500/20 scale-[1.02]"
                  : "bg-slate-100/80 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/5 hover:bg-slate-200/70 dark:hover:bg-white/10"
              )}
            >
              <span className="text-sm">🌍</span>
              <span>{t('packages_all_dest')}</span>
            </button>

            {destinations.map(d => {
              const displayName = isArabic && d.nom_ar ? d.nom_ar : d.nom;
              const isSelected = selectedDestId === d.id;

              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDestId(d.id)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 shrink-0 border",
                    isSelected
                      ? "bg-slate-900 text-white dark:bg-brand-500 dark:text-white border-transparent shadow-md shadow-brand-500/20 scale-[1.02]"
                      : "bg-slate-100/80 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/5 hover:bg-slate-200/70 dark:hover:bg-white/10"
                  )}
                >
                  <RenderCountryFlag dest={d} className="w-4 h-3" />
                  <span>{displayName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Cards Grid ─────────────────────────────────────────────────── */}
        {filteredPackages.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-[#121212] rounded-3xl border border-slate-200/80 dark:border-white/10 p-8 shadow-sm">
            <Compass size={40} className="mx-auto text-slate-400/50 mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isArabic ? 'لا توجد باقات متاحة حالياً لهذه الوجهة' : 'Aucun séjour disponible pour cette sélection'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {isArabic 
                ? 'يمكنكم التواصل معنا مباشرة لتصميم برنامج سفر مخصص حسب رغبتكم.'
                : 'Contactez notre agence pour concevoir votre voyage sur-mesure personnalisé.'}
            </p>
            <button
              onClick={() => onOpenQuoteModal && onOpenQuoteModal({ type: 'package' })}
              className="mt-5 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all inline-flex items-center gap-2"
            >
              <span>{t('nav_quote_btn')}</span>
              <ArrowIcon size={14} />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredPackages.map(pkg => {
              const destObj = getDestinationObj(pkg.destination_id);
              const startPrice = getStartingPriceForHolidayPackage(pkg);
              const displayName = isArabic && pkg.nom_ar ? pkg.nom_ar : pkg.nom;
              const displayDuree = isArabic && pkg.duree_ar ? pkg.duree_ar : pkg.duree;

              return (
                <div 
                  key={pkg.id}
                  className="bg-white dark:bg-[#131313] border border-slate-200/80 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Image Container */}
                    <div className="relative h-56 w-full overflow-hidden bg-slate-100 dark:bg-obsidian-900">
                      <img 
                        src={pkg.image_url || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1000&auto=format&fit=crop'} 
                        alt={displayName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        loading="lazy"
                      />

                      {/* Destination Pill (Top Left) */}
                      <div className="absolute top-3.5 left-3.5 bg-black/60 backdrop-blur-md text-white text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-2 shadow-md">
                        <RenderCountryFlag dest={destObj} className="w-4 h-3" />
                        <span>{destObj ? (isArabic && destObj.nom_ar ? destObj.nom_ar : destObj.nom) : 'International'}</span>
                      </div>

                      {/* Featured Gold Badge (Top Right) */}
                      {pkg.en_vedette && (
                        <div className="absolute top-3.5 right-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                          <Sparkles size={11} className="text-amber-200" />
                          <span>{isArabic ? 'عرض مميز' : 'Coup de Cœur'}</span>
                        </div>
                      )}

                      {/* Bottom Image Overlay: Duration & Type */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                        <span className="bg-brand-600/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm">
                          {pkg.type === 'organise' ? t('packages_type_organise') : t('packages_type_a_la_carte')}
                        </span>

                        <span className="bg-black/75 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                          <Clock size={12} className="text-amber-400" />
                          <span>{displayDuree}</span>
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 sm:p-6 space-y-4">
                      {/* Title */}
                      <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2">
                        {displayName}
                      </h3>

                      {/* Departures Chip */}
                      {Array.isArray(pkg.departs) && pkg.departs.length > 0 && (
                        <div className="bg-slate-50 dark:bg-white/5 p-2.5 rounded-2xl border border-slate-200/70 dark:border-white/5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                            <Calendar size={14} className="text-brand-500 shrink-0" />
                            <span className="truncate">
                              {pkg.departs[0].date_depart 
                                ? `${pkg.departs[0].date_depart} → ${pkg.departs[0].date_retour || ''}` 
                                : pkg.departs[0].label}
                            </span>
                          </div>
                          {pkg.departs.length > 1 && (
                            <span className="text-[10px] font-bold bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-md shrink-0">
                              +{pkg.departs.length - 1} autre(s)
                            </span>
                          )}
                        </div>
                      )}

                      {/* Perks & Features Row */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {pkg.billet_avion_inclus && (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-blue-50/60 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 p-2 rounded-xl">
                            <Plane size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="truncate">{pkg.compagnie_id ? `Vol ${pkg.compagnie_id}` : t('packages_perk_flight')}</span>
                          </div>
                        )}

                        {pkg.transfert_inclus && (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-emerald-50/60 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 p-2 rounded-xl">
                            <Bus size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate">{t('packages_perk_transfer')}</span>
                          </div>
                        )}

                        {pkg.visa_status === 'incluse' && (
                          <div className="col-span-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-500/15 border border-emerald-300/80 dark:border-emerald-500/30 p-2 rounded-xl">
                            <Stamp size={13} className="text-emerald-600 shrink-0" />
                            <span>{t('packages_perk_visa')}</span>
                          </div>
                        )}

                        {pkg.visa_status === 'traitement_dossier' && (
                          <div className="col-span-2 flex items-center gap-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-500/15 border border-amber-300/80 dark:border-amber-500/30 p-2 rounded-xl">
                            <Stamp size={13} className="text-amber-600 shrink-0" />
                            <span>{t('packages_perk_visa_help')}</span>
                          </div>
                        )}
                      </div>

                      {/* Hotel Preview */}
                      {Array.isArray(pkg.hotels) && pkg.hotels.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                          <span className="flex items-center gap-1.5 truncate font-medium">
                            <Hotel size={14} className="text-brand-500 shrink-0" />
                            <span className="truncate">{pkg.hotels[0].nom || 'Hôtel de prestige'}</span>
                          </span>
                          <div className="flex items-center text-amber-400 shrink-0">
                            {Array.from({ length: pkg.hotels[0].etoiles || 4 }).map((_, i) => (
                              <Star key={i} size={11} className="fill-amber-400" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Price & Booking Actions */}
                  <div className="p-5 sm:p-6 pt-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 block">
                        {t('packages_price_from')}
                      </span>
                      <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                        {startPrice ? `${startPrice.toLocaleString()} DZD` : 'Sur devis'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDetailModalPackage(pkg)}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        title={t('packages_view_detail')}
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        onClick={() => handleBookPackage(pkg)}
                        className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white text-xs font-bold shadow-md shadow-brand-500/20 hover:shadow-brand-500/30 transition-all flex items-center gap-1.5"
                      >
                        <span>{t('packages_book_btn')}</span>
                        <ArrowIcon size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal Détails & Grille Tarifaire du Package ──────────────────── */}
      {detailModalPackage && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            className="bg-white dark:bg-[#161616] border border-slate-200 dark:border-white/10 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col"
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            {/* Modal Header */}
            <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-slate-900 shrink-0">
              <img 
                src={detailModalPackage.image_url || 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=1000&auto=format&fit=crop'} 
                alt={detailModalPackage.nom} 
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              
              <button
                onClick={() => setDetailModalPackage(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X size={16} />
              </button>

              <div className="absolute bottom-4 left-5 right-5 text-white space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-brand-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    {detailModalPackage.duree}
                  </span>
                  <span className="text-xs text-white/80 font-medium">
                    {detailModalPackage.type === 'organise' ? t('packages_type_organise') : t('packages_type_a_la_carte')}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black leading-tight">
                  {isArabic && detailModalPackage.nom_ar ? detailModalPackage.nom_ar : detailModalPackage.nom}
                </h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1 text-slate-800 dark:text-slate-200">
              
              {/* Description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {isArabic ? 'وصف البرنامج' : 'Description du séjour'}
                </h4>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/80 dark:border-white/5">
                  {isArabic && detailModalPackage.description_ar ? detailModalPackage.description_ar : detailModalPackage.description}
                </p>
              </div>

              {/* Hotels & Room Rates Table */}
              {Array.isArray(detailModalPackage.hotels) && detailModalPackage.hotels.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t('packages_hotels_title')}
                  </h4>

                  {detailModalPackage.hotels.map((h, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-black text-sm text-slate-900 dark:text-white block">{h.nom}</span>
                          <span className="text-xs text-slate-500">{h.location}</span>
                        </div>
                        <div className="text-amber-400 flex items-center">
                          {'★'.repeat(h.etoiles || 4)}
                        </div>
                      </div>

                      {/* Tarifs breakdown */}
                      {h.tarifs && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 dark:border-white/5 text-center">
                          <div className="bg-white dark:bg-[#1a1a1a] p-2.5 rounded-xl border border-slate-200/70 dark:border-white/5">
                            <span className="text-[10px] font-bold text-slate-400 block">{isArabic ? 'رباعية' : 'Quadruple'}</span>
                            <span className="text-xs font-black text-brand-600 dark:text-brand-400 font-mono">
                              {h.tarifs.quadruple ? `${Number(h.tarifs.quadruple).toLocaleString()} DA` : '—'}
                            </span>
                          </div>

                          <div className="bg-white dark:bg-[#1a1a1a] p-2.5 rounded-xl border border-slate-200/70 dark:border-white/5">
                            <span className="text-[10px] font-bold text-slate-400 block">{isArabic ? 'ثلاثية' : 'Triple'}</span>
                            <span className="text-xs font-black text-brand-600 dark:text-brand-400 font-mono">
                              {h.tarifs.triple ? `${Number(h.tarifs.triple).toLocaleString()} DA` : '—'}
                            </span>
                          </div>

                          <div className="bg-white dark:bg-[#1a1a1a] p-2.5 rounded-xl border border-slate-200/70 dark:border-white/5">
                            <span className="text-[10px] font-bold text-slate-400 block">{isArabic ? 'ثنائية' : 'Double'}</span>
                            <span className="text-xs font-black text-brand-600 dark:text-brand-400 font-mono">
                              {h.tarifs.double ? `${Number(h.tarifs.double).toLocaleString()} DA` : '—'}
                            </span>
                          </div>

                          <div className="bg-white dark:bg-[#1a1a1a] p-2.5 rounded-xl border border-slate-200/70 dark:border-white/5">
                            <span className="text-[10px] font-bold text-slate-400 block">{isArabic ? 'فردية' : 'Single'}</span>
                            <span className="text-xs font-black text-brand-600 dark:text-brand-400 font-mono">
                              {h.tarifs.single ? `${Number(h.tarifs.single).toLocaleString()} DA` : '—'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Inclusions / Exclusions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Inclusions */}
                {Array.isArray(detailModalPackage.inclusions) && detailModalPackage.inclusions.length > 0 && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                    <h5 className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      <span>{isArabic ? 'الخدمات المشمولة' : 'Inclus dans le package'}</span>
                    </h5>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {detailModalPackage.inclusions.map((inc, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Check size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Exclusions */}
                {Array.isArray(detailModalPackage.exclusions) && detailModalPackage.exclusions.length > 0 && (
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                    <h5 className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                      <XCircle size={14} />
                      <span>{isArabic ? 'غير مشمول' : 'Non inclus'}</span>
                    </h5>
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {detailModalPackage.exclusions.map((exc, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <X size={13} className="text-rose-600 shrink-0 mt-0.5" />
                          <span>{exc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-between shrink-0">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">{t('packages_price_from')}</span>
                <span className="text-lg sm:text-xl font-black text-brand-600 dark:text-brand-400">
                  {getStartingPriceForHolidayPackage(detailModalPackage)?.toLocaleString()} DZD
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDetailModalPackage(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  {isArabic ? 'إغلاق' : 'Fermer'}
                </button>
                <button
                  onClick={() => {
                    const selected = detailModalPackage;
                    setDetailModalPackage(null);
                    handleBookPackage(selected);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
                >
                  <span>{t('packages_book_btn')}</span>
                  <ArrowIcon size={14} />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </section>
  );
};

export default PackagesSection;
