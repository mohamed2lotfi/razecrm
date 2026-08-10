import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { Stamp, Clock, FileCheck, ArrowRight, ArrowLeft, Globe, ShieldCheck } from 'lucide-react';
import { cn, formatDZD } from '@/lib/utils';

export const VisaServices = ({ onSelectVisa }) => {
  const { t, isArabic } = useLanguage();
  const [countries, setCountries] = useState([]);
  const [visaTypes, setVisaTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountryId, setSelectedCountryId] = useState('all');
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  useEffect(() => {
    const fetchVisaData = async () => {
      try {
        const [cRes, vtRes] = await Promise.all([
          supabase.from('visa_countries').select('*').order('nom'),
          supabase.from('visa_types').select('*').order('tarif_vente')
        ]);

        if (cRes.data && cRes.data.length > 0) setCountries(cRes.data);
        else {
          setCountries([
            { id: 'c1', nom: 'Arabie Saoudite (Omra & Tourisme)', nom_ar: 'المملكة العربية السعودية (عمرة وسياحة)', code_iso: 'sa', flag_icon: '🇸🇦' },
            { id: 'c2', nom: 'Émirats Arabes Unis (Dubaï)', nom_ar: 'الإمارات العربية المتحدة (دبي)', code_iso: 'ae', flag_icon: '🇦🇪' },
            { id: 'c3', nom: 'Turquie (E-Visa & Touristique)', nom_ar: 'تركيا (تأشيرة إلكترونية وسياحية)', code_iso: 'tr', flag_icon: '🇹🇷' },
            { id: 'c4', nom: 'Égypte', nom_ar: 'جمهورية مصر العربية', code_iso: 'eg', flag_icon: '🇪🇬' },
            { id: 'c5', nom: 'Espace Schengen', nom_ar: 'دول فضاء شنغن (Schengen)', code_iso: 'eu', flag_icon: '🇪🇺' },
            { id: 'c6', nom: 'Royaume-Uni (UK)', nom_ar: 'المملكة المتحدة', code_iso: 'gb', flag_icon: '🇬🇧' },
            { id: 'c7', nom: 'États-Unis (USA)', nom_ar: 'الولايات المتحدة', code_iso: 'us', flag_icon: '🇺🇸' }
          ]);
        }

        if (vtRes.data && vtRes.data.length > 0) setVisaTypes(vtRes.data);
        else {
          setVisaTypes([
            {
              id: 'v1',
              country_id: 'c1',
              nom: 'E-Visa Tourisme & Omra (1 An Multiple)',
              nom_ar: 'تأشيرة إلكترونية سياحة وعمرة (سنة كاملة متعددة)',
              duree_traitement: '24 à 48 heures',
              duree_traitement_ar: '24 إلى 48 ساعة',
              tarif_vente: 32000,
              dossier: ['Copie Passeport (Validité 6 mois min)', 'Photo fond blanc numérisée'],
              dossier_ar: ['نسخة جواز السفر (صلاحية 6 أشهر)', 'صورة شمسية رقمية بخلفية بيضاء']
            },
            {
              id: 'v2',
              country_id: 'c2',
              nom: 'Visa Dubaï Touristique (30 Jours)',
              nom_ar: 'تأشيرة دبي السياحية (30 يوماً)',
              duree_traitement: '2 à 3 jours ouvrables',
              duree_traitement_ar: '2 إلى 3 أيام عمل',
              tarif_vente: 22000,
              dossier: ['Copie Passeport', 'Photo d\'identité', 'Billet d\'avion A/R'],
              dossier_ar: ['نسخة جواز السفر', 'صورة شمسية', 'تذكرة طيران ذهاب وإياب']
            },
            {
              id: 'v3',
              country_id: 'c3',
              nom: 'E-Visa Turquie (B1 / C1)',
              nom_ar: 'تأشيرة تركيا الإلكترونية الفورية',
              duree_traitement: 'Instantané (2 heures)',
              duree_traitement_ar: 'فوري (خلال ساعتين)',
              tarif_vente: 14000,
              dossier: ['Passeport en cours de validité', 'Visa Schengen/USA valide si applicable'],
              dossier_ar: ['جواز سفر ساري المفعول', 'تأشيرة شنغن/أمريكا سارية إن وجدت']
            },
            {
              id: 'v4',
              country_id: 'c4',
              nom: 'Visa Touristique Égypte avec Sécurité',
              nom_ar: 'تأشيرة مصر السياحية مع الموافقة الأمنية',
              duree_traitement: '5 à 7 jours ouvrables',
              duree_traitement_ar: '5 إلى 7 أيام عمل',
              tarif_vente: 18500,
              dossier: ['Passeport original', '2 Photos d\'identité', 'Attestation de travail'],
              dossier_ar: ['جواز السفر الأصلي', 'صورتان شمسيتان', 'شهادة عمل أو كشف حساب']
            }
          ]);
        }
      } catch (err) {
        console.warn('Error loading visa catalogue:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVisaData();
  }, []);

  const filteredVisas = selectedCountryId === 'all'
    ? visaTypes
    : visaTypes.filter(v => v.country_id === selectedCountryId);

  const getCountryForVisa = (countryId) => {
    return countries.find(c => c.id === countryId) || {};
  };

  return (
    <section id="visas" className="py-24 px-4 sm:px-6 relative max-w-7xl mx-auto border-t border-slate-200/60 dark:border-white/5">
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 dark:bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider mb-4">
          <Stamp size={13} /> {t('visa_badge')}
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
          {t('visa_title')}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
          {t('visa_subtitle')}
        </p>
      </div>

      {/* Country Filter Tabs with Flags */}
      <div className="flex items-center justify-center gap-2.5 overflow-x-auto pb-4 mb-12 custom-scrollbar">
        <button
          onClick={() => setSelectedCountryId('all')}
          className={cn(
            "px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2",
            selectedCountryId === 'all'
              ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25 scale-105'
              : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10'
          )}
        >
          <Globe size={15} />
          <span>{t('visa_all_destinations')}</span>
        </button>

        {countries.map(c => {
          const countryName = isArabic ? (c.nom_ar || c.nom) : (c.nom || c.nom_ar);
          const isSelected = selectedCountryId === c.id;

          return (
            <button
              key={c.id}
              onClick={() => setSelectedCountryId(c.id)}
              className={cn(
                "px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2",
                isSelected
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25 scale-105'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10'
              )}
            >
              {c.code_iso ? (
                <img 
                  src={`https://flagcdn.com/w40/${c.code_iso.toLowerCase()}.png`} 
                  alt={countryName} 
                  className="w-5 h-3.5 object-cover rounded shadow-sm flex-shrink-0"
                />
              ) : (
                <span className="text-base leading-none">{c.flag_icon || '🌍'}</span>
              )}
              <span>{countryName}</span>
            </button>
          );
        })}
      </div>

      {/* Visa Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVisas.map((visa, idx) => {
          const country = getCountryForVisa(visa.country_id);
          const visaTitle = isArabic ? (visa.nom_ar || visa.nom) : (visa.nom || visa.nom_ar);
          const delayText = isArabic ? (visa.duree_traitement_ar || visa.duree_traitement || 'سريع') : (visa.duree_traitement || 'Rapide');
          const dossierList = isArabic ? (visa.dossier_ar || visa.dossier || ['جواز سفر ساري', 'صورة شمسية']) : (visa.dossier || ['Passeport valide', 'Photo d\'identité']);

          return (
            <div key={visa.id || idx} className="card-bezel-outer transition-all hover:scale-[1.01]">
              <div className="card-bezel-inner p-6 flex flex-col h-full text-left rtl:text-right">
                
                {/* Header with Flag and Price */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    {country.code_iso ? (
                      <div className="w-10 h-7 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm flex-shrink-0">
                        <img 
                          src={`https://flagcdn.com/w80/${country.code_iso.toLowerCase()}.png`} 
                          alt={country.nom} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-xl flex-shrink-0">
                        {country.flag_icon || '🌍'}
                      </div>
                    )}
                    <div>
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                        {isArabic ? (country.nom_ar || country.nom) : (country.nom || country.nom_ar)}
                      </span>
                    </div>
                  </div>

                  <span className="text-lg font-black text-slate-900 dark:text-white font-mono flex-shrink-0">
                    {visa.tarif_vente ? formatDZD(visa.tarif_vente) : (isArabic ? 'حسب الطلب' : 'Sur devis')}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                  {visaTitle}
                </h3>

                <div className="flex items-center gap-2 text-xs text-brand-700 dark:text-brand-300 font-medium mb-5 bg-brand-500/10 px-3 py-1.5 rounded-lg border border-brand-500/20 w-fit">
                  <Clock size={13} />
                  <span>{t('visa_delay')} : {delayText}</span>
                </div>

                {/* Requirements list */}
                <div className="space-y-1.5 mb-6 flex-1 text-xs text-slate-600 dark:text-slate-300">
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider block mb-1">
                    {t('visa_docs_required')}
                  </span>
                  {dossierList.map((doc, dIdx) => (
                    <div key={dIdx} className="flex items-center gap-2">
                      <FileCheck size={12} className="text-brand-500 flex-shrink-0" />
                      <span className="truncate">{doc}</span>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => onSelectVisa(visa)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-500 text-slate-900 dark:text-white text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 mt-auto shadow-sm"
                >
                  <span>{t('visa_apply_btn')}</span>
                  <ArrowIcon size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
