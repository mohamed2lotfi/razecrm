import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Loader2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const OmraSettings = () => {
  const [compagnies, setCompagnies] = useState([]);
  const [intermediaires, setIntermediaires] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newCompagnie, setNewCompagnie] = useState({ code: '', nom: '' });
  const [newIntermediaire, setNewIntermediaire] = useState({ nom: '', type: 'partenaire' });
  const [newHotel, setNewHotel] = useState({ nom: '', location: 'mecca', nbr_etoiles: '3' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [c, i, h] = await Promise.all([
      supabase.from('compagnies_aeriennes').select('*').order('created_at'),
      supabase.from('intermediaires').select('*').order('created_at'),
      supabase.from('hotels').select('*').order('created_at')
    ]);
    if (c.data) setCompagnies(c.data);
    if (i.data) setIntermediaires(i.data);
    if (h.data) setHotels(h.data);
    setLoading(false);
  };

  const addCompagnie = async (e) => {
    e.preventDefault();
    if (newCompagnie.code && newCompagnie.nom) {
      const { data, error } = await supabase.from('compagnies_aeriennes').insert([newCompagnie]).select();
      if (!error && data) setCompagnies([...compagnies, data[0]]);
      setNewCompagnie({ code: '', nom: '' });
    }
  };

  const removeCompagnie = async (id) => {
    await supabase.from('compagnies_aeriennes').delete().eq('id', id);
    setCompagnies(compagnies.filter(c => c.id !== id));
  };

  const addIntermediaire = async (e) => {
    e.preventDefault();
    if (newIntermediaire.nom) {
      const { data, error } = await supabase.from('intermediaires').insert([newIntermediaire]).select();
      if (!error && data) setIntermediaires([...intermediaires, data[0]]);
      setNewIntermediaire({ nom: '', type: 'partenaire' });
    }
  };

  const removeIntermediaire = async (id) => {
    await supabase.from('intermediaires').delete().eq('id', id);
    setIntermediaires(intermediaires.filter(i => i.id !== id));
  };

  const addHotel = async (e) => {
    e.preventDefault();
    if (newHotel.nom && newHotel.location && newHotel.nbr_etoiles) {
      const { data, error } = await supabase.from('hotels').insert([newHotel]).select();
      if (!error && data) setHotels([...hotels, data[0]]);
      setNewHotel({ nom: '', location: 'mecca', nbr_etoiles: '3' });
    }
  };

  const removeHotel = async (id) => {
    await supabase.from('hotels').delete().eq('id', id);
    setHotels(hotels.filter(h => h.id !== id));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Compagnies Aériennes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Compagnies Aériennes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={addCompagnie} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input placeholder="Code IATA (ex: AH)" value={newCompagnie.code} onChange={e => setNewCompagnie({...newCompagnie, code: e.target.value.toUpperCase()})} className="w-1/3 uppercase" />
              <Input placeholder="Nom de la compagnie" value={newCompagnie.nom} onChange={e => setNewCompagnie({...newCompagnie, nom: e.target.value})} className="flex-1" />
            </div>
            <Button type="submit" disabled={!newCompagnie.code || !newCompagnie.nom}>
              <Plus size={16} className="mr-1" /> Ajouter
            </Button>
          </form>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {compagnies.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors text-sm">
                <div>
                  <span className="font-bold text-xs bg-muted border px-1.5 py-0.5 rounded mr-2">{c.code}</span>
                  {c.nom}
                </div>
                <Button type="button" variant="destructive" size="icon-sm" onClick={() => removeCompagnie(c.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
            {compagnies.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Aucune compagnie configurée</p>}
          </div>
        </CardContent>
      </Card>

      {/* Intermédiaires */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Intermédiaires</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={addIntermediaire} className="flex flex-col gap-2">
            <Input placeholder="Nom de l'intermédiaire" value={newIntermediaire.nom} onChange={e => setNewIntermediaire({...newIntermediaire, nom: e.target.value})} />
            <Select value={newIntermediaire.type} onChange={e => setNewIntermediaire({...newIntermediaire, type: e.target.value})}>
              <option value="partenaire">Partenaire</option>
              <option value="branche">Branche</option>
              <option value="rabateur">Rabateur</option>
            </Select>
            <Button type="submit" disabled={!newIntermediaire.nom}>
              <Plus size={16} className="mr-1" /> Ajouter
            </Button>
          </form>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {intermediaires.map((int) => (
              <div key={int.id} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors text-sm">
                <div>
                  <div className="font-medium">{int.nom}</div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">{int.type}</div>
                </div>
                <Button type="button" variant="destructive" size="icon-sm" onClick={() => removeIntermediaire(int.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
            {intermediaires.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Aucun intermédiaire configuré</p>}
          </div>
        </CardContent>
      </Card>

      {/* Hôtels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hôtels Omra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={addHotel} className="flex flex-col gap-2">
            <Input 
              placeholder="Nom de l'hôtel" 
              value={newHotel.nom} 
              onChange={e => setNewHotel({...newHotel, nom: e.target.value})} 
            />
            <div className="flex gap-2">
              <Select value={newHotel.location} onChange={e => setNewHotel({...newHotel, location: e.target.value})}>
                <option value="mecca">Mecca</option>
                <option value="medina">Medina</option>
              </Select>
              <Select value={newHotel.nbr_etoiles} onChange={e => setNewHotel({...newHotel, nbr_etoiles: e.target.value})}>
                <option value="1">1 Étoile</option>
                <option value="2">2 Étoiles</option>
                <option value="3">3 Étoiles</option>
                <option value="4">4 Étoiles</option>
                <option value="5">5 Étoiles</option>
              </Select>
            </div>
            <Button type="submit" disabled={!newHotel.nom}>
              <Plus size={16} className="mr-1" /> Ajouter
            </Button>
          </form>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {hotels.map((h) => (
              <div key={h.id} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors text-sm">
                <div className="flex flex-col">
                  <span className="font-semibold">{h.nom}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase border", h.location === 'mecca' ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-emerald-100 text-emerald-800 border-emerald-200")}>
                      {h.location}
                    </span>
                    <span className="font-semibold text-muted-foreground text-xs">{h.nbr_etoiles} ⭐</span>
                  </div>
                </div>
                <Button type="button" variant="destructive" size="icon-sm" onClick={() => removeHotel(h.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
            {hotels.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Aucun hôtel configuré</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const AISettings = () => {
  const [apiKey, setApiKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('models/gemini-1.5-flash-latest');
  const [availableModels, setAvailableModels] = useState([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('ai_settings').select('*').eq('id', 1).single();
    if (data) {
      setApiKey(data.api_key || '');
      setSystemPrompt(data.system_prompt || '');
      setSelectedModel(data.model_name || 'models/gemini-1.5-flash-latest');
    }
    setIsLoading(false);
  };

  const fetchModels = async () => {
    if (!apiKey) {
      alert("Veuillez d'abord saisir une clé API valide.");
      return;
    }
    setIsFetchingModels(true);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      const textModels = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
      setAvailableModels(textModels);
      if (textModels.length > 0 && !textModels.find(m => m.name === selectedModel)) {
        setSelectedModel(textModels[0].name);
      }
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la récupération des modèles: " + error.message);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSave = async () => {
    const { error } = await supabase.from('ai_settings').upsert({
      id: 1,
      api_key: apiKey,
      system_prompt: systemPrompt,
      model_name: selectedModel,
      updated_at: new Date().toISOString()
    });
    
    if (error) {
      console.error(error);
      alert("Erreur lors de la sauvegarde: " + error.message);
      return;
    }

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings size={20} className="text-primary"/> Clé API Google AI & Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Clé API Google AI (Gemini)</label>
              <p className="text-xs text-muted-foreground mb-2">
                Saisissez votre clé API pour activer la génération automatique de devis et l'assistance intelligente.
              </p>
              <Input 
                type="password" 
                placeholder="AIzaSy..." 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            
            <div className="space-y-4 pt-2 pb-2">
              <label className="text-sm font-semibold block">Modèle Google AI</label>
              <div className="flex gap-2">
                <Select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="flex-1 bg-muted/20">
                  <option value="models/gemini-1.5-flash-latest">models/gemini-1.5-flash-latest (Défaut)</option>
                  <option value="models/gemini-1.5-pro-latest">models/gemini-1.5-pro-latest</option>
                  {availableModels.filter(m => m.name !== 'models/gemini-1.5-flash-latest' && m.name !== 'models/gemini-1.5-pro-latest').map(m => (
                    <option key={m.name} value={m.name}>{m.name}</option>
                  ))}
                </Select>
                <Button type="button" variant="outline" onClick={fetchModels} disabled={isFetchingModels || !apiKey}>
                  {isFetchingModels ? <Loader2 className="animate-spin" size={16} /> : "Récupérer"}
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">System Prompt (Consignes pour l'IA)</label>
              <p className="text-xs text-muted-foreground mb-2">
                Personnalisez le comportement de l'IA lors de la génération de devis. 
                <br/><b>Tokens disponibles :</b> <code>[client reques]</code> (détails de la demande) et <code>[agent offre]</code> (détails du devis interne).
              </p>
              <Textarea 
                placeholder="Ex: Tu es un agent de voyage. Rédige le message WhatsApp final. Utilise 'Nous avons le plaisir' et termine toujours par : 'Nous restons à votre entière disposition pour toute information complémentaire ou éventuelle réservation. Merci de choisir l'agence El Mokhtar Travel.' Demande: [client reques] Offre: [agent offre]" 
                className="min-h-[120px]"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
            </div>

            <p className="text-[10px] text-muted-foreground italic border-t pt-2 mt-2">
              * Ces informations sont stockées de manière centralisée dans votre base de données.
            </p>
          </div>
          
          <Button onClick={handleSave} className="w-full">
            {isSaved ? "Configuration enregistrée avec succès !" : "Sauvegarder la configuration"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const EnveloppesSettings = () => {
  const [enveloppes, setEnveloppes] = useState([]);
  const [sousEnveloppes, setSousEnveloppes] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [compagnies, setCompagnies] = useState([]);
  const [newEnveloppe, setNewEnveloppe] = useState('');
  const [newTypeEnveloppe, setNewTypeEnveloppe] = useState('standard');
  const [newFournisseurId, setNewFournisseurId] = useState('');
  const [newSousEnveloppe, setNewSousEnveloppe] = useState({});
  const [selectedRelationEnvId, setSelectedRelationEnvId] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [eRes, sRes, fRes, servRes, compRes] = await Promise.all([
      supabase.from('outcomes_enveloppes').select('*').order('created_at'),
      supabase.from('outcomes_sous_enveloppes').select('*').order('created_at'),
      supabase.from('fournisseurs').select('*').order('nom'),
      supabase.from('services').select('*').order('nom'),
      supabase.from('compagnies_aeriennes').select('*').order('nom')
    ]);
    if (eRes.data) setEnveloppes(eRes.data);
    if (sRes.data) setSousEnveloppes(sRes.data);
    if (fRes.data) setFournisseurs(fRes.data);
    if (servRes.data) setServices(servRes.data);
    if (compRes.data) setCompagnies(compRes.data);
    setLoading(false);
  };

  const updateSousEnveloppeCompagnie = async (sousEnvId, compagnieCode) => {
    setSousEnveloppes(prev => prev.map(se => se.id === sousEnvId ? { ...se, compagnie: compagnieCode || null } : se));
    const { error } = await supabase
      .from('outcomes_sous_enveloppes')
      .update({ compagnie: compagnieCode || null })
      .eq('id', sousEnvId);

    if (error) {
      alert("Erreur lors de la liaison de la compagnie: " + error.message);
    }
  };

  const addEnveloppe = async (e) => {
    e.preventDefault();
    if (!newEnveloppe.trim()) return;
    if (newTypeEnveloppe === 'fournisseur' && !newFournisseurId) {
      alert("Veuillez sélectionner un fournisseur existant pour cette enveloppe.");
      return;
    }

    const payload = {
      nom: newEnveloppe.trim(),
      type_enveloppe: newTypeEnveloppe,
      fournisseur_id: newTypeEnveloppe === 'fournisseur' ? newFournisseurId : null
    };

    const { data, error } = await supabase.from('outcomes_enveloppes').insert([payload]).select();
    if (!error && data) {
      setEnveloppes([...enveloppes, data[0]]);
      setNewEnveloppe('');
      setNewTypeEnveloppe('standard');
      setNewFournisseurId('');
    } else if (error) {
      alert("Erreur: " + error.message);
    }
  };

  const removeEnveloppe = async (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer cette enveloppe et toutes ses sous-enveloppes ?")) {
      await supabase.from('outcomes_sous_enveloppes').delete().eq('enveloppe_id', id);
      await supabase.from('outcomes_enveloppes').delete().eq('id', id);
      setEnveloppes(enveloppes.filter(env => env.id !== id));
      setSousEnveloppes(sousEnveloppes.filter(se => se.enveloppe_id !== id));
    }
  };

  const addSousEnveloppe = async (e, envId) => {
    e.preventDefault();
    const val = (newSousEnveloppe[envId] || '').trim();
    if (!val) return;
    const { data, error } = await supabase.from('outcomes_sous_enveloppes').insert([{ enveloppe_id: envId, nom: val }]).select();
    if (!error && data) {
      setSousEnveloppes([...sousEnveloppes, data[0]]);
      setNewSousEnveloppe({ ...newSousEnveloppe, [envId]: '' });
    }
  };

  const removeSousEnveloppe = async (id) => {
    await supabase.from('outcomes_sous_enveloppes').delete().eq('id', id);
    setSousEnveloppes(sousEnveloppes.filter(se => se.id !== id));
  };

  const toggleServiceForSousEnveloppe = async (sousEnvId, serviceId) => {
    const targetSub = sousEnveloppes.find(se => se.id === sousEnvId);
    if (!targetSub) return;
    const currentServiceIds = targetSub.service_ids || [];
    const exists = currentServiceIds.includes(serviceId);
    const nextServiceIds = exists
      ? currentServiceIds.filter(id => id !== serviceId)
      : [...currentServiceIds, serviceId];

    setSousEnveloppes(prev => prev.map(se => se.id === sousEnvId ? { ...se, service_ids: nextServiceIds } : se));

    const { error } = await supabase
      .from('outcomes_sous_enveloppes')
      .update({ service_ids: nextServiceIds })
      .eq('id', sousEnvId);

    if (error) {
      alert("Erreur lors de la mise à jour des services: " + error.message);
    }
  };

  const getFournisseurNom = (fId) => fournisseurs.find(f => f.id === fId)?.nom || '—';
  const getServiceName = (sId) => services.find(s => s.id === sId)?.nom || '';

  if (loading) return <div className="flex justify-center h-24 items-center"><Loader2 className="animate-spin text-primary" size={24} /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader><CardTitle>Enveloppes Principales & Types</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addEnveloppe} className="space-y-4 mb-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input 
                placeholder="Nom de l'enveloppe (ex: Hôtels, Salaires...)" 
                value={newEnveloppe} 
                onChange={e => setNewEnveloppe(e.target.value)} 
              />
              <Select 
                value={newTypeEnveloppe} 
                onChange={e => setNewTypeEnveloppe(e.target.value)}
              >
                <option value="standard">Type : Standard / Général</option>
                <option value="omra">Type 1 : Omra (Dépenses Omra)</option>
                <option value="fournisseur">Type 2 : Enveloppe Fournisseur</option>
              </Select>

              {newTypeEnveloppe === 'fournisseur' && (
                <Select 
                  value={newFournisseurId} 
                  onChange={e => setNewFournisseurId(e.target.value)}
                  required
                >
                  <option value="">Lier à un Fournisseur…</option>
                  {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </Select>
              )}
            </div>

            <Button type="submit" disabled={!newEnveloppe.trim()} className="w-full sm:w-auto">
              <Plus size={16} className="mr-1"/> Créer l'enveloppe
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── CARD : MENU DE MISE EN RELATION (Enveloppe Fournisseur ↔ Services) ── */}
      <Card className="border-2 border-blue-500/20 bg-blue-50/20 shadow-sm">
        <CardHeader className="bg-blue-50/40 border-b pb-3">
          <CardTitle className="text-base font-bold text-blue-950 flex items-center gap-2">
            🔗 Menu de Mise en Relation (Enveloppes Fournisseurs ↔ Services)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Choisissez une enveloppe liée à un fournisseur, puis associez chaque sous-enveloppe à un ou plusieurs services.
          </p>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">1. Sélectionner une enveloppe liée à un fournisseur :</label>
            <Select 
              value={selectedRelationEnvId} 
              onChange={e => setSelectedRelationEnvId(e.target.value)}
              className="bg-white"
            >
              <option value="">-- Choisir une enveloppe fournisseur --</option>
              {enveloppes.filter(e => e.type_enveloppe === 'fournisseur' || e.fournisseur_id).map(e => (
                <option key={e.id} value={e.id}>
                  {e.nom} (Fournisseur : {getFournisseurNom(e.fournisseur_id)})
                </option>
              ))}
            </Select>
          </div>

          {selectedRelationEnvId ? (
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-foreground block">
                2. Lier chaque sous-enveloppe à un ou plusieurs services :
              </label>

              {sousEnveloppes.filter(se => se.enveloppe_id === selectedRelationEnvId).length === 0 ? (
                <div className="bg-white p-4 text-center rounded-lg border text-xs text-muted-foreground italic">
                  Aucune sous-enveloppe pour cette enveloppe. Veuillez en ajouter ci-dessous.
                </div>
              ) : (
                <div className="space-y-3">
                  {sousEnveloppes.filter(se => se.enveloppe_id === selectedRelationEnvId).map(se => {
                    const currentServiceIds = se.service_ids || [];
                    return (
                      <div key={se.id} className="bg-white p-4 rounded-xl border border-blue-200/60 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-foreground flex items-center gap-2">
                            📂 Sous-enveloppe : <span className="text-blue-700">{se.nom}</span>
                          </span>
                          <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                            {currentServiceIds.length} service(s) lié(s)
                          </span>
                        </div>

                        {services.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Aucun service défini dans Master Data.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {services.map(serv => {
                              const isChecked = currentServiceIds.includes(serv.id);
                              return (
                                <button
                                  key={serv.id}
                                  type="button"
                                  onClick={() => toggleServiceForSousEnveloppe(se.id, serv.id)}
                                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                                    isChecked 
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                                  }`}
                                >
                                  {isChecked ? '✓ ' : '+ '}{serv.nom}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic bg-white p-3 rounded-lg border border-blue-100">
              💡 Sélectionnez une enveloppe fournisseur dans le menu déroulant ci-dessus pour configurer les liaisons avec les services.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {enveloppes.map(env => {
          const type = env.type_enveloppe || (env.nom.toLowerCase() === 'omra' ? 'omra' : 'standard');
          return (
            <Card key={env.id} className={`border-t-4 shadow-sm ${type === 'omra' ? 'border-t-purple-600' : type === 'fournisseur' ? 'border-t-blue-600' : 'border-t-primary'}`}>
              <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    {env.nom}
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    {type === 'omra' && (
                      <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                        🕌 Type Omra
                      </span>
                    )}
                    {type === 'fournisseur' && (
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                        🏢 Fournisseur: {getFournisseurNom(env.fournisseur_id)}
                      </span>
                    )}
                    {type === 'standard' && (
                      <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200">
                        📁 Standard
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="destructive" size="icon-sm" onClick={() => removeEnveloppe(env.id)}><Trash2 size={14}/></Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={e => addSousEnveloppe(e, env.id)} className="flex gap-2 mb-3">
                  <Input size="sm" className="h-9 text-sm bg-muted/20" placeholder="Nouvelle sous-enveloppe..." value={newSousEnveloppe[env.id] || ''} onChange={e => setNewSousEnveloppe({...newSousEnveloppe, [env.id]: e.target.value})} />
                  <Button size="sm" type="submit" className="h-9" disabled={!(newSousEnveloppe[env.id] || '').trim()}><Plus size={14}/></Button>
                </form>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {sousEnveloppes.filter(se => se.enveloppe_id === env.id).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-2">Aucune sous-enveloppe</p>
                  ) : (
                    sousEnveloppes.filter(se => se.enveloppe_id === env.id).map(se => {
                      const linkedServNames = (se.service_ids || []).map(getServiceName).filter(Boolean);
                      return (
                        <div key={se.id} className="p-2.5 bg-muted/30 rounded border text-sm hover:bg-muted/50 transition-colors space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">{se.nom}</span>
                            <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => removeSousEnveloppe(se.id)}><Trash2 size={12}/></Button>
                          </div>
                          {linkedServNames.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {linkedServNames.map(sName => (
                                <span key={sName} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                                  ⚡ {sName}
                                </span>
                              ))}
                            </div>
                          )}

                          {type === 'omra' && (
                            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-purple-100 mt-1">
                              <span className="text-[11px] font-bold text-purple-900 shrink-0">✈️ Compagnie :</span>
                              <Select
                                value={se.compagnie || ''}
                                onChange={e => updateSousEnveloppeCompagnie(se.id, e.target.value)}
                                className="h-7 text-xs bg-white py-0 border-purple-200 w-44 font-semibold"
                              >
                                <option value="">-- Non liée --</option>
                                {compagnies.map(c => (
                                  <option key={c.id} value={c.code || c.nom}>
                                    {c.code ? `[${c.code}] ${c.nom}` : c.nom}
                                  </option>
                                ))}
                              </Select>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const MasterData = () => {
  const [services, setServices] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [activeTab, setActiveTab] = useState('services');
  const [newService, setNewService] = useState('');
  const [newFournisseur, setNewFournisseur] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [s, f] = await Promise.all([
      supabase.from('services').select('*').order('created_at'),
      supabase.from('fournisseurs').select('*').order('created_at')
    ]);
    if (s.data) setServices(s.data);
    if (f.data) setFournisseurs(f.data);
    setLoading(false);
  };

  const handleAdd = async (e, type) => {
    e.preventDefault();
    let val = '';
    let table = '';
    
    if (type === 'services') { val = newService.trim(); table = 'services'; }
    else if (type === 'fournisseurs') { val = newFournisseur.trim(); table = 'fournisseurs'; }
    
    if (!val) return;
    
    const { data, error } = await supabase.from(table).insert([{ nom: val }]).select();
    if (!error && data) {
      if (type === 'services') { setServices([...services, data[0]]); setNewService(''); }
      else if (type === 'fournisseurs') { setFournisseurs([...fournisseurs, data[0]]); setNewFournisseur(''); }
    }
  };

  const handleRemove = async (id, type) => {
    await supabase.from(type).delete().eq('id', id);
    
    if (type === 'services') setServices(services.filter(s => s.id !== id));
    else if (type === 'fournisseurs') setFournisseurs(fournisseurs.filter(f => f.id !== id));
  };

  const tabs = [
    { key: 'services', label: 'Services' },
    { key: 'fournisseurs', label: 'Fournisseurs' },
    { key: 'enveloppes', label: 'Enveloppes Outcomes' },
    { key: 'omra', label: 'Omra Settings' },
    { key: 'ai', label: 'Configuration IA' },
  ];

  const currentList = activeTab === 'services' ? services : fournisseurs;
  const isGenericList = activeTab === 'services' || activeTab === 'fournisseurs';
  const listTitle = activeTab === 'services' ? 'Services' : 'Fournisseurs';

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-3">
          <Settings size={28} className="text-primary" /> Master Data
        </h1>
      </div>

      <div className="animate-fade-in">
        {/* Tabs */}
        <div className="flex gap-0 border-b mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.key ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/30"
              )}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'enveloppes' ? (
          <EnveloppesSettings />
        ) : activeTab === 'omra' ? (
          <OmraSettings />
        ) : activeTab === 'ai' ? (
          <AISettings />
        ) : isGenericList ? (
          <div className="max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des {listTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                   <div className="flex justify-center items-center h-24">
                     <Loader2 className="animate-spin text-primary" size={24} />
                   </div>
                ) : (
                  <>
                    <form onSubmit={(e) => handleAdd(e, activeTab)} className="flex gap-2">
                      <Input
                        placeholder={`Nouveau ${listTitle.toLowerCase()}...`}
                        value={activeTab === 'services' ? newService : newFournisseur}
                        onChange={(e) => {
                          if (activeTab === 'services') setNewService(e.target.value);
                          else if (activeTab === 'fournisseurs') setNewFournisseur(e.target.value);
                        }}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={!(activeTab === 'services' ? newService : newFournisseur).trim()}>
                        <Plus size={16} className="mr-1" /> Ajouter
                      </Button>
                    </form>

                    <div className="space-y-2">
                      {currentList.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">Aucun élément configuré.</p>
                      ) : currentList.map((item) => (
                        <div key={item.id} className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors">
                          <span className="font-medium text-sm">{item.nom}</span>
                          <Button type="button" variant="destructive" size="icon-sm" onClick={() => handleRemove(item.id, activeTab)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </Layout>
  );
};

export default MasterData;
