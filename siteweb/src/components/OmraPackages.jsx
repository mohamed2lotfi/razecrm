import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Building2, Calendar, Plane, Star, 
  CheckCircle2, ArrowRight, ArrowLeft, Sparkles 
} from 'lucide-react';
import { cn, formatDZD } from '@/lib/utils';

// Helper pour calculer le tarif le plus bas parmi les chambres CH4 et CH5 de tous les hôtels du groupe
// Si CH5 est vide ou non renseigné, le tarif le plus bas de CH4 est utilisé
export const getStartingPriceForPackage = (pkg) => {
  if (!pkg) return null;

  const validCh4Ch5Prices = [];

  if (Array.isArray(pkg.hotels) && pkg.hotels.length > 0) {
    pkg.hotels.forEach(h => {
      const p5 = parseFloat(String(h.ch5 || '').replace(/\s+/g, ''));
      const p4 = parseFloat(String(h.ch4 || '').replace(/\s+/g, ''));

      if (!isNaN(p5) && p5 > 0) {
        validCh4Ch5Prices.push(p5);
      }
      if (!isNaN(p4) && p4 > 0) {
        validCh4Ch5Prices.push(p4);
      }
    });
  }

  // 1. Si au moins une chambre CH4 ou CH5 a un tarif renseigné
  if (validCh4Ch5Prices.length > 0) {
    return Math.min(...validCh4Ch5Prices);
  }

  // 2. Fallback vers les autres types de chambres si CH4/CH5 sont vides
  if (Array.isArray(pkg.hotels) && pkg.hotels.length > 0) {
    const otherPrices = [];
    pkg.hotels.forEach(h => {
      ['ch3', 'ch2', 'single'].forEach(key => {
        const val = parseFloat(String(h[key] || '').replace(/\s+/g, ''));
        if (!isNaN(val) && val > 0) otherPrices.push(val);
      });
    });
    if (otherPrices.length > 0) return Math.min(...otherPrices);
  }

  // 3. Fallback vers tarif_billet général du groupe
  const billet = parseFloat(String(pkg.tarif_billet || '').replace(/\s+/g, ''));
  if (!isNaN(billet) && billet > 0) {
    return billet;
  }

  return null;
};

