import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { 
  Globe, Images, Plus, Trash2, ArrowUp, ArrowDown, 
  Upload, Eye, Check, Save, RefreshCw, ExternalLink, MapPin, 
  ChevronLeft, ChevronRight, Layers, MessageSquareQuote, Star,
  Edit2, Search, AlertCircle
} from 'lucide-react';

export const INITIAL_DEFAULT_STEPS = [
  {
    step_number: '01',
    ordre: 1,
    location_fr: "Aéroports d'Alger / Oran / Constantine",
    location_ar: 'مطار الجزائر / وهران / قسنطينة',
    location_badge_fr: "Départ d'Algérie",
    location_badge_ar: 'انطلاق من الجزائر',
    title_fr: "Départ d'Algérie vers Médine en Vol Direct",
    title_ar: 'الإنطلاق من الجزائر إلى المدينة في رحلة مباشرة',
    desc_fr: "Rendez-vous à l'aéroport avec accueil personnalisé par nos coordinateurs. Assistance complète à l'enregistrement et remise des pochettes de voyage, puis décollage en vol direct sans escale vers l'Aéroport International Prince Mohammad Bin Abdulaziz de Médine.",
    desc_ar: 'تجمع المعتمرين في المطار، استقبال من طرف منسقي الوكالة وتسهيل إجراءات التسجيل وتسليم وثائق السفر، ثم الإقلاع في رحلة جوية مريحة ومباشرة دون توقف نحو مطار الأمير محمد بن عبد العزيز بالمدينة المنورة.',
    icon_name: 'Plane',
    images: [
      {
        id: 'img-01-1',
        url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1000&auto=format&fit=crop',
        title_fr: "Aéroport International d'Alger",
        title_ar: 'مطار الجزائر الدولي',
        desc_fr: 'Accueil VIP et formalités rapides',
        desc_ar: 'استقبال راقٍ وتسهيل إجراءات السفر'
      },
      {
        id: 'img-01-2',
        url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'Vol Direct Confortable',
        title_ar: 'رحلة جوية مباشرة ومريحة',
        desc_fr: 'Flotte moderne et collation à bord',
        desc_ar: 'أسطول طائرات حديث مع وجبات وضيافة'
      },
      {
        id: 'img-01-3',
        url: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'Arrivée à Médine Al-Munawwarah',
        title_ar: 'الوصول إلى مطار الأمير محمد بالمدينة',
        desc_fr: "Accueil chaleureux par l'équipe sur place",
        desc_ar: 'استقبال بالورود وتسهيل نقل الأمتعة'
      }
    ]
  },
  {
    step_number: '02',
    ordre: 2,
    location_fr: 'Médine — Zone Centrale Markazia',
    location_ar: 'المدينة المنورة — المنطقة المركزية',
    location_badge_fr: 'Masjid An-Nabawi',
    location_badge_ar: 'المسجد النبوي الشريف',
    title_fr: 'Hébergement à Médine à Proximité Immédiate du Haram',
    title_ar: 'الإقامة في المدينة في فنادق قريبة من المسجد النبوي ومختارة بعناية',
    desc_fr: "Arrivée à Médine et transfert privatif vers votre hôtel. Installation dans des chambres raffinées au sein d'hôtels 4★ ou 5★ soigneusement sélectionnés, situés à quelques minutes à pied des portes de la Mosquée du Prophète (ﷺ).",
    desc_ar: 'الوصول للمدينة المنورة والانتقال عبر حافلاتنا الخاصة للفندق. التسكين في غرف فاخرة ومجهزة بفنادق 4 و 5 نجوم تبعد خطوات معدودة عن ساحات المسجد النبوي الشريف لأداء الصلوات الخمس بكل راحة وسكينة.',
    icon_name: 'Hotel',
    images: [
      {
        id: 'img-02-1',
        url: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'Hôtel de Prestige à Médine',
        title_ar: 'فندق راقٍ بالمنطقة المركزية',
        desc_fr: 'Chambres spacieuses à 2 pas du Haram',
        desc_ar: 'غرف فندقية مجهزة بإطلالات مميزة'
      },
      {
        id: 'img-02-2',
        url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'Confort & Suites Familiales',
        title_ar: 'أجنحة فندقية عائلية فاخرة',
        desc_fr: "Service hôtelier d'exception 24h/24",
        desc_ar: 'خدمة غرف ممتازة على مدار الساعة'
      },
      {
        id: 'img-02-3',
        url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'Buffets & Restauration Raffinée',
        title_ar: 'بوفيهات إفطار ومطاعم متنوعة',
        desc_fr: 'Saveurs orientales et internationales',
        desc_ar: 'تشكيلة أطباق لذيذة ومتنوعة'
      }
    ]
  },
  {
    step_number: '03',
    ordre: 3,
    location_fr: 'Noble Rawdah Ash-Sharifah',
    location_ar: 'الروضة الشريفة — المسجد النبوي',
    location_badge_fr: 'Jardin du Paradis',
    location_badge_ar: 'روضة من رياض الجنة',
    title_fr: 'Prière Sacrée dans la Noble Rawdah & Salutations',
    title_ar: 'الصلاة في الروضة الشريفة والسلام على رسول الله ﷺ',
    desc_fr: "Réservation garantie des créneaux officiels via l'application Nusuk pour chaque pèlerin. Accompagnement spirituel pour prier dans la Noble Rawdah et adresser les salutations au Messager d'Allah (ﷺ) et à ses deux compagnons Abou Bakr et Omar (qu'Allah les agrée).",
    desc_ar: "حجز وتأكيد التصاريح الرسمية عبر منصة 'نسك' المعتمدة لجميع المعتمرين. مرافقة خاصة للدخول إلى الروضة الشريفة للصلاة في هذا المكان المبارك والسلام على النبي ﷺ وصاحبيه أبي بكر وعمر رضي الله عنهما.",
    icon_name: 'Sparkles',
    images: [
      {
        id: 'img-03-1',
        url: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'Mosquée du Prophète (ﷺ)',
        title_ar: 'المسجد النبوي الشريف',
        desc_fr: 'Moments de paix et de spiritualité',
        desc_ar: 'أجواء من السكينة والطمأنينة'
      },
      {
        id: 'img-03-2',
        url: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'La Noble Rawdah',
        title_ar: 'الروضة الشريفة المباركة',
        desc_fr: 'Prière et invocations exaucées',
        desc_ar: 'الصلاة والسلام على النبي وصاحبيه'
      }
    ]
  },
  {
    step_number: '04',
    ordre: 4,
    location_fr: 'Quba, Uhud & Palmeraies de Médine',
    location_ar: 'قباء، أحد، والشهداء — المدينة',
    location_badge_fr: 'Ziyarates Médine',
    location_badge_ar: 'مزارات المدينة',
    title_fr: 'Visites Spirituelles & Historiques de Médine',
    title_ar: 'مزارات المدينة المنورة (مسجد قباء، جبل أحد، مقبرة الشهداء، ومزارع التمور)',
    desc_fr: "Circuit guidé en autocar avec nos guides : prière à la Mosquée de Quba (première mosquée bâtie en Islam), halte historique au Mont Uhud et recueillement au Cimetière des Martyrs, suivi de la visite d'une palmeraie réputée pour découvrir et déguster les dattes Ajwa de Médine.",
    desc_ar: 'جولة ميدانية مع مرشدينا لزيارة مسجد قباء (أول مسجد أُسس على التقوى) والصلاة فيه، جبل أحد ومقبرة شهداء أحد لاستحضار السيرة النبوية العطرة، تليها زيارة مزرعة تمور نموذجية لشراء وتذوق تمور العجوة المباركة.',
    icon_name: 'Compass',
    images: [
      {
        id: 'img-04-1',
        url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'Mosquée de Quba',
        title_ar: 'مسجد قباء المبارك',
        desc_fr: "Première mosquée de l'Islam",
        desc_ar: 'أول مسجد أُسس على التقوى'
      },
      {
        id: 'img-04-2',
        url: 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'Mont Uhud & Martyrs',
        title_ar: 'جبل أحد ومقبرة الشهداء',
        desc_fr: 'Recueillement historique et spirituel',
        desc_ar: 'استحضار بطولات الصحابة الكرام'
      },
      {
        id: 'img-04-3',
        url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'Palmeraies & Dattes Ajwa',
        title_ar: 'مزارع تمور العجوة بالمدينة',
        desc_fr: 'Dégustation directe de dattes fraîches',
        desc_ar: 'تذوق وشراء أجود أنواع تمور المدينة'
      }
    ]
  },
  {
    step_number: '05',
    ordre: 5,
    location_fr: "Route de l'Hégire Médine ➔ La Mecque",
    location_ar: 'طريق الهجرة السريع — نحو مكة',
    location_badge_fr: 'Transfert Grand Confort',
    location_badge_ar: 'تنقل VIP مريح',
    title_fr: 'Transfert vers La Mecque en Autocars Récents VIP',
    title_ar: 'النزول إلى مكة المكرمة في باصات جديدة ومجهزة بأحدث وسائل الراحة',
    desc_fr: "Départ pour La Mecque à bord d'autocars touristiques de dernière génération. Véhicules équipés d'une climatisation performante, de sièges ergonomiques grand confort, de prises USB et d'une distribution de rafraîchissements tout au long du trajet.",
    desc_ar: 'الانطلاق نحو العاصمة المقدسة على متن أحدث حافلات النقل السياحي (موديل السنة) المزودة بتكييف عالي الكفاءة، مقاعد وثيرية مريحة قابلة للإمالة، منافذ شحن الهواتف، وتوزيع مياه وعصائر ومأكولات خفيفة طوال الطريق.',
    icon_name: 'Bus',
    images: [
      {
        id: 'img-05-1',
        url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'Autocars VIP Grand Tourisme',
        title_ar: 'حافلات سياحية VIP حديثة',
        desc_fr: 'Climatisation intégrale et sièges inclinables',
        desc_ar: 'راحة تامة وتكييف ممتاز طوال الرحلة'
      },
      {
        id: 'img-05-2',
        url: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'Trajet Médine ➔ Makkah',
        title_ar: 'طريق الهجرة النبوية الشريفة',
        desc_fr: 'Accompagnement et chants spirituels',
        desc_ar: 'أجواء إيمانية مع التلبية والذكر'
      }
    ]
  },
  {
    step_number: '06',
    ordre: 6,
    location_fr: 'Miqat Dhul Hulayfah (Abiyar Ali)',
    location_ar: 'ميقات ذو الحليفة (آبار علي)',
    location_badge_fr: 'Entrée en Ihram',
    location_badge_ar: 'الإحرام والتلبية',
    title_fr: 'Arrêt Sacré au Miqat Dhul Hulayfah & Entrée en Ihram',
    title_ar: 'التوقف في ميقات ذو الحليفة للإحرام والتلبية',
    desc_fr: "Halte rituelle au Miqat pour accomplir les prières, revêtir la tenue sacrée d'Ihram, formuler solennellement l'intention (Niyyah) de l'Omra avec notre guide, et débuter la récitation collective et fervente de la Talbiyah : « Labbayka Allahumma Labbayk ».",
    desc_ar: "التوقف عند مسجد الميقات للاغتسال والتطيب ولبس ثياب الإحرام للرجال، وعقد نية العمرة جماعياً خلف المرشد الديني مع انطلاق حناجر المعتمرين بالتلبية الموحدة: 'لبيك اللهم لبيك، لبيك لا شريك لك لبيك'.",
    icon_name: 'Heart',
    images: [
      {
        id: 'img-06-1',
        url: 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'Mosquée du Miqat Dhul Hulayfah',
        title_ar: 'مسجد الميقات (ذو الحليفة)',
        desc_fr: "Lieu de sacralisation pour l'Omra",
        desc_ar: 'عقد النية ولبس الإحرام والتلبية'
      },
      {
        id: 'img-06-2',
        url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1000&auto=format&fit=crop',
        title_fr: "Émotion & Ferveur de l'Ihram",
        title_ar: 'خشوع وتلبية موحدة',
        desc_fr: '« Labbayk Allahumma Labbayk »',
        desc_ar: 'لبيك اللهم عمرة لا رياء فيها ولا سُمعة'
      }
    ]
  },
  {
    step_number: '07',
    ordre: 7,
    location_fr: 'Masjid Al-Haram — La Sainte Kaaba',
    location_ar: 'المسجد الحرام — الكعبة المشرفة',
    location_badge_fr: "Rituels de l'Omra",
    location_badge_ar: 'أداء مناسك العمرة',
    title_fr: "Arrivée à La Mecque & Accomplissement de l'Omra",
    title_ar: 'الوصول لمكة المكرمة وأداء مناسك العمرة بمرافقة وإرشاد',
    desc_fr: "Arrivée à La Mecque, installation à l'hôtel, puis entrée au Masjid Al-Haram sous la conduite d'un guide spirituel : Tawaf autour de la Sainte Kaaba, prière derrière le Maqam Ibrahim, eau bénite de Zamzam, Sa'i entre Safa et Marwah et désacralisation (Tahallul).",
    desc_ar: 'الوصول إلى مكة وتفريغ الأمتعة بالفندق، ثم التوجه جماعياً تحت قيادة المرشد الديني إلى الحرم المكي لأداء الطواف حول الكعبة المشرفة، ركعتي الطواف خلف مقام إبراهيم، الشرب من ماء زمزم، ثم السعي بين الصفا والمروة والتحلل من الإحرام.',
    icon_name: 'Sparkles',
    images: [
      {
        id: 'img-07-1',
        url: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'La Sainte Kaaba — Masjid Al-Haram',
        title_ar: 'الكعبة المشرفة والحرم المكي',
        desc_fr: 'Tawaf autour de la Maison Sacrée',
        desc_ar: 'طواف الخشوع والدعاء المستجاب'
      },
      {
        id: 'img-07-2',
        url: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'Le Sa’i entre Safa et Marwah',
        title_ar: 'السعي بين الصفا والمروة',
        desc_fr: 'Parcours sacré sous air climatisé',
        desc_ar: 'إتمام الأشواط السبعة والتحلل'
      },
      {
        id: 'img-07-3',
        url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'Eau Bénite de Zamzam',
        title_ar: 'الشرب من ماء زمزم المبارك',
        desc_fr: 'Boisson bénie et guérison',
        desc_ar: 'ماء زمزم لما شُرب له'
      }
    ]
  },
  {
    step_number: '08',
    ordre: 8,
    location_fr: 'La Mecque — Hôtels 4★ & 5★',
    location_ar: 'مكة المكرمة — أبراج البيت / المنطقة المركزية',
    location_badge_fr: 'Séjour Haut de Gamme',
    location_badge_ar: 'إقامة فاخرة بمكة',
    title_fr: "Séjour de Prestige dans des Hôtels d'Élite",
    title_ar: 'الإقامة في فنادق متميزة حسب اختيار ورغبة المعتمر',
    desc_fr: "Séjour dans des établissements de haut standing selon la formule choisie : hôtels avec vue directe sur la Kaaba (Abraj Al-Bait) ou hôtels 4★/5★ prestigieux avec navettes privées VIP 24h/24 pour rejoindre l'esplanade sacrée sans contrainte.",
    desc_ar: 'التمتع بإقامة مريحة في فنادق عالمية المستوى حسب الباقة المختارة (أبراج البيت المطلة على الحرم، أو فنادق 5 نجوم فاخرة، أو فنادق راقية مع حافلات ترددية خاصة 24/24س) لضمان أقصى درجات الراحة والتفرغ للعبادة.',
    icon_name: 'Hotel',
    images: [
      {
        id: 'img-08-1',
        url: 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'Vue Imprenable sur le Haram',
        title_ar: 'إطلالة مباشرة على الحرم المكي',
        desc_fr: 'Tours Abraj Al-Bait & Hôtels 5★',
        desc_ar: 'إقامة ملكية في قلب مكة المكرمة'
      },
      {
        id: 'img-08-2',
        url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'Chambres & Suites Spacieuses',
        title_ar: 'غرف وأجنحة فندقية راقية',
        desc_fr: 'Équipements modernes et confort optimal',
        desc_ar: 'أعلى معايير النظافة والراحة التامة'
      }
    ]
  },
  {
    step_number: '09',
    ordre: 9,
    location_fr: 'Mina, Muzdalifah, Mont Arafat & Hira',
    location_ar: 'منى، مزدلفة، عرفات، وجبل النور',
    location_badge_fr: 'Ziyarates La Mecque',
    location_badge_ar: 'مزارات مكة المكرمة',
    title_fr: 'Visite Guidée des Lieux Saints de La Mecque',
    title_ar: 'مزارات مكة المكرمة (منى، مزدلفة، جبل عرفات، وجبل النور)',
    desc_fr: "Excursion mémorable sur les traces du Hajj et des événements majeurs de l'Islam : les vallées sacrées de Mina et Muzdalifah, le Mont Arafat (Jabal Ar-Rahmah) et le Mont Al-Nour abritant la célèbre Grotte de Hira où fut révélé le Saint Coran.",
    desc_ar: 'رحلة تاريخية وإيمانية لاكتشاف مشاعر الحج المقدسة: وادي منى، مزدلفة، جبل الرحمة بصعيد عرفات الطاهر، والمرور بجبل النور الشاهد على نزول أول آيات القرآن الكريم في غار حراء، مع استعراض المعاني العظيمة لهذه المشاهد.',
    icon_name: 'Compass',
    images: [
      {
        id: 'img-09-1',
        url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'Mont Arafat — Jabal Ar-Rahmah',
        title_ar: 'جبل الرحمة بصعيد عرفات الطاهر',
        desc_fr: 'Lieu emblématique du pèlerinage',
        desc_ar: 'وقفة إيمانية واستشعار لمشاعر الحج'
      },
      {
        id: 'img-09-2',
        url: 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'Grotte de Hira — Mont Al-Nour',
        title_ar: 'جبل النور وغار حراء المبارك',
        desc_fr: 'Lieu de révélation de la première sourate',
        desc_ar: 'مهبط الوحي وأول آيات القرآن الكريم'
      }
    ]
  },
  {
    step_number: '10',
    ordre: 10,
    location_fr: 'Aéroport de Djeddah ➔ Algérie',
    location_ar: 'مطار الملك عبد العزيز بجدة ➔ الجزائر',
    location_badge_fr: 'Retour Béni avec Zamzam',
    location_badge_ar: 'عودة ميمونة بالسلامة',
    title_fr: 'Vol Direct Retour Djeddah ➔ Algérie avec Eau de Zamzam',
    title_ar: 'العودة في رحلة مباشرة من مطار جدة إلى الجزائر مع ماء زمزم',
    desc_fr: "Accomplissement du Tawaf d'adieu (Tawaf Al-Wadaa), transfert VIP vers l'Aéroport International de Djeddah, assistance aux formalités de douane et remise du bidon de 5 litres d'eau bénite de Zamzam scellé pour chaque pèlerin.",
    desc_ar: 'توديع بيت الله الحرام بعد أداء طواف الوداع، النقل بحافلاتنا إلى مطار الملك عبد العزيز بجدة، إتمام إجراءات العودة وتسليم كل معتمر عبوة 5 لتر أصلية ومختومة من ماء زمزم المبارك كهدية من الوكالة.',
    icon_name: 'Gift',
    images: [
      {
        id: 'img-10-1',
        url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1000&auto=format&fit=crop',
        title_fr: 'Eau de Zamzam 5L Offerte',
        title_ar: 'عبوة ماء زمزم الرسمية هدية',
        desc_fr: "Bidon scellé et certifié offert par l'agence",
        desc_ar: 'عبوة 5 لتر أصلية ومغلفة لكل معتمر'
      },
      {
        id: 'img-10-2',
        url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1000&auto=format&fit=crop',
        title_fr: "Vol Direct Retour vers l'Algérie",
        title_ar: 'رحلة العودة المباركة إلى أرض الوطن',
        desc_fr: '« Omra Maqboulah & Djanb Maghfour »',
        desc_ar: 'عمرة مقبولة وذنب مغفور وسعي مشكور'
      }
    ]
  }
];

