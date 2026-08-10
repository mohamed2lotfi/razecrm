import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Building2, MapPin, Footprints, Star, 
  DoorOpen, Sparkles, Eye, ArrowRight, ArrowLeft, 
  Navigation, Image as ImageIcon, Map as MapIcon, 
  Layers, X, CheckCircle2, Coffee, ExternalLink, Globe 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Stabilized MapController: only pans when the selected hotel or city actually changes
const MapController = ({ activeCity, selectedHotel, haramCenter }) => {
  const map = useMap();
  const lastKeyRef = React.useRef(null);

  const hotelId = selectedHotel?.id || 'none';
  const hotelLat = selectedHotel?.lat;
  const hotelLng = selectedHotel?.lng;
  const currentKey = `${activeCity}_${hotelId}_${hotelLat}_${hotelLng}`;

  useEffect(() => {
    if (!map) return;
    if (lastKeyRef.current === currentKey) return;
    lastKeyRef.current = currentKey;

    try {
      map.stop(); // Stop any pending animation to prevent vibration/shaking

      if (hotelLat && hotelLng && haramCenter) {
        const bounds = L.latLngBounds([
          [haramCenter[0], haramCenter[1]],
          [hotelLat, hotelLng]
        ]);
        map.flyToBounds(bounds, {
          padding: [60, 60],
          maxZoom: 16.5,
          duration: 0.8,
          easeLinearity: 0.25
        });
      } else if (haramCenter) {
        map.flyTo([haramCenter[0], haramCenter[1]], 16, { duration: 0.8 });
      }
    } catch (err) {
      console.warn('Map transition handled:', err);
    }
  }, [currentKey, map, haramCenter, hotelLat, hotelLng]);

  return null;
};

// Robust city matching helper
const isCityMatch = (hotelLoc, targetCity) => {
  if (!hotelLoc) return false;
  const h = String(hotelLoc).toLowerCase().trim();
  const t = String(targetCity).toLowerCase().trim();

  if (t === 'makkah' || t === 'mecca') {
    return h === 'mecca' || h === 'makkah' || h.includes('mecc') || h.includes('makk') || h.includes('مكة') || h.includes('mecque');
  }
  if (t === 'madinah' || t === 'medina') {
    return h === 'medina' || h === 'madinah' || h.includes('medin') || h.includes('madin') || h.includes('المدينة') || h.includes('médine');
  }
  return h === t;
};

