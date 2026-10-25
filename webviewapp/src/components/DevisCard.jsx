import React from 'react';
import { Calendar, MapPin, User, Clock, ArrowRight, CheckCircle2, AlertCircle, Image as ImageIcon } from 'lucide-react';

const DevisCard = ({ devis, onClick }) => {
  const isAnswered = devis.status === 'repondu' || !!devis.reponse_texte || !!devis.reponse_photo_url;

  // Format dates
  const formatDate = (dStr) => {
    if (!dStr) return '-';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  // Calculate duration
  const getDuration = () => {
    if (!devis.date_depart || !devis.date_retour) return null;
    try {
      const dep = new Date(devis.date_depart);
      const ret = new Date(devis.date_retour);
      const diff = Math.round((ret - dep) / (1000 * 60 * 60 * 24));
      return diff > 0 ? `${diff} jours` : null;
    } catch {
      return null;
    }
  };

  const duration = getDuration();

  const priorityStyles = {
    Urgente: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
    Haute: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    Moyenne: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    Basse: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
  };

  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-2xl p-4 transition-all duration-200 active:scale-[0.98] cursor-pointer relative overflow-hidden border ${
        isAnswered
          ? 'border-emerald-500/30 bg-white/95 dark:bg-slate-900/60 shadow-xs'
          : 'border-amber-500/40 bg-gradient-to-b from-white dark:from-slate-900/90 to-amber-500/5 dark:to-slate-900/60 shadow-md shadow-amber-950/5'
      }`}
    >
      {/* Top Banner Status Bar */}
      <div className="flex items-center justify-between gap-2 mb-3">
        {/* Status Chip */}
        {isAnswered ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={12} className="shrink-0 text-emerald-500" />
            <span>Répondu</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 animate-pulse">
            <AlertCircle size={12} className="shrink-0 text-amber-500" />
            <span>En attente de réponse</span>
          </span>
        )}

        {/* Priority Badge & Creation Date */}
        <div className="flex items-center gap-2">
          {devis.priorite && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                priorityStyles[devis.priorite] || priorityStyles.Moyenne
              }`}
            >
              {devis.priorite}
            </span>
          )}
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            {formatDate(devis.date_devis || devis.created_at)}
          </span>
        </div>
      </div>

      {/* Destination & Client Header */}
      <div className="mb-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-1.5 truncate">
              <span className="text-lg shrink-0">{devis.destination_emoji || '✈️'}</span>
              <span className="truncate">{devis.destination || 'Destination non spécifiée'}</span>
            </h3>
            {devis.client_nom && (
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate mt-0.5 flex items-center gap-1">
                <span className="text-slate-400">Client :</span>
                <span className="text-slate-900 dark:text-white font-bold">{devis.client_nom}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Dates Section (Date départ -> Date retour) */}
      <div className="bg-slate-50 dark:bg-slate-950/60 rounded-xl p-2.5 mb-3 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-emerald-500 shrink-0" />
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium uppercase tracking-wider">
              Période du voyage
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {formatDate(devis.date_depart)}
              <span className="mx-1.5 text-slate-400 dark:text-slate-500">➔</span>
              {formatDate(devis.date_retour)}
            </span>
          </div>
        </div>
        {duration && (
          <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md">
            {duration}
          </span>
        )}
      </div>

      {/* Customer Request Description */}
      <div className="mb-3">
        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">
          Demande client :
        </span>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/50 line-clamp-3">
          {devis.description_demande || 'Aucune description fournie.'}
        </p>
      </div>

      {/* Answer Preview if already responded */}
      {isAnswered && (
        <div className="mb-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 size={11} /> Votre Réponse :
            </span>
            {devis.reponse_date && (
              <span className="text-[9px] text-slate-500 dark:text-slate-400">
                {formatDate(devis.reponse_date)}
              </span>
            )}
          </div>
          {devis.reponse_texte && (
            <p className="text-xs text-emerald-900 dark:text-emerald-200/90 line-clamp-2 italic">
              "{devis.reponse_texte}"
            </p>
          )}
          {devis.reponse_photo_url && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 mt-1">
              <ImageIcon size={13} />
              <span>Photo / Devis joint inclus</span>
            </div>
          )}
        </div>
      )}

      {/* Footer: Agent Name & Call to Action */}
      <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/80 dark:border-slate-800/80 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <User size={13} className="shrink-0" />
          <span className="text-[11px]">Envoyé par :</span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
            {devis.agent_nom || 'Agent'}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xs ${
            isAnswered
              ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
          }`}
        >
          <span>{isAnswered ? 'Modifier réponse' : 'Répondre'}</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};

export default DevisCard;