export const INITIAL_DEFAULT_TESTIMONIALS = [
  {
    name: 'Karim Meziane',
    name_ar: 'كريم مزيان',
    handle: '@karim.travels • Alger',
    handle_ar: 'karim.travels@ • الجزائر',
    tag: '✈️ Vol Direct Alger - Istanbul',
    tag_ar: '✈️ حجز طيران مباشر وتذاكر إلكترونية',
    text: '« Réservation de nos billets d\'avion pour Istanbul en moins de 3 minutes sur la plateforme ! Émission instantanée des billets électroniques, choix des sièges côte à côte et zéro mauvaise surprise sur les bagages à l\'aéroport. »',
    text_ar: '« حجز تذاكر الطيران إلى إسطنبول تم في أقل من 3 دقائق على المنصة! إصدار فوري للتذاكر الإلكترونية، واختيار المقاعد المتجاورة وبدون أي مفاجآت في الأمتعة بالمطار. »',
    rating: 5,
    verified: 'Billet Confirmé & Émis',
    verified_ar: 'تذكرة مؤكدة ومصدرة',
    date_text: 'Il y a 3 jours',
    date_text_ar: 'منذ 3 أيام',
    avatar_gradient: 'from-emerald-600 to-teal-800',
    column_index: 1,
    ordre: 1,
    is_active: true
  },
  {
    name: 'Sarah & Yacine Benali',
    name_ar: 'سارة وياسين بن علي',
    handle: '@sarah_ben • Oran',
    handle_ar: 'sarah_ben@ • وهران',
    tag: '🇹🇷 Séjour Combiné Istanbul & Antalya',
    tag_ar: '🇹🇷 باقة مدمجة إسطنبول وأنطاليا',
    text: '« Le package multi-hôtels en Turquie était sensationnel ! 4 nuits dans un hôtel de charme au cœur de Sultanahmet puis 4 nuits dans un resort 5★ All-Inclusive à Antalya avec vols intérieurs inclus. »',
    text_ar: '« الباقة المتعددة الفنادق في تركيا كانت استثنائية! 4 ليالٍ في فندق ساحر بقلب السلطان أحمد ثم 4 ليالٍ في منتجع 5 نجوم شامل كلياً في أنطاليا مع الرحلات الداخلية المنسقة بدقة. »',
    rating: 5,
    verified: 'Package Séjour Validé',
    verified_ar: 'باقة سفر مكتملة',
    date_text: 'Il y a 1 semaine',
    date_text_ar: 'منذ أسبوع',
    avatar_gradient: 'from-amber-600 to-orange-800',
    column_index: 1,
    ordre: 2,
    is_active: true
  },
  {
    name: 'Dr. Amine Tahari',
    name_ar: 'د. أمين طاهري',
    handle: '@amine_tah • Constantine',
    handle_ar: 'amine_tah@ • قسنطينة',
    tag: '🚐 Transfert VIP Van Mercedes',
    tag_ar: '🚐 نقل خاص بسيارة فان VIP',
    text: '« Adieu les bus bondés et les heures d\'attente ! Dès notre atterrissage, notre chauffeur privé nous attendait avec une pancarte et un van Mercedes Vito spacieux et climatisé avec Wi-Fi. Confort absolu. »',
    text_ar: '« وداعاً للحافلات المزدحمة وساعات الانتظار! بمجرد هبوط الطائرة، كان سائقنا الخاص في انتظارنا بلافتة وسيارة فان مرسيدس فيتو مريحة ومكيفة مع واي فاي. راحة مطلقة لعائلتي. »',
    rating: 5,
    verified: 'Transfert Privé VIP',
    verified_ar: 'نقل خاص VIP',
    date_text: 'Il y a 2 semaines',
    date_text_ar: 'منذ أسبوعين',
    avatar_gradient: 'from-blue-600 to-indigo-800',
    column_index: 1,
    ordre: 3,
    is_active: true
  },
  {
    name: 'Hadj Mustapha B.',
    name_ar: 'الحاج مصطفى بوعلام',
    handle: '@mustapha_hadj • Alger',
    handle_ar: 'mustapha_hadj@ • الجزائر',
    tag: '🕋 Omra Prestige & Hôtel au pied du Haram',
    tag_ar: '🕋 عمرة متميزة وفندق بساحة الحرم',
    text: '« Une organisation exemplaire du départ jusqu\'au retour. Notre hôtel à La Mecque était à 100 mètres de l\'esplanade du Haram avec une vue imprenable. L\'accompagnement spirituel et Nusuk au top. »',
    text_ar: '« تنظيم محكم ومثالي من مطار الجزائر إلى غاية العودة. فندقنا في مكة كان على بعد 100 متر فقط من ساحة الحرم المكي مع إطلالة رائعة. المرافقة الإرشادية وإجراءات نسك كانت في قمة التميز. »',
    rating: 5,
    verified: 'Pèlerinage Confirmé',
    verified_ar: 'معتمر موثق',
    date_text: 'Il y a 5 jours',
    date_text_ar: 'منذ 5 أيام',
    avatar_gradient: 'from-yellow-600 to-amber-800',
    column_index: 2,
    ordre: 4,
    is_active: true
  },
  {
    name: 'Sofiane & Rania Khelil',
    name_ar: 'سفيان ورانية خليل',
    handle: '@sofiane_kh • Blida',
    handle_ar: 'sofiane_kh@ • البليدة',
    tag: '🇹🇷 Circuit Cappadoce & Istanbul',
    tag_ar: '🇹🇷 جولة كابادوكيا وإسطنبول',
    text: '« Le combiné hôtel troglodyte en Cappadoce avec l\'envolée en montgolfière et l\'hôtel 5★ sur le Bosphore était magique. Les transferts privés entre les aéroports et les hôtels à l\'heure exacte. »',
    text_ar: '« الجمع بين الإقامة في فندق الكهف في كابادوكيا وتجربة المنطاد، ثم فندق 5 نجوم على مضيق البوسفور كان ساحراً. النقل الخاص بين المطارات والفنادق كان دقيقاً في الموعد بالثانية. »',
    rating: 5,
    verified: 'Circuit Clé en Main',
    verified_ar: 'رحلة سياحية كاملة',
    date_text: 'Il y a 10 jours',
    date_text_ar: 'منذ 10 أيام',
    avatar_gradient: 'from-indigo-600 to-violet-800',
    column_index: 2,
    ordre: 5,
    is_active: true
  },
  {
    name: 'Leila Hamidi',
    name_ar: 'ليلى حميدي',
    handle: '@leila_travel • Tlemcen',
    handle_ar: 'leila_travel@ • تلمسان',
    tag: '🚐 Chauffeur Dédié & Berline Privée',
    tag_ar: '🚐 سيارة خاصة وسائق مخصص',
    text: '« Pour notre voyage, nous avons opté pour le forfait avec voiture privée dédiée pour toutes nos excursions au lieu des navettes collectives. Une liberté totale et des chauffeurs très professionnels. »',
    text_ar: '« في شهر العسل اخترنا باقة السيارة الخاصة لجميع جولاتنا بدل الحافلات السياحية. حرية كاملة وسائقون في غاية اللطف والمهنية. تجربة نوصي بها الجميع. »',
    rating: 5,
    verified: 'Prestation VIP Privée',
    verified_ar: 'خدمة VIP خاصة',
    date_text: 'Il y a 1 mois',
    date_text_ar: 'منذ شهر',
    avatar_gradient: 'from-purple-600 to-fuchsia-800',
    column_index: 2,
    ordre: 6,
    is_active: true
  },
  {
    name: 'Farid & Amina Zerrouki',
    name_ar: 'فريد وأمينة زروقي',
    handle: '@farid_zer • Sétif',
    handle_ar: 'farid_zer@ • سطيف',
    tag: '🚐 Van VIP Famille & Bagages',
    tag_ar: '🚐 فان مرسيدس عائلي خاص',
    text: '« Voyager avec 3 enfants et 5 valises peut vite devenir stressant, mais le service de transfert en van VIP privé a tout changé ! Chauffeur chaleureux, sièges enfants installés et bouteilles d\'eau fraîches. »',
    text_ar: '« السفر مع 3 أطفال و5 حقائب كان سيكون معقداً، لكن خدمة التوصيل بالفان الخاص أنقذت رحلتنا! سائق خدوم، مقاعد أطفال مجهزة، ومياه باردة. تجربة مريحة جداً. »',
    rating: 5,
    verified: 'Famille Confort VIP',
    verified_ar: 'راحة عائلية VIP',
    date_text: 'Il y a 4 jours',
    date_text_ar: 'منذ 4 أيام',
    avatar_gradient: 'from-emerald-700 to-green-900',
    column_index: 3,
    ordre: 7,
    is_active: true
  },
  {
    name: 'Fatima Zohra K.',
    name_ar: 'فاطمة الزهراء قاسي',
    handle: '@fz_kaci • Alger',
    handle_ar: 'fz_kaci@ • الجزائر',
    tag: '🕋 Omra VIP & Assistance 24/7',
    tag_ar: '🕋 عمرة مريحة ومرافقة 24/7',
    text: '« Voyage effectué avec mes parents âgés : l\'assistance dédiée et les transferts privés en voiture climatisée ont fait toute la différence. Nos guides étaient joignables sur WhatsApp pour le moindre besoin. »',
    text_ar: '« سافرت برفقة والديّ المسنين: المرافقة المخصصة وتوفير سيارات النقل الفردية المكيفة صنعت فارقاً كبيراً في رحلتنا. المرشدون كانوا دائماً متاحين على واتساب لأي مساعدة. »',
    rating: 5,
    verified: 'Pèlerine Vérifiée',
    verified_ar: 'معتمرة موثقة',
    date_text: 'Il y a 2 semaines',
    date_text_ar: 'منذ أسبوعين',
    avatar_gradient: 'from-pink-600 to-rose-800',
    column_index: 3,
    ordre: 8,
    is_active: true
  },
  {
    name: 'Walid Bencherif',
    name_ar: 'وليد بن شريف',
    handle: '@walid_b • Batna',
    handle_ar: 'walid_b@ • باتنة',
    tag: '🇹🇷 Istanbul Multi-Hôtels (Taksim & Bosphore)',
    tag_ar: '🇹🇷 تقسيم وأورتاكوي فندقان مختلفان',
    text: '« La possibilité de fractionner notre séjour entre 2 hôtels différents (3 nuits à Taksim pour le shopping + 3 nuits à Ortaköy sur le Bosphore) sans aucun surcoût logistique est un énorme plus ! »',
    text_ar: '« إمكانية تقسيم الإقامة بين فندقين مختلفين (3 ليالٍ في تقسيم للتسوق + 3 ليالٍ في أورتاكوي على البوسفور) بدون أي تعقيد لوجستي هي ميزة ممتازة لهذه الوكالة. »',
    rating: 5,
    verified: 'Séjour Personnalisé',
    verified_ar: 'باقة مخصصة',
    date_text: 'Il y a 1 mois',
    date_text_ar: 'منذ شهر',
    avatar_gradient: 'from-orange-600 to-amber-800',
    column_index: 3,
    ordre: 9,
    is_active: true
  }
];

