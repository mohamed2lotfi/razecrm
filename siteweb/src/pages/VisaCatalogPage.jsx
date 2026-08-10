import React from 'react';
import { VisaServices } from '@/components/VisaServices';
import { Stamp, ShieldCheck, Clock } from 'lucide-react';

export const VisaCatalogPage = ({ onSelectVisa, onOpenQuoteModal }) => {
  return (
    <div className="pt-28 pb-20 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
          <Stamp size={13} /> Traitement Express & Sécurisé
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
          Catalogue des Visas & E-Visas
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
          Simplifiez vos démarches consulaires pour l'Arabie Saoudite, Dubaï, la Turquie, l'Égypte et l'Espace Schengen.
        </p>
      </div>

      <VisaServices onSelectVisa={onSelectVisa} />
    </div>
  );
};
