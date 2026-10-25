import React, { useState } from 'react';
import { Calculator, Users, Plane, Building2, Coins, Copy, Check, Sparkles, RefreshCw } from 'lucide-react';

const SimulatorView = () => {
  // Simulator inputs
  const [adultes, setAdultes] = useState(2);
  const [enfants, setEnfants] = useState(0);
  const [bebes, setBebes] = useState(0);

  const [billetParPersonne, setBilletParPersonne] = useState(125000);
  const [hotelTotal, setHotelTotal] = useState(250000);
  const [visaParPersonne, setVisaParPersonne] = useState(30000);
  const [transfertTotal, setTransfertTotal] = useState(25000);
  const [margeParPersonne, setMargeParPersonne] = useState(20000);

  const [copied, setCopied] = useState(false);

  // Totals calculation
  const totalBillets = (adultes * billetParPersonne) + (enfants * (billetParPersonne * 0.85)) + (bebes * (billetParPersonne * 0.15));
  const totalVisas = (adultes + enfants) * visaParPersonne;
  const totalMarge = (adultes + enfants) * margeParPersonne;

  const grandTotal = totalBillets + Number(hotelTotal || 0) + totalVisas + Number(transfertTotal || 0) + totalMarge;
  const prixParAdulte = adultes > 0 ? Math.round(grandTotal / (adultes + (enfants * 0.8))) : grandTotal;

  const handleCopySummary = () => {
    const text = `📋 *Simulation Rapide Devis Travel* :
👥 Passagers : ${adultes} Adulte(s), ${enfants} Enfant(s), ${bebes} Bébé(s)
✈️ Billets : ${Math.round(totalBillets).toLocaleString('fr-FR')} DZD
🏨 Hébergement : ${Number(hotelTotal).toLocaleString('fr-FR')} DZD
📄 Visas & Transferts : ${(totalVisas + Number(transfertTotal)).toLocaleString('fr-FR')} DZD
💰 *TOTAL ESTIMÉ : ${Math.round(grandTotal).toLocaleString('fr-FR')} DZD*
(Soit env. ~${Math.round(prixParAdulte).toLocaleString('fr-FR')} DZD / Adulte)`;

    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    setAdultes(2);
    setEnfants(0);
    setBebes(0);
    setBilletParPersonne(125000);
    setHotelTotal(250000);
    setVisaParPersonne(30000);
    setTransfertTotal(25000);
    setMargeParPersonne(20000);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Banner Result Card */}
      <div className="glass-card rounded-3xl p-4 border border-emerald-500/30 bg-gradient-to-br from-white dark:from-slate-900 via-white dark:via-slate-950 to-emerald-500/5 dark:to-emerald-950/40 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Sparkles size={13} /> Estimation Devis Pocket
          </span>
          <button
            onClick={handleReset}
            className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 font-semibold"
          >
            <RefreshCw size={11} /> Réinitialiser
          </button>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Prix Total TTC Estimé</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {Math.round(grandTotal).toLocaleString('fr-FR')}
            </h2>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">DZD</span>
          </div>
          {adultes > 0 && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Soit environ <strong className="text-slate-800 dark:text-slate-200 font-bold">{Math.round(prixParAdulte).toLocaleString('fr-FR')} DZD</strong> / personne
            </p>
          )}
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopySummary}
          className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs"
        >
          {copied ? <Check size={14} className="text-emerald-600 dark:text-emerald-300" /> : <Copy size={14} />}
          <span>{copied ? 'Résumé Copié !' : 'Copier le résumé devis'}</span>
        </button>
      </div>

      {/* Simulator Calculator Form */}
      <div className="glass-card rounded-3xl p-4 border border-slate-200 dark:border-slate-800 space-y-4">
        {/* Pax Counters */}
        <div>
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
            <Users size={14} className="text-emerald-500" /> Nombre de Passagers
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-50 dark:bg-slate-950/70 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block">Adultes</span>
              <div className="flex items-center justify-center gap-2 mt-1">
                <button
                  onClick={() => setAdultes(p => Math.max(1, p - 1))}
                  className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >-</button>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white w-4">{adultes}</span>
                <button
                  onClick={() => setAdultes(p => p + 1)}
                  className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >+</button>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/70 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block">Enfants</span>
              <div className="flex items-center justify-center gap-2 mt-1">
                <button
                  onClick={() => setEnfants(p => Math.max(0, p - 1))}
                  className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >-</button>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white w-4">{enfants}</span>
                <button
                  onClick={() => setEnfants(p => p + 1)}
                  className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >+</button>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/70 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block">Bébés</span>
              <div className="flex items-center justify-center gap-2 mt-1">
                <button
                  onClick={() => setBebes(p => Math.max(0, p - 1))}
                  className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >-</button>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white w-4">{bebes}</span>
                <button
                  onClick={() => setBebes(p => p + 1)}
                  className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >+</button>
              </div>
            </div>
          </div>
        </div>

        {/* Billets d'avion */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Plane size={13} className="text-emerald-500" /> Billet avion / personne (DZD)
            </span>
          </label>
          <input
            type="number"
            value={billetParPersonne}
            onChange={(e) => setBilletParPersonne(Number(e.target.value))}
            step={5000}
            className="w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:outline-none font-mono shadow-2xs"
          />
        </div>

        {/* Hébergement Hotel Total */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Building2 size={13} className="text-amber-500" /> Coût Total Hôtel (DZD)
            </span>
          </label>
          <input
            type="number"
            value={hotelTotal}
            onChange={(e) => setHotelTotal(Number(e.target.value))}
            step={10000}
            className="w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:outline-none font-mono shadow-2xs"
          />
        </div>

        {/* Visas & Services */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Visa / personne</label>
            <input
              type="number"
              value={visaParPersonne}
              onChange={(e) => setVisaParPersonne(Number(e.target.value))}
              step={2000}
              className="w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:outline-none font-mono shadow-2xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Transferts total</label>
            <input
              type="number"
              value={transfertTotal}
              onChange={(e) => setTransfertTotal(Number(e.target.value))}
              step={5000}
              className="w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:outline-none font-mono shadow-2xs"
            />
          </div>
        </div>

        {/* Marge Agence */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Coins size={13} className="text-yellow-500" /> Marge souhaitée / personne (DZD)
          </label>
          <input
            type="number"
            value={margeParPersonne}
            onChange={(e) => setMargeParPersonne(Number(e.target.value))}
            step={5000}
            className="w-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:outline-none font-mono shadow-2xs"
          />
        </div>
      </div>
    </div>
  );
};

export default SimulatorView;
