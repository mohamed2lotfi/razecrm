// Constantes et utilitaires pour le constructeur et l'impression de badges

export const BADGE_DIMENSIONS = [
  { id: 'cr80_v', label: 'Standard Vertical (54 × 86 mm)', widthMm: 54, heightMm: 86, orientation: 'vertical' },
  { id: 'cr80_h', label: 'Standard Horizontal (86 × 54 mm)', widthMm: 86, heightMm: 54, orientation: 'horizontal' },
  { id: 'event_v', label: 'Événement Grand Vertical (70 × 100 mm)', widthMm: 70, heightMm: 100, orientation: 'vertical' },
  { id: 'event_large_v', label: 'Pochette A6 Vertical (105 × 148 mm)', widthMm: 105, heightMm: 148, orientation: 'vertical' },
  { id: 'custom', label: 'Dimensions Personnalisées', widthMm: 86, heightMm: 54, orientation: 'horizontal' },
];

export const AVAILABLE_FONTS = [
  { id: 'Cairo', label: 'Cairo (Recommandé Arabe Moderne)', family: "'Cairo', sans-serif" },
  { id: 'Amiri', label: 'Amiri (Calligraphie Traditionnelle)', family: "'Amiri', serif" },
  { id: 'Tajawal', label: 'Tajawal (Épuré & Géométrique)', family: "'Tajawal', sans-serif" },
  { id: 'Inter', label: 'Inter (Moderne & Neutre)', family: "'Inter', sans-serif" },
  { id: 'Arial', label: 'Arial', family: "Arial, sans-serif" },
];

export const BADGE_TOKENS_CONFIG = [
  {
    id: 'nom_arabe',
    label: 'Nom en Arabe',
    arabicLabel: 'اللقب بالعربية',
    defaultText: 'بلحوت',
    isRtl: true,
    category: 'pilgrim',
    defaultStyle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#0f172a',
      fontFamily: 'Cairo',
      align: 'right',
      prefix: '',
      isRtl: true
    }
  },
  {
    id: 'prenom_arabe',
    label: 'Prénom en Arabe',
    arabicLabel: 'الاسم بالعربية',
    defaultText: 'دانية',
    isRtl: true,
    category: 'pilgrim',
    defaultStyle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#0f172a',
      fontFamily: 'Cairo',
      align: 'right',
      prefix: '',
      isRtl: true
    }
  },
  {
    id: 'num_passeport',
    label: 'Numéro de Passeport',
    arabicLabel: 'رقم جواز السفر',
    defaultText: '231984572',
    isRtl: false,
    category: 'pilgrim',
    defaultStyle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#1e3a8a',
      fontFamily: 'Inter',
      align: 'left',
      prefix: '',
      isRtl: false
    }
  },
  {
    id: 'hotel_medina',
    label: 'Hôtel Médine',
    arabicLabel: 'فندق المدينة المنورة',
    defaultText: 'فندق ديوان روز',
    isRtl: true,
    category: 'hotels',
    defaultStyle: {
      fontSize: 13,
      fontWeight: 'bold',
      color: '#065f46',
      fontFamily: 'Cairo',
      align: 'right',
      prefix: '',
      isRtl: true
    }
  },
  {
    id: 'hotel_mecca',
    label: 'Hôtel Mecca',
    arabicLabel: 'فندق مكة المكرمة',
    defaultText: 'فندق فجر نسك أجياد',
    isRtl: true,
    category: 'hotels',
    defaultStyle: {
      fontSize: 13,
      fontWeight: 'bold',
      color: '#854d0e',
      fontFamily: 'Cairo',
      align: 'right',
      prefix: '',
      isRtl: true
    }
  },
  {
    id: 'tel_guide',
    label: 'Numéro Tél. Guide',
    arabicLabel: 'رقم هاتف المرشد',
    defaultText: '0547.50.52.93',
    isRtl: false,
    category: 'guide',
    defaultStyle: {
      fontSize: 13,
      fontWeight: 'bold',
      color: '#dc2626',
      fontFamily: 'Inter',
      align: 'left',
      prefix: '',
      isRtl: false
    }
  },
  {
    id: 'photo_pelerin',
    label: "Photo du Pèlerin",
    arabicLabel: 'صورة المعتمر',
    isImage: true,
    category: 'photo',
    defaultStyle: {
      width: 70,
      height: 90,
      borderRadius: 6,
      borderColor: '#cbd5e1',
      borderWidth: 1
    }
  }
];

