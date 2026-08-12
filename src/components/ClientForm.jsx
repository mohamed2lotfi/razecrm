import React, { useState, useEffect } from 'react';
import { 
  X, UserPlus, Pencil, Loader2, MessageSquare, 
  User, Building2, Mail, Phone, CheckCircle2, Sparkles, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ClientRemarquesModal from '@/components/ClientRemarquesModal';
import { cn } from '@/lib/utils';

const ClientForm = ({ onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    type: initialData?.type || 'Particulier',
    nom: initialData?.nom || '',
    email: initialData?.email || '',
    telephone: initialData?.telephone || '',
    id: initialData?.id || undefined
  });
  const [loading, setLoading] = useState(false);
  const [showRemarques, setShowRemarques] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        type: initialData.type || 'Particulier',
        nom: initialData.nom || '',
        email: initialData.email || '',
        telephone: initialData.telephone || '',
        id: initialData.id
      });
    } else {
      setFormData({
        type: 'Particulier',
        nom: '',
        email: '',
        telephone: '',
        id: undefined
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nom?.trim()) return;

    const payload = {
      nom: formData.nom.trim(),
      email: formData.email?.trim() || null,
      telephone: formData.telephone?.trim() || null,
      type: formData.type || 'Particulier'
    };

    if (formData.id) {
      payload.id = formData.id;
    }

    try {
      setLoading(true);
      await onSave(payload);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] p-0 overflow-hidden rounded-2xl shadow-2xl border-border/80" onClose={onClose}>
        {/* ── Modern Premium Header ───────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white px-6 py-5 border-b border-slate-700/60">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-md border border-white/20">
              {initialData ? <Pencil size={20} /> : <UserPlus size={20} />}
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                {initialData ? 'Modifier la Fiche Client' : 'Ajouter un Nouveau Client'}
              </DialogTitle>
              <p className="text-xs text-slate-300/90 mt-0.5">
                {initialData 
                  ? 'Mettez à jour les informations et coordonnées de ce client.' 
                  : 'Enregistrez un nouveau contact particulier ou entreprise.'}
              </p>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6 space-y-5">
            
            {/* ── Type Toggle (Segmented Pill) ───────────────────────── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Type de compte client
              </Label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: 'Particulier' }))}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-extrabold transition-all duration-200",
                    formData.type === 'Particulier'
                      ? "bg-white dark:bg-slate-800 text-primary shadow-sm border border-slate-200/80 dark:border-slate-700"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                  )}
                >
                  <User size={15} className={formData.type === 'Particulier' ? "text-primary" : "text-slate-400"} />
                  <span>Particulier (Individuel)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: 'Entreprise' }))}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-extrabold transition-all duration-200",
                    formData.type === 'Entreprise'
                      ? "bg-white dark:bg-slate-800 text-amber-700 shadow-sm border border-amber-200 dark:border-amber-900"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                  )}
                >
                  <Building2 size={15} className={formData.type === 'Entreprise' ? "text-amber-600" : "text-slate-400"} />
                  <span>Entreprise / Société</span>
                </button>
              </div>
            </div>

            {/* ── Nom complet / Entreprise ──────────────────────────── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  {formData.type === 'Entreprise' ? <Building2 size={14} className="text-amber-600" /> : <User size={14} className="text-primary" />}
                  {formData.type === 'Entreprise' ? "Raison Sociale / Nom de l'entreprise" : 'Nom Complet du Client'} <span className="text-red-500">*</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">Obligatoire</span>
              </Label>
              <div className="relative">
                <Input 
                  id="nom" 
                  name="nom" 
                  required 
                  value={formData.nom} 
                  onChange={handleChange} 
                  className="h-11 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 focus-visible:bg-transparent text-xs font-bold pl-3.5 transition-all shadow-2xs" 
                  placeholder={formData.type === 'Entreprise' ? "Ex: SARL Voyage Prestige & Co" : "Ex: Ahmed Yassine Benali"} 
                />
              </div>
            </div>

            {/* ── Coordonnées (Email & Téléphone) ───────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Téléphone */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Phone size={14} className="text-emerald-600" />
                  Numéro de Téléphone
                </Label>
                <div className="relative">
                  <Input 
                    id="telephone" 
                    name="telephone" 
                    value={formData.telephone} 
                    onChange={handleChange} 
                    className="h-11 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 focus-visible:bg-transparent text-xs pl-3.5 transition-all shadow-2xs font-mono" 
                    placeholder="Ex: 0550 12 34 56" 
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Mail size={14} className="text-blue-600" />
                  Adresse Email
                </Label>
                <div className="relative">
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    className="h-11 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 focus-visible:bg-transparent text-xs pl-3.5 transition-all shadow-2xs" 
                    placeholder="contact@exemple.com" 
                  />
                </div>
              </div>
            </div>

          </div>

          {/* ── Footer ────────────────────────────────────────────── */}
          <div className="px-6 py-4 border-t bg-slate-50/80 dark:bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div>
              {initialData?.id ? (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowRemarques(true)}
                  className="h-9 px-3.5 gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs shadow-2xs transition-colors"
                >
                  <MessageSquare size={14} className="text-emerald-600" />
                  Notes & Remarques
                </Button>
              ) : (
                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                  Client prêt à être associé à vos ventes & devis.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={loading} 
                className="h-10 px-5 text-xs font-bold"
              >
                Annuler
              </Button>
              
              <Button 
                type="submit" 
                disabled={loading || !formData.nom?.trim()} 
                className="h-10 px-6 font-black text-xs gap-2 shadow-md min-w-[130px]"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                {initialData ? 'Mettre à jour' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>

      {/* Embedded Remarques Modal */}
      {showRemarques && initialData && (
        <ClientRemarquesModal
          isOpen={true}
          onClose={() => setShowRemarques(false)}
          client={initialData}
        />
      )}
    </Dialog>
  );
};

export default ClientForm;
