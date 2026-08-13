import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { OmraStepImageSlider } from '@/components/OmraStepImageSlider';
import { 
  Plane, Hotel, Compass, Heart, Bus, Sparkles, 
  MapPin, CheckCircle2, ShieldCheck, Clock, Users, 
  ArrowRight, ArrowLeft, ChevronDown, Award, Gift, 
  Calendar, Check, HelpCircle, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Icon Map for dynamic icons from Supabase
const ICON_MAP = {
  Plane,
  Hotel,
  Sparkles,
  Compass,
  Bus,
  Heart,
  MapPin,
  Gift,
  Award,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Users
};

export const UmrahProgramPage = ({ onOpenQuoteModal }) => {
  const { t, isArabic } = useLanguage();
  const [openFaq, setOpenFaq] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);

  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  // Default curated steps with multi-image sliders
  const defaultTimelineSteps = [
    {
      step: "01",
      location: isArabic ? "مطار الجزائر / وهران / قسنطينة" : "Aéroports d'Alger / Oran / Constantine",
      locationBadge: isArabic ? "انطلاق من الجزائر" : "Départ d'Algérie",
      title: isArabic ? "الإنطلاق من الجزائر إلى المدينة في رحلة مباشرة" : "Départ d'Algérie vers Médine en Vol Direct",
      desc: isArabic 
        ? "تجمع المعتمرين في المطار، استقبال من طرف منسقي الوكالة وتسهيل إجراءات التسجيل وتسليم وثائق السفر، ثم الإقلاع في رحلة جوية مريحة ومباشرة دون توقف نحو مطار الأمير محمد بن عبد العزيز بالمدينة المنورة."
        : "Rendez-vous à l'aéroport avec accueil personnalisé par nos coordinateurs. Assistance complète à l'enregistrement et remise des pochettes de voyage, puis décollage en vol direct sans escale vers l'Aéroport International Prince Mohammad Bin Abdulaziz de Médine.",
      perks: [
        isArabic ? "رحلة مباشرة بدون ترانزيت" : "Vol direct sans escale",
        isArabic ? "مرافقة ومساعدة بالمطار" : "Assistance personnalisée à l'aéroport",
        isArabic ? "أمتعة مسموحة سخية" : "Franchise bagages généreuse"
      ],
      icon: Plane,
      images: [
        {
          id: "def-01-1",
          url: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Aéroport International d'Alger",
          title_ar: "مطار الجزائر الدولي",
          desc_fr: "Accueil VIP et formalités rapides",
          desc_ar: "استقبال راقٍ وتسهيل إجراءات السفر"
        },
        {
          id: "def-01-2",
          url: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Vol Direct Confortable",
          title_ar: "رحلة جوية مباشرة ومريحة",
          desc_fr: "Flotte moderne et collation à bord",
          desc_ar: "أسطول طائرات حديث مع وجبات وضيافة"
        },
        {
          id: "def-01-3",
          url: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Arrivée à Médine Al-Munawwarah",
          title_ar: "الوصول إلى مطار الأمير محمد بالمدينة",
          desc_fr: "Accueil chaleureux par l'équipe sur place",
          desc_ar: "استقبال بالورود وتسهيل نقل الأمتعة"
        }
      ]
    },
    {
      step: "02",
      location: isArabic ? "المدينة المنورة — المنطقة المركزية" : "Médine — Zone Centrale Markazia",
      locationBadge: isArabic ? "المسجد النبوي الشريف" : "Masjid An-Nabawi",
      title: isArabic ? "الإقامة في المدينة في فنادق قريبة من المسجد النبوي ومختارة بعناية" : "Hébergement à Médine à Proximité Immédiate du Haram",
      desc: isArabic
        ? "الوصول للمدينة المنورة والانتقال عبر حافلاتنا الخاصة للفندق. التسكين في غرف فاخرة ومجهزة بفنادق 4 و 5 نجوم تبعد خطوات معدودة عن ساحات المسجد النبوي الشريف لأداء الصلوات الخمس بكل راحة وسكينة."
        : "Arrivée à Médine et transfert privatif vers votre hôtel. Installation dans des chambres raffinées au sein d'hôtels 4★ ou 5★ soigneusement sélectionnés, situés à quelques minutes à pied des portes de la Mosquée du Prophète (ﷺ).",
      perks: [
        isArabic ? "قرب فائق من الحرم النبوي" : "Accès à pied immédiat (2 à 5 min)",
        isArabic ? "فنادق 4★ و 5★ مصنفة" : "Hôtels 4★ et 5★ certifiés",
        isArabic ? "إفطار صباحي راقٍ ومتنوع" : "Buffets de petit-déjeuner inclus"
      ],
      icon: Hotel,
      images: [
        {
          id: "def-02-1",
          url: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Hôtel de Prestige à Médine",
          title_ar: "فندق راقٍ بالمنطقة المركزية",
          desc_fr: "Chambres spacieuses à 2 pas du Haram",
          desc_ar: "غرف فندقية مجهزة بإطلالات مميزة"
        },
        {
          id: "def-02-2",
          url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Confort & Suites Familiales",
          title_ar: "أجنحة فندقية عائلية فاخرة",
          desc_fr: "Service hôtelier d'exception 24h/24",
          desc_ar: "خدمة غرف ممتازة على مدار الساعة"
        },
        {
          id: "def-02-3",
          url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Buffets & Restauration Raffinée",
          title_ar: "بوفيهات إفطار ومطاعم متنوعة",
          desc_fr: "Saveurs orientales et internationales",
          desc_ar: "تشكيلة أطباق لذيذة ومتنوعة"
        }
      ]
    },
    {
      step: "03",
      location: isArabic ? "الروضة الشريفة — المسجد النبوي" : "Noble Rawdah Ash-Sharifah",
      locationBadge: isArabic ? "روضة من رياض الجنة" : "Jardin du Paradis",
      title: isArabic ? "الصلاة في الروضة الشريفة والسلام على رسول الله ﷺ" : "Prière Sacrée dans la Noble Rawdah & Salutations",
      desc: isArabic
        ? "حجز وتأكيد التصاريح الرسمية عبر منصة 'نسك' المعتمدة لجميع المعتمرين. مرافقة خاصة للدخول إلى الروضة الشريفة للصلاة في هذا المكان المبارك والسلام على النبي ﷺ وصاحبيه أبي بكر وعمر رضي الله عنهما."
        : "Réservation garantie des créneaux officiels via l'application Nusuk pour chaque pèlerin. Accompagnement spirituel pour prier dans la Noble Rawdah et adresser les salutations au Messager d'Allah (ﷺ) et à ses deux compagnons Abou Bakr et Omar (qu'Allah les agrée).",
      perks: [
        isArabic ? "تصريح نسك رسمي مضمون" : "Permis Nusuk officiel garanti",
        isArabic ? "تنظيم وتوجيه روحي للمجموعات" : "Encadrement par nos guides",
        isArabic ? "أوقات مخصصة للرجال والنساء" : "Créneaux dédiés hommes & femmes"
      ],
      icon: Sparkles,
      images: [
        {
          id: "def-03-1",
          url: "https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Mosquée du Prophète (ﷺ)",
          title_ar: "المسجد النبوي الشريف",
          desc_fr: "Moments de paix et de spiritualité",
          desc_ar: "أجواء من السكينة والطمأنينة"
        },
        {
          id: "def-03-2",
          url: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1000&auto=format&fit=crop",
          title_fr: "La Noble Rawdah",
          title_ar: "الروضة الشريفة المباركة",
          desc_fr: "Prière et invocations exaucées",
          desc_ar: "الصلاة والسلام على النبي وصاحبيه"
        }
      ]
    },
    {
      step: "04",
      location: isArabic ? "قباء، أحد، والشهداء — المدينة" : "Quba, Uhud & Palmeraies de Médine",
      locationBadge: isArabic ? "مزارات المدينة" : "Ziyarates Médine",
      title: isArabic ? "مزارات المدينة المنورة (مسجد قباء، جبل أحد، مقبرة الشهداء، ومزارع التمور)" : "Visites Spirituelles & Historiques de Médine",
      desc: isArabic
        ? "جولة ميدانية مع مرشدينا لزيارة مسجد قباء (أول مسجد أُسس على التقوى) والصلاة فيه، جبل أحد ومقبرة شهداء أحد لاستحضار السيرة النبوية العطرة، تليها زيارة مزرعة تمور نموذجية لشراء وتذوق تمور العجوة المباركة."
        : "Circuit guidé en autocar avec nos guides : prière à la Mosquée de Quba (première mosquée bâtie en Islam), halte historique au Mont Uhud et recueillement au Cimetière des Martyrs, suivi de la visite d'une palmeraie réputée pour découvrir et déguster les dattes Ajwa de Médine.",
      perks: [
        isArabic ? "حافلات حديثة ومكيفة للمزارات" : "Autocars climatisés grand confort",
        isArabic ? "شرح تاريخي وروحي وافٍ" : "Récits historiques par nos imams",
        isArabic ? "زيارة مزارع تمور العجوة الأصلية" : "Dégustation & achat de dattes Ajwa"
      ],
      icon: Compass,
      images: [
        {
          id: "def-04-1",
          url: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Mosquée de Quba",
          title_ar: "مسجد قباء المبارك",
          desc_fr: "Première mosquée de l'Islam",
          desc_ar: "أول مسجد أُسس على التقوى"
        },
        {
          id: "def-04-2",
          url: "https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Mont Uhud & Martyrs",
          title_ar: "جبل أحد ومقبرة الشهداء",
          desc_fr: "Recueillement historique et spirituel",
          desc_ar: "استحضار بطولات الصحابة الكرام"
        },
        {
          id: "def-04-3",
          url: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Palmeraies & Dattes Ajwa",
          title_ar: "مزارع تمور العجوة بالمدينة",
          desc_fr: "Dégustation directe de dattes fraîches",
          desc_ar: "تذوق وشراء أجود أنواع تمور المدينة"
        }
      ]
    },
    {
      step: "05",
      location: isArabic ? "طريق الهجرة السريع — نحو مكة" : "Route de l'Hégire Médine ➔ La Mecque",
      locationBadge: isArabic ? "تنقل VIP مريح" : "Transfert Grand Confort",
      title: isArabic ? "النزول إلى مكة المكرمة في باصات جديدة ومجهزة بأحدث وسائل الراحة" : "Transfert vers La Mecque en Autocars Récents VIP",
      desc: isArabic
        ? "الانطلاق نحو العاصمة المقدسة على متن أحدث حافلات النقل السياحي (موديل السنة) المزودة بتكييف عالي الكفاءة، مقاعد وثيرية مريحة قابلة للإمالة، منافذ شحن الهواتف، وتوزيع مياه وعصائر ومأكولات خفيفة طوال الطريق."
        : "Départ pour La Mecque à bord d'autocars touristiques de dernière génération. Véhicules équipés d'une climatisation performante, de sièges ergonomiques grand confort, de prises USB et d'une distribution de rafraîchissements tout au long du trajet.",
      perks: [
        isArabic ? "أسطول حافلات حديث ومريح" : "Flotte d'autocars récents",
        isArabic ? "مقاعد مريحة ومنافذ شحن USB" : "Sièges inclinables & ports de charge",
        isArabic ? "توزيع مياه وضيافة خفيفة" : "Collation & boissons fraîches"
      ],
      icon: Bus,
      images: [
        {
          id: "def-05-1",
          url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Autocars VIP Grand Tourisme",
          title_ar: "حافلات سياحية VIP حديثة",
          desc_fr: "Climatisation intégrale et sièges inclinables",
          desc_ar: "راحة تامة وتكييف ممتاز طوال الرحلة"
        },
        {
          id: "def-05-2",
          url: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Trajet Médine ➔ Makkah",
          title_ar: "طريق الهجرة النبوية الشريفة",
          desc_fr: "Accompagnement et chants spirituels",
          desc_ar: "أجواء إيمانية مع التلبية والذكر"
        }
      ]
    },
    {
      step: "06",
      location: isArabic ? "ميقات ذو الحليفة (آبار علي)" : "Miqat Dhul Hulayfah (Abiyar Ali)",
      locationBadge: isArabic ? "الإحرام والتلبية" : "Entrée en Ihram",
      title: isArabic ? "التوقف في ميقات ذو الحليفة للإحرام والتلبية" : "Arrêt Sacré au Miqat Dhul Hulayfah & Entrée en Ihram",
      desc: isArabic
        ? "التوقف عند مسجد الميقات للاغتسال والتطيب ولبس ثياب الإحرام للرجال، وعقد نية العمرة جماعياً خلف المرشد الديني مع انطلاق حناجر المعتمرين بالتلبية الموحدة: 'لبيك اللهم لبيك، لبيك لا شريك لك لبيك'."
        : "Halte rituelle au Miqat pour accomplir les prières, revêtir la tenue sacrée d'Ihram, formuler solennellement l'intention (Niyyah) de l'Omra avec notre guide, et débuter la récitation collective et fervente de la Talbiyah : « Labbayka Allahumma Labbayk ».",
      perks: [
        isArabic ? "توجيه وتذكير بأحكام الإحرام" : "Explication détaillée des interdits",
        isArabic ? "وقت كافٍ للصلاة والتجهيز" : "Temps dédié au recueillement",
        isArabic ? "تلبية جماعية بصوت موحد" : "Talbiyah collective encadrée"
      ],
      icon: Heart,
      images: [
        {
          id: "def-06-1",
          url: "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Mosquée du Miqat Dhul Hulayfah",
          title_ar: "مسجد الميقات (ذو الحليفة)",
          desc_fr: "Lieu de sacralisation pour l'Omra",
          desc_ar: "عقد النية ولبس الإحرام والتلبية"
        },
        {
          id: "def-06-2",
          url: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Émotion & Ferveur de l'Ihram",
          title_ar: "خشوع وتلبية موحدة",
          desc_fr: "« Labbayk Allahumma Labbayk »",
          desc_ar: "لبيك اللهم عمرة لا رياء فيها ولا سُمعة"
        }
      ]
    },
    {
      step: "07",
      location: isArabic ? "المسجد الحرام — الكعبة المشرفة" : "Masjid Al-Haram — La Sainte Kaaba",
      locationBadge: isArabic ? "أداء مناسك العمرة" : "Rituels de l'Omra",
      title: isArabic ? "الوصول لمكة المكرمة وأداء مناسك العمرة بمرافقة وإرشاد" : "Arrivée à La Mecque & Accomplissement de l'Omra",
      desc: isArabic
        ? "الوصول إلى مكة وتفريغ الأمتعة بالفندق، ثم التوجه جماعياً تحت قيادة المرشد الديني إلى الحرم المكي لأداء الطواف حول الكعبة المشرفة، ركعتي الطواف خلف مقام إبراهيم، الشرب من ماء زمزم، ثم السعي بين الصفا والمروة والتحلل من الإحرام."
        : "Arrivée à La Mecque, installation à l'hôtel, puis entrée au Masjid Al-Haram sous la conduite d'un guide spirituel : Tawaf autour de la Sainte Kaaba, prière derrière le Maqam Ibrahim, eau bénite de Zamzam, Sa'i entre Safa et Marwah et désacralisation (Tahallul).",
      perks: [
        isArabic ? "مرافقة خطوة بخطوة أثناء الطواف والسعي" : "Accompagnement guidé du Tawaf au Sa'i",
        isArabic ? "توفير أجهزة صوتية لسماع الأدعية" : "Écoute claire des invocations",
        isArabic ? "مساعدة كبار السن وذوي الاحتياجات" : "Assistance dédiée aux aînés"
      ],
      icon: Sparkles,
      images: [
        {
          id: "def-07-1",
          url: "https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=1000&auto=format&fit=crop",
          title_fr: "La Sainte Kaaba — Masjid Al-Haram",
          title_ar: "الكعبة المشرفة والحرم المكي",
          desc_fr: "Tawaf autour de la Maison Sacrée",
          desc_ar: "طواف الخشوع والدعاء المستجاب"
        },
        {
          id: "def-07-2",
          url: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Le Sa'i entre Safa et Marwah",
          title_ar: "السعي بين الصفا والمروة",
          desc_fr: "Parcours sacré sous air climatisé",
          desc_ar: "إتمام الأشواط السبعة والتحلل"
        },
        {
          id: "def-07-3",
          url: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Eau Bénite de Zamzam",
          title_ar: "الشرب من ماء زمزم المبارك",
          desc_fr: "Boisson bénie et guérison",
          desc_ar: "ماء زمزم لما شُرب له"
        }
      ]
    },
    {
      step: "08",
      location: isArabic ? "مكة المكرمة — أبراج البيت / المنطقة المركزية" : "La Mecque — Hôtels 4★ & 5★",
      locationBadge: isArabic ? "إقامة فاخرة بمكة" : "Séjour Haut de Gamme",
      title: isArabic ? "الإقامة في فنادق متميزة حسب اختيار ورغبة المعتمر" : "Séjour de Prestige dans des Hôtels d'Élite",
      desc: isArabic
        ? "التمتع بإقامة مريحة في فنادق عالمية المستوى حسب الباقة المختارة (أبراج البيت المطلة على الحرم، أو فنادق 5 نجوم فاخرة، أو فنادق راقية مع حافلات ترددية خاصة 24/24س) لضمان أقصى درجات الراحة والتفرغ للعبادة."
        : "Séjour dans des établissements de haut standing selon la formule choisie : hôtels avec vue directe sur la Kaaba (Abraj Al-Bait) ou hôtels 4★/5★ prestigieux avec navettes privées VIP 24h/24 pour rejoindre l'esplanade sacrée sans contrainte.",
      perks: [
        isArabic ? "خيارات متنوعة تلائم كل التطلعات" : "Formules Luxe, Confort et Économique",
        isArabic ? "حافلات ترددية خاصة على مدار الساعة" : "Navettes privées 24h/24 disponibles",
        isArabic ? "خدمات فندقية متكاملة" : "Room service & conciergerie 24/7"
      ],
      icon: Hotel,
      images: [
        {
          id: "def-08-1",
          url: "https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Vue Imprenable sur le Haram",
          title_ar: "إطلالة مباشرة على الحرم المكي",
          desc_fr: "Tours Abraj Al-Bait & Hôtels 5★",
          desc_ar: "إقامة ملكية في قلب مكة المكرمة"
        },
        {
          id: "def-08-2",
          url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Chambres & Suites Spacieuses",
          title_ar: "غرف وأجنحة فندقية راقية",
          desc_fr: "Équipements modernes et confort optimal",
          desc_ar: "أعلى معايير النظافة والراحة التامة"
        }
      ]
    },
    {
      step: "09",
      location: isArabic ? "منى، مزدلفة، عرفات، وجبل النور" : "Mina, Muzdalifah, Mont Arafat & Hira",
      locationBadge: isArabic ? "مزارات مكة المكرمة" : "Ziyarates La Mecque",
      title: isArabic ? "مزارات مكة المكرمة (منى، مزدلفة، جبل عرفات، وجبل النور)" : "Visite Guidée des Lieux Saints de La Mecque",
      desc: isArabic
        ? "رحلة تاريخية وإيمانية لاكتشاف مشاعر الحج المقدسة: وادي منى، مزدلفة، جبل الرحمة بصعيد عرفات الطاهر، والمرور بجبل النور الشاهد على نزول أول آيات القرآن الكريم في غار حراء، مع استعراض المعاني العظيمة لهذه المشاهد."
        : "Excursion mémorable sur les traces du Hajj et des événements majeurs de l'Islam : les vallées sacrées de Mina et Muzdalifah, le Mont Arafat (Jabal Ar-Rahmah) et le Mont Al-Nour abritant la célèbre Grotte de Hira où fut révélé le Saint Coran.",
      perks: [
        isArabic ? "استكشاف مشاعر الحج المباركة" : "Découverte des sites sacrés du Hajj",
        isArabic ? "شرح تفصيلي لمحطات السيرة" : "Récits historiques et spirituels",
        isArabic ? "فرص لالتقاط صور تذكارية" : "Halte panoramique à Jabal Ar-Rahmah"
      ],
      icon: MapPin,
      images: [
        {
          id: "def-09-1",
          url: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Mont Arafat — Jabal Ar-Rahmah",
          title_ar: "جبل الرحمة بصعيد عرفات الطاهر",
          desc_fr: "Lieu emblématique du pèlerinage",
          desc_ar: "وقفة إيمانية واستشعار لمشاعر الحج"
        },
        {
          id: "def-09-2",
          url: "https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Grotte de Hira — Mont Al-Nour",
          title_ar: "جبل النور وغار حراء المبارك",
          desc_fr: "Lieu de révélation de la première sourate",
          desc_ar: "مهبط الوحي وأول آيات القرآن الكريم"
        }
      ]
    },
    {
      step: "10",
      location: isArabic ? "مطار الملك عبد العزيز بجدة ➔ الجزائر" : "Aéroport de Djeddah ➔ Algérie",
      locationBadge: isArabic ? "عودة ميمونة بالسلامة" : "Retour Béni avec Zamzam",
      title: isArabic ? "العودة في رحلة مباشرة من مطار جدة إلى الجزائر مع ماء زمزم" : "Vol Direct Retour Djeddah ➔ Algérie avec Eau de Zamzam",
      desc: isArabic
        ? "توديع بيت الله الحرام بعد أداء طواف الوداع، النقل بحافلاتنا إلى مطار الملك عبد العزيز بجدة، إتمام إجراءات العودة وتسليم كل معتمر عبوة 5 لتر أصلية ومختومة من ماء زمزم المبارك كهدية من الوكالة."
        : "Accomplissement du Tawaf d'adieu (Tawaf Al-Wadaa), transfert VIP vers l'Aéroport International de Djeddah, assistance aux formalités de douane et remise du bidon de 5 litres d'eau bénite de Zamzam scellé pour chaque pèlerin.",
      perks: [
        isArabic ? "عبوة ماء زمزم 5 لتر رسمية لكل معتمر" : "Bidon d'eau de Zamzam 5L offert",
        isArabic ? "رحلة عودة مباشرة ومريحة" : "Vol direct vers l'Algérie",
        isArabic ? "استقبال ووداع بالورود والدعاء" : "Accompagnement jusqu'à l'embarquement"
      ],
      icon: Gift,
      images: [
        {
          id: "def-10-1",
          url: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Eau de Zamzam 5L Offerte",
          title_ar: "عبوة ماء زمزم الرسمية هدية",
          desc_fr: "Bidon scellé et certifié offert par l'agence",
          desc_ar: "عبوة 5 لتر أصلية ومغلفة لكل معتمر"
        },
        {
          id: "def-10-2",
          url: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1000&auto=format&fit=crop",
          title_fr: "Vol Direct Retour vers l'Algérie",
          title_ar: "رحلة العودة المباركة إلى أرض الوطن",
          desc_fr: "« Omra Maqboulah & Djanb Maghfour »",
          desc_ar: "عمرة مقبولة وذنب مغفور وسعي مشكور"
        }
      ]
    }
  ];

  // Fetch from Supabase
  useEffect(() => {
    fetchSteps();
  }, [isArabic]);

  const fetchSteps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('website_omra_steps')
        .select('*')
        .eq('is_active', true)
        .order('ordre', { ascending: true });

      if (!error && data && data.length > 0) {
        // Map database data
        const mapped = data.map((item, idx) => {
          const stepIcon = ICON_MAP[item.icon_name] || MapPin;
          return {
            id: item.id,
            step: item.step_number || String(idx + 1).padStart(2, '0'),
            location: isArabic ? (item.location_ar || item.location_fr) : item.location_fr,
            locationBadge: isArabic ? (item.location_badge_ar || item.location_badge_fr) : item.location_badge_fr,
            title: isArabic ? (item.title_ar || item.title_fr) : item.title_fr,
            desc: isArabic ? (item.desc_ar || item.desc_fr) : item.desc_fr,
            perks: Array.isArray(isArabic ? item.perks_ar : item.perks_fr) 
              ? (isArabic ? item.perks_ar : item.perks_fr) 
              : (Array.isArray(item.perks_fr) ? item.perks_fr : []),
            images: Array.isArray(item.images) ? item.images : [],
            icon: stepIcon
          };
        });
        setSteps(mapped);
      } else {
        // Fallback to rich defaults
        setSteps(defaultTimelineSteps);
      }
    } catch (err) {
      console.warn('Using default Omra steps fallback:', err);
      setSteps(defaultTimelineSteps);
    } finally {
      setLoading(false);
    }
  };

  const pillars = [
    {
      icon: Award,
      title: isArabic ? "إشراف ديني وإداري عالي المستوى" : "Encadrement Religieux & Administratif",
      desc: isArabic 
        ? "يرافقكم مرشدون وأئمة ذوو خبرة واسعة لشرح المناسك والإجابة على استفساراتكم خطوة بخطوة."
        : "Des guides religieux chevronnés et des coordinateurs bilingues vous accompagnent 24/7 pour un pèlerinage serein."
    },
    {
      icon: ShieldCheck,
      title: isArabic ? "فنادق مختارة ومطابقة للعهود" : "Hébergements Audités & Certifiés",
      desc: isArabic 
        ? "نضمن لكم فنادق حقيقية وقريبة تطابق تماماً الصور والمواصفات المتفق عليها دون أي مفاجآت."
        : "Des hôtels scrupuleusement audités, à proximité immédiate des mosquées saintes, conformes à nos engagements."
    },
    {
      icon: Bus,
      title: isArabic ? "أسطول نقل سياحي حديث" : "Flotte de Transport Récente & VIP",
      desc: isArabic 
        ? "جميع تنقلاتنا تتم بحافلات موديل حديث مجهزة بكافة وسائل الراحة والتكييف الممتاز."
        : "Tous nos déplacements s'effectuent à bord d'autocars modernes, climatisés et équipés de sièges tout confort."
    },
    {
      icon: Gift,
      title: isArabic ? "مفاجآت وهدايا تذكارية قيمة" : "Pack Cadeaux & Eau de Zamzam",
      desc: isArabic 
        ? "عبوة ماء زمزم 5 لتر رسمية لكل معتمر، حقائب سفر عالية الجودة، ومستلزمات الإحرام."
        : "Un bidon de 5L de Zamzam certifié scellé remis à chaque pèlerin, sacs de voyage et kit pèlerin offert."
    }
  ];

  const faqs = [
    {
      q: isArabic ? "ما هي شروط وإجراءات التسجيل في رحلة العمرة؟" : "Quelles sont les formalités requises pour s'inscrire ?",
      a: isArabic 
        ? "جواز سفر بيومتري صالح لأكثر من 6 أشهر، صور شمسية بخلفية بيضاء، وشهادة طبية أو لقاحات سارية المفعول حسب اشتراطات وزارة الحج والعمرة السعودية."
        : "Un passeport biométrique valide au moins 6 mois après la date de retour, des photos d'identité sur fond blanc et les vaccinations obligatoires en vigueur requises par les autorités saoudiennes."
    },
    {
      q: isArabic ? "هل تتكفل الوكالة بجميع إجراءات تأشيرة العمرة وتصاريح الروضة؟" : "L'agence gère-t-elle le visa et les permis de la Rawdah ?",
      a: isArabic 
        ? "نعم، نضمن استخراج التأشيرة الإلكترونية الرسمية وحجز المواعيد المؤكدة لدخول الروضة الشريفة عبر تطبيق نسك المعتمد لكافة المعتمرين."
        : "Absolument. Nous prenons en charge la délivrance intégrale du visa électronique et effectuons les réservations officielles des créneaux de la Noble Rawdah via la plateforme officielle Nusuk."
    },
    {
      q: isArabic ? "ما هي المسافة الفاصلة بين الفنادق والحرمين الشريفين؟" : "À quelle distance des mosquées saintes sont situés les hôtels ?",
      a: isArabic 
        ? "فنادقنا بالمدينة تقع بالمنطقة المركزية على بعد 2 إلى 5 دقائق مشياً، وفي مكة نوفر فنادق مواجهة لساحات الحرم أو فنادق فاخرة بحافلات ترددية 24/24س."
        : "À Médine, nos hôtels sont situés dans la zone centrale à 2-5 minutes à pied du Haram. À La Mecque, nous proposons des établissements face à l'esplanade ou avec navettes VIP privées 24h/24."
    },
    {
      q: isArabic ? "هل توجد رحلات مباشرة بدون توقف؟" : "Les vols sont-ils directs sans escale ?",
      a: isArabic 
        ? "نعم، جميع برامجنا المعتمدة تنطلق عبر رحلات جوية مباشرة دون ترانزيت من مطارات الجزائر، وهران، وقسنطينة نحو المدينة المنورة وجدة."
        : "Oui, la majorité de nos programmes sont opérés en vols directs sans escale au départ d'Alger, Oran et Constantine à destination de Médine et Djeddah."
    }
  ];

  const currentSteps = steps.length > 0 ? steps : defaultTimelineSteps;

  return (
    <main className="min-h-screen bg-slate-50/50 dark:bg-obsidian-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* ── 1. HERO SECTION ────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 px-4 sm:px-6 overflow-hidden border-b border-slate-200/60 dark:border-white/5">
        
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-500/10 dark:bg-brand-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 border border-brand-500/20 text-xs sm:text-sm font-bold tracking-wide shadow-xs">
            <Sparkles size={14} className="animate-pulse" />
            <span>{t('prog_badge')}</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight max-w-4xl mx-auto">
            {t('prog_hero_title')}
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
            {t('prog_hero_subtitle')}
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
            <Link
              to="/omra"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-black text-sm shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 group"
            >
              <span>{t('prog_cta_catalog')}</span>
              <ArrowIcon size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>

            <button
              onClick={() => onOpenQuoteModal && onOpenQuoteModal({ type: 'omra' })}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 border border-slate-200 dark:border-white/15 text-slate-800 dark:text-white font-bold text-sm shadow-sm transition-all"
            >
              {t('prog_cta_quote')}
            </button>
          </div>

          {/* Key Stats Pill Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-8 max-w-4xl mx-auto">
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-xs text-center">
              <span className="text-xl sm:text-2xl font-black text-brand-600 dark:text-brand-400 block font-mono">10</span>
              <span className="text-xs text-slate-500 font-medium">{isArabic ? 'محطات متكاملة' : 'Étapes clés planifiées'}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-xs text-center">
              <span className="text-xl sm:text-2xl font-black text-brand-600 dark:text-brand-400 block font-mono">100%</span>
              <span className="text-xs text-slate-500 font-medium">{isArabic ? 'رحلات طيران مباشرة' : 'Vols directs sans escale'}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-xs text-center">
              <span className="text-xl sm:text-2xl font-black text-brand-600 dark:text-brand-400 block font-mono">4★ & 5★</span>
              <span className="text-xs text-slate-500 font-medium">{isArabic ? 'فنادق قريبة وموثقة' : 'Hôtels proches des Harams'}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-xs text-center">
              <span className="text-xl sm:text-2xl font-black text-brand-600 dark:text-brand-400 block font-mono">5 Litres</span>
              <span className="text-xs text-slate-500 font-medium">{isArabic ? 'ماء زمزم هدية لكل معتمر' : 'Eau de Zamzam offerte'}</span>
            </div>
          </div>

        </div>
      </section>

      {/* ── 2. VERTICAL TIMELINE OF THE 10 STEPS ────────────────────────── */}
      <section className="py-16 sm:py-24 relative px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Section Sub-Header */}
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">
              {t('prog_timeline_title')}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              {t('prog_timeline_sub')}
            </p>
          </div>

          {/* Timeline Container */}
          <div className="relative">
            
            {/* Center Glowing Spine (Desktop) */}
            <div className="hidden md:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-gradient-to-b from-brand-500 via-emerald-500 to-amber-500 rounded-full opacity-40" />

            <div className="space-y-12 sm:space-y-16">
              {currentSteps.map((item, index) => {
                const isEven = index % 2 === 0;
                const StepIcon = item.icon || MapPin;

                return (
                  <div 
                    key={item.id || item.step || index}
                    className={cn(
                      "relative flex flex-col md:flex-row items-center gap-8",
                      isEven ? "md:flex-row-reverse" : ""
                    )}
                  >
                    {/* Step Content Card (50% width on Desktop) */}
                    <div className="w-full md:w-1/2">
                      <div className="bg-white dark:bg-[#141414] border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 group">
                        
                        {/* Top Meta Bar */}
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-bold">
                            <MapPin size={13} />
                            <span>{item.locationBadge}</span>
                          </span>

                          <span className="text-xs font-mono font-black text-slate-400 dark:text-slate-500">
                            {isArabic ? `المحطة ${item.step}` : `ÉTAPE ${item.step}`}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug mb-3 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                          {item.title}
                        </h3>

                        {/* Description */}
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
                          {item.desc}
                        </p>

                        {/* Inclusions / Highlights Badges */}
                        {Array.isArray(item.perks) && item.perks.length > 0 && (
                          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-white/5">
                            {item.perks.map((perk, pIdx) => (
                              <div key={pIdx} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>{perk}</span>
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    </div>

                    {/* Center Marker Pin */}
                    <div className="relative z-10 flex items-center justify-center shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-lg shadow-brand-500/30 border-2 border-white dark:border-[#0b0b0b]">
                        <StepIcon size={20} />
                      </div>
                    </div>

                    {/* Image Slider Card (50% width on Desktop) */}
                    <div className="w-full md:w-1/2">
                      <OmraStepImageSlider 
                        images={item.images}
                        stepTitle={item.title}
                        stepLocation={item.location}
                        isArabic={isArabic}
                      />
                    </div>

                  </div>
                );
              })}
            </div>

          </div>

        </div>
      </section>

      {/* ── 3. BENTO GRID : NOS 4 ENGAGEMENTS D'EXCELLENCE ─────────────── */}
      <section className="py-16 sm:py-24 bg-slate-100/60 dark:bg-[#101010] border-y border-slate-200/70 dark:border-white/5 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">
              {t('prog_bento_title')}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              {isArabic
                ? 'معايير صارمة وضمانات رسمية تقدمها وكالة المختار لتأمين راحتكم وسلامتكم طوال فترة الإقامة.'
                : 'Des standards rigoureux et des garanties officielles pour un séjour spirituel sans le moindre imprévu.'}
            </p>
          </div>

          {/* 4-Item Gapless Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pillars.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div 
                  key={idx}
                  className="bg-white dark:bg-[#161616] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                      <Icon size={24} />
                    </div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug">
                      {p.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── 4. FAQ ACCORDION ───────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          
          <div className="text-center mb-12 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-bold">
              <HelpCircle size={14} />
              <span>FAQ</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {t('prog_faq_title')}
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx}
                  className="bg-white dark:bg-[#141414] border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 dark:text-white transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={18} className={cn("shrink-0 text-slate-400 transition-transform duration-200", isOpen && "rotate-180 text-brand-500")} />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-white/5 pt-3 animate-in fade-in-50">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── 5. FINAL CALL TO ACTION BANNER ──────────────────────────────── */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-r from-brand-600 via-emerald-600 to-brand-700 text-white p-8 sm:p-12 shadow-2xl relative overflow-hidden text-center space-y-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
            <Sparkles size={13} />
            <span>{isArabic ? 'موسم 1447 / 2026' : 'Saison 1447 / 2026'}</span>
          </span>

          <h2 className="text-2xl sm:text-4xl font-black max-w-2xl mx-auto leading-tight">
            {isArabic 
              ? 'هل أنتم مستعدون لخوض هذه الرحلة الإيمانية المباركة؟' 
              : 'Prêt à vivre cette expérience spirituelle inoubliable ?'}
          </h2>

          <p className="text-xs sm:text-sm text-white/90 max-w-xl mx-auto leading-relaxed">
            {isArabic
              ? 'تواصلوا معنا الآن للاطلاع على تواريخ الرحلات القادمة وحجز مقاعدكم ومقاعد عائلاتكم بأفضل الأسعار.'
              : 'Consultez dès maintenant nos prochains départs et réservez votre formule d\'Omra auprès de notre équipe d\'experts.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/omra"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>{t('prog_cta_catalog')}</span>
              <ArrowIcon size={16} />
            </Link>

            <button
              onClick={() => onOpenQuoteModal && onOpenQuoteModal({ type: 'omra' })}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-brand-900/50 hover:bg-brand-900/70 border border-white/20 text-white font-bold text-sm transition-all"
            >
              {t('prog_cta_quote')}
            </button>
          </div>

        </div>
      </section>

    </main>
  );
};

export default UmrahProgramPage;
