import React, { useState, useEffect } from 'react';
import { 
  X, Send, Smartphone, ShieldCheck, User, Calendar, MapPin, 
  FileText, CheckCircle2, AlertCircle, Loader2, Clock, Sparkles,
  Image as ImageIcon, ZoomIn, ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function SendToManagerModal({ isOpen, onClose, devis, onSent }) {
  if (!isOpen || !devis) return null;

  const { user, profile } = useAuth();
  const [managers, setManagers] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(true);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  
  // Fields required by user
  const [dateDevis, setDateDevis] = useState('');
  const [dateDepart, setDateDepart] = useState('');
  const [dateRetour, setDateRetour] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationEmoji, setDestinationEmoji] = useState('📍');
  const [descriptionDemande, setDescriptionDemande] = useState('');
  const [agentNom, setAgentNom] = useState('');
  const [notesAgent, setNotesAgent] = useState('');
  const [priorite, setPriorite] = useState('Moyenne');

  const [existingTransmission, setExistingTransmission] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Initialize fields on open
  useEffect(() => {
    if (devis) {
      let meta = {};
      try {
        if (devis.details_devis && typeof devis.details_devis === 'string' && devis.details_devis.trim().startsWith('{')) {
          meta = JSON.parse(devis.details_devis);
        }
      } catch (e) {}

      // Pre-fill Date Devis
      const today = new Date().toISOString().split('T')[0];
      const created = devis.date_creation ? devis.date_creation.split('T')[0] : today;
      setDateDevis(meta.date_devis || created || today);

      // Pre-fill Dates
      setDateDepart(meta.date_depart || devis.date_depart || '');
      setDateRetour(meta.date_retour || devis.date_retour || '');

      // Pre-fill Destination
      setDestination(meta.destination || devis.destination || '');
      setDestinationEmoji(meta.destination_emoji || '📍');

      // Pre-fill Demande
      setDescriptionDemande(devis.details_demande || meta.demande || '');

      // Pre-fill Agent Nom
      const currentAgent = profile?.nom || user?.email?.split('@')[0] || meta.agent_nom || 'Agent';
      setAgentNom(currentAgent);

      // Pre-fill Priorité
      setPriorite(meta.priorite || 'Moyenne');

      // Check existing transmission in meta
      if (meta.manager_sent) {
        setExistingTransmission({
          ...meta.manager_sent,
          response: meta.manager_response || null
        });
        if (meta.manager_sent.manager_id) {
          setSelectedManagerId(meta.manager_sent.manager_id);
        }
      } else {
        setExistingTransmission(null);
      }
    }
  }, [devis, profile, user]);

  // Load Managers from profiles
  useEffect(() => {
    const fetchManagers = async () => {
      setLoadingManagers(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('nom', { ascending: true });

        if (data) {
          // Prioritize profiles with role === 'manager'
          const mgrs = data.filter(p => p.role === 'manager');
          // If no manager role yet, include admins so the agent can still test
          if (mgrs.length > 0) {
            setManagers(mgrs);
            if (!selectedManagerId) setSelectedManagerId(mgrs[0].id);
          } else {
            const fallback = data.filter(p => p.role === 'admin' || p.role === 'agent');
            setManagers(fallback);
            if (!selectedManagerId && fallback.length > 0) setSelectedManagerId(fallback[0].id);
          }
        }
      } catch (err) {
        console.warn('Error loading managers:', err);
      } finally {
        setLoadingManagers(false);
      }
    };

    if (isOpen) {
      fetchManagers();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedManagerId) {
      setStatusMessage({ type: 'error', text: 'Veuillez sélectionner un manager destinataire.' });
      return;
    }

    const selectedManager = managers.find(m => m.id === selectedManagerId);
    if (!selectedManager) {
      setStatusMessage({ type: 'error', text: 'Manager introuvable.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const now = new Date().toISOString();
      const clientName = devis.clients?.nom || devis.nom_prospect || 'Client';

      const managerRecord = {
        pipeline_id: devis.id,
        client_id: devis.client_id || null,
        client_nom: clientName,
        manager_id: selectedManager.id,
        manager_nom: selectedManager.nom || selectedManager.email,
        manager_email: selectedManager.email,
        agent_id: user?.id || null,
        agent_nom: agentNom.trim() || 'Agent',
        date_devis: dateDevis || now.split('T')[0],
        date_depart: dateDepart || null,
        date_retour: dateRetour || null,
        destination: destination.trim(),
        destination_emoji: destinationEmoji,
        description_demande: descriptionDemande.trim(),
        notes_agent: notesAgent.trim() || null,
        priorite: priorite,
        status: 'en_attente',
        updated_at: now
      };

      // 1. Insert or update in manager_devis table
      try {
        const { error: insertErr } = await supabase
          .from('manager_devis')
          .insert(managerRecord);

        if (insertErr) {
          console.warn('manager_devis insert warning (table might be newly created):', insertErr);
        }
      } catch (errDb) {
        console.warn('manager_devis insert exception:', errDb);
      }

      // 2. Update pipeline JSON metadata (always works & keeps sync)
      let detailsObj = {};
      try {
        if (devis.details_devis && typeof devis.details_devis === 'string' && devis.details_devis.trim().startsWith('{')) {
          detailsObj = JSON.parse(devis.details_devis);
        }
      } catch (e) {}

      detailsObj.destination = destination.trim();
      detailsObj.destination_emoji = destinationEmoji;
      detailsObj.date_depart = dateDepart || null;
      detailsObj.date_retour = dateRetour || null;
      detailsObj.priorite = priorite;

      detailsObj.manager_sent = {
        sent_at: now,
        manager_id: selectedManager.id,
        manager_nom: selectedManager.nom || selectedManager.email,
        manager_email: selectedManager.email,
        agent_nom: agentNom.trim() || 'Agent',
        status: 'en_attente'
      };

      const updatedDetailsStr = JSON.stringify(detailsObj);

      const { error: pipeErr } = await supabase
        .from('pipeline')
        .update({
          details_devis: updatedDetailsStr,
          details_demande: descriptionDemande.trim() || devis.details_demande
        })
        .eq('id', devis.id);

      if (pipeErr) throw pipeErr;

      setStatusMessage({ type: 'success', text: `Devis transmis avec succès à ${selectedManager.nom || selectedManager.email} !` });

      if (onSent) {
        onSent({
          ...devis,
          details_devis: updatedDetailsStr,
          details_demande: descriptionDemande.trim() || devis.details_demande,
          manager_sent: detailsObj.manager_sent
        });
      }

      setTimeout(() => {
        onClose();
      }, 1400);

    } catch (err) {
      console.error('Error sending quote to manager:', err);
      setStatusMessage({ type: 'error', text: 'Une erreur est survenue lors de la transmission.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const clientName = devis.clients?.nom || devis.nom_prospect || 'Client';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-card rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-muted/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Smartphone size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                <span>Envoyer à un Manager</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  PocketApp
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Transmettre ce devis pour validation ou cotation sur l'application mobile
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        {/* Existing Response Banner (if manager already answered) */}
        {existingTransmission?.response && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-500" />
                Réponse du Manager ({existingTransmission.response.manager_nom})
              </span>
              {existingTransmission.response.reponse_date && (
                <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">
                  {new Date(existingTransmission.response.reponse_date).toLocaleString('fr-FR')}
                </span>
              )}
            </div>

            {existingTransmission.response.reponse_texte && (
              <p className="text-xs text-emerald-900 dark:text-emerald-100 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 whitespace-pre-line font-medium">
                {existingTransmission.response.reponse_texte}
              </p>
            )}

            {existingTransmission.response.reponse_photo_url && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPreviewPhoto(existingTransmission.response.reponse_photo_url)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors shadow-xs"
                >
                  <ImageIcon size={13} />
                  <span>Voir la photo réponse du manager</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Status Message */}
          {statusMessage && (
            <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* 1. Manager Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500" />
                Sélectionner le Manager destinataire *
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Recevra la notification sur sa PocketApp
              </span>
            </Label>
            
            {loadingManagers ? (
              <div className="h-10 rounded-xl bg-muted/60 animate-pulse flex items-center px-3 text-xs text-muted-foreground">
                Chargement des managers...
              </div>
            ) : managers.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                Aucun utilisateur avec le rôle "manager" trouvé. Vous pouvez attribuer le rôle dans Supabase profiles.
              </div>
            ) : (
              <select
                value={selectedManagerId}
                onChange={(e) => setSelectedManagerId(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-xl bg-background border border-input text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
              >
                {managers.map((mgr) => (
                  <option key={mgr.id} value={mgr.id}>
                    {mgr.nom || mgr.email} ({mgr.email}) {mgr.role !== 'manager' ? `[${mgr.role}]` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Client & Quote Summary Card */}
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Client concerné :</span>
              <span className="font-bold text-foreground flex items-center gap-1">
                <User size={13} className="text-emerald-500" />
                {clientName}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Date Devis */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-medium">Date du devis</Label>
                <Input
                  type="date"
                  value={dateDevis}
                  onChange={(e) => setDateDevis(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              {/* Priorité */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-medium">Priorité</Label>
                <select
                  value={priorite}
                  onChange={(e) => setPriorite(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-md bg-background border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Basse">Basse</option>
                  <option value="Moyenne">Moyenne</option>
                  <option value="Haute">Haute ⚡</option>
                  <option value="Urgente">Urgente 🔥</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Dates & Destination */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Calendar size={13} className="text-emerald-500" /> Date de départ
              </Label>
              <Input
                type="date"
                value={dateDepart}
                onChange={(e) => setDateDepart(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Calendar size={13} className="text-emerald-500" /> Date de retour
              </Label>
              <Input
                type="date"
                value={dateRetour}
                onChange={(e) => setDateRetour(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <MapPin size={13} className="text-emerald-500" /> Destination
            </Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={destinationEmoji}
                onChange={(e) => setDestinationEmoji(e.target.value)}
                className="w-12 h-9 text-center text-sm"
                placeholder="📍"
                title="Emoji drapeau"
              />
              <Input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Ex: Turquie (Istanbul), Arabie Saoudite (Omra)..."
                className="flex-1 h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* 4. Description de la demande client */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center justify-between">
              <span className="flex items-center gap-1">
                <FileText size={13} className="text-emerald-500" />
                Description de la demande client *
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Visible par le manager
              </span>
            </Label>
            <Textarea
              value={descriptionDemande}
              onChange={(e) => setDescriptionDemande(e.target.value)}
              placeholder="Détails de la demande : nombre de pax, type d'hôtels, préférences de vols, budget indicatif..."
              rows={4}
              required
              className="text-xs leading-relaxed resize-none"
            />
          </div>

          {/* 5. Envoyé par "Agent" & Note interne */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <User size={13} className="text-emerald-500" /> Envoyé par (Agent)
              </Label>
              <Input
                type="text"
                value={agentNom}
                onChange={(e) => setAgentNom(e.target.value)}
                className="h-9 text-xs font-bold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Note privée pour le manager
              </Label>
              <Input
                type="text"
                value={notesAgent}
                onChange={(e) => setNotesAgent(e.target.value)}
                placeholder="Ex: Client VIP, réponse souhaitée avant 14h"
                className="h-9 text-xs"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-xs"
          >
            Annuler
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedManagerId}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Envoi en cours...</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>{existingTransmission ? 'Mettre à jour & Renvoyer' : 'Envoyer au Manager'}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in"
        >
          <button
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700"
          >
            <X size={20} />
          </button>
          <img
            src={previewPhoto}
            alt="Réponse Manager"
            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
