import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Star, CheckCircle2, Sparkles, Plane, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TestimonialsSection = () => {
  const { isArabic } = useLanguage();

  // 3 distinct collections of reviews optimized for 60 FPS performance
  const column1Cards = [
    {
      id: 'c1-1',
      name: isArabic ? 'كريم مزيان' : 'Karim Meziane',
      handle: isArabic ? 'karim.travels@ • الجزائر' : '@karim.travels • Alger',
      initials: 'KM',
      avatarGradient: 'from-emerald-600 to-teal-800',
      rating: 5,
      tag: isArabic ? '✈️ حجز طيران مباشر وتذاكر إلكترونية' : '✈️ Vol Direct Alger - Istanbul',
      text: isArabic
        ? '« حجز تذاكر الطيران إلى إسطنبول تم في أقل من 3 دقائق على المنصة! إصدار فوري للتذاكر الإلكترونية، واختيار المقاعد المتجاورة وبدون أي مفاجآت في الأمتعة بالمطار. »'
        : '« Réservation de nos billets d\'avion pour Istanbul en moins de 3 minutes sur la plateforme ! Émission instantanée des billets électroniques, choix des sièges côte à côte et zéro mauvaise surprise sur les bagages à l\'aéroport. »',
      verified: isArabic ? 'تذكرة مؤكدة ومصدرة' : 'Billet Confirmé & Émis',
      date: isArabic ? 'منذ 3 أيام' : 'Il y a 3 jours'
    },
    {
      id: 'c1-2',
      name: isArabic ? 'سارة وياسين بن علي' : 'Sarah & Yacine Benali',
      handle: isArabic ? 'sarah_ben@ • وهران' : '@sarah_ben • Oran',
      initials: 'SB',
      avatarGradient: 'from-amber-600 to-orange-800',
      rating: 5,
      tag: isArabic ? '🇹🇷 باقة مدمجة إسطنبول وأنطاليا' : '🇹🇷 Séjour Combiné Istanbul & Antalya',
      text: isArabic
        ? '« الباقة المتعددة الفنادق في تركيا كانت استثنائية! 4 ليالٍ في فندق ساحر بقلب السلطان أحمد ثم 4 ليالٍ في منتجع 5 نجوم شامل كلياً في أنطاليا مع الرحلات الداخلية المنسقة بدقة. »'
        : '« Le package multi-hôtels en Turquie était sensationnel ! 4 nuits dans un hôtel de charme au cœur de Sultanahmet puis 4 nuits dans un resort 5★ All-Inclusive à Antalya avec vols intérieurs inclus. »',
      verified: isArabic ? 'باقة سفر مكتملة' : 'Package Séjour Validé',
      date: isArabic ? 'منذ أسبوع' : 'Il y a 1 semaine'
    },
    {
      id: 'c1-3',
      name: isArabic ? 'د. أمين طاهري' : 'Dr. Amine Tahari',
      handle: isArabic ? 'amine_tah@ • قسنطينة' : '@amine_tah • Constantine',
      initials: 'AT',
      avatarGradient: 'from-blue-600 to-indigo-800',
      rating: 5,
      tag: isArabic ? '🚐 نقل خاص بسيارة فان VIP' : '🚐 Transfert VIP Van Mercedes',
      text: isArabic
        ? '« وداعاً للحافلات المزدحمة وساعات الانتظار! بمجرد هبوط الطائرة، كان سائقنا الخاص في انتظارنا بلافتة وسيارة فان مرسيدس فيتو مريحة ومكيفة مع واي فاي. راحة مطلقة لعائلتي. »'
        : '« Adieu les bus bondés et les heures d\'attente ! Dès notre atterrissage, notre chauffeur privé nous attendait avec une pancarte et un van Mercedes Vito spacieux et climatisé avec Wi-Fi. Confort absolu. »',
      verified: isArabic ? 'نقل خاص VIP' : 'Transfert Privé VIP',
      date: isArabic ? 'منذ أسبوعين' : 'Il y a 2 semaines'
    }
  ];

  const column2Cards = [
    {
      id: 'c2-1',
      name: isArabic ? 'الحاج مصطفى بوعلام' : 'Hadj Mustapha B.',
      handle: isArabic ? 'mustapha_hadj@ • الجزائر' : '@mustapha_hadj • Alger',
      initials: 'MB',
      avatarGradient: 'from-yellow-600 to-amber-800',
      rating: 5,
      tag: isArabic ? '🕋 عمرة متميزة وفندق بساحة الحرم' : '🕋 Omra Prestige & Hôtel au pied du Haram',
      text: isArabic
        ? '« تنظيم محكم ومثالي من مطار الجزائر إلى غاية العودة. فندقنا في مكة كان على بعد 100 متر فقط من ساحة الحرم المكي مع إطلالة رائعة. المرافقة الإرشادية وإجراءات نسك كانت في قمة التميز. »'
        : '« Une organisation exemplaire du départ jusqu\'au retour. Notre hôtel à La Mecque était à 100 mètres de l\'esplanade du Haram avec une vue imprenable. L\'accompagnement spirituel et Nusuk au top. »',
      verified: isArabic ? 'معتمر موثق' : 'Pèlerinage Confirmé',
      date: isArabic ? 'منذ 5 أيام' : 'Il y a 5 jours'
    },
    {
      id: 'c2-2',
      name: isArabic ? 'سفيان ورانية خليل' : 'Sofiane & Rania Khelil',
      handle: isArabic ? 'sofiane_kh@ • البليدة' : '@sofiane_kh • Blida',
      initials: 'SK',
      avatarGradient: 'from-indigo-600 to-violet-800',
      rating: 5,
      tag: isArabic ? '🇹🇷 جولة كابادوكيا وإسطنبول' : '🇹🇷 Circuit Cappadoce & Istanbul',
      text: isArabic
        ? '« الجمع بين الإقامة في فندق الكهف في كابادوكيا وتجربة المنطاد، ثم فندق 5 نجوم على مضيق البوسفور كان ساحراً. النقل الخاص بين المطارات والفنادق كان دقيقاً في الموعد بالثانية. »'
        : '« Le combiné hôtel troglodyte en Cappadoce avec l\'envolée en montgolfière et l\'hôtel 5★ sur le Bosphore était magique. Les transferts privés entre les aéroports et les hôtels à l\'heure exacte. »',
      verified: isArabic ? 'رحلة سياحية كاملة' : 'Circuit Clé en Main',
      date: isArabic ? 'منذ 10 أيام' : 'Il y a 10 jours'
    },
    {
      id: 'c2-3',
      name: isArabic ? 'ليلى حميدي' : 'Leila Hamidi',
      handle: isArabic ? 'leila_travel@ • تلمسان' : '@leila_travel • Tlemcen',
      initials: 'LH',
      avatarGradient: 'from-purple-600 to-fuchsia-800',
      rating: 5,
      tag: isArabic ? '🚐 سيارة خاصة وسائق مخصص' : '🚐 Chauffeur Dédié & Berline Privée',
      text: isArabic
        ? '« في شهر العسل اخترنا باقة السيارة الخاصة لجميع جولاتنا بدل الحافلات السياحية. حرية كاملة وسائقون في غاية اللطف والمهنية. تجربة نوصي بها الجميع. »'
        : '« Pour notre voyage, nous avons opté pour le forfait avec voiture privée dédiée pour toutes nos excursions au lieu des navettes collectives. Une liberté totale et des chauffeurs très professionnels. »',
      verified: isArabic ? 'خدمة VIP خاصة' : 'Prestation VIP Privée',
      date: isArabic ? 'منذ شهر' : 'Il y a 1 mois'
    }
  ];

  const column3Cards = [
    {
      id: 'c3-1',
      name: isArabic ? 'فريد وأمينة زروقي' : 'Farid & Amina Zerrouki',
      handle: isArabic ? 'farid_zer@ • سطيف' : '@farid_zer • Sétif',
      initials: 'FZ',
      avatarGradient: 'from-emerald-700 to-green-900',
      rating: 5,
      tag: isArabic ? '🚐 فان مرسيدس عائلي خاص' : '🚐 Van VIP Famille & Bagages',
      text: isArabic
        ? '« السفر مع 3 أطفال و5 حقائب كان سيكون معقداً، لكن خدمة التوصيل بالفان الخاص أنقذت رحلتنا! سائق خدوم، مقاعد أطفال مجهزة، ومياه باردة. تجربة مريحة جداً. »'
        : '« Voyager avec 3 enfants et 5 valises peut vite devenir stressant, mais le service de transfert en van VIP privé a tout changé ! Chauffeur chaleureux, sièges enfants installés et bouteilles d\'eau fraîches. »',
      verified: isArabic ? 'راحة عائلية VIP' : 'Famille Confort VIP',
      date: isArabic ? 'منذ 4 أيام' : 'Il y a 4 jours'
    },
    {
      id: 'c3-2',
      name: isArabic ? 'فاطمة الزهراء قاسي' : 'Fatima Zohra K.',
      handle: isArabic ? 'fz_kaci@ • الجزائر' : '@fz_kaci • Alger',
      initials: 'FK',
      avatarGradient: 'from-pink-600 to-rose-800',
      rating: 5,
      tag: isArabic ? '🕋 عمرة مريحة ومرافقة 24/7' : '🕋 Omra VIP & Assistance 24/7',
      text: isArabic
        ? '« سافرت برفقة والديّ المسنين: المرافقة المخصصة وتوفير سيارات النقل الفردية المكيفة صنعت فارقاً كبيراً في رحلتنا. المرشدون كانوا دائماً متاحين على واتساب لأي مساعدة. »'
        : '« Voyage effectué avec mes parents âgés : l\'assistance dédiée et les transferts privés en voiture climatisée ont fait toute la différence. Nos guides étaient joignables sur WhatsApp pour le moindre besoin. »',
      verified: isArabic ? 'معتمرة موثقة' : 'Pèlerine Vérifiée',
      date: isArabic ? 'منذ أسبوعين' : 'Il y a 2 semaines'
    },
    {
      id: 'c3-3',
      name: isArabic ? 'وليد بن شريف' : 'Walid Bencherif',
      handle: isArabic ? 'walid_b@ • باتنة' : '@walid_b • Batna',
      initials: 'WB',
      avatarGradient: 'from-orange-600 to-amber-800',
      rating: 5,
      tag: isArabic ? '🇹🇷 تقسيم وأورتاكوي فندقان مختلفان' : '🇹🇷 Istanbul Multi-Hôtels (Taksim & Bosphore)',
      text: isArabic
        ? '« إمكانية تقسيم الإقامة بين فندقين مختلفين (3 ليالٍ في تقسيم للتسوق + 3 ليالٍ في أورتاكوي على البوسفور) بدون أي تعقيد لوجستي هي ميزة ممتازة لهذه الوكالة. »'
        : '« La possibilité de fractionner notre séjour entre 2 hôtels différents (3 nuits à Taksim pour le shopping + 3 nuits à Ortaköy sur le Bosphore) sans aucun surcoût logistique est un énorme plus ! »',
      verified: isArabic ? 'باقة مخصصة' : 'Séjour Personnalisé',
      date: isArabic ? 'منذ شهر' : 'Il y a 1 mois'
    }
  ];

  // Responsive Card Component supporting Light and Dark modes seamlessly
  const TestimonialCard = ({ item }) => (
    <div className="bg-white dark:bg-[#141414] hover:bg-slate-50/90 dark:hover:bg-[#1a1a1a] border border-slate-200/80 dark:border-white/10 hover:border-emerald-500/30 dark:hover:border-white/20 rounded-2xl p-5 transition-colors duration-200 text-left rtl:text-right shadow-sm dark:shadow-none group">
      {/* Top Header: Tag & Rating */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-full truncate max-w-[210px]">
          {item.tag}
        </span>
        <div className="flex items-center gap-0.5 text-amber-400 shrink-0">
          {Array.from({ length: item.rating }).map((_, i) => (
            <Star key={i} size={12} className="fill-amber-400" />
          ))}
        </div>
      </div>

      {/* Review Body */}
      <p className="text-slate-700 dark:text-neutral-300 text-xs sm:text-[13px] leading-relaxed font-normal mb-4 group-hover:text-slate-900 dark:group-hover:text-neutral-100 transition-colors">
        {item.text}
      </p>

      {/* Author Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-3 mt-auto">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar Placeholder */}
          <div className={cn(
            "w-8 h-8 rounded-full bg-gradient-to-tr text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm border border-white/15",
            item.avatarGradient
          )}>
            {item.initials}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
              {item.name}
            </h4>
            <span className="text-[10px] text-slate-500 dark:text-neutral-400 truncate block font-mono">
              {item.handle}
            </span>
          </div>
        </div>

        <div className="text-right rtl:text-left shrink-0">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/80 dark:border-emerald-800/40">
            <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">{item.verified}</span>
          </span>
          <span className="block text-[9px] text-slate-400 dark:text-neutral-500 font-mono mt-0.5">
            {item.date}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 relative bg-slate-50/60 dark:bg-[#0a0a0a] text-slate-900 dark:text-white border-t border-slate-200/80 dark:border-neutral-800 transition-colors duration-300">
      
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* ── 1. Top Section: Header & Key Statistics ───────────────────────── */}
        <div className="text-center max-w-4xl mx-auto mb-12 sm:mb-16">
          
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
            <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400" />
            <span>{isArabic ? 'تجارب وآراء مسافرينا الحقيقية' : 'Avis & Retours d\'Expérience Vérifiés'}</span>
          </div>

          {/* Section Heading */}
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4 leading-tight">
            {isArabic 
              ? 'أكثر من 25,000 مسافر يثقون في وكالتنا' 
              : 'Approuvé par plus de 25 000 voyageurs à travers le monde'}
          </h2>

          <p className="text-slate-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto mb-8">
            {isArabic
              ? 'سواء لحجز تذاكر الطيران، الباقات السياحية الفاخرة في تركيا، رحلات العمرة أو خدمة النقل الخاص بسيارات VIP، إليكم ما يقوله عملاؤنا.'
              : 'Billetterie de vol instantanée, combinés multi-hôtels en Turquie, séjours Omra au pied du Haram et transferts VIP en van privé : découvrez les retours authentiques de nos voyageurs.'}
          </p>

          {/* 3 Key Statistics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            
            {/* Stat 1: Satisfaction */}
            <div className="bg-white dark:bg-[#141414] border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-sm dark:shadow-none">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                <ThumbsUp size={16} />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                99.4%
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-neutral-300 mt-0.5">
                {isArabic ? 'نسبة رضا المسافرين' : 'Taux de Satisfaction'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                {isArabic ? 'بناءً على أكثر من 3,500 تقييم' : 'Basé sur +3 500 retours certifiés'}
              </span>
            </div>

            {/* Stat 2: Bookings */}
            <div className="bg-white dark:bg-[#141414] border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-sm dark:shadow-none">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
                <Plane size={16} />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                25 000+
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-neutral-300 mt-0.5">
                {isArabic ? 'رحلة وباقة سياحية محجوزة' : 'Vols & Packages Organisés'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                {isArabic ? 'تركيا، العمرة، أوروبا والخليج' : 'Turquie, Omra, Europe & Golfe'}
              </span>
            </div>

            {/* Stat 3: Rating Score */}
            <div className="bg-white dark:bg-[#141414] border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center shadow-sm dark:shadow-none">
              <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 flex items-center justify-center mb-2">
                <Star size={16} className="fill-yellow-400 text-yellow-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1">
                4.9 <span className="text-sm text-slate-400 dark:text-neutral-400 font-normal">/ 5</span>
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-neutral-300 mt-0.5">
                {isArabic ? 'التقييم العام المعتمد' : 'Note Globale Vérifiée'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                {isArabic ? 'أكثر من 1,800 رأي على Google' : '+1 800 avis Google & Trust'}
              </span>
            </div>

          </div>

        </div>


        {/* ── 2. Bottom Section: 3-Column Infinite Vertical Scrolling ───────── */}
        {/* Main Scrolling Wrapper with GPU Hardware Layer Isolation */}
        <div 
          className="relative h-[620px] overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
            contain: 'paint'
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-full">
            
            {/* Column 1 (Left): Animates Vertically Downwards (-50% to 0%) */}
            <div className="overflow-hidden relative h-full">
              <div className="flex flex-col gap-4 animate-scroll-down hover:[animation-play-state:paused]">
                {/* Set 1 */}
                {column1Cards.map(item => (
                  <TestimonialCard key={`c1-s1-${item.id}`} item={item} />
                ))}
                {/* Set 2 (Identical duplicate for seamless infinite loop) */}
                {column1Cards.map(item => (
                  <TestimonialCard key={`c1-s2-${item.id}`} item={item} />
                ))}
              </div>
            </div>

            {/* Column 2 (Middle): Animates Vertically Upwards (0% to -50%) */}
            <div className="overflow-hidden relative h-full hidden md:block">
              <div className="flex flex-col gap-4 animate-scroll-up hover:[animation-play-state:paused]">
                {/* Set 1 */}
                {column2Cards.map(item => (
                  <TestimonialCard key={`c2-s1-${item.id}`} item={item} />
                ))}
                {/* Set 2 (Identical duplicate for seamless infinite loop) */}
                {column2Cards.map(item => (
                  <TestimonialCard key={`c2-s2-${item.id}`} item={item} />
                ))}
              </div>
            </div>

            {/* Column 3 (Right): Animates Vertically Downwards (-50% to 0%) */}
            <div className="overflow-hidden relative h-full hidden md:block">
              <div className="flex flex-col gap-4 animate-scroll-down hover:[animation-play-state:paused]">
                {/* Set 1 */}
                {column3Cards.map(item => (
                  <TestimonialCard key={`c3-s1-${item.id}`} item={item} />
                ))}
                {/* Set 2 (Identical duplicate for seamless infinite loop) */}
                {column3Cards.map(item => (
                  <TestimonialCard key={`c3-s2-${item.id}`} item={item} />
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

    </section>
  );
};

export default TestimonialsSection;
