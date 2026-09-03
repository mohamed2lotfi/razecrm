import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bell, Clock, Check, CheckCircle2, ArrowUpRight, 
  X, AlertTriangle, ShieldAlert, Calendar, Sparkles, User
} from 'lucide-react';

const PRIORITY_CONFIG = {
  urgent: { 
    label: 'Urgent', 
    badge: 'bg-rose-500 text-white border-rose-600 shadow-sm shadow-rose-500/30',
    ring: 'ring-rose-400 border-rose-500',
    iconBg: 'bg-rose-100 text-rose-600',
    icon: ShieldAlert
  },
  high: { 
    label: 'Haute', 
    badge: 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/30',
    ring: 'ring-amber-400 border-amber-500',
    iconBg: 'bg-amber-100 text-amber-600',
    icon: AlertTriangle
  },
  normal: { 
    label: 'Normale', 
    badge: 'bg-blue-500 text-white border-blue-600',
    ring: 'ring-blue-400 border-blue-500',
    iconBg: 'bg-blue-100 text-blue-600',
    icon: Bell
  },
  low: { 
    label: 'Basse', 
    badge: 'bg-slate-500 text-white border-slate-600',
    ring: 'ring-slate-400 border-slate-500',
    iconBg: 'bg-slate-100 text-slate-600',
    icon: Clock
  }
};

const ENTITY_LABELS = {
  client: { label: 'Client', color: 'text-indigo-700 border-indigo-200 bg-indigo-50' },
  pipeline: { label: 'Devis & Prospect', color: 'text-emerald-700 border-emerald-200 bg-emerald-50' },
  devis: { label: 'Devis', color: 'text-emerald-700 border-emerald-200 bg-emerald-50' },
  omra_groupe: { label: 'Groupe Omra', color: 'text-amber-800 border-amber-200 bg-amber-50' },
  facture: { label: 'Facture', color: 'text-cyan-700 border-cyan-200 bg-cyan-50' },
  visa: { label: 'Visa', color: 'text-purple-700 border-purple-200 bg-purple-50' }
};

export default function DueAlertModal({ 
  alertItem, 
  onClose, 
  onSnooze, 
  onMarkSeen, 
  onMarkDone, 
  onNavigate 
}) {
  const [snoozing, setSnoozing] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!alertItem || !alertItem.alert || typeof document === 'undefined') return null;

  const alert = alertItem.alert;
  const priorityConfig = PRIORITY_CONFIG[alert.priority] || PRIORITY_CONFIG.normal;
  const IconComp = priorityConfig.icon;
  const entityBadge = alert.entity_type ? (ENTITY_LABELS[alert.entity_type] || { label: alert.entity_type, color: 'text-slate-600 border-slate-200 bg-slate-100' }) : null;

  const handleSnoozeMinutes = async (mins = 5) => {
    setSnoozing(true);
    try {
      await onSnooze(alert.id, mins);
      onClose();
    } finally {
      setSnoozing(false);
    }
  };

  const handleMarkAsRead = async () => {
    setLoading(true);
    try {
      await onMarkSeen(alertItem.id);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsFinished = async () => {
    setLoading(true);
    try {
      await onMarkDone(alertItem.id);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEntity = () => {
    onClose();
    if (onNavigate && alert.entity_type) {
      onNavigate(alert.entity_type, alert.entity_id);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Centered Modal Card */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden z-10 animate-in zoom-in-95 duration-200 flex flex-col text-slate-900">
        
        {/* Top Accent Priority Banner */}
        <div className={`h-2.5 w-full ${alert.priority === 'urgent' ? 'bg-rose-500' : alert.priority === 'high' ? 'bg-amber-500' : 'bg-primary'}`} />

        {/* Modal Header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm relative ${priorityConfig.iconBg}`}>
              <IconComp size={22} />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight">
                  Rappel d'Alerte
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${priorityConfig.badge}`}>
                  {priorityConfig.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Cette alerte est arrivée à son échéance</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            {entityBadge && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${entityBadge.color}`}>
                {entityBadge.label}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <Calendar size={12} className="text-slate-500" />
              <span>Échéance atteinte</span>
            </span>
          </div>

          {/* Main Title */}
          <div>
            <h4 className="text-lg font-black text-slate-900 leading-snug">
              {alert.title}
            </h4>
          </div>

          {/* Description Box */}
          {alert.content && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm text-slate-700 leading-relaxed font-normal">
              {alert.content}
            </div>
          )}

          {/* Author info */}
          {alert.author?.nom && (
            <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
              <User size={13} className="text-slate-400" />
              <span>Créé par <strong className="text-slate-700">{alert.author.nom}</strong></span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          
          {/* Snooze 5 Min Button */}
          <button
            type="button"
            onClick={() => handleSnoozeMinutes(5)}
            disabled={snoozing || loading}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-all flex items-center justify-center gap-2 shadow-xs active:scale-95 disabled:opacity-50"
            title="Repousser de 5 minutes"
          >
            <Clock size={15} className="text-amber-700" />
            <span>Décaler de 5 min</span>
          </button>

          <div className="flex items-center gap-2 justify-end flex-wrap">
            {/* Mark as read button */}
            <button
              type="button"
              onClick={handleMarkAsRead}
              disabled={snoozing || loading}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-50"
            >
              <Check size={14} />
              <span>Marquer comme lu</span>
            </button>

            {/* Mark Done button */}
            <button
              type="button"
              onClick={handleMarkAsFinished}
              disabled={snoozing || loading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              <span>Fait (Terminé)</span>
            </button>

            {/* Open Dossier button */}
            {alert.entity_type && (
              <button
                type="button"
                onClick={handleOpenEntity}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 active:scale-95"
              >
                <span>Ouvrir dossier</span>
                <ArrowUpRight size={14} />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
