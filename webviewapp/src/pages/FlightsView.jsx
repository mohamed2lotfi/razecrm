import React, { useState, useEffect } from 'react';
import { 
  Plane, Calendar, Users, Building2, BedDouble, 
  Wallet, RefreshCw, ChevronDown, ChevronUp, UserCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { buildChambresPhysiques, computeGroupRoomStats, resolveHotelName } from '../lib/omraRoomUtils';

// Helper pour traduire les types de chambres en arabe
const translateRoomType = (typeKey) => {
  if (!typeKey) return 'رباعية';
  const k = String(typeKey).trim().toUpperCase();
  if (k === 'CH4' || k.includes('QUAD')) return 'رباعية';
  if (k === 'CH3' || k.includes('TRIP')) return 'ثلاثية';
  if (k === 'CH2' || k.includes('DOUB')) return 'ثنائية';
  if (k === 'CH5' || k.includes('QUINT')) return 'خماسية';
  if (k === 'SINGLE' || k.includes('INDIV') || k === 'CH1') return 'فردية';
  return typeKey;
};

// Helper pour formater les compagnies aériennes
const formatAirlineName = (code) => {
  if (!code) return 'رحلة جوية';
  const c = String(code).trim().toUpperCase();
  if (c === 'SV') return 'الخطوط السعودية (SV)';
  if (c === 'AH') return 'الخطوط الجزائرية (AH)';
  if (c === 'TK') return 'الخطوط التركية (TK)';
  if (c === 'QR') return 'القطرية (QR)';
  if (c === 'EK') return 'طيران الإمارات (EK)';
  return code;
};

// Helper date en arabe (format Algérie)
const formatDateAr = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    const monthsAr = [
      'جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان',
      'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const day = String(d.getDate()).padStart(2, '0');
    const month = monthsAr[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
};

const FlightsView = () => {
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedHotelGroupId, setExpandedHotelGroupId] = useState(null);

  useEffect(() => {
    fetchUpcomingFlights();
  }, []);

  const fetchUpcomingFlights = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Charger uniquement les groupes à venir (date_depart >= aujourd'hui)
      const [grpRes, hotelsRes, enrRes, paiRes] = await Promise.all([
        supabase
          .from('omra_groupes')
          .select('*')
          .gte('date_depart', todayStr)
          .order('date_depart', { ascending: true }),
        supabase.from('hotels').select('*'),
        supabase
          .from('omra_enregistrements')
          .select('id, groupe_id, hotel_id, type_chambre, chambre_id, pelerins, enfants_sans_lit, total_net, total_brut, total_commission, reduction, paiement_rabatteur'),
        supabase
          .from('omra_paiements')
          .select('id, groupe_id, montant_dzd')
      ]);

      const rawGroups = grpRes.data || [];
      const hotelsMaster = hotelsRes.data || [];
      const allEnrs = enrRes.data || [];
      const allPaiements = paiRes.data || [];

      // 2. Traitement et calcul des statistiques pour chaque vol
      const processed = rawGroups.map(grp => {
        const groupEnrs = allEnrs.filter(e => e.groupe_id === grp.id);
        const groupPaiements = allPaiements.filter(p => p.groupe_id === grp.id);

        // A. Places & Inscriptions
        const allPelerins = groupEnrs.flatMap(e => [
          ...(e.pelerins || []),
          ...(e.enfants_sans_lit || e.enfantsSansLit || []).map(enf => ({ ...enf, chd: true }))
        ]);
        const inscritsCount = allPelerins.length;
        const totalPlaces = Number(grp.nbr_places) || 0;
        const placesRestantes = Math.max(0, totalPlaces - inscritsCount);
        const occupationPercent = totalPlaces > 0 ? Math.min(100, Math.round((inscritsCount / totalPlaces) * 100)) : 0;

        // B. Chambres physiques & Lits restants par hôtel
        const groupChambres = buildChambresPhysiques(groupEnrs);
        const roomStats = computeGroupRoomStats(groupChambres, grp.hotels, hotelsMaster);

        // C. Finances : CA Dû, CA Encaissé, CA Restant
        const caDu = groupEnrs.reduce((sum, e) => {
          if (e.total_net != null && !isNaN(Number(e.total_net))) {
            return sum + Number(e.total_net);
          }
          const brut = Number(e.total_brut) || 0;
          const comm = e.paiement_rabatteur ? (Number(e.total_commission) || 0) : 0;
          const reduc = Number(e.reduction) || 0;
          return sum + Math.max(0, brut - comm - reduc);
        }, 0);

        const caEncaisse = groupPaiements.reduce((sum, p) => sum + (Number(p.montant_dzd) || 0), 0);
        const caRestant = Math.max(0, caDu - caEncaisse);
        const caEncaissePercent = caDu > 0 ? Math.min(100, Math.round((caEncaisse / caDu) * 100)) : 0;

        // D. Résolution des noms d'hôtels en arabe
        const hotelsListAr = (grp.hotels || [])
          .map(gh => resolveHotelName(gh.hotelId || gh.id || gh.location, hotelsMaster, grp.hotels, true))
          .filter((v, i, a) => v && v !== 'فندق غير محدد' && a.indexOf(v) === i);

        return {
          ...grp,
          inscritsCount,
          totalPlaces,
          placesRestantes,
          occupationPercent,
          roomStats,
          hotelsListAr,
          caDu,
          caEncaisse,
          caRestant,
          caEncaissePercent,
        };
      });

      setGroupes(processed);
    } catch (err) {
      console.warn('Error fetching upcoming omra flights:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchUpcomingFlights();
  };

  return (
    <div dir="rtl" className="space-y-4 pb-28 font-sans text-right w-full max-w-full">
      {/* Header compact en arabe avec bouton d'actualisation */}
      <div className="flex items-center justify-between px-1 pt-1 pb-0.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Plane size={17} className="-rotate-45" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              رحلات العمرة القادمة
            </h3>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
              المقاعد الشاغرة، الغرف والبيانات المالية
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all shadow-2xs"
          title="تحديث البيانات"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-emerald-500' : ''} />
        </button>
      </div>

      {/* Liste des vols ou état de chargement */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 mx-auto border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            جاري تحميل بيانات رحلات العمرة...
          </p>
        </div>
      ) : groupes.length === 0 ? (
        <div className="py-16 text-center space-y-3 px-4 glass-card rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
            <Plane size={28} className="text-emerald-500 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              لا توجد رحلات عمرة قادمة حالياً
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              جميع الرحلات السابقة مكتملة أو لم تتم برمجة رحلات مستقبلية بعد.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs"
          >
            <RefreshCw size={12} />
            <span>تحديث البيانات</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupes.map((grp) => {
            const isExpanded = expandedHotelGroupId === grp.id;
            const rStats = grp.roomStats || {};
            const repartitionTypes = rStats.repartitionTypes || {};

            return (
              <div
                key={grp.id}
                className="glass-card rounded-3xl p-4 border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 shadow-md space-y-3.5"
              >
                {/* 1. ترويسة الرحلة : الرمز، اسم الفوج وشارة الحالة */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {grp.code || 'OMRA'}
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-1.5 leading-snug">
                      {grp.nom}
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                    رحلة قادمة
                  </span>
                </div>

                {/* 2. مسار وتواريخ السفر (ذهاب وعودة) */}
                <div className="bg-slate-50 dark:bg-slate-950/70 rounded-2xl p-2.5 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs w-full min-w-0 gap-1 overflow-hidden">
                  {/* الذهاب */}
                  <div className="space-y-0.5 text-right min-w-0 flex-1">
                    <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-semibold block truncate">
                      الذهاب (من الجزائر)
                    </span>
                    <p className="font-extrabold text-slate-900 dark:text-slate-100 text-[11px] truncate">
                      {formatDateAr(grp.date_depart)}
                    </p>
                  </div>

                  {/* خط السير */}
                  <div className="flex flex-col items-center px-1 shrink-0 max-w-[95px]">
                    <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 truncate max-w-[90px] text-center">
                      {formatAirlineName(grp.compagnie)}
                    </span>
                    <div className="flex items-center gap-1 my-0.5">
                      <div className="w-3.5 h-px bg-slate-300 dark:bg-slate-700" />
                      <Plane size={10} className="text-emerald-500 rotate-180" />
                      <div className="w-3.5 h-px bg-slate-300 dark:bg-slate-700" />
                    </div>
                    <span className="text-[8.5px] text-slate-400 font-bold">مباشر</span>
                  </div>

                  {/* العودة */}
                  <div className="space-y-0.5 text-left min-w-0 flex-1">
                    <span className="text-[9.5px] text-slate-500 dark:text-slate-400 font-semibold block truncate">
                      العودة (من السعودية)
                    </span>
                    <p className="font-extrabold text-slate-900 dark:text-slate-100 text-[11px] truncate">
                      {formatDateAr(grp.date_retour)}
                    </p>
                  </div>
                </div>

                {/* ======================================================== */}
                {/* القسم 1 : الأماكن المتبقية                                */}
                {/* ======================================================== */}
                <div className="bg-emerald-50/40 dark:bg-emerald-950/20 rounded-2xl p-3 border border-emerald-500/25 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Users size={14} className="text-emerald-600 dark:text-emerald-400" />
                      <span>الأماكن المتبقية :</span>
                    </span>

                    <div className="flex items-baseline gap-1">
                      <span className={`font-black text-sm tabular-nums ${
                        grp.placesRestantes === 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {grp.placesRestantes === 0 ? 'مكتمل (0)' : `${grp.placesRestantes} مكان`}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                        / {grp.totalPlaces} إجمالي
                      </span>
                    </div>
                  </div>

                  {/* شريط نسبة الامتلاء */}
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        grp.placesRestantes === 0
                          ? 'bg-red-500'
                          : grp.placesRestantes <= 5
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${grp.occupationPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    <span>المسجلين : <strong className="text-slate-800 dark:text-slate-200">{grp.inscritsCount}</strong></span>
                    <span>نسبة الحجز : <strong className="text-emerald-600 dark:text-emerald-400">{grp.occupationPercent}%</strong></span>
                    <span>المتبقي : <strong className="text-slate-800 dark:text-slate-200">{grp.placesRestantes} شاغر</strong></span>
                  </div>
                </div>

                {/* ======================================================== */}
                {/* القسم 2 : تقسيم الغرف                                     */}
                {/* ======================================================== */}
                <div className="bg-amber-50/40 dark:bg-amber-950/20 rounded-2xl p-3 border border-amber-500/25 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <BedDouble size={14} className="text-amber-500" />
                      <span>تقسيم الغرف والأسرة الشاغرة</span>
                    </span>

                    <button
                      onClick={() => setExpandedHotelGroupId(isExpanded ? null : grp.id)}
                      className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 hover:underline"
                    >
                      <span>{isExpanded ? 'إخفاء التفاصيل' : 'تفاصيل الفنادق'}</span>
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>

                  {/* إحصائيات عامة للغرف في هذا الفوج */}
                  <div className="flex items-center justify-between text-xs flex-wrap gap-1.5 pt-0.5">
                    <span className="text-slate-700 dark:text-slate-300 text-[11px]">
                      إجمالي الغرف : <strong className="text-slate-900 dark:text-white">{rStats.totalChambres || 0}</strong>
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold">الأسرة الشاغرة :</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10.5px] tabular-nums">
                        {rStats.totalLitsVides || 0} سرير
                      </span>

                      {rStats.litsVidesHommes > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[9.5px] font-bold">
                          👨 {rStats.litsVidesHommes} رجال
                        </span>
                      )}

                      {rStats.litsVidesFemmes > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[9.5px] font-bold">
                          👩 {rStats.litsVidesFemmes} نساء
                        </span>
                      )}
                    </div>
                  </div>

                  {/* شارات توزيع أنواع الغرف (رباعية، ثلاثية، ثنائية...) */}
                  {Object.keys(repartitionTypes).length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-amber-200/50 dark:border-amber-800/40">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">الأنواع :</span>
                      {Object.entries(repartitionTypes).map(([typeKey, count]) => (
                        <span
                          key={typeKey}
                          className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-[10px] font-bold shadow-2xs"
                        >
                          {translateRoomType(typeKey)}: {count}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* أكورديون تفاصيل الفنادق */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/60 space-y-2 animate-in fade-in duration-200">
                      {(!rStats.hotelsStats || rStats.hotelsStats.length === 0) ? (
                        <p className="text-[11px] text-slate-400 italic">لا توجد فنادق محددة لهذا الفوج حالياً.</p>
                      ) : (
                        rStats.hotelsStats.map((hStat, hIdx) => (
                          <div
                            key={hIdx}
                            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 truncate max-w-[200px]">
                                <Building2 size={13} className="text-amber-500 shrink-0" />
                                <span className="truncate">{hStat.hotelNomAr || hStat.hotelNom}</span>
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {hStat.totalChambres} غرفة
                              </span>
                            </div>

                            {/* تفاصيل الأنواع الفندقية */}
                            {hStat.types && Object.keys(hStat.types).length > 0 && (
                              <div className="flex items-center gap-1 flex-wrap text-[10px] text-slate-600 dark:text-slate-400">
                                <span className="font-semibold">الغرف :</span>
                                {Object.entries(hStat.types).map(([tk, c]) => (
                                  <span key={tk} className="bg-slate-50 dark:bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                                    {c} {translateRoomType(tk)}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                              <span className="text-slate-500 dark:text-slate-400">
                                الأسرة المحجوزة : <strong className="text-slate-800 dark:text-slate-200">{hStat.litsOccupes || 0}</strong> / {hStat.totalLits || 0}
                              </span>
                              <span className="font-extrabold text-amber-600 dark:text-amber-400">
                                {hStat.totalLitsVides || 0} سرير شاغر
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* ======================================================== */}
                {/* القسم 3 : البيانات المالية                                 */}
                {/* ======================================================== */}
                <div className="bg-gradient-to-br from-slate-50 dark:from-slate-950/80 to-slate-100/60 dark:to-slate-900/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Wallet size={14} className="text-emerald-500" />
                      <span>البيانات المالية للرحلة</span>
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      تم تحصيل {grp.caEncaissePercent}%
                    </span>
                  </div>

                  {/* 3 بطاقات مالية */}
                  <div className="grid grid-cols-3 gap-1 pt-0.5 text-center w-full min-w-0">
                    {/* 1. المبلغ الإجمالي المستحق */}
                    <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 min-w-0 overflow-hidden">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold block truncate">
                        المبلغ الإجمالي
                      </span>
                      <span className="text-[11px] font-black text-slate-900 dark:text-white tabular-nums block mt-0.5 truncate">
                        {Number(grp.caDu).toLocaleString('fr-FR')}
                      </span>
                      <span className="text-[8px] text-slate-400 font-bold block mt-0.5">د.ج</span>
                    </div>

                    {/* 2. المبلغ المحصل */}
                    <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-emerald-500/20 dark:border-emerald-500/30 min-w-0 overflow-hidden">
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block truncate">
                        المحصل
                      </span>
                      <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums block mt-0.5 truncate">
                        {Number(grp.caEncaisse).toLocaleString('fr-FR')}
                      </span>
                      <span className="text-[8px] text-emerald-600/70 dark:text-emerald-400/70 font-bold block mt-0.5">د.ج</span>
                    </div>

                    {/* 3. المبلغ المتبقي */}
                    <div className="bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-amber-500/20 dark:border-amber-500/30 min-w-0 overflow-hidden">
                      <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold block truncate">
                        المتبقي
                      </span>
                      <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 tabular-nums block mt-0.5 truncate">
                        {Number(grp.caRestant).toLocaleString('fr-FR')}
                      </span>
                      <span className="text-[8px] text-amber-600/70 dark:text-amber-400/70 font-bold block mt-0.5">د.ج</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FlightsView;
