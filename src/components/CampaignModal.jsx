import React, { useState, useEffect } from 'react';
import { Mail, Plus, Send, Clock, Edit3, Trash2, ArrowRight, CheckCircle2, Users, Briefcase, X, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const CampaignModal = ({ isOpen, onClose, onSaved, initialTypeAudience, campaignToEdit }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    nom: '',
    sujet: '',
    type_audience: initialTypeAudience || 'B2B',
    filtres_audience: { location: 'all', type: 'all' },
    contenu: '',
    statut: 'Brouillon'
  });
  
  const [contactTypes, setContactTypes] = useState([]);
  const [audienceCount, setAudienceCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (campaignToEdit) {
      setFormData(campaignToEdit);
    } else {
      setFormData({
        nom: '',
        sujet: '',
        type_audience: initialTypeAudience || 'B2B',
        filtres_audience: { location: 'all', type: 'all' },
        contenu: '',
        statut: 'Brouillon'
      });
    }
    setStep(1);
    fetchContactTypes();
  }, [campaignToEdit, initialTypeAudience, isOpen]);

  useEffect(() => {
    if (step === 2) {
      calculateAudience();
    }
  }, [step, formData.filtres_audience, formData.type_audience]);

  const fetchContactTypes = async () => {
    const { data } = await supabase.from('contact_types').select('*').order('nom');
    if (data) setContactTypes(data);
  };

  const calculateAudience = async () => {
    if (formData.type_audience === 'B2B') {
      let query = supabase.from('banque_contacts').select('id', { count: 'exact' });
      if (formData.filtres_audience.type && formData.filtres_audience.type !== 'all') {
        query = query.eq('type', formData.filtres_audience.type);
      }
      if (formData.filtres_audience.location && formData.filtres_audience.location !== 'all') {
        if (formData.filtres_audience.location === 'Autre') {
          query = query.not('location', 'in', '("Algerie","Saudia")');
        } else {
          query = query.eq('location', formData.filtres_audience.location);
        }
      }
      const { count } = await query;
      setAudienceCount(count || 0);
    } else {
      // B2C
      const { count } = await supabase.from('clients').select('id', { count: 'exact' });
      setAudienceCount(count || 0);
    }
  };

  const handleSave = async (statut = 'Brouillon') => {
    setLoading(true);
    const dataToSave = {
      ...formData,
      statut,
      destinataires_count: audienceCount
    };
    
    if (campaignToEdit && campaignToEdit.id) {
      await supabase.from('campagnes_email').update(dataToSave).eq('id', campaignToEdit.id);
    } else {
      await supabase.from('campagnes_email').insert([dataToSave]);
    }
    
    setLoading(false);
    onSaved();
    onClose();
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-0 shadow-2xl h-[85vh] flex flex-col">
        <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-indigo-800 p-6 text-white shrink-0">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Mail size={24} />
            </div>
            {campaignToEdit ? 'Modifier la Campagne' : 'Nouvelle Campagne Email'}
          </DialogTitle>
          <div className="flex gap-2 mt-4 text-sm font-medium">
            <span className={`px-3 py-1 rounded-full ${step >= 1 ? 'bg-white text-violet-700' : 'bg-white/20'}`}>1. Infos</span>
            <span className={`px-3 py-1 rounded-full ${step >= 2 ? 'bg-white text-violet-700' : 'bg-white/20'}`}>2. Audience</span>
            <span className={`px-3 py-1 rounded-full ${step >= 3 ? 'bg-white text-violet-700' : 'bg-white/20'}`}>3. Contenu</span>
            <span className={`px-3 py-1 rounded-full ${step >= 4 ? 'bg-white text-violet-700' : 'bg-white/20'}`}>4. Validation</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {step === 1 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Nom de la Campagne (interne)</Label>
                <Input 
                  value={formData.nom} 
                  onChange={e => setFormData({...formData, nom: e.target.value})} 
                  placeholder="Ex: Promo Omra Ramadan" 
                  className="h-12 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">Objet de l'Email</Label>
                <Input 
                  value={formData.sujet} 
                  onChange={e => setFormData({...formData, sujet: e.target.value})} 
                  placeholder="Ce que verront vos destinataires" 
                  className="h-12 text-lg"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                <h3 className="font-bold flex items-center gap-2 border-b pb-2"><Filter size={18} /> Filtres de ciblage ({formData.type_audience})</h3>
                
                {formData.type_audience === 'B2B' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type d'entreprise</Label>
                      <Select 
                        value={formData.filtres_audience.type} 
                        onChange={e => setFormData({...formData, filtres_audience: {...formData.filtres_audience, type: e.target.value}})}
                      >
                        <option value="all">Tous les types</option>
                        {contactTypes.map(t => <option key={t.id} value={t.nom}>{t.nom}</option>)}
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pays / Localisation</Label>
                      <Select 
                        value={formData.filtres_audience.location} 
                        onChange={e => setFormData({...formData, filtres_audience: {...formData.filtres_audience, location: e.target.value}})}
                      >
                        <option value="all">Tous les pays</option>
                        <option value="Algerie">Algérie</option>
                        <option value="Saudia">Saudia</option>
                        <option value="Autre">Autre</option>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Pour l'instant, les campagnes B2C s'adressent à toute votre base de clients. Des filtres avancés seront disponibles prochainement.
                  </p>
                )}
                
                <div className="mt-6 bg-violet-50 border border-violet-100 rounded-xl p-4 flex items-center gap-4">
                  <div className="bg-violet-200 text-violet-700 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-violet-600 uppercase tracking-wider">Taille de l'audience</p>
                    <p className="text-2xl font-black text-violet-900">{audienceCount} destinataires</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="h-[450px] flex flex-col bg-white rounded-xl border overflow-hidden">
              <div className="p-3 border-b bg-slate-50 text-sm font-medium text-slate-500">
                Sujet : <span className="text-slate-800 font-bold">{formData.sujet}</span>
              </div>
              <div className="flex-1">
                <ReactQuill 
                  theme="snow" 
                  value={formData.contenu} 
                  onChange={(val) => setFormData({...formData, contenu: val})}
                  modules={modules}
                  className="h-[370px]"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 max-w-2xl mx-auto text-center py-8">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-800">Prêt à partir !</h2>
              <p className="text-slate-500 text-lg max-w-md mx-auto">
                Votre campagne <strong>"{formData.nom}"</strong> va cibler <strong>{audienceCount} destinataires</strong>.
              </p>
              
              <div className="bg-orange-50 text-orange-800 p-4 rounded-xl border border-orange-200 mt-6 max-w-md mx-auto text-sm text-left flex gap-3">
                <Clock size={24} className="shrink-0" />
                <p>L'envoi direct d'emails n'est pas encore connecté. Vous pouvez enregistrer cette campagne comme brouillon en attendant l'intégration de Resend.</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t flex justify-between shrink-0">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>Précédent</Button>
            )}
            
            {step < 4 ? (
              <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => setStep(step + 1)} disabled={step === 1 && (!formData.nom || !formData.sujet)}>Suivant <ArrowRight size={16} className="ml-2" /></Button>
            ) : (
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700" 
                onClick={() => handleSave('Brouillon')}
                disabled={loading}
              >
                {loading ? 'Enregistrement...' : 'Enregistrer le Brouillon'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignModal;
