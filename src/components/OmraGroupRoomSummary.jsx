import React, { useState } from 'react';
import { BedDouble, Building2, Users, ChevronDown, ChevronUp, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Composant Haute-Couture de synthèse de répartition des chambres par hôtel
 * et des lits disponibles avec ventilation précise par genre (Hommes / Femmes).
 */
export default function OmraGroupRoomSummary({ 
  roomStats, 
  variant = 'compact', // 'compact' | 'full'
  className = ''
}) {
  const [showAllHotels, setShowAllHotels] = useState(false);

  if (!roomStats) return null;

  const {
    totalChambres = 0,
    totalLitsVides = 0,
    litsVidesFemmes = 0,
    litsVidesHommes = 0,
    litsVidesMixte = 0,
    litsVidesLibres = 0,
    hotelsStats = []
  } = roomStats;

  // ── Variante Compact (Tableau de bord & Cartes Groupes) ──────────────
  if (variant === 'compact') {
    return (
      <div className={cn(
        "p-1 rounded-xl bg-slate-100/75 border border-slate-200/80 shadow-2xs transition-all duration-300 hover:border-slate-300/90",
        className
      )}>
        <div className="p-2 bg-white rounded-lg border border-slate-100/90 flex flex-col gap-1.5 shadow-2xs">
          {/* Ligne 1 : Chambres totales & Lits vides avec ventilation Homme/Femme */}
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            {/* Nombre total de chambres */}
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                <BedDouble size={11} />
              </div>
              <span className="text-[11px] font-semibold text-slate-600">
                Chambres : <span className="font-black text-slate-900 tabular-nums">{totalChambres}</span>
              </span>
            </div>

            {/* Statut Lits Vides & Genre */}
            <div className="flex items-center gap-1 flex-wrap">
              {totalLitsVides === 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <CheckCircle2 size={10} className="text-emerald-600" />
                  Complet (0 vide)
                </span>
              ) : (
                <>
                  <span className="text-[10px] font-extrabold text-slate-400 mr-0.5 uppercase tracking-wide">
                    Lits vacants :
                  </span>

                  {/* Badge Total Lits Vides */}
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-black bg-amber-500 text-white shadow-2xs tabular-nums">
                    {totalLitsVides}
                  </span>

                  {/* Ventilation Hommes (si chambres 100% Hommes) */}
                  {litsVidesHommes > 0 && (
                    <span 
                      className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9.5px] font-black bg-sky-50 text-sky-800 border border-sky-200/90 shadow-2xs tabular-nums"
                      title="Lits vacants réservés Hommes (chambres occupées uniquement par des hommes)"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse shrink-0" />
                      👨 {litsVidesHommes} H
                    </span>
                  )}

                  {/* Ventilation Femmes (si chambres 100% Femmes) */}
                  {litsVidesFemmes > 0 && (
                    <span 
                      className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9.5px] font-black bg-rose-50 text-rose-800 border border-rose-200/90 shadow-2xs tabular-nums"
                      title="Lits vacants réservés Femmes (chambres occupées uniquement par des femmes)"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                      👩 {litsVidesFemmes} F
                    </span>
                  )}

                  {/* Mixtes ou Libres */}
                  {(litsVidesMixte + litsVidesLibres) > 0 && (
                    <span 
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs tabular-nums"
                      title="Lits vacants dans chambres familles/mixtes ou non encore affectées"
                    >
                      ⚪ {litsVidesMixte + litsVidesLibres} lib.
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Ligne 2 : Répartition des chambres par hôtel */}
          {hotelsStats.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center pt-1.5 border-t border-slate-100">
              {hotelsStats.map((h, idx) => (
                <div 
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50/90 border border-slate-200 text-[10px] text-slate-700 shadow-2xs hover:bg-white hover:border-slate-300 transition-all"
                  title={`${h.hotelNom} : ${h.totalChambres} chambre(s) [${h.typesSummary || 'Types non spécifiés'}], ${h.totalLitsVides} lit(s) vide(s) (${h.litsVidesFemmes} Femmes, ${h.litsVidesHommes} Hommes)`}
                >
                  <Building2 size={11} className="text-slate-400 shrink-0" />
                  <span className="font-extrabold text-slate-900 truncate max-w-[130px]">{h.hotelNom}</span>
                  <span className="font-black text-emerald-800 bg-emerald-100/70 px-1 py-0.2 rounded text-[9px] border border-emerald-200">
                    {h.totalChambres} ch.
                  </span>
                  {h.typesSummary && (
                    <span className="text-slate-500 font-mono text-[9px]">({h.typesSummary})</span>
                  )}
                  {h.totalLitsVides > 0 && (
                    <span className="font-black text-amber-900 bg-amber-100 px-1 py-0.2 rounded text-[9px] border border-amber-300">
                      {h.totalLitsVides} v.
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Variante Full (Détails Groupe / Fiche Omra) ──────────────────────
  return (
    <div className={cn(
      "rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col gap-3.5",
      className
    )}>
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shadow-2xs shrink-0">
            <BedDouble size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Répartition des Chambres par Hôtel
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {totalChambres} chambres au total
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Ventilation physique par établissement et lits vacants (attribués Hommes / Femmes)
            </p>
          </div>
        </div>

        {/* Global Empty Beds Tag */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-black shadow-2xs",
            totalLitsVides > 0 
              ? "bg-amber-50 text-amber-900 border-amber-200" 
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          )}>
            <BedDouble size={13} className={totalLitsVides > 0 ? "text-amber-600" : "text-emerald-600"} />
            <span>{totalLitsVides} lits vides</span>
          </div>

          {litsVidesHommes > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 text-xs font-extrabold shadow-2xs">
              <span>👨 {litsVidesHommes} Hommes</span>
            </div>
          )}

          {litsVidesFemmes > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-extrabold shadow-2xs">
              <span>👩 {litsVidesFemmes} Femmes</span>
            </div>
          )}

          {(litsVidesMixte + litsVidesLibres) > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
              <span>⚪ {litsVidesMixte + litsVidesLibres} Libres / Mixtes</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Hotels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {hotelsStats.length === 0 ? (
          <div className="col-span-full py-6 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Aucun hôtel ou chambre configuré pour ce groupe Omra.
          </div>
        ) : (
          hotelsStats.map((h, i) => (
            <div 
              key={i} 
              className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50/90 transition-all flex flex-col justify-between gap-3 shadow-2xs group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
                      <Building2 size={12} />
                    </div>
                    <span className="font-bold text-xs text-slate-900 truncate" title={h.hotelNom}>
                      {h.hotelNom}
                    </span>
                  </div>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200/80 shrink-0">
                    {h.totalChambres} ch.
                  </span>
                </div>

                {/* Composition des types */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.keys(h.types || {}).length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic">Aucune chambre assignée</span>
                  ) : (
                    Object.entries(h.types).map(([typeKey, count]) => (
                      <span 
                        key={typeKey} 
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs"
                      >
                        {count}× <span className="font-extrabold text-slate-900">{typeKey}</span>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Lits vides de cet hôtel */}
              <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Lits disponibles :</span>
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "font-black px-1.5 py-0.2 rounded text-[10px]",
                    h.totalLitsVides > 0 ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"
                  )}>
                    {h.totalLitsVides}
                  </span>
                  {h.litsVidesHommes > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-sky-50 text-sky-800 border border-sky-200 text-[9.5px] font-extrabold">
                      👨 {h.litsVidesHommes} H
                    </span>
                  )}
                  {h.litsVidesFemmes > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[9.5px] font-extrabold">
                      👩 {h.litsVidesFemmes} F
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
