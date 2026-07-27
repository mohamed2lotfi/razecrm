import React, { useState, useEffect } from 'react';
import { Plus, Loader2, ArrowRightLeft, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

const DEVISES = ['DZD', 'SAR', 'USD', 'EUR'];

const OutcomeForm = ({ onClose, onSave, initialData }) => {
  const [enveloppes, setEnveloppes] = useState([]);
  const [sousEnveloppes, setSousEnveloppes] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [groupesOmra, setGroupesOmra] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);

  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return {
        id: initialData.id,
        enveloppe_id: initialData.enveloppe_id || '',
        sous_enveloppe_id: initialData.sous_enveloppe_id || '',
        montant: initialData.montant || '',
        devise: initialData.devise || 'DZD',
        taux_change: initialData.taux_change || '',
        reference_paiement: initialData.reference_paiement || '',
        description: initialData.description || '',
        date_paiement: initialData.date_paiement ? format(new Date(initialData.date_paiement), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        groupe_ids: initialData.groupe_ids || (initialData.groupe_id ? [initialData.groupe_id] : []),
        repartition_mode: initialData.repartition_mode || 'egal'
      };
    }
    return {
      enveloppe_id: '',
      sous_enveloppe_id: '',
      montant: '',
      devise: 'DZD',
      taux_change: '',
      reference_paiement: '',
      description: '',
      date_paiement: format(new Date(), 'yyyy-MM-dd'),
      groupe_ids: [],
      repartition_mode: 'egal'
    };
  });

  useEffect(() => {
    fetchEnveloppes();
  }, []);

  const fetchEnveloppes = async () => {
    setLoadingData(true);
    const [envRes, subEnvRes, grpRes, fRes] = await Promise.all([
      supabase.from('outcomes_enveloppes').select('*').order('created_at'),
      supabase.from('outcomes_sous_enveloppes').select('*').order('created_at'),
      supabase.from('omra_groupes').select('id, nom, nbr_places').order('created_at', { ascending: false }),
      supabase.from('fournisseurs').select('*').order('nom')
    ]);
    if (envRes.data) setEnveloppes(envRes.data);
    if (subEnvRes.data) setSousEnveloppes(subEnvRes.data);
    if (grpRes.data) setGroupesOmra(grpRes.data);
    if (fRes.data) setFournisseurs(fRes.data);
    setLoadingData(false);
  };

  const selectedEnv = enveloppes.find(e => e.id === formData.enveloppe_id);
  const isOmraEnvelope = selectedEnv?.type_enveloppe === 'omra' || selectedEnv?.nom?.toLowerCase() === 'omra' || formData.groupe_ids.length > 0;
  const isFournisseurEnvelope = selectedEnv?.type_enveloppe === 'fournisseur';
  const linkedFournisseur = isFournisseurEnvelope ? fournisseurs.find(f => f.id === selectedEnv.fournisseur_id) : null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'enveloppe_id') {
        newData.sous_enveloppe_id = ''; // reset sous-enveloppe when enveloppe changes
      }
      return newData;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.enveloppe_id) {
      alert("Veuillez sélectionner une enveloppe.");
      return;
    }
    if (!formData.sous_enveloppe_id) {
      alert("Veuillez sélectionner une sous-enveloppe.");
      return;
    }
    
    if (formData.devise !== 'DZD' && (!formData.taux_change || Number(formData.taux_change) <= 0)) {
      alert("Veuillez saisir un taux de change valide supérieur à 0 pour la devise " + formData.devise + ".");
      return;
    }

    let montant_dzd = Number(formData.montant);
    if (formData.devise !== 'DZD') {
      montant_dzd = Number(formData.montant) * Number(formData.taux_change);
    }

    onSave({
      ...(initialData?.id ? { id: initialData.id } : {}),
      enveloppe_id: formData.enveloppe_id,
      sous_enveloppe_id: formData.sous_enveloppe_id,
      montant: Number(formData.montant),
      devise: formData.devise,
      taux_change: formData.devise === 'DZD' ? null : Number(formData.taux_change),
      montant_dzd,
      reference_paiement: formData.reference_paiement,
      description: formData.description,
      date_paiement: formData.date_paiement,
      groupe_ids: formData.groupe_ids,
      repartition_mode: formData.repartition_mode
    });
  };

  const toggleGroupeSelection = (gId) => {
    setFormData(prev => {
      const exists = prev.groupe_ids.includes(gId);
      const nextIds = exists ? prev.groupe_ids.filter(id => id !== gId) : [...prev.groupe_ids, gId];
      return { ...prev, groupe_ids: nextIds };
    });
  };

  const isForeignCurrency = formData.devise !== 'DZD';
  const hasInvalidRate = isForeignCurrency && (!formData.taux_change || Number(formData.taux_change) <= 0);
  const computedDZD = isForeignCurrency 
    ? (Number(formData.montant) || 0) * (Number(formData.taux_change) || 0)
    : (Number(formData.montant) || 0);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-xl p-0 overflow-hidden" onClose={onClose}>
        <div className="bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent px-6 py-5 border-b">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold flex items-center gap-2">
              {initialData ? <Pencil className="text-orange-600" size={24} /> : <Plus className="text-orange-600" size={24} />}
              {initialData ? 'Modifier la Dépense' : 'Ajouter une Dépense'}
            </DialogTitle>
          </DialogHeader>
        </div>
        
        {loadingData ? (
          <div className="flex justify-center items-center h-48">
             <Loader2 className="animate-spin text-orange-500" size={32} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
            <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-foreground">Date de paiement <span className="text-red-500">*</span></Label>
                  <Input 
                    type="date" name="date_paiement" required 
                    value={formData.date_paiement} onChange={handleChange} 
                    className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors" 
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-foreground">Enveloppe <span className="text-red-500">*</span></Label>
                  <Select name="enveloppe_id" value={formData.enveloppe_id} onChange={handleChange} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors">
                    <option value="">Sélectionner une enveloppe</option>
                    {enveloppes.map(env => <option key={env.id} value={env.id}>{env.nom}</option>)}
                  </Select>
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-foreground">Sous-enveloppe <span className="text-red-500">*</span></Label>
                  <Select name="sous_enveloppe_id" value={formData.sous_enveloppe_id} onChange={handleChange} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors" disabled={!formData.enveloppe_id}>
                    <option value="">Sélectionner une sous-enveloppe</option>
                    {sousEnveloppes.filter(se => se.enveloppe_id === formData.enveloppe_id).map(se => (
                      <option key={se.id} value={se.id}>{se.nom}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-foreground">Référence Paiement / Facture (Facultatif)</Label>
                  <Input 
                    name="reference_paiement"
                    placeholder="N° de facture, chèque ou transfert"
                    value={formData.reference_paiement}
                    onChange={handleChange}
                    className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                  />
                </div>
              </div>

              {/* Badge Fournisseur si enveloppe de type Fournisseur */}
              {isFournisseurEnvelope && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-900 text-xs font-bold">
                    <span className="text-base">🏢</span> Fournisseur rattaché à l'enveloppe :
                  </div>
                  <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-md">
                    {linkedFournisseur ? linkedFournisseur.nom : 'Non spécifié'}
                  </span>
                </div>
              )}

              {/* Multi-Groupes Omra Section (Seulement pour les enveloppes de type Omra ou si des groupes sont déjà associés) */}
              {isOmraEnvelope && groupesOmra.length > 0 && (
                <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold text-purple-900 block">🕌 Partager la dépense sur les Groupes Omra</Label>
                    <span className="text-[10px] bg-purple-200 text-purple-800 font-bold px-2 py-0.5 rounded-full">Dépense Module Omra</span>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                    {groupesOmra.map(g => {
                      const isSelected = formData.groupe_ids.includes(g.id);
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => toggleGroupeSelection(g.id)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${isSelected ? 'bg-purple-700 text-white border-purple-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-purple-100'}`}
                        >
                          {g.nom} ({g.nbr_places || 0} pax)
                        </button>
                      );
                    })}
                  </div>

                  {formData.groupe_ids.length > 1 && (
                    <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-900">Mode de répartition :</span>
                      <Select
                        value={formData.repartition_mode}
                        onChange={e => setFormData(prev => ({ ...prev, repartition_mode: e.target.value }))}
                        className="h-9 text-xs w-52 bg-white"
                      >
                        <option value="egal">Égalitaire (division égale)</option>
                        <option value="pax">Au Prorata des Pèlerins (PAX)</option>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2.5">
                <Label className="text-sm font-bold text-foreground">Description (Facultatif)</Label>
                <Textarea 
                  name="description"
                  placeholder="Détails de la dépense..."
                  value={formData.description}
                  onChange={handleChange}
                  className="resize-none min-h-[80px] bg-muted/20 focus-visible:bg-transparent transition-colors"
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-orange-600 mb-4">Détails du montant</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-2.5">
                    <Label className="text-sm font-bold text-foreground">Montant <span className="text-red-500">*</span></Label>
                    <Input 
                      type="number" 
                      name="montant"
                      required min="0" step="any" placeholder="0.00"
                      value={formData.montant}
                      onChange={handleChange}
                      className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-sm font-bold text-foreground">Devise <span className="text-red-500">*</span></Label>
                    <Select 
                      name="devise"
                      value={formData.devise}
                      onChange={handleChange}
                      className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                    >
                      {DEVISES.map(d => <option key={d} value={d}>{d}</option>)}
                    </Select>
                  </div>
                  {isForeignCurrency && (
                    <div className="space-y-2.5">
                      <Label className="text-sm font-bold text-foreground">Taux <span className="text-red-500">*</span></Label>
                      <Input 
                        type="number" name="taux_change" required min="0" step="any" placeholder="Ex: 145"
                        value={formData.taux_change}
                        onChange={handleChange}
                        className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-6 bg-orange-50 border border-orange-100 rounded-lg p-4 flex items-center justify-between">
                  <div className="text-sm text-orange-800 flex items-center gap-2 font-medium">
                    <ArrowRightLeft size={16} /> Coût total (DZD) :
                  </div>
                  <div className="text-xl font-extrabold text-orange-600">
                    {computedDZD.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm">DZD</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-3 shrink-0 rounded-b-xl">
              <Button type="button" variant="outline" onClick={onClose} className="h-11 px-6">Annuler</Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white h-11 px-8">Enregistrer la dépense</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OutcomeForm;