export const HaramHotelsRadar = ({ onSelectHotel }) => {
  const { t, isArabic } = useLanguage();
  const { isDark } = useTheme();
  const [activeCity, setActiveCity] = useState('makkah'); // 'makkah' | 'madinah'
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'closer' | 'view'
  const [mapLayerType, setMapLayerType] = useState('streets'); // 'streets' (Plan par défaut) | 'satellite'
  const [selectedHotelId, setSelectedHotelId] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null); // For Image modal preview
  const [dbHotels, setDbHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  const cityData = {
    makkah: {
      center: [21.4225, 39.8262],
      zoom: 17,
      name: isArabic ? 'المسجد الحرام والكعبة المشرفة' : 'Al-Masjid Al-Haram (La Mecque)',
      icon: '🕋'
    },
    madinah: {
      center: [24.4672, 39.6109],
      zoom: 17,
      name: isArabic ? 'المسجد النبوي الشريف والروضة' : 'Al-Masjid An-Nabawi (Médine)',
      icon: '🕌'
    }
  };

  // Fallback preset hotels
  const fallbackHotelsData = {
    makkah: [
      {
        id: 'mk-shada',
        nom: isArabic ? 'فندق شدا مكة (تلال)' : 'Hôtel Shada Makkah (Tilal)',
        nom_ar: 'فندق شدا مكة (تلال)',
        etoiles: 4,
        nbr_etoiles: 4,
        lat: 21.4195,
        lng: 39.8272,
        distanceMeters: 150,
        distance_metres: 150,
        distanceLabel: isArabic ? '150 متر عن ساحات الحرم' : '150 mètres du parvis',
        walkingTime: isArabic ? '2 إلى 3 دقائق سيراً' : '2 à 3 min à pied',
        temps_marche: '2 à 3 min à pied',
        porte: isArabic ? 'ساحة أجياد وباب الملك عبد العزيز' : 'Esplanade Ajyad & Porte Roi Abdulaziz',
        porte_proche: 'Esplanade Ajyad & Porte Roi Abdulaziz',
        vue: isArabic ? 'تصميم عصري وقرب استثنائي (150م)' : 'Design moderne & proximité immédiate (150m)',
        hasView: true,
        vue_haram: true,
        isCloser: true,
        petit_dejeuner: true,
        image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'
        ],
        description: isArabic 
          ? 'فندق أنيق وراقٍ يقع على بعد 150 متراً فقط من ساحات الحرم المكي الشريف، يوفر راحة تامة وسرعة وصول فائقة للصلوات.'
          : 'Hôtel contemporain et raffiné situé à seulement 150m du parvis sacré, garantissant confort et accès ultra-rapide aux prières.'
      },
      {
        id: 'mk-fajr',
        nom: isArabic ? 'فندق فجر النسك أجياد (لؤلؤة الشرق)' : 'Hôtel Fajr Al Nusuk Ajyad (Ex: Lou\'louat Al Sharq)',
        nom_ar: 'فندق فجر النسك أجياد (لؤلؤة الشرق)',
        etoiles: 4,
        nbr_etoiles: 4,
        lat: 21.4168,
        lng: 39.8296,
        distanceMeters: 450,
        distance_metres: 450,
        distanceLabel: isArabic ? '450 متر عن ساحات الحرم' : '450 mètres du Haram',
        walkingTime: isArabic ? '6 إلى 7 دقائق سيراً' : '6 à 7 min à pied',
        temps_marche: '6 à 7 min à pied',
        porte: isArabic ? 'شارع أجياد المصافي وباب أجياد' : 'Rue Ajyad Al Masafi & Porte Ajyad',
        porte_proche: 'Rue Ajyad Al Masafi & Porte Ajyad',
        vue: isArabic ? 'مسار مشاة مباشر ومستقيم' : 'Accès piéton direct sans côte',
        hasView: false,
        vue_haram: false,
        isCloser: false,
        petit_dejeuner: true,
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80'
        ],
        description: isArabic 
          ? 'فندق معروف ومفضل في شارع أجياد المصافي، يتميز بالنظافة وحسن الاستقبال وسهولة الوصول إلى الحرم سيراً على الأقدام دون الحاجة لمواصلات.'
          : 'Hôtel très apprécié situé dans la rue Ajyad Al Masafi, réputé pour sa propreté et son accès piéton direct sans navette.'
      },
      {
        id: 'mk-nawazi',
        nom: isArabic ? 'فندق أبراج النوازي' : 'Hôtel Abraj Al Nawazi',
        nom_ar: 'فندق أبراج النوازي',
        etoiles: 4,
        nbr_etoiles: 4,
        lat: 21.4132,
        lng: 39.8288,
        distanceMeters: 800,
        distance_metres: 800,
        distanceLabel: isArabic ? '800 متر عن الحرم' : '800 mètres du Haram',
        walkingTime: isArabic ? '10 إلى 12 دقيقة (أو حافلات 24/24)' : '10 à 12 min (ou navette 24h/24)',
        temps_marche: '10 à 12 min (ou navette 24h/24)',
        porte: isArabic ? 'أجياد السد ومصاعد الحرم' : 'Ajyad & Navettes Haram',
        porte_proche: 'Ajyad & Navettes Haram',
        vue: isArabic ? 'غرف فسيحة وأسعار اقتصادية ممتازة' : 'Grandes chambres & tarifs avantageux',
        hasView: false,
        vue_haram: false,
        isCloser: false,
        petit_dejeuner: false,
        image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80'
        ],
        description: isArabic 
          ? 'مجمع فندقي فسيح يتميز بغرفه الواسعة وخدماته العائلية وأسعاره التنافسية مع توفر حافلات نقل منتظمة إلى ساحات الحرم.'
          : 'Grand complexe hôtelier idéal pour les familles et groupes, offrant d\'excellents tarifs avec service de navette continue.'
      }
    ],
    madinah: [
      {
        id: 'md1',
        nom: isArabic ? 'فندق دار التقوى المدينة 5★' : 'Dar Al Taqwa Hotel Madinah 5★',
        nom_ar: 'فندق دار التقوى المدينة 5★',
        etoiles: 5,
        nbr_etoiles: 5,
        lat: 24.4705,
        lng: 39.6118,
        distanceMeters: 0,
        distance_metres: 0,
        distanceLabel: isArabic ? 'ملاصق لساحة المسجد النبوي (0 متر)' : 'Face à la Mosquée du Prophète (0m)',
        walkingTime: isArabic ? 'دقيقة واحدة سيراً' : '1 min à pied',
        temps_marche: '1 min à pied',
        porte: isArabic ? 'باب النساء وباب السلام' : 'Porte des Femmes & Bab Al-Salam',
        porte_proche: 'Porte des Femmes & Bab Al-Salam',
        vue: isArabic ? 'إطلالة مباشرة على القبة الخضراء والروضة' : 'Vue directe sur le Dôme Vert & Rawdah',
        hasView: true,
        vue_haram: true,
        isCloser: true,
        petit_dejeuner: true,
        image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'
        ],
        description: isArabic 
          ? 'أحد أفخم فنادق المدينة المنورة على الإطلاق، يقع مباشرة أمام الساحة الشمالية للمسجد النبوي.'
          : 'Hôtel de référence à Médine, situé directement face au parvis avec vue sur le Dôme Vert.'
      },
      {
        id: 'md2',
        nom: isArabic ? 'فندق أوبروي المدينة 5★' : 'The Oberoi Madinah 5★',
        nom_ar: 'فندق أوبروي المدينة 5★',
        etoiles: 5,
        nbr_etoiles: 5,
        lat: 24.4712,
        lng: 39.6110,
        distanceMeters: 50,
        distance_metres: 50,
        distanceLabel: isArabic ? '50 متر عن ساحات الحرم' : '50 mètres du parvis',
        walkingTime: isArabic ? '1 دقيقة سيراً' : '1 min à pied',
        temps_marche: '1 min à pied',
        porte: isArabic ? 'الجهة الشمالية المركزية' : 'Cour Nord du Haram',
        porte_proche: 'Cour Nord du Haram',
        vue: isArabic ? 'إطلالة روحانية فريدة' : 'Vue spirituelle d\'exception',
        hasView: true,
        vue_haram: true,
        isCloser: true,
        petit_dejeuner: true,
        image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80'
        ],
        description: isArabic 
          ? 'خدمة ملكية رفيعة المستوى وموقع استثنائي يجعل أداء الصلوات في المسجد النبوي غاية في اليسر.'
          : 'Service princier et situation d\'exception pour rejoindre la prière en quelques secondes.'
      },
      {
        id: 'md3',
        nom: isArabic ? 'فندق أنوار المدينة موفنبيك 5★' : 'Anwar Al Madinah Mövenpick 5★',
        nom_ar: 'فندق أنوار المدينة موفنبيك 5★',
        etoiles: 5,
        nbr_etoiles: 5,
        lat: 24.4715,
        lng: 39.6095,
        distanceMeters: 80,
        distance_metres: 80,
        distanceLabel: isArabic ? '80 متر' : '80 mètres',
        walkingTime: isArabic ? '2 دقيقة سيراً' : '2 min à pied',
        temps_marche: '2 min à pied',
        porte: isArabic ? 'باب الملك فهد' : 'Porte Roi Fahd',
        porte_proche: 'Porte Roi Fahd',
        vue: isArabic ? 'أكبر مجمع فندقي متكامل في المدينة' : 'Accès direct parvis et centre commercial',
        hasView: true,
        vue_haram: true,
        isCloser: true,
        petit_dejeuner: true,
        image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
        gallery: [
          'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80'
        ],
        description: isArabic 
          ? 'فندق مفضل لدى المعتمرين الجزائريين بفضل مرافقه الكبيرة وقربه من بوابات دخول الرجال والنساء.'
          : 'Très apprécié pour ses facilités, ses ascenseurs directs et sa proximité immédiate des portes.'
      }
    ]
  };

  // Fetch Master Data Hotels from Supabase with Realtime listener
  const fetchMasterHotels = async () => {
    try {
      const { data, error } = await supabase
        .from('hotels')
        .select('*')
        .order('distance_metres', { ascending: true, nullsFirst: false });

      if (!error && data && data.length > 0) {
        setDbHotels(data);
      }
    } catch (err) {
      console.warn('Erreur chargement hôtels:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterHotels();

    // Subscribe to realtime database updates on hotels table
    const channel = supabase
      .channel('public:hotels')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotels' }, () => {
        fetchMasterHotels();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Format hotels from DB or Fallback
  const getCityHotels = (cityKey) => {
    const matchedFromDb = dbHotels.filter(h => isCityMatch(h.location, cityKey));

    if (matchedFromDb.length > 0) {
      return matchedFromDb.map(h => {
        const dist = h.distance_metres ?? 0;
        const defaultLat = (cityKey === 'medina') ? 24.4705 : 21.4195;
        const defaultLng = (cityKey === 'medina') ? 39.6118 : 39.8272;

        return {
          id: h.id,
          nom: isArabic ? (h.nom_ar || h.nom) : (h.nom || h.nom_ar),
          nom_ar: h.nom_ar || h.nom,
          etoiles: parseInt(h.nbr_etoiles) || 4,
          lat: (h.lat && !isNaN(h.lat)) ? parseFloat(h.lat) : defaultLat,
          lng: (h.lng && !isNaN(h.lng)) ? parseFloat(h.lng) : defaultLng,
          distanceMeters: dist,
          distanceLabel: (dist === 0) 
            ? (isArabic ? 'على ساحة الحرم مباشرة (0 متر)' : 'Sur l\'esplanade du Haram (0m)')
            : `${dist}m ${isArabic ? 'عن الحرم' : 'du Haram'}`,
          walkingTime: h.temps_marche || (isArabic ? `${Math.ceil(dist / 70)} دقيقة سيراً` : `${Math.ceil(dist / 70)} min à pied`),
          porte: h.porte_proche || (cityKey === 'medina' ? (isArabic ? 'باب السلام' : 'Bab Al-Salam') : (isArabic ? 'باب الملك عبد العزيز' : 'Porte Roi Abdulaziz')),
          vue: h.vue_haram ? (isArabic ? 'إطلالة مباشرة على الحرم' : 'Vue directe sur le Haram') : (isArabic ? 'راحة وسكينة' : 'Confort et sérénité'),
          hasView: h.vue_haram === true,
          isCloser: dist <= 250,
          petit_dejeuner: h.petit_dejeuner !== false,
          image: h.image || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
          gallery: (h.gallery && h.gallery.length > 0) ? h.gallery : [h.image || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'],
          description: isArabic ? (h.description_ar || h.description || '') : (h.description || h.description_ar || '')
        };
      });
    }

    return fallbackHotelsData[cityKey] || [];
  };

  const currentCityConfig = cityData[activeCity];
  const currentHotels = getCityHotels(activeCity);
  
  const filteredHotels = currentHotels.filter(hotel => {
    if (activeFilter === 'closer') return hotel.isCloser;
    if (activeFilter === 'view') return hotel.hasView;
    return true;
  });

  const selectedHotel = currentHotels.find(h => h.id === selectedHotelId) || currentHotels[0];

  const handleSelectCity = (city) => {
    setActiveCity(city);
    const newHotels = getCityHotels(city);
    if (newHotels.length > 0) {
      setSelectedHotelId(newHotels[0].id);
    }
  };

  // Ensure selectedHotelId is always valid on initial load
  useEffect(() => {
    if (!selectedHotelId && currentHotels.length > 0) {
      setSelectedHotelId(currentHotels[0].id);
    }
  }, [currentHotels, selectedHotelId]);

  // Custom Leaflet Markers
  const createHaramIcon = () => {
    return L.divIcon({
      className: 'custom-haram-pin',
      html: `
        <div style="
          width: 48px; 
          height: 48px; 
          background: linear-gradient(135deg, #D89F35, #dfb061); 
          border: 3px solid #ffffff; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 22px; 
          box-shadow: 0 0 25px rgba(216, 159, 53, 0.9), 0 6px 16px rgba(0,0,0,0.6);
        ">
          ${activeCity === 'makkah' ? '🕋' : '🕌'}
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });
  };

  // Precision Pointer Marker: The downward triangle tip points exactly to the GPS point!
  const createHotelIcon = (hotel, isSelected) => {
    const bgColor = isSelected ? '#34783B' : '#0f172a';
    const borderColor = isSelected ? '#ffffff' : '#D89F35';

    return L.divIcon({
      className: 'custom-hotel-pin-container',
      html: `
        <div style="
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
          transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          filter: drop-shadow(0 4px 10px rgba(0,0,0,0.6));
        ">
          <!-- Badge Box -->
          <div style="
            padding: 5px 9px;
            background: ${bgColor};
            color: #ffffff;
            border: 2px solid ${borderColor};
            border-radius: 10px;
            font-size: 11px;
            font-weight: 800;
            font-family: inherit;
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
          ">
            <span>⭐ ${hotel.etoiles}★</span>
            <span style="color: ${isSelected ? '#ffffff' : '#D89F35'};">${hotel.distanceMeters}m</span>
          </div>
          <!-- Precision Needle Tip -->
          <div style="
            width: 0; 
            height: 0; 
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 7px solid ${borderColor};
            margin-top: -1px;
          "></div>
        </div>
      `,
      iconSize: [95, 40],
      iconAnchor: [47.5, 37],
    });
  };

  return (
    <section id="hotels-radar" className="py-24 px-4 sm:px-6 relative max-w-7xl mx-auto border-t border-slate-200/60 dark:border-white/5">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider mb-4">
          <Navigation size={13} /> {t('radar_badge')}
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
          {t('radar_title')}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
          {t('radar_subtitle')}
        </p>
      </div>

      {/* City Switcher Tabs */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <button
          onClick={() => handleSelectCity('makkah')}
          className={cn(
            "px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-sm",
            activeCity === 'makkah'
              ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25 scale-105"
              : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10"
          )}
        >
          <span>{t('radar_tab_makkah')}</span>
        </button>

        <button
          onClick={() => handleSelectCity('madinah')}
          className={cn(
            "px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-sm",
            activeCity === 'madinah'
              ? "bg-brand-500 text-white shadow-lg shadow-brand-500/25 scale-105"
              : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10"
          )}
        >
          <span>{t('radar_tab_madinah')}</span>
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center justify-center gap-2 mb-10 overflow-x-auto pb-2">
        {[
          { id: 'all', label: t('radar_filter_all') },
          { id: 'closer', label: t('radar_filter_closer') },
          { id: 'view', label: t('radar_filter_view') },
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap",
              activeFilter === filter.id
                ? "bg-gold-500 text-white shadow-md shadow-gold-500/20"
                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Main Grid: Left = Real Interactive Map (Leaflet) / Right = Rich Hotel Photo Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Real Leaflet Map with GPS Coordinates */}
        <div className="lg:col-span-6 card-bezel-outer shadow-2xl sticky top-24">
          <div className="card-bezel-inner p-3 sm:p-4 bg-slate-900 text-white relative overflow-hidden flex flex-col">
            
            {/* Map Header with Satellite vs Streets Toggle */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 mb-3 text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2 text-gold-400 font-bold">
                <MapIcon size={15} />
                <span>{currentCityConfig.name}</span>
              </div>
              
              {/* Satellite vs Streets Layer Switcher */}
              <div className="flex items-center bg-white/10 rounded-lg p-0.5 border border-white/15">
                <button
                  type="button"
                  onClick={() => setMapLayerType('satellite')}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1",
                    mapLayerType === 'satellite' ? "bg-brand-500 text-white shadow-sm" : "text-slate-300 hover:text-white"
                  )}
                >
                  <Globe size={11} />
                  <span>Satellite HD</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayerType('streets')}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1",
                    mapLayerType === 'streets' ? "bg-brand-500 text-white shadow-sm" : "text-slate-300 hover:text-white"
                  )}
                >
                  <Layers size={11} />
                  <span>Plan</span>
                </button>
              </div>
            </div>

            {/* Leaflet Map Frame */}
            <div className="h-[460px] w-full rounded-2xl overflow-hidden border border-white/15 relative z-10">
              <MapContainer
                center={selectedHotel ? [selectedHotel.lat, selectedHotel.lng] : currentCityConfig.center}
                zoom={currentCityConfig.zoom}
                scrollWheelZoom={false}
                className="w-full h-full"
              >
                <MapController 
                  activeCity={activeCity}
                  selectedHotel={selectedHotel}
                  haramCenter={currentCityConfig.center} 
                />

                {/* Satellite Imagery (Esri HD) vs Streets Tile Layer */}
                {mapLayerType === 'satellite' ? (
                  <TileLayer
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={19}
                  />
                ) : (
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url={isDark 
                      ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    }
                  />
                )}

                {/* Central Haram Landmark Marker */}
                <Marker 
                  position={currentCityConfig.center} 
                  icon={createHaramIcon()}
                >
                  <Popup>
                    <div className="p-3 text-center text-slate-900 dark:text-white">
                      <span className="text-xl">{currentCityConfig.icon}</span>
                      <h4 className="font-bold text-sm mt-1">{currentCityConfig.name}</h4>
                      <p className="text-xs text-brand-600 font-bold mt-0.5">Centre 0m (Esplanade)</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Hotels Markers with Precision Pointer */}
                {currentHotels.map(hotel => {
                  const isSelected = hotel.id === selectedHotel?.id;
                  return (
                    <Marker
                      key={hotel.id}
                      position={[hotel.lat, hotel.lng]}
                      icon={createHotelIcon(hotel, isSelected)}
                      eventHandlers={{
                        click: () => setSelectedHotelId(hotel.id)
                      }}
                    >
                      <Popup>
                        <div className="p-3 text-left rtl:text-right max-w-[230px]">
                          <img 
                            src={hotel.image} 
                            alt={hotel.nom} 
                            className="w-full h-24 object-cover rounded-lg mb-2 shadow-sm cursor-pointer"
                            onClick={() => setSelectedPhoto(hotel.image)}
                          />
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">{hotel.nom}</h4>
                          <span className="text-[11px] text-brand-600 dark:text-brand-400 font-extrabold block mt-1">
                            📍 {hotel.distanceLabel}
                          </span>
                          <span className="text-[10px] text-slate-500 block mb-2">
                            🚶 {hotel.walkingTime}
                          </span>
                          <div className="flex flex-col gap-1.5">
                            <button
                              onClick={() => onSelectHotel && onSelectHotel(hotel)}
                              className="w-full py-1.5 rounded-lg bg-brand-500 text-white font-bold text-[10px] text-center"
                            >
                              {t('radar_quote_hotel')}
                            </button>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${hotel.lat},${hotel.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 font-semibold text-[9px] text-center flex items-center justify-center gap-1"
                            >
                              <ExternalLink size={10} /> Ouvrir Google Maps
                            </a>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>

            {/* Active Selected Hotel Banner below Map */}
            {selectedHotel && (
              <div className="mt-3 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 truncate">
                  <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 border border-white/20">
                    <img src={selectedHotel.image} alt={selectedHotel.nom} className="w-full h-full object-cover" />
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-white block truncate">{selectedHotel.nom}</span>
                    <span className="text-[11px] text-gold-400 font-mono">{selectedHotel.distanceLabel} • {selectedHotel.walkingTime}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedHotel.lat},${selectedHotel.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold flex items-center gap-1"
                    title="Voir sur Google Maps"
                  >
                    <ExternalLink size={11} />
                    <span className="hidden sm:inline">Google Maps</span>
                  </a>
                  <button
                    onClick={() => setSelectedPhoto(selectedHotel.image)}
                    className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-[10px] font-bold flex items-center gap-1"
                  >
                    <ImageIcon size={12} />
                    <span>{isArabic ? 'الصور' : 'Photos'}</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right: Hotel Cards with Photos & Proximity Badges */}
        <div className="lg:col-span-6 space-y-4">
          {filteredHotels.map(hotel => {
            const isSelected = hotel.id === selectedHotel?.id;

            return (
              <div
                key={hotel.id}
                onClick={() => setSelectedHotelId(hotel.id)}
                className={cn(
                  "card-bezel-outer transition-all duration-200 cursor-pointer text-left rtl:text-right overflow-hidden",
                  isSelected
                    ? "ring-2 ring-brand-500 border-brand-500/40 shadow-xl scale-[1.01]"
                    : "hover:border-slate-300 dark:hover:border-white/20"
                )}
              >
                <div className="card-bezel-inner p-5 bg-white dark:bg-obsidian-900/95 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                  
                  {/* Hotel Photo Thumbnail with Zoom Icon */}
                  <div 
                    className="relative w-full sm:w-36 h-28 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 dark:border-white/10 group/img"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPhoto(hotel.image);
                    }}
                  >
                    <img 
                      src={hotel.image} 
                      alt={hotel.nom} 
                      className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <ImageIcon size={18} />
                    </div>
                    {/* Stars Badge on Image */}
                    <div className="absolute bottom-1.5 left-1.5 rtl:left-auto rtl:right-1.5 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm text-gold-400 text-[10px] font-bold">
                      ⭐ {hotel.etoiles}★
                    </div>
                  </div>

                  {/* Hotel Information */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Distance Pill */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 font-mono">
                        <MapPin size={11} /> {hotel.distanceLabel}
                      </span>

                      {/* Breakfast Badge */}
                      {hotel.petit_dejeuner && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          <Coffee size={10} /> {isArabic ? 'شامل الإفطار' : 'Petit-déjeuner inclus'}
                        </span>
                      )}

                      {/* View badge if applicable */}
                      {hotel.hasView && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gold-500/10 text-gold-600 dark:text-gold-400 border border-gold-500/20">
                          <Eye size={10} /> {hotel.vue}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {hotel.nom}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {hotel.description}
                    </p>

                    {/* Proximity Details */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                        <Footprints size={13} className="text-brand-500" /> {hotel.walkingTime}
                      </span>
                      <span className="flex items-center gap-1 truncate text-[11px]">
                        <DoorOpen size={13} className="text-gold-500 flex-shrink-0" /> {hotel.porte}
                      </span>
                    </div>
                  </div>

                  {/* Select & Quote CTA */}
                  <div className="sm:text-right rtl:sm:text-left flex-shrink-0 flex flex-col gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectHotel) onSelectHotel(hotel);
                      }}
                      className={cn(
                        "w-full sm:w-auto px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2",
                        isSelected
                          ? "bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/25"
                          : "bg-slate-100 dark:bg-white/10 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-500 text-slate-800 dark:text-slate-200"
                      )}
                    >
                      <span>{t('radar_quote_hotel')}</span>
                      <ArrowIcon size={13} />
                    </button>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${hotel.lat},${hotel.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] text-slate-400 hover:text-brand-500 flex items-center justify-center gap-1 font-semibold transition-colors"
                    >
                      <ExternalLink size={10} /> Google Maps
                    </a>
                  </div>

                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Lightbox Photo Preview Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl border border-white/20">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors z-20"
            >
              <X size={18} />
            </button>
            <img 
              src={selectedPhoto} 
              alt="Hôtel Aperçu" 
              className="w-full h-full object-contain max-h-[80vh] bg-black" 
            />
          </div>
        </div>
      )}

    </section>
  );
};