export const OmraPackages = ({ onSelectPackage }) => {
  const { t, isArabic } = useLanguage();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const { data, error } = await supabase
          .from('omra_groupes')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setGroups(data);
        } else {
          setGroups([
            {
              id: 'pack-confort',
              nom: isArabic ? 'عمرة الراحة — فنادق قريبة من الحرم' : 'Omra Confort — Hôtels Proches Haram',
              date_depart: '2026-09-15',
              date_retour: '2026-09-30',
              compagnie: 'Saudia Airlines',
              nbr_places: 45,
              hotels: [
                { 
                  location: isArabic ? 'فندق شدا مكة (تلال 150م)' : 'Hôtel Shada Makkah (Tilal 150m)', 
                  nbrEtoiles: '4',
                  ch5: 220000,
                  ch4: 235000,
                  ch3: 255000,
                  ch2: 285000
                },
                { 
                  location: isArabic ? 'فندق دار التقوى المدينة 5★' : 'Dar Al Taqwa Madinah 5★', 
                  nbrEtoiles: '5',
                  ch5: 225000,
                  ch4: 240000,
                  ch3: 260000,
                  ch2: 290000
                }
              ],
              featured: true
            },
            {
              id: 'pack-economique',
              nom: isArabic ? 'عمرة رمضان المبارك 1447 — سكينة وإيمان' : 'Omra Ramadan 1447 — Sérénité & Spiritualité',
              date_depart: '2026-10-05',
              date_retour: '2026-10-20',
              compagnie: 'Air Algérie',
              nbr_places: 50,
              hotels: [
                { 
                  location: isArabic ? 'فندق فجر النسك أجياد (450م)' : 'Hôtel Fajr Al Nusuk Ajyad (450m)', 
                  nbrEtoiles: '4',
                  ch5: '',
                  ch4: 185000,
                  ch3: 205000,
                  ch2: 230000
                },
                { 
                  location: isArabic ? 'فندق أنوار المدينة موفنبيك 5★' : 'Hôtel Anwar Al Madinah Mövenpick 5★', 
                  nbrEtoiles: '5',
                  ch5: '',
                  ch4: 195000,
                  ch3: 215000,
                  ch2: 245000
                }
              ],
              featured: false
            },
            {
              id: 'pack-vip',
              nom: isArabic ? 'عمرة كبار الشخصيات VIP — جناح فاخر' : 'Omra Prestige VIP — Suite 5 Étoiles',
              date_depart: '2026-11-10',
              date_retour: '2026-11-25',
              compagnie: 'Qatar Airways',
              nbr_places: 30,
              hotels: [
                { 
                  location: isArabic ? 'فيرمونت مكة (مطل على الكعبة)' : 'Fairmont Makkah (Vue Kaaba)', 
                  nbrEtoiles: '5',
                  ch5: 320000,
                  ch4: 340000,
                  ch3: 370000,
                  ch2: 410000
                },
                { 
                  location: isArabic ? 'أوبروي المدينة المنورة 5★' : 'The Oberoi Madinah 5★', 
                  nbrEtoiles: '5',
                  ch5: 330000,
                  ch4: 350000,
                  ch3: 380000,
                  ch2: 420000
                }
              ],
              featured: false
            }
          ]);
        }
      } catch (err) {
        console.warn('Error fetching packages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [isArabic]);

  return (
    <section id="omra" className="py-24 px-4 sm:px-6 relative max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 dark:bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles size={13} /> {t('omra_badge')}
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('omra_title')}
          </h2>
        </div>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-md">
          {t('omra_subtitle')}
        </p>
      </div>

      {/* Grid of Packages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {groups.map((pkg, idx) => {
          const isFeatured = idx === 0 || pkg.featured;
          const startingPrice = getStartingPriceForPackage(pkg);

          return (
            <div
              key={pkg.id || idx}
              className={cn(
                "card-bezel-outer transition-all duration-300 hover:scale-[1.01] flex flex-col group",
                isFeatured ? "border-brand-500/40 ring-1 ring-brand-500/30" : ""
              )}
            >
              <div className="card-bezel-inner p-6 sm:p-7 flex flex-col flex-1 relative overflow-hidden text-left rtl:text-right">
                
                {/* Featured Badge */}
                {isFeatured && (
                  <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-brand-500 text-white shadow-lg shadow-brand-500/30">
                      <Star size={11} className="fill-white" /> {t('omra_popular')}
                    </span>
                  </div>
                )}

                {/* Title */}
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 pr-20 rtl:pr-0 rtl:pl-20 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {pkg.nom}
                </h3>

                {/* Dates & Flight */}
                <div className="space-y-2.5 pb-5 mb-5 border-b border-slate-100 dark:border-white/10 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Calendar size={14} className="text-brand-500" /> {t('omra_period')}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {pkg.date_depart ? new Date(pkg.date_depart).toLocaleDateString(isArabic ? 'ar-DZ' : 'fr-FR') : '—'} {isArabic ? 'إلى' : 'au'} {pkg.date_retour ? new Date(pkg.date_retour).toLocaleDateString(isArabic ? 'ar-DZ' : 'fr-FR') : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Plane size={14} className="text-emerald-500" /> {t('omra_airline')}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">
                      {pkg.compagnie || 'Vol Régulier'}
                    </span>
                  </div>
                </div>

                {/* Hotels List */}
                <div className="space-y-2 mb-6 flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block mb-2">
                    {t('omra_hotels_title')}
                  </span>
                  {(pkg.hotels && pkg.hotels.length > 0 ? pkg.hotels : [
                    { location: 'Hôtel 5★ Proche Haram Makkah', nbrEtoiles: '5' },
                    { location: 'Hôtel 4★ Médine Centrale', nbrEtoiles: '4' }
                  ]).map((h, hIdx) => {
                    const rawName = h.location || h.hotelId || 'Hôtel Partenaire';
                    const cleanName = typeof rawName === 'string' ? rawName.replace(/undefined\s*étoiles/gi, '').trim() : rawName;
                    const starsCount = parseInt(h.nbrEtoiles || h.nbr_etoiles) || 4;
                    return (
                      <div key={hIdx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <Building2 size={13} className="text-gold-500 flex-shrink-0" />
                          <span className="text-slate-700 dark:text-slate-200 font-medium truncate">{cleanName || 'Hôtel Partenaire'}</span>
                        </div>
                        <div className="flex items-center text-gold-500 text-[10px] flex-shrink-0 ml-2 rtl:ml-0 rtl:mr-2">
                          {Array.from({ length: starsCount }).map((_, sIdx) => (
                            <Star key={sIdx} size={10} className="fill-gold-500" />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Included Perks */}
                <div className="space-y-1.5 mb-7 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-brand-500 flex-shrink-0" />
                    <span>{t('omra_perk_visa')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-brand-500 flex-shrink-0" />
                    <span>{t('omra_perk_guide')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-brand-500 flex-shrink-0" />
                    <span>{t('omra_perk_transfer')}</span>
                  </div>
                </div>

                {/* Price & Action: Starting from lowest CH5/CH4 across all hotels */}
                <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-4 mt-auto">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">{t('omra_price_from')}</span>
                    <span className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                      {startingPrice ? formatDZD(startingPrice) : (isArabic ? 'حسب الطلب' : 'Sur Devis')}
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectPackage(pkg)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-500 text-slate-900 dark:text-white font-bold text-xs transition-all duration-200 flex items-center gap-1.5 shadow-sm group-hover:bg-brand-500 group-hover:text-white"
                  >
                    <span>{t('omra_book_btn')}</span>
                    <ArrowIcon size={14} />
                  </button>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
