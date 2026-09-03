import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Bell, AlertTriangle, Clock, Users, Calendar, 
  CheckCircle2, Sparkles, AlertCircle, ShieldAlert,
  PlusCircle, UserCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const PRIORITIES = [
  { value: 'low', label: 'Basse', sub: 'Information', color: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100', icon: Clock },
  { value: 'normal', label: 'Normale', sub: 'Standard', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100', icon: Bell },
  { value: 'high', label: 'Haute', sub: 'Prioritaire', color: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100', icon: AlertTriangle },
  { value: 'urgent', label: 'Urgente', sub: 'Immédiat', color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100', icon: ShieldAlert },
];

export default function CreateAlertModal({ isOpen, onClose, onSuccess, initialEntity = null }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [scheduleType, setScheduleType] = useState('immediate'); // 'immediate' | 'scheduled'
  const [alertAt, setAlertAt] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState([]);
  const [assignAll, setAssignAll] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
      const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
      const offsetMs = inOneHour.getTimezoneOffset() * 60000;
      const localIso = new Date(inOneHour.getTime() - offsetMs).toISOString().slice(0, 16);
      setAlertAt(localIso);
      setError(null);
    }
  }, [isOpen]);

  const fetchAgents = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, nom, email, role')
        .in('role', ['admin', 'agent'])
        .order('nom');
      
      if (data) {
        setRecipients(data);
      }
    } catch (err) {
      console.error('Erreur chargement agents:', err);
    }
  };

  const handleToggleAgent = (agentId) => {
    setAssignAll(false);
    setSelectedAgentIds(prev => 
      prev.includes(agentId) ? prev.filter(id => id !== agentId) : [...prev, agentId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Veuillez saisir un titre pour l\'alerte.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const triggerTime = scheduleType === 'scheduled' && alertAt 
        ? new Date(alertAt).toISOString() 
        : new Date().toISOString();
      
      const isScheduled = scheduleType === 'scheduled' && new Date(alertAt) > new Date();
      const status = isScheduled ? 'scheduled' : 'active';

      let targetRecipientIds = [];
      if (assignAll || selectedAgentIds.length === 0) {
        targetRecipientIds = recipients.map(r => r.id);
      } else {
        targetRecipientIds = selectedAgentIds;
      }

      if (targetRecipientIds.length === 0 && user?.id) {
        targetRecipientIds = [user.id];
      }

      // Insert alert
      const { data: newAlert, error: alertError } = await supabase
        .from('alerts')
        .insert({
          title: title.trim(),
          content: content.trim() || null,
          priority,
          status,
          alert_at: triggerTime,
          entity_type: initialEntity?.type || null,
          entity_id: initialEntity?.id || null,
          created_by: user?.id || null,
          metadata: initialEntity ? { entityLabel: initialEntity.label } : {}
        })
        .select()
        .single();

      if (alertError) throw alertError;

      // Insert recipients
      if (newAlert && targetRecipientIds.length > 0) {
        const recipientRows = targetRecipientIds.map(agentId => ({
          alert_id: newAlert.id,
          recipient_id: agentId,
          is_seen: false,
          is_done: false
        }));

        await supabase
          .from('alert_recipients')
          .insert(recipientRows);
      }

      // Reset
      setTitle('');
      setContent('');
      setPriority('normal');
      setScheduleType('immediate');
      setAssignAll(true);
      setSelectedAgentIds([]);

      if (onSuccess) onSuccess(newAlert);
      onClose();
    } catch (err) {
      console.error('Erreur création alerte:', err);
      setError(err.message || 'Erreur lors de la création de l\'alerte.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/50 transition-opacity"
      />

      {/* Light Mode Modal Shell */}
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 text-slate-900">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <PlusCircle size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">Nouvelle Alerte d'Équipe</h3>
              <p className="text-xs text-slate-500">Créer un rappel ou assigner une notification</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Titre */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Titre de l'alerte <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text"
              required
              placeholder="Ex: Contacter client Benali pour valider passeports Omra..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Instructions & Notes détaillées (Optionnel)
            </label>
            <textarea 
              rows={3}
              placeholder="Précisez les consignes, délais ou liens utiles..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-slate-400 resize-none font-normal"
            />
          </div>

          {/* Niveau de Priorité */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Niveau d'Urgence
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRIORITIES.map(p => {
                const IconComp = p.icon;
                const isSelected = priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs transition-all ${
                      isSelected 
                        ? 'bg-primary/10 text-primary border-primary ring-1 ring-primary font-bold shadow-sm' 
                        : `${p.color}`
                    }`}
                  >
                    <IconComp size={15} className="mb-1" />
                    <span className="font-bold">{p.label}</span>
                    <span className="text-[10px] opacity-75">{p.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Déclenchement & Planification */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Déclenchement Temporel
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setScheduleType('immediate')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  scheduleType === 'immediate'
                    ? 'bg-primary text-white font-bold shadow-sm border-primary'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Sparkles size={14} />
                <span>Immédiat</span>
              </button>
              <button
                type="button"
                onClick={() => setScheduleType('scheduled')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  scheduleType === 'scheduled'
                    ? 'bg-primary text-white font-bold shadow-sm border-primary'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Calendar size={14} />
                <span>Planifier un rappel</span>
              </button>
            </div>

            {scheduleType === 'scheduled' && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="block text-[10px] text-slate-500 mb-1 font-medium">Date & Heure d'apparition :</span>
                <input 
                  type="datetime-local"
                  required={scheduleType === 'scheduled'}
                  value={alertAt}
                  onChange={(e) => setAlertAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-primary"
                />
              </div>
            )}
          </div>

          {/* Destinataires */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Destinataires
              </label>
              <button
                type="button"
                onClick={() => {
                  setAssignAll(!assignAll);
                  if (!assignAll) setSelectedAgentIds([]);
                }}
                className="text-xs text-primary hover:underline font-semibold"
              >
                {assignAll ? 'Sélectionner des membres précis' : 'Envoyer à toute l\'équipe'}
              </button>
            </div>

            {assignAll ? (
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Users size={15} />
                </div>
                <div>
                  <span className="text-slate-900 font-bold block">Toute l'équipe ({recipients.length} membres)</span>
                  <span className="text-slate-500 text-[11px]">Tous les agents et admins recevront cette alerte.</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-1">
                {recipients.map(agent => {
                  const isChecked = selectedAgentIds.includes(agent.id);
                  return (
                    <div
                      key={agent.id}
                      onClick={() => handleToggleAgent(agent.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-colors ${
                        isChecked 
                          ? 'bg-primary/10 border-primary text-slate-900 font-medium ring-1 ring-primary/30'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                        isChecked ? 'bg-primary border-primary text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isChecked && <CheckCircle2 size={11} />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs truncate font-semibold text-slate-900">{agent.nom || agent.email}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-medium">{agent.role}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <UserCheck size={14} />
              )}
              <span>Créer & Distribuer</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