export const SAMPLE_PILGRIM_PREVIEW = {
  nom_arabe: 'بلحوت',
  prenom_arabe: 'دانية',
  num_passeport: '231984572',
  hotel_medina: 'فندق ديوان روز',
  hotel_mecca: 'فندق فجر نسك أجياد',
  hotel_makkah: 'فندق فجر نسك أجياد',
  tel_guide: '0547.50.52.93',
  photo_url: null
};

// Modèle Officiel ONPO & El Mokhtar (Conforme aux badges officiels de la Omra en Algérie)
export const OFFICIAL_ONPO_TEMPLATE = {
  id: 'official_onpo',
  nom: 'Modèle Officiel ONPO & El Mokhtar (Standard Algérie)',
  isOfficial: true,
  width_mm: 75,
  height_mm: 120,
  orientation: 'vertical',
  is_default: true,
  background_url: null,
  tokens: []
};

// Modèle par défaut généré si aucun modèle n'a encore été sauvegardé
export const DEFAULT_INITIAL_TEMPLATE = {
  id: 'default-template-omra',
  nom: 'Badge Omra Standard (Vertical)',
  width_mm: 70,
  height_mm: 100,
  orientation: 'vertical',
  background_url: null, // Si null, utilise un fond sobre avec gradient élégant
  tokens: [
    {
      tokenId: 'photo_pelerin',
      xPercent: 24,
      yPercent: 32,
      width: 70,
      height: 90,
      borderRadius: 6,
      borderColor: '#cbd5e1',
      borderWidth: 1
    },
    {
      tokenId: 'prenom_arabe',
      xPercent: 68,
      yPercent: 28,
      fontSize: 18,
      fontWeight: 'bold',
      color: '#0f172a',
      fontFamily: 'Cairo',
      align: 'right',
      prefix: '',
      isRtl: true
    },
    {
      tokenId: 'nom_arabe',
      xPercent: 68,
      yPercent: 36,
      fontSize: 18,
      fontWeight: 'bold',
      color: '#0f172a',
      fontFamily: 'Cairo',
      align: 'right',
      prefix: '',
      isRtl: true
    },
    {
      tokenId: 'num_passeport',
      xPercent: 68,
      yPercent: 44,
      fontSize: 14,
      fontWeight: 'bold',
      color: '#1e3a8a',
      fontFamily: 'Inter',
      align: 'left',
      prefix: '',
      isRtl: false
    },
    {
      tokenId: 'hotel_mecca',
      xPercent: 50,
      yPercent: 62,
      fontSize: 14,
      fontWeight: 'bold',
      color: '#854d0e',
      fontFamily: 'Cairo',
      align: 'right',
      prefix: '',
      isRtl: true
    },
    {
      tokenId: 'hotel_medina',
      xPercent: 50,
      yPercent: 72,
      fontSize: 14,
      fontWeight: 'bold',
      color: '#065f46',
      fontFamily: 'Cairo',
      align: 'right',
      prefix: '',
      isRtl: true
    },
    {
      tokenId: 'tel_guide',
      xPercent: 50,
      yPercent: 84,
      fontSize: 13,
      fontWeight: 'bold',
      color: '#dc2626',
      fontFamily: 'Inter',
      align: 'center',
      prefix: '',
      isRtl: false
    }
  ],
  is_default: true
};
