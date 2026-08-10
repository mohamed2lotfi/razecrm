import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Plane, Hotel, Compass, Heart, Bus, Sparkles, 
  MapPin, CheckCircle2, ShieldCheck, Clock, Users, 
  ArrowRight, ArrowLeft, ChevronDown, Award, Gift, 
  Calendar, Check, HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const UmrahProgramPage = ({ onOpenQuoteModal }) => {
  const { t, isArabic } = useLanguage();
  const [openFaq, setOpenFaq] = useState(null);

  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  const timelineSteps = [
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
      image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1000&auto=format&fit=crop",
      icon: Plane
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
      image: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=1000&auto=format&fit=crop",
      icon: Hotel
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
      image: "https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=1000&auto=format&fit=crop",
      icon: Sparkles
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
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop",
      icon: Compass
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
      image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1000&auto=format&fit=crop",
      icon: Bus
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
      image: "https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?q=80&w=1000&auto=format&fit=crop",
      icon: Heart
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
      image: "https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=1000&auto=format&fit=crop",
      icon: Sparkles
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
      image: "https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?q=80&w=1000&auto=format&fit=crop",
      icon: Hotel
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
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop",
      icon: MapPin
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
      image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1000&auto=format&fit=crop",
      icon: Gift
    }
  ];

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
        : "Autocars climatisés grand tourisme récents avec prises USB, sièges ergonomiques et chauffeurs certifiés."
    },
    {
      icon: Clock,
      title: isArabic ? "متابعة ورعاية على مدار الساعة" : "Assistance Médicale & Logistique 24/7",
      desc: isArabic 
        ? "فريقنا الميداني متواجد معكم في مكة والمدينة لتقديم الدعم الفوري لأي ظرف طارئ."
        : "Une équipe permanente sur place à Médine et La Mecque pour répondre à tous vos besoins en temps réel."
    }
  ];

  const faqs = [
    {
      q: isArabic ? "ما هي الإجراءات المطلوبة لاستخراج تأشيرة العمرة؟" : "Quelles sont les formalités pour l'obtention du visa Omra ?",
      a: isArabic 
        ? "نوفر لكم معالجة سريعة لملف التأشيرة الإلكترونية الرسمية، كل ما نحتاجه هو جواز سفر ساري المفعول لمدة لا تقل عن 6 أشهر وصورة شمسية بخلفية بيضاء."
        : "Notre agence s'occupe de l'intégralité de la procédure du visa officiel électronique. Il vous suffit de nous fournir un passeport valide plus de 6 mois et une photo d'identité récente."
    },
    {
      q: isArabic ? "هل الصلاة في الروضة الشريفة مؤكدة لجميع المعتمرين؟" : "La réservation pour la Noble Rawdah est-elle garantie ?",
      a: isArabic 
        ? "نعم، تتولى وكالتنا استخراج تصاريح الدخول الرسمية للروضة الشريفة عبر تطبيق نسك لجميع المعتمرين (رجالاً ونساءً) في الأوقات المخصصة رسمياً."
        : "Absolument. Notre équipe administrative réserve et valide les créneaux officiels sur la plateforme Nusuk pour l'ensemble des pèlerins (hommes et femmes)."
    },
    {
      q: isArabic ? "كيف يتم التكفل بكبار السن والأشخاص ذوي الاحتياجات الخاصة؟" : "Comment sont accompagnées les personnes âgées ou à mobilité réduite ?",
      a: isArabic 
        ? "نولي عناية فائقة لكبار السن من خلال توفير كراسي متحركة، واختيار فنادق قريبة جداً، ومساعدة مباشرة من مرشدينا أثناء أداء الطواف والسعي."
        : "Nous accordons une attention toute particulière aux aînés avec mise à disposition de fauteuils roulants, choix d'hôtels très proches et aide de nos guides pendant le Tawaf et le Sa'i."
    },
    {
      q: isArabic ? "هل يحصل كل معتمر على عبوة ماء زمزم عند العودة؟" : "Chaque pèlerin reçoit-il son bidon d'eau de Zamzam au retour ?",
      a: isArabic 
        ? "نعم، يحصل كل معتمر مسافر مع وكالتنا على عبوة 5 لتر أصلية ومختومة من ماء زمزم المبارك مباشرة في مطار جدة قبل صعود الطائرة."
        : "Oui, chaque pèlerin voyageant avec notre agence reçoit un bidon officiel scellé de 5 litres d'eau bénite de Zamzam à l'aéroport de Djeddah avant l'embarquement."
    }
  ];

  return (
    <main className="min-h-screen bg-slate-50/50 dark:bg-obsidian-950 text-slate-900 dark:text-slate-100 overflow-x-hidden pt-24 pb-20 transition-colors duration-300">
      
      {/* ── 1. CINEMATIC HERO SECTION ───────────────────────────────────── */}
      <section className="relative py-16 sm:py-24 px-4 sm:px-6 overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-500/15 dark:bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-black uppercase tracking-wider shadow-sm">
            <Compass size={15} className="animate-spin-slow text-brand-500" />
            <span>{t('prog_badge')}</span>
          </div>

          {/* H1 Headline (Wide, Max 2-3 lines) */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]">
            {isArabic ? (
              <>رحلة العمر : برنامج العمرة المتكامل في <span className="text-brand-600 dark:text-brand-400">10 محطات مباركة</span></>
            ) : (
              <>Le Voyage d'une Vie : Notre Programme Omra en <span className="text-brand-600 dark:text-brand-400">10 Étapes Clés</span></>
            )}
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
            {t('prog_hero_subtitle')}
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/omra"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-brand-500/25 hover:shadow-brand-500/35 transition-all flex items-center justify-center gap-2"
            >
              <span>{t('prog_cta_catalog')}</span>
              <ArrowIcon size={16} />
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
              {timelineSteps.map((item, index) => {
                const isEven = index % 2 === 0;
                const StepIcon = item.icon;

                return (
                  <div 
                    key={item.step}
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
                            ÉTAPE {item.step}
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
                        <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-white/5">
                          {item.perks.map((perk, pIdx) => (
                            <div key={pIdx} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                              <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>{perk}</span>
                            </div>
                          ))}
                        </div>

                      </div>
                    </div>

                    {/* Center Marker Pin */}
                    <div className="relative z-10 flex items-center justify-center shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-lg shadow-brand-500/30 border-2 border-white dark:border-[#0b0b0b]">
                        <StepIcon size={20} />
                      </div>
                    </div>

                    {/* Image / Visual Card (50% width on Desktop) */}
                    <div className="w-full md:w-1/2">
                      <div className="relative h-60 sm:h-72 w-full rounded-3xl overflow-hidden shadow-md group">
                        <img 
                          src={item.image} 
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        
                        <div className="absolute bottom-4 left-4 right-4 text-white">
                          <span className="text-[11px] font-bold text-brand-300 flex items-center gap-1.5 mb-0.5">
                            <MapPin size={12} />
                            <span>{item.location}</span>
                          </span>
                          <span className="text-xs font-medium text-white/90 line-clamp-1">
                            {item.title}
                          </span>
                        </div>
                      </div>
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