const GRADIENT_OPTIONS = [
  { value: 'from-emerald-600 to-teal-800', label: 'Émeraude & Sarcelle' },
  { value: 'from-amber-600 to-orange-800', label: 'Ambre & Orange' },
  { value: 'from-blue-600 to-indigo-800', label: 'Bleu & Indigo' },
  { value: 'from-yellow-600 to-amber-800', label: 'Or & Ambre' },
  { value: 'from-indigo-600 to-violet-800', label: 'Indigo & Violet' },
  { value: 'from-purple-600 to-fuchsia-800', label: 'Pourpre & Fuchsia' },
  { value: 'from-pink-600 to-rose-800', label: 'Rose & Rubis' },
  { value: 'from-orange-600 to-amber-800', label: 'Orange & Cuivre' }
];

const WebsiteManagement = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('omra_program'); // 'omra_program' | 'testimonials'
  const [statusMessage, setStatusMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── OMRA STEPS STATE ─────────────────────────────────────────────
  const [steps, setSteps] = useState([]);
  const [editingStep, setEditingStep] = useState(null);
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);

  // New Slide Inputs
  const [newSlideUrl, setNewSlideUrl] = useState('');
  const [newSlideTitleFr, setNewSlideTitleFr] = useState('');
  const [newSlideTitleAr, setNewSlideTitleAr] = useState('');
  const [newSlideDescFr, setNewSlideDescFr] = useState('');
  const [newSlideDescAr, setNewSlideDescAr] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // ── TESTIMONIALS STATE ───────────────────────────────────────────
  const [testimonials, setTestimonials] = useState([]);
  const [testimonialSearch, setTestimonialSearch] = useState('');
  const [editingTestimonial, setEditingTestimonial] = useState(null);
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const emptyTestimonial = {
    name: '',
    name_ar: '',
    handle: '',
    handle_ar: '',
    tag: '🕋 Omra Prestige',
    tag_ar: '🕋 عمرة متميزة',
    text: '',
    text_ar: '',
    rating: 5,
    verified: 'Pèlerinage Confirmé',
    verified_ar: 'معتمر موثق',
    date_text: 'Il y a 3 jours',
    date_text_ar: 'منذ 3 أيام',
    avatar_url: '',
    avatar_gradient: 'from-emerald-600 to-teal-800',
    column_index: 1,
    is_active: true,
    ordre: 1
  };

  useEffect(() => {
    fetchSteps();
    fetchTestimonials();
  }, []);

  const showNotification = (text, type = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4500);
  };

  // ── FETCH OMRA STEPS ─────────────────────────────────────────────
  const fetchSteps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('website_omra_steps')
        .select('*')
        .order('ordre', { ascending: true });

      if (!error && data && data.length > 0) {
        setSteps(data);
      } else {
        setSteps(INITIAL_DEFAULT_STEPS);
      }
    } catch (err) {
      console.error('Fetch steps error:', err);
      setSteps(INITIAL_DEFAULT_STEPS);
    } finally {
      setLoading(false);
    }
  };

  // ── FETCH TESTIMONIALS ───────────────────────────────────────────
  const fetchTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from('website_testimonials')
        .select('*')
        .order('ordre', { ascending: true });

      if (!error && data && data.length > 0) {
        setTestimonials(data);
      } else {
        setTestimonials(INITIAL_DEFAULT_TESTIMONIALS);
      }
    } catch (err) {
      console.error('Fetch testimonials error:', err);
      setTestimonials(INITIAL_DEFAULT_TESTIMONIALS);
    }
  };

  // ── SEED DEFAULT OMRA STEPS ──────────────────────────────────────
  const handleSeedSteps = async () => {
    if (!window.confirm('Voulez-vous synchroniser les 10 étapes et sliders photos par défaut dans la base de données ?')) return;
    setSaving(true);
    try {
      for (const step of INITIAL_DEFAULT_STEPS) {
        await supabase
          .from('website_omra_steps')
          .upsert({
            step_number: step.step_number,
            ordre: step.ordre,
            location_fr: step.location_fr,
            location_ar: step.location_ar,
            location_badge_fr: step.location_badge_fr,
            location_badge_ar: step.location_badge_ar,
            title_fr: step.title_fr,
            title_ar: step.title_ar,
            desc_fr: step.desc_fr,
            desc_ar: step.desc_ar,
            icon_name: step.icon_name,
            images: step.images,
            is_active: true
          }, { onConflict: 'step_number' });
      }
      await fetchSteps();
      showNotification('Les 10 étapes et sliders ont été synchronisés avec succès !');
    } catch (err) {
      console.error('Seed steps error:', err);
      showNotification('Erreur lors de la synchronisation des étapes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── SEED DEFAULT TESTIMONIALS ────────────────────────────────────
  const handleSeedDefaultTestimonials = async () => {
    if (!window.confirm('Voulez-vous réinitialiser ou charger les 9 avis clients par défaut dans Supabase ?')) return;
    setSaving(true);
    try {
      // Clear and insert default reviews
      for (const testi of INITIAL_DEFAULT_TESTIMONIALS) {
        await supabase
          .from('website_testimonials')
          .insert(testi);
      }
      await fetchTestimonials();
      showNotification('Les témoignages par défaut ont été enregistrés avec succès !');
    } catch (err) {
      console.error('Seed testimonials error:', err);
      showNotification('Erreur lors de la synchronisation des avis.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── SLIDER & STEP EDITING ────────────────────────────────────────
  const handleOpenEditStep = (step) => {
    setEditingStep({
      ...step,
      images: Array.isArray(step.images) ? JSON.parse(JSON.stringify(step.images)) : []
    });
    setPreviewSlideIndex(0);
    setNewSlideUrl('');
    setNewSlideTitleFr(step.location_fr || '');
    setNewSlideTitleAr(step.location_ar || '');
    setNewSlideDescFr(step.title_fr || '');
    setNewSlideDescAr(step.title_ar || '');
    setIsStepModalOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `omra/step_${editingStep?.step_number || '01'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      let uploadBucket = 'website-sliders';
      let { data: _uploadData, error } = await supabase.storage
        .from(uploadBucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error && (error.message?.includes('Bucket not found') || error.error === 'Bucket not found')) {
        uploadBucket = 'agency-media';
        const fallbackRes = await supabase.storage
          .from(uploadBucket)
          .upload(`website/${fileName}`, file, {
            cacheControl: '3600',
            upsert: true
          });
        error = fallbackRes.error;
      }

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from(uploadBucket)
        .getPublicUrl(uploadBucket === 'website-sliders' ? fileName : `website/${fileName}`);

      if (publicUrlData?.publicUrl) {
        setNewSlideUrl(publicUrlData.publicUrl);
        showNotification('Photo importée dans le bucket website-sliders avec succès !');
      }
    } catch (err) {
      console.error('Upload error:', err);
      showNotification("Erreur lors de l'upload de l'image (" + (err.message || 'Storage error') + ")", 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddSlide = () => {
    if (!newSlideUrl.trim()) {
      showNotification('Veuillez spécifier une URL ou importer une image.', 'error');
      return;
    }

    const newSlide = {
      id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      url: newSlideUrl.trim(),
      title_fr: newSlideTitleFr.trim() || editingStep.location_fr || editingStep.title_fr,
      title_ar: newSlideTitleAr.trim() || editingStep.location_ar || editingStep.title_ar,
      desc_fr: newSlideDescFr.trim() || '',
      desc_ar: newSlideDescAr.trim() || ''
    };

    setEditingStep(prev => ({
      ...prev,
      images: [...(prev.images || []), newSlide]
    }));

    setPreviewSlideIndex((editingStep.images || []).length);
    setNewSlideUrl('');
    showNotification('Image ajoutée au slider !');
  };

  const handleRemoveSlide = (index) => {
    setEditingStep(prev => {
      const updated = [...prev.images];
      updated.splice(index, 1);
      return { ...prev, images: updated };
    });
    if (previewSlideIndex >= (editingStep.images.length - 1)) {
      setPreviewSlideIndex(Math.max(0, editingStep.images.length - 2));
    }
  };

  const handleMoveSlide = (index, direction) => {
    setEditingStep(prev => {
      const updated = [...prev.images];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= updated.length) return prev;
      
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return { ...prev, images: updated };
    });
  };

  const handleSaveStep = async () => {
    if (!editingStep) return;
    setSaving(true);

    try {
      const payload = {
        step_number: editingStep.step_number,
        ordre: editingStep.ordre || parseInt(editingStep.step_number, 10) || 1,
        location_fr: editingStep.location_fr,
        location_ar: editingStep.location_ar,
        location_badge_fr: editingStep.location_badge_fr,
        location_badge_ar: editingStep.location_badge_ar,
        title_fr: editingStep.title_fr,
        title_ar: editingStep.title_ar,
        desc_fr: editingStep.desc_fr,
        desc_ar: editingStep.desc_ar,
        icon_name: editingStep.icon_name || 'MapPin',
        images: editingStep.images || [],
        is_active: editingStep.is_active ?? true,
        updated_at: new Date().toISOString()
      };

      if (editingStep.id) {
        const { error } = await supabase
          .from('website_omra_steps')
          .update(payload)
          .eq('id', editingStep.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('website_omra_steps')
          .upsert(payload, { onConflict: 'step_number' })
          .select();

        if (error) throw error;
      }

      await fetchSteps();
      setIsStepModalOpen(false);
      showNotification(`Étape ${editingStep.step_number} et son slider enregistrés avec succès !`);
    } catch (err) {
      console.error('Save error:', err);
      showNotification("Erreur lors de l'enregistrement de l'étape.", 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── TESTIMONIAL MODAL ACTIONS ────────────────────────────────────
  const handleOpenAddTestimonial = () => {
    setEditingTestimonial({ ...emptyTestimonial, ordre: testimonials.length + 1 });
    setIsTestimonialModalOpen(true);
  };

  const handleOpenEditTestimonial = (testi) => {
    setEditingTestimonial({ ...testi });
    setIsTestimonialModalOpen(true);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatars/client_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${fileExt}`;

      let uploadBucket = 'website-sliders';
      let { error } = await supabase.storage
        .from(uploadBucket)
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (error && error.message?.includes('Bucket not found')) {
        uploadBucket = 'agency-media';
        const fallbackRes = await supabase.storage
          .from(uploadBucket)
          .upload(`website/${fileName}`, file, { cacheControl: '3600', upsert: true });
        error = fallbackRes.error;
      }

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from(uploadBucket)
        .getPublicUrl(uploadBucket === 'website-sliders' ? fileName : `website/${fileName}`);

      if (publicUrlData?.publicUrl) {
        setEditingTestimonial(prev => ({ ...prev, avatar_url: publicUrlData.publicUrl }));
        showNotification('Photo de profil importée !');
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      showNotification("Erreur upload photo client", 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveTestimonial = async () => {
    if (!editingTestimonial.name.trim() || !editingTestimonial.text.trim()) {
      showNotification('Veuillez renseigner au moins le nom et le texte du témoignage.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: editingTestimonial.name.trim(),
        name_ar: editingTestimonial.name_ar?.trim() || editingTestimonial.name.trim(),
        handle: editingTestimonial.handle?.trim() || '@client • Algérie',
        handle_ar: editingTestimonial.handle_ar?.trim() || editingTestimonial.handle?.trim() || 'client@ • الجزائر',
        tag: editingTestimonial.tag?.trim() || '🕋 Omra Prestige',
        tag_ar: editingTestimonial.tag_ar?.trim() || '🕋 عمرة متميزة',
        text: editingTestimonial.text.trim(),
        text_ar: editingTestimonial.text_ar?.trim() || editingTestimonial.text.trim(),
        rating: parseInt(editingTestimonial.rating, 10) || 5,
        verified: editingTestimonial.verified?.trim() || 'Pèlerinage Confirmé',
        verified_ar: editingTestimonial.verified_ar?.trim() || 'معتمر موثق',
        date_text: editingTestimonial.date_text?.trim() || 'Récemment',
        date_text_ar: editingTestimonial.date_text_ar?.trim() || 'مؤخراً',
        avatar_url: editingTestimonial.avatar_url || null,
        avatar_gradient: editingTestimonial.avatar_gradient || 'from-emerald-600 to-teal-800',
        column_index: parseInt(editingTestimonial.column_index, 10) || 1,
        is_active: editingTestimonial.is_active ?? true,
        ordre: editingTestimonial.ordre || 1,
        updated_at: new Date().toISOString()
      };

      if (editingTestimonial.id && !editingTestimonial.id.startsWith('temp-')) {
        const { error } = await supabase
          .from('website_testimonials')
          .update(payload)
          .eq('id', editingTestimonial.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('website_testimonials')
          .insert(payload);

        if (error) throw error;
      }

      await fetchTestimonials();
      setIsTestimonialModalOpen(false);
      showNotification('Témoignage enregistré avec succès !');
    } catch (err) {
      console.error('Save testimonial error:', err);
      showNotification("Erreur lors de l'enregistrement du témoignage.", 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTestimonial = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet avis client ?')) return;

    try {
      const { error } = await supabase
        .from('website_testimonials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTestimonials(prev => prev.filter(t => t.id !== id));
      showNotification('Témoignage supprimé avec succès !');
    } catch (err) {
      console.error('Delete error:', err);
      showNotification('Erreur lors de la suppression.', 'error');
    }
  };

  const handleToggleTestimonialActive = async (testi) => {
    try {
      const newStatus = !testi.is_active;
      const { error } = await supabase
        .from('website_testimonials')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', testi.id);

      if (error) throw error;

      setTestimonials(prev => prev.map(t => t.id === testi.id ? { ...t, is_active: newStatus } : t));
      showNotification(newStatus ? 'Avis activé sur le site' : 'Avis masqué du site');
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  const previewCurrentSlide = editingStep?.images?.[previewSlideIndex] || editingStep?.images?.[0];

  const filteredTestimonials = testimonials.filter(t => {
    const q = testimonialSearch.toLowerCase();
    return (
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.name_ar && t.name_ar.includes(q)) ||
      (t.tag && t.tag.toLowerCase().includes(q)) ||
      (t.text && t.text.toLowerCase().includes(q))
    );
  });

  return (
    <Layout>
      <div className="space-y-8 max-w-7xl mx-auto pb-16">
        
        {/* Toast Alert */}
        {statusMessage && (
          <div className={cn(
            "fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border text-sm font-bold backdrop-blur-md animate-in slide-in-from-top-4",
            statusMessage.type === 'error'
              ? "bg-rose-950/90 text-rose-200 border-rose-800/80"
              : "bg-emerald-950/90 text-emerald-200 border-emerald-800/80"
          )}>
            {statusMessage.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 p-6 sm:p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
              <Globe size={13} />
              <span>Administration Vitrine & Site Web</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Gestion du Contenu du Site Web
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Gérez les sliders multi-photos du Programme Omra et les Témoignages / Avis clients affichés sur le site web.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 relative z-10">
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white transition-all shadow-sm"
            >
              <ExternalLink size={14} />
              <span>Voir le site web</span>
            </a>
          </div>
        </div>

        {/* ── NAVIGATION TABS ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('omra_program')}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all",
              activeTab === 'omra_program'
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            )}
          >
            <Images size={16} />
            <span>Programme Omra (10 Étapes & Sliders)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('testimonials')}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all relative",
              activeTab === 'testimonials'
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            )}
          >
            <MessageSquareQuote size={16} />
            <span>Témoignages & Avis Clients ({testimonials.length})</span>
          </button>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: PROGRAMME OMRA (ÉTAPES & SLIDERS)                        */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'omra_program' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers size={18} className="text-emerald-400" />
                  <span>Les 10 Étapes du Programme Omra</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Cliquez sur "Gérer le Slider" pour configurer les photos avec titre vert et description blanche.
                </p>
              </div>

              <Button
                onClick={handleSeedSteps}
                disabled={saving}
                variant="outline"
                className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/30 text-xs font-bold self-start sm:self-auto"
              >
                <RefreshCw size={14} className={cn("mr-1.5", saving && "animate-spin")} />
                <span>Synchroniser les 10 étapes par défaut</span>
              </Button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-emerald-400" />
                <span>Chargement des étapes...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {steps.map((step, idx) => {
                  const imagesCount = Array.isArray(step.images) ? step.images.length : 0;
                  const coverImage = step.images?.[0]?.url || 'https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=1000&auto=format&fit=crop';

                  return (
                    <div
                      key={step.id || step.step_number || idx}
                      className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between group"
                    >
                      <div>
                        {/* Step Top Bar */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black flex items-center justify-center font-mono">
                              {step.step_number}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-slate-300">
                              {step.location_badge_fr || step.location_fr}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-bold text-emerald-400">
                            <Images size={13} />
                            <span>{imagesCount} {imagesCount === 1 ? 'photo' : 'photos'}</span>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="font-black text-sm text-white group-hover:text-emerald-400 transition-colors line-clamp-1 mb-1">
                          {step.title_fr}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                          {step.desc_fr}
                        </p>

                        {/* Image Thumbnail Slider Gallery */}
                        <div className="relative h-28 w-full rounded-2xl overflow-hidden mb-4 border border-slate-800 bg-slate-950">
                          <img 
                            src={coverImage} 
                            alt={step.title_fr}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          
                          <div className="absolute bottom-2.5 left-3 right-3 text-white">
                            <span className="text-[10px] font-bold text-emerald-400 block line-clamp-1">
                              {step.images?.[0]?.title_fr || step.location_fr}
                            </span>
                            <span className="text-[10px] text-white/90 font-medium block line-clamp-1">
                              {step.images?.[0]?.desc_fr || step.title_fr}
                            </span>
                          </div>

                          {imagesCount > 1 && (
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-mono font-bold text-white border border-white/10">
                              +{imagesCount - 1} autre{imagesCount > 2 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Action */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 font-mono">
                          {step.location_fr}
                        </span>

                        <Button
                          onClick={() => handleOpenEditStep(step)}
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs"
                        >
                          <Images size={13} className="mr-1.5" />
                          <span>Gérer le Slider ({imagesCount})</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: TÉMOIGNAGES & AVIS CLIENTS                               */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'testimonials' && (
          <div className="space-y-6">
            
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Rechercher par nom, tag ou texte..."
                  value={testimonialSearch}
                  onChange={(e) => setTestimonialSearch(e.target.value)}
                  className="pl-9 bg-slate-900 border-slate-700 text-xs h-10 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSeedDefaultTestimonials}
                  disabled={saving}
                  variant="outline"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 text-xs font-bold rounded-xl"
                >
                  <RefreshCw size={13} className={cn("mr-1.5", saving && "animate-spin")} />
                  <span>Synchroniser 9 avis par défaut</span>
                </Button>

                <Button
                  onClick={handleOpenAddTestimonial}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  <Plus size={14} className="mr-1.5" />
                  <span>Nouveau Témoignage</span>
                </Button>
              </div>
            </div>

            {/* Testimonials List */}
            {filteredTestimonials.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800">
                <MessageSquareQuote size={32} className="mx-auto mb-2 text-slate-600" />
                <p className="text-sm font-bold text-white mb-1">Aucun témoignage trouvé</p>
                <p className="text-xs text-slate-400">Cliquez sur "Nouveau Témoignage" pour ajouter le premier avis client.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTestimonials.map((t, idx) => {
                  const initials = (t.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                  return (
                    <div
                      key={t.id || idx}
                      className={cn(
                        "p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between group",
                        t.is_active !== false
                          ? "bg-slate-900/90 border-slate-800 hover:border-emerald-500/50 shadow-sm"
                          : "bg-slate-950/40 border-slate-900 opacity-60"
                      )}
                    >
                      <div>
                        {/* Top: Tag & Rating */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-0.5 rounded-full truncate max-w-[180px]">
                            {t.tag}
                          </span>
                          <div className="flex items-center gap-0.5 text-amber-400 shrink-0">
                            {Array.from({ length: t.rating || 5 }).map((_, i) => (
                              <Star key={i} size={11} className="fill-amber-400" />
                            ))}
                          </div>
                        </div>

                        {/* Review Text */}
                        <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mb-4">
                          {t.text}
                        </p>

                        {/* Author Info */}
                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {t.avatar_url ? (
                              <img src={t.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/15" />
                            ) : (
                              <div className={cn("w-8 h-8 rounded-full bg-gradient-to-tr text-white font-bold text-xs flex items-center justify-center shrink-0 border border-white/15", t.avatar_gradient || 'from-emerald-600 to-teal-800')}>
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white truncate">{t.name}</h4>
                              <span className="text-[10px] text-slate-400 truncate block font-mono">{t.handle}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40 block">
                              {t.verified || 'Vérifié'}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">{t.date_text}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Bottom Actions */}
                      <div className="pt-3 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500 font-mono">
                            Col. {t.column_index || 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleTestimonialActive(t)}
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1",
                              t.is_active !== false
                                ? "bg-emerald-950/50 text-emerald-300 border-emerald-700/50"
                                : "bg-slate-800 text-slate-400 border-slate-700"
                            )}
                          >
                            <span>{t.is_active !== false ? 'Actif' : 'Masqué'}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditTestimonial(t)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="Modifier"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTestimonial(t.id)}
                            className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300"
                            title="Supprimer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MODAL : ÉDITEUR D'ÉTAPE ET SLIDER PHOTOS ─────────────────── */}
        {editingStep && (
          <Dialog open={isStepModalOpen} onOpenChange={setIsStepModalOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-white rounded-3xl p-6 sm:p-8">
              <DialogHeader className="mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <Images size={14} />
                  <span>Configuration Slider Photo & Étape</span>
                </div>
                <DialogTitle className="text-xl font-black text-white">
                  Étape {editingStep.step_number} : {editingStep.title_fr}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Ajoutez plusieurs photos dans le slider de cette étape. Chaque image aura son titre vert et sa description blanche superposés sur le coin inférieur.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                
                {/* LEFT: SLIDER LIVE PREVIEW (5 COLS) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Eye size={13} className="text-emerald-400" />
                      <span>Aperçu en Direct du Slider</span>
                    </Label>
                    <span className="text-[11px] font-mono text-emerald-400">
                      Slide {(editingStep.images?.length || 0) > 0 ? previewSlideIndex + 1 : 0} / {editingStep.images?.length || 0}
                    </span>
                  </div>

                  <div className="relative h-60 w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-950 group">
                    {previewCurrentSlide?.url ? (
                      <>
                        <img 
                          src={previewCurrentSlide.url} 
                          alt=""
                          className="w-full h-full object-cover transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10" />
                        
                        {(editingStep.images?.length || 0) > 1 && (
                          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white font-mono flex items-center gap-1">
                            <Images size={10} className="text-emerald-400" />
                            <span>{previewSlideIndex + 1} / {editingStep.images.length}</span>
                          </div>
                        )}

                        {(editingStep.images?.length || 0) > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={() => setPreviewSlideIndex(p => p === 0 ? editingStep.images.length - 1 : p - 1)}
                              className="absolute top-1/2 -translate-y-1/2 left-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/20"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewSlideIndex(p => (p + 1) % editingStep.images.length)}
                              className="absolute top-1/2 -translate-y-1/2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/20"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </>
                        )}

                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 font-bold text-xs shadow-xs mb-1">
                            <MapPin size={11} className="text-emerald-400 shrink-0" />
                            <span>{previewCurrentSlide.title_fr || editingStep.location_fr}</span>
                          </div>
                          <p className="text-xs font-medium text-white/95 leading-tight line-clamp-2">
                            {previewCurrentSlide.desc_fr || editingStep.title_fr}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2 p-4 text-center">
                        <Images size={32} />
                        <span className="text-xs">Aucune image dans le slider</span>
                      </div>
                    )}
                  </div>

                  {(editingStep.images?.length || 0) > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {editingStep.images.map((img, idx) => (
                        <button
                          key={img.id || idx}
                          type="button"
                          onClick={() => setPreviewSlideIndex(idx)}
                          className={cn(
                            "w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all relative",
                            idx === previewSlideIndex
                              ? "border-emerald-400 ring-2 ring-emerald-400/30 scale-105"
                              : "border-slate-700 opacity-60 hover:opacity-100"
                          )}
                        >
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-slate-300 block">Informations de l'Étape</span>
                    
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-slate-400">Titre de l'étape (FR)</Label>
                      <Input
                        value={editingStep.title_fr || ''}
                        onChange={(e) => setEditingStep({ ...editingStep, title_fr: e.target.value })}
                        className="bg-slate-900 border-slate-700 text-xs h-8"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-slate-400">Titre de l'étape (AR)</Label>
                      <Input
                        dir="rtl"
                        value={editingStep.title_ar || ''}
                        onChange={(e) => setEditingStep({ ...editingStep, title_ar: e.target.value })}
                        className="bg-slate-900 border-slate-700 text-xs h-8"
                      />
                    </div>
                  </div>
                </div>

                {/* RIGHT: SLIDES LIST & ADD SLIDE FORM (7 COLS) */}
                <div className="lg:col-span-7 space-y-6">
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Images size={14} className="text-emerald-400" />
                        <span>Photos dans le Slider ({editingStep.images?.length || 0})</span>
                      </Label>
                    </div>

                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                      {(!editingStep.images || editingStep.images.length === 0) && (
                        <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-400">
                          Aucune image dans ce slider. Ajoutez-en une ci-dessous !
                        </div>
                      )}

                      {editingStep.images?.map((img, idx) => (
                        <div
                          key={img.id || idx}
                          className={cn(
                            "p-3 rounded-2xl border transition-all flex items-start gap-3",
                            idx === previewSlideIndex
                              ? "bg-slate-800/90 border-emerald-500/50 shadow-md"
                              : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                          )}
                        >
                          <div 
                            className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-700 bg-slate-900 cursor-pointer"
                            onClick={() => setPreviewSlideIndex(idx)}
                          >
                            <img src={img.url} alt="" className="w-full h-full object-cover" />
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                                #{idx + 1}
                              </span>
                              <span className="text-xs font-bold text-emerald-400 truncate">
                                {img.title_fr || 'Sans titre'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 line-clamp-1">
                              {img.desc_fr || 'Sans description'}
                            </p>
                          </div>

                          <div className="flex flex-col gap-1 shrink-0">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveSlide(idx, 'up')}
                                className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                type="button"
                                disabled={idx === editingStep.images.length - 1}
                                onClick={() => handleMoveSlide(idx, 'down')}
                                className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                              >
                                <ArrowDown size={12} />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSlide(idx)}
                              className="p-1 rounded-md bg-rose-950/60 hover:bg-rose-900 text-rose-300 mt-1"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Form to Add New Slide */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5">
                    <Label className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                      <Plus size={14} />
                      <span>Ajouter une Nouvelle Photo au Slider</span>
                    </Label>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-slate-300">URL ou Import direct (Bucket website-sliders)</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://images.unsplash.com/..."
                          value={newSlideUrl}
                          onChange={(e) => setNewSlideUrl(e.target.value)}
                          className="bg-slate-900 border-slate-700 text-xs h-9"
                        />
                        <label className={cn(
                          "px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white cursor-pointer flex items-center gap-1.5 shrink-0 transition-colors",
                          uploadingImage && "opacity-50 pointer-events-none"
                        )}>
                          <Upload size={13} className={cn(uploadingImage && "animate-spin")} />
                          <span>{uploadingImage ? 'Upload...' : 'Importer'}</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleFileUpload}
                            disabled={uploadingImage}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-emerald-400 font-bold">Titre en Vert (FR)</Label>
                        <Input
                          placeholder="Ex: Vol Direct Confortable"
                          value={newSlideTitleFr}
                          onChange={(e) => setNewSlideTitleFr(e.target.value)}
                          className="bg-slate-900 border-slate-700 text-xs h-8 text-emerald-300 font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-emerald-400 font-bold">Titre en Vert (AR)</Label>
                        <Input
                          dir="rtl"
                          placeholder="مثال: رحلة جوية مريحة ومباشرة"
                          value={newSlideTitleAr}
                          onChange={(e) => setNewSlideTitleAr(e.target.value)}
                          className="bg-slate-900 border-slate-700 text-xs h-8 text-emerald-300 font-bold font-arabic"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-300 font-bold">Description en Blanc (FR)</Label>
                        <Input
                          placeholder="Ex: Flotte moderne avec collation à bord"
                          value={newSlideDescFr}
                          onChange={(e) => setNewSlideDescFr(e.target.value)}
                          className="bg-slate-900 border-slate-700 text-xs h-8 text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] text-slate-300 font-bold">Description en Blanc (AR)</Label>
                        <Input
                          dir="rtl"
                          placeholder="مثال: أسطول حديث مع وجبات وضيافة كاملة"
                          value={newSlideDescAr}
                          onChange={(e) => setNewSlideDescAr(e.target.value)}
                          className="bg-slate-900 border-slate-700 text-xs h-8 text-white font-arabic"
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={handleAddSlide}
                      className="w-full bg-slate-800 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl border border-slate-700 hover:border-emerald-500 transition-all h-9"
                    >
                      <Plus size={14} className="mr-1" />
                      <span>Ajouter cette photo au slider de l'étape</span>
                    </Button>
                  </div>

                </div>

              </div>

              {/* Modal Bottom Actions */}
              <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsStepModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 text-xs"
                >
                  Annuler
                </Button>

                <Button
                  type="button"
                  onClick={handleSaveStep}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-6 rounded-xl shadow-md"
                >
                  <Save size={14} className={cn("mr-1.5", saving && "animate-spin")} />
                  <span>{saving ? 'Enregistrement...' : 'Enregistrer les Modifications'}</span>
                </Button>
              </div>

            </DialogContent>
          </Dialog>
        )}

        {/* ── MODAL : ÉDITEUR DE TÉMOIGNAGE (AJOUT / MODIFICATION) ────── */}
        {editingTestimonial && (
          <Dialog open={isTestimonialModalOpen} onOpenChange={setIsTestimonialModalOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800 text-white rounded-3xl p-6 sm:p-8">
              <DialogHeader className="mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <MessageSquareQuote size={14} />
                  <span>{editingTestimonial.id && !editingTestimonial.id.startsWith('temp-') ? 'Modifier le Témoignage' : 'Nouveau Témoignage Client'}</span>
                </div>
                <DialogTitle className="text-xl font-black text-white">
                  {editingTestimonial.name || 'Nouvel Avis Client'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Renseignez les détails du client, sa note, son badge et son retour d'expérience.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                
                {/* Client Name & Handle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300 font-bold">Nom du Client (FR)</Label>
                    <Input
                      placeholder="Ex: Karim Meziane"
                      value={editingTestimonial.name || ''}
                      onChange={(e) => setEditingTestimonial({ ...editingTestimonial, name: e.target.value })}
                      className="bg-slate-950 border-slate-700 text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300 font-bold">Nom du Client (AR)</Label>
                    <Input
                      dir="rtl"
                      placeholder="مثال: كريم مزيان"
                      value={editingTestimonial.name_ar || ''}
                      onChange={(e) => setEditingTestimonial({ ...editingTestimonial, name_ar: e.target.value })}
                      className="bg-slate-950 border-slate-700 text-xs h-9 font-arabic"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300 font-bold">Identifiant / Ville (FR)</Label>
                    <Input
                      placeholder="Ex: @karim.travels • Alger"
                      value={editingTestimonial.handle || ''}
                      onChange={(e) => setEditingTestimonial({ ...editingTestimonial, handle: e.target.value })}
                      className="bg-slate-950 border-slate-700 text-xs h-9 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300 font-bold">Identifiant / Ville (AR)</Label>
                    <Input
                      dir="rtl"
                      placeholder="مثال: karim.travels@ • الجزائر"
                      value={editingTestimonial.handle_ar || ''}
                      onChange={(e) => setEditingTestimonial({ ...editingTestimonial, handle_ar: e.target.value })}
                      className="bg-slate-950 border-slate-700 text-xs h-9 font-arabic"
                    />
                  </div>
                </div>

                {/* Prestation Tag & Rating */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label className="text-xs text-slate-300 font-bold">Badge Prestation (FR)</Label>
                    <Input
                      placeholder="Ex: 🕋 Omra Prestige & Hôtel au pied du Haram"
                      value={editingTestimonial.tag || ''}
                      onChange={(e) => setEditingTestimonial({ ...editingTestimonial, tag: e.target.value })}
                      className="bg-slate-950 border-slate-700 text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300 font-bold">Note (Étoiles)</Label>
                    <Select
                      value={String(editingTestimonial.rating || 5)}
                      onChange={(e) => setEditingTestimonial({ ...editingTestimonial, rating: parseInt(e.target.value, 10) })}
                      className="bg-slate-950 border-slate-700 text-xs h-9"
                    >
                      <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                      <option value="4">⭐⭐⭐⭐ (4/5)</option>
                      <option value="3">⭐⭐⭐ (3/5)</option>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-bold">Badge Prestation (AR)</Label>
                  <Input
                    dir="rtl"
                    placeholder="مثال: 🕋 عمرة متميزة وفندق بساحة الحرم"
                    value={editingTestimonial.tag_ar || ''}
                    onChange={(e) => setEditingTestimonial({ ...editingTestimonial, tag_ar: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-xs h-9 font-arabic"
                  />
                </div>

                {/* Review Text FR & AR */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-bold">Contenu de l'Avis (Français)</Label>
                  <Textarea
                    rows={3}
                    placeholder="« Une organisation exemplaire du départ jusqu'au retour... »"
                    value={editingTestimonial.text || ''}
                    onChange={(e) => setEditingTestimonial({ ...editingTestimonial, text: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-bold">Contenu de l'Avis (Arabe)</Label>
                  <Textarea
                    dir="rtl"
                    rows={3}
                    placeholder="« تنظيم محكم ومثالي من مطار الجزائر إلى غاية العودة... »"
                    value={editingTestimonial.text_ar || ''}
                    onChange={(e) => setEditingTestimonial({ ...editingTestimonial, text_ar: e.target.value })}
                    className="bg-slate-950 border-slate-700 text-xs font-arabic"
                  />
                </div>

                {/* Badges & Meta */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300 font-bold">Statut Vérifié (FR)</Label>
                    <Input
                      placeholder="Ex: Pèlerinage Confirmé"
                      value={editingTestimonial.verified || ''}
                      onChange={(e) => setEditingTestimonial({ ...editingTestimonial, verified: e.target.value })}
                      className="bg-slate-950 border-slate-700 text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300 font-bold">Date affichée (FR)</Label>
                    <Input
                      placeholder="Ex: Il y a 3 jours"
                      value={editingTestimonial.date_text || ''}
                      onChange={(e) => setEditingTestimonial({ ...editingTestimonial, date_text: e.target.value })}
                      className="bg-slate-950 border-slate-700 text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300 font-bold">Colonne Défilement</Label>
                    <Select
                      value={String(editingTestimonial.column_index || 1)}
                      onChange={(e) => setEditingTestimonial({ ...editingTestimonial, column_index: parseInt(e.target.value, 10) })}
                      className="bg-slate-950 border-slate-700 text-xs h-9"
                    >
                      <option value="1">Colonne 1 (Gauche)</option>
                      <option value="2">Colonne 2 (Milieu)</option>
                      <option value="3">Colonne 3 (Droite)</option>
                    </Select>
                  </div>
                </div>

                {/* Avatar / Photo or Gradient */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <Label className="text-xs font-bold text-slate-300 block">Photo ou Dégradé de l'Avatar</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-slate-400">Style du dégradé (si pas de photo)</Label>
                      <Select
                        value={editingTestimonial.avatar_gradient || 'from-emerald-600 to-teal-800'}
                        onChange={(e) => setEditingTestimonial({ ...editingTestimonial, avatar_gradient: e.target.value })}
                        className="bg-slate-900 border-slate-700 text-xs h-9"
                      >
                        {GRADIENT_OPTIONS.map(g => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-slate-400">Importer une photo de profil</Label>
                      <label className={cn(
                        "w-full h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white cursor-pointer flex items-center justify-center gap-1.5 transition-colors",
                        uploadingAvatar && "opacity-50 pointer-events-none"
                      )}>
                        <Upload size={13} className={cn(uploadingAvatar && "animate-spin")} />
                        <span>{uploadingAvatar ? 'Upload...' : (editingTestimonial.avatar_url ? 'Changer la photo' : 'Importer photo')}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                      </label>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Actions */}
              <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsTestimonialModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 text-xs"
                >
                  Annuler
                </Button>

                <Button
                  type="button"
                  onClick={handleSaveTestimonial}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-6 rounded-xl shadow-md"
                >
                  <Save size={14} className={cn("mr-1.5", saving && "animate-spin")} />
                  <span>{saving ? 'Enregistrement...' : 'Enregistrer le Témoignage'}</span>
                </Button>
              </div>

            </DialogContent>
          </Dialog>
        )}

      </div>
    </Layout>
  );
};

export default WebsiteManagement;
