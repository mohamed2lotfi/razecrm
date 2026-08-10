import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Sparkles, Send, Mail, Loader2, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ClientForm from '@/components/ClientForm';
import { supabase } from '@/lib/supabase';

const AI_QUOTE_TEMPLATE = (data, serviceName) => `Objet : Devis — ${serviceName || 'Prestation'}

Bonjour ${data.nom_prospect},

Suite à votre demande, veuillez trouver ci-dessous notre proposition :

━━━━━━━━━━━━━━━━━━━━━━
SERVICE : ${serviceName || 'À définir'}
DÉTAILS : ${data.details_demande || 'À préciser'}
━━━━━━━━━━━━━━━━━━━━━━

Montant estimé : ______ DZD (HT)
Taxe applicable : 19%
Total TTC : ______ DZD

Validité du devis : 15 jours
Modalités de paiement : Versement / Chèque

━━━━━━━━━━━━━━━━━━━━━━

Nous restons à votre disposition pour toute question.

Cordialement,
L'équipe AgencyCRM`;

const ProspectModal = ({ isOpen, onClose, onSave, prospect, isNew, servicesList, clientsList = [] }) => {
  const [formData, setFormData] = useState({
    client_id: '', service_id: '',
    details_demande: '', details_devis: '', devis_ia: '', status: 'nouvelle'
  });
  const [showAIQuote, setShowAIQuote] = useState(false);
  const [aiQuoteText, setAiQuoteText] = useState('');

  const [devisOptions, setDevisOptions] = useState([{ text: '', images: [] }]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const [clientSearch, setClientSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const wrapperRef = React.useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (prospect) { 
      setFormData(prospect); 
      if (prospect.client_id) {
        const c = clientsList.find(c => c.id === prospect.client_id);
        if (c) setClientSearch(c.nom);
      } else {
        setClientSearch(prospect.nom_prospect || '');
      }
      if (prospect.devis_ia) {
        setAiQuoteText(prospect.devis_ia);
        setShowAIQuote(true);
      }
      
      try {
        if (prospect.details_devis && prospect.details_devis.trim().startsWith('{')) {
          const parsed = JSON.parse(prospect.details_devis);
          
          let newOpts = parsed.options && parsed.options.length ? parsed.options.map(opt => {
            if (typeof opt === 'string') return { text: opt, images: [] };
            
            const images = (opt.images || []).map(img => {
              if (typeof img === 'string') return { id: Math.random().toString(), url: img };
              return img;
            });
            
            return { ...opt, images };
          }) : [{ text: '', images: [] }];
          
          // Migrate old global images to the first option if they exist
          if (parsed.images && parsed.images.length > 0) {
             const oldImgs = parsed.images.map(url => ({ id: Math.random().toString(), url }));
             newOpts[0].images = [...(newOpts[0].images || []), ...oldImgs];
          }
          
          setDevisOptions(newOpts);
        } else {
          setDevisOptions([{ text: prospect.details_devis || '', images: [] }]);
        }
      } catch (e) {
        setDevisOptions([{ text: prospect.details_devis || '', images: [] }]);
      }
    }
    else { 
      setFormData({ client_id: '', service_id: '', details_demande: '', details_devis: '', devis_ia: '', status: 'nouvelle' }); 
      setShowAIQuote(false);
      setAiQuoteText('');
      setDevisOptions([{ text: '', images: [] }]);
      setClientSearch('');
    }
  }, [prospect, isOpen, clientsList]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectClient = (client) => {
    setClientSearch(client.nom);
    setFormData(prev => ({ ...prev, client_id: client.id }));
    setShowDropdown(false);
  };

  const handleClientSaved = async (newClientData) => {
    const { data, error } = await supabase.from('clients').insert([newClientData]).select();
    if (!error && data) {
      const insertedClient = data[0];
      if (clientsList) clientsList.push(insertedClient);
      setClientSearch(insertedClient.nom);
      setFormData(prev => ({ ...prev, client_id: insertedClient.id }));
      setIsAddingClient(false);
    } else {
      alert("Erreur lors de la création du client: " + (error?.message || 'Erreur inconnue'));
    }
  };

  const handleAiTextChange = (e) => {
    setAiQuoteText(e.target.value);
    setFormData(prev => ({ ...prev, devis_ia: e.target.value }));
  };

  const handleOptionChange = (idx, value) => {
    const newOpts = [...devisOptions];
    newOpts[idx].text = value;
    setDevisOptions(newOpts);
  };

  const addOption = () => setDevisOptions(prev => [...prev, { text: '', images: [] }]);
  
  const removeOption = (idx) => setDevisOptions(prev => prev.filter((_, i) => i !== idx));

  const handlePasteImage = (e, idx) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const newOpts = [...devisOptions];
            newOpts[idx].images.push({ id: Date.now().toString(), file, base64: event.target.result });
            setDevisOptions(newOpts);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const removeImage = (optIdx, imgIdx) => {
    const newOpts = [...devisOptions];
    newOpts[optIdx].images = newOpts[optIdx].images.filter((_, i) => i !== imgIdx);
    setDevisOptions(newOpts);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_id) {
      alert("Veuillez sélectionner ou créer un client.");
      return;
    }
    
    setIsSaving(true);
    
    const optionsToSave = [];
    
    for (let opt of devisOptions) {
      if (!opt.text.trim() && (!opt.images || opt.images.length === 0)) continue;
      
      let finalImages = [];
      for (let img of (opt.images || [])) {
        if (img.file) {
          const ext = img.file.name.split('.').pop() || 'png';
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          const { data, error } = await supabase.storage.from('prospect_devis_images').upload(fileName, img.file);
          if (!error) {
            const { data: publicUrlData } = supabase.storage.from('prospect_devis_images').getPublicUrl(fileName);
            finalImages.push(publicUrlData.publicUrl);
          }
        } else if (img.url) {
          finalImages.push(img.url);
        }
      }
      
      optionsToSave.push({ text: opt.text, images: finalImages });
    }
    
    const detailsObject = {
      options: optionsToSave
    };
    
    onSave({ ...formData, details_devis: JSON.stringify(detailsObject) });
    setIsSaving(false);
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    let apiKey = '';
    let systemPrompt = '';
    let aiModel = 'models/gemini-1.5-flash-latest';

    try {
      const { data, error } = await supabase.from('ai_settings').select('*').eq('id', 1).single();
      if (data) {
        apiKey = data.api_key;
        systemPrompt = data.system_prompt;
        aiModel = data.model_name || 'models/gemini-1.5-flash-latest';
      }
    } catch (e) {
      console.error(e);
    }

    if (!apiKey) {
      alert("Veuillez configurer votre clé API Google AI (Gemini) dans les Paramètres > Master Data.");
      return;
    }
    if (!systemPrompt) {
      alert("Veuillez configurer le System Prompt dans les Paramètres > Master Data.");
      setIsGenerating(false);
      return;
    }

    try {
      const serviceName = servicesList.find(s => s.id === formData.service_id)?.nom || '';
      
      const optionsText = devisOptions.filter(o => o.text.trim() !== '').map((o, idx) => `Option ${idx + 1} :\n${o.text}`).join('\n\n');
      
      // Remplacement des tokens demandés par l'utilisateur
      const selectedClient = clientsList.find(c => c.id === formData.client_id);
      const clientName = selectedClient ? selectedClient.nom : formData.nom_prospect;
      
      let finalPrompt = systemPrompt
        .replace(/\[client reques\]/gi, formData.details_demande || 'Non spécifié')
        .replace(/\[agent offre\]/gi, optionsText || 'Non spécifié')
        .replace(/client reques/gi, formData.details_demande || 'Non spécifié') 
        .replace(/agent offre/gi, optionsText || 'Non spécifié');
        
      finalPrompt += `\n\nInformations supplémentaires du prospect : \nNom: ${clientName || 'Inconnu'}\nService souhaité: ${serviceName}`;
      
      finalPrompt += `\n\n!!! RÈGLE ABSOLUE !!!\nN'écris AUCUN brouillon, aucun plan, aucune puce avec ton raisonnement. Tu dois formuler la réponse finale et rien d'autre. Ne dis pas "Voici le message", commence immédiatement par le message ("Bonjour...").`;

      let parts = [{ text: finalPrompt }];
      
      for (let idx = 0; idx < devisOptions.length; idx++) {
        const opt = devisOptions[idx];
        if (opt.images && opt.images.length > 0) {
          parts.push({ text: `\n[Image(s) attachée(s) pour l'Option ${idx + 1}]` });
          
          for (let img of opt.images) {
            if (img.base64) {
              const mimeType = img.base64.split(';')[0].split(':')[1];
              const dataBase64 = img.base64.split(',')[1];
              parts.push({ inlineData: { mimeType, data: dataBase64 } });
            } else if (img.url) {
              try {
                const res = await fetch(img.url);
                const blob = await res.blob();
                const base64data = await new Promise(resolve => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result);
                  reader.readAsDataURL(blob);
                });
                const mimeType = base64data.split(';')[0].split(':')[1];
                const dataBase64 = base64data.split(',')[1];
                parts.push({ inlineData: { mimeType, data: dataBase64 } });
              } catch(e) { console.error("Could not fetch image for AI", e); }
            }
          }
        }
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${aiModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ 
              text: "Tu es un assistant de vente. Tu dois générer un message WhatsApp pour un client. Ta réponse doit être uniquement un objet JSON valide contenant la clé 'message_whatsapp'."
            }]
          },
          contents: [{
            parts: parts
          }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                message_whatsapp: {
                  type: "STRING",
                  description: "Le texte final du message prêt à envoyer au client, en français, avec les émojis appropriés. Sans introduction ni brouillon."
                }
              },
              required: ["message_whatsapp"]
            }
          }
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || "Erreur retournée par l'API.");
      }

      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      
      let cleanText = generatedText.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```/, '').replace(/```$/, '').trim();
      }
      
      let finalMessage = '';
      try {
        const parsed = JSON.parse(cleanText);
        finalMessage = parsed.message_whatsapp || cleanText;
      } catch (e) {
        finalMessage = cleanText;
      }

      setAiQuoteText(finalMessage);
      setFormData(prev => ({ ...prev, devis_ia: finalMessage }));
      setShowAIQuote(true);
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la génération avec l'IA: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWhatsApp = (text) => {
    const selectedClient = clientsList.find(c => c.id === formData.client_id);
    const phone = selectedClient?.phone || formData.phone;
    if (phone) {
      let num = phone.replace(/\s+/g, '');
      if (num.startsWith('0')) num = '213' + num.substring(1);
      const encoded = encodeURIComponent(text || '');
      window.open(`https://api.whatsapp.com/send?phone=${num}${text ? '&text=' + encoded : ''}`, '_blank');
    }
  };

  const handleEmail = (text) => {
    const selectedClient = clientsList.find(c => c.id === formData.client_id);
    const email = selectedClient?.email || formData.email;
    const serviceName = servicesList.find(s => s.id === formData.service_id)?.nom || '';
    const subject = encodeURIComponent(`Devis — ${serviceName || 'Prestation'}`);
    const body = encodeURIComponent(text || '');
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email || ''}&su=${subject}&body=${body}`, '_blank');
  };

  const filteredClients = clientsList.filter(c => c.nom.toLowerCase().includes(clientSearch.toLowerCase()));

  return (
    <>
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden" onClose={onClose}>
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-5 border-b">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold flex items-center gap-2">
              <Sparkles className="text-primary" size={24} />
              {isNew ? 'Créer une Demande de Devis' : 'Détails du Prospect'}
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2.5 relative" ref={wrapperRef}>
                <Label className="text-sm font-bold text-foreground">Client <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9 h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                    placeholder="Rechercher un client..."
                    value={clientSearch}
                    onChange={e => { setClientSearch(e.target.value); setShowDropdown(true); if (formData.client_id) handleChange({ target: { name: 'client_id', value: '' } }); }}
                    onFocus={() => setShowDropdown(true)}
                  />
                </div>
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-background border rounded-lg shadow-lg z-50 max-h-[220px] overflow-y-auto overflow-x-hidden">
                    {filteredClients.map(c => (
                      <div key={c.id} onClick={() => handleSelectClient(c)}
                        className="flex items-center justify-between px-3 py-3 cursor-pointer hover:bg-muted transition-colors border-b border-border/50 last:border-0">
                        <span className="font-medium text-sm text-foreground">{c.nom}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${c.type === 'Entreprise' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {c.type || 'Particulier'}
                        </span>
                      </div>
                    ))}
                    {filteredClients.length === 0 && clientSearch && (
                      <div className="px-4 py-3 text-sm text-muted-foreground italic bg-muted/10">Aucun client trouvé.</div>
                    )}
                    <div onClick={() => { setShowDropdown(false); setIsAddingClient(true); }}
                      className="flex items-center gap-2 px-4 py-3 cursor-pointer text-primary font-bold text-sm bg-primary/5 hover:bg-primary/10 transition-colors border-t">
                      <Plus size={16} /> Ajouter un nouveau client
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2.5">
                <Label className="text-sm font-bold text-foreground">Service</Label>
                <Select name="service_id" value={formData.service_id} onChange={handleChange} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors">
                  <option value="">Sélectionner un service</option>
                  {servicesList.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </Select>
              </div>
            </div>

            {/* Recapitulatif visuel si le devis contient des détails Omra structurés */}
            {(() => {
              try {
                if (formData.details_devis && formData.details_devis.trim().startsWith('{')) {
                  const parsed = JSON.parse(formData.details_devis);
                  if (parsed.service_type === 'omra') {
                    return (
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                            🕋 Demande Omra Détaillée
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {parsed.omra_mode === 'organise' ? 'Omra Organisée' : 'Omra À la Carte'}
                          </span>
                        </div>

                        {/* Mode Organisé */}
                        {parsed.omra_mode === 'organise' && (
                          <div className="text-xs text-foreground/80 space-y-1">
                            {parsed.groupe_nom && <div><strong>Groupe :</strong> {parsed.groupe_nom}</div>}
                            {parsed.hotel_choisi && <div><strong>Hôtel / Formule :</strong> {parsed.hotel_choisi}</div>}
                          </div>
                        )}

                        {/* Mode À la carte */}
                        {parsed.omra_mode === 'a_la_carte' && (
                          <div className="text-xs text-foreground/80 space-y-1">
                            <div><strong>Parcours :</strong> {parsed.parcours === 'makkah_medina' ? 'Makkah & Médine' : 'Makkah seul'}</div>
                            {parsed.hotel_medina && <div><strong>Hôtel Médine souhaité :</strong> {parsed.hotel_medina}</div>}
                            {parsed.hotel_makkah && <div><strong>Hôtel Makkah souhaité :</strong> {parsed.hotel_makkah}</div>}
                            {parsed.date_arrivee && <div><strong>Dates :</strong> {parsed.date_arrivee} → {parsed.date_depart || 'Non fixé'}</div>}
                            {parsed.parcours === 'makkah_medina' && (
                              <div><strong>Répartition :</strong> {parsed.nuits_medine || 0} nuits Médine / {parsed.nuits_makkah || 0} nuits Makkah</div>
                            )}
                            {parsed.vol_itineraire && <div><strong>Vol :</strong> {parsed.vol_itineraire}</div>}
                            {parsed.option_vip && <div className="text-amber-600 font-bold">⭐ Option VIP incluse (Voiture privée)</div>}
                          </div>
                        )}

                        {/* Chambres */}
                        {parsed.chambres && (
                          <div className="pt-2 border-t border-primary/10 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold text-muted-foreground mr-1">Chambres ({parsed.total_lits || 0} lits) :</span>
                            {Object.entries(parsed.chambres).filter(([_, q]) => q > 0).map(([t, q]) => (
                              <span key={t} className="text-[10px] font-black px-2 py-0.5 rounded-md bg-background border border-border shadow-2xs uppercase">
                                {q} {t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Enfants sans lit */}
                        {Array.isArray(parsed.enfants_sans_lit) && parsed.enfants_sans_lit.length > 0 && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span>👶 <strong>Enfants sans lit ({parsed.enfants_sans_lit.length}) :</strong></span>
                            <span>{parsed.enfants_sans_lit.map(e => `${e.age} ans`).join(', ')}</span>
                          </div>
                        )}

                        {/* Train Haramain */}
                        {parsed.train_haramain && (
                          <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                            🚅 Transfert Train Al-Haramain Express demandé
                          </div>
                        )}
                      </div>
                    );
                  }
                }
              } catch (e) {}
              return null;
            })()}

            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-foreground">Détails de la demande</Label>
              <Textarea name="details_demande" rows={3} placeholder="Décrivez le besoin du prospect en détail..."
                value={formData.details_demande} onChange={handleChange} className="resize-none bg-muted/20 focus-visible:bg-transparent transition-colors" />
            </div>

            {!isNew && (
              <div className="space-y-5 pt-5 border-t">
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-primary flex items-center gap-1.5"><MessageCircle size={16} /> Détails du devis (Usage interne)</Label>
                  
                  {devisOptions.map((opt, idx) => (
                    <div key={idx} className="relative group border border-primary/20 bg-primary/5 rounded-md p-2">
                      {devisOptions.length > 1 && <span className="absolute -top-2.5 right-3 text-[10px] uppercase font-bold text-primary/80 bg-background border px-1.5 rounded-full shadow-sm z-10">Option {idx + 1}</span>}
                      <Textarea 
                        rows={3} 
                        placeholder={idx === 0 ? "Notes internes, calculs, ou COLLEZ une capture d'écran ici (Ctrl+V)..." : `Option ${idx + 1}... (Collez une image ici)`}
                        value={opt.text} 
                        onChange={(e) => handleOptionChange(idx, e.target.value)} 
                        onPaste={(e) => handlePasteImage(e, idx)}
                        className="bg-transparent border-none focus-visible:ring-0 resize-none pr-12 shadow-none" 
                      />
                      {devisOptions.length > 1 && (
                        <button type="button" onClick={() => removeOption(idx)} className="absolute bottom-2 right-2 text-[10px] text-red-500 hover:underline opacity-0 group-hover:opacity-100 transition-opacity bg-background border px-2 py-0.5 rounded shadow-sm">Supprimer</button>
                      )}
                      
                      {/* Images Thumbnails for this option */}
                      {opt.images && opt.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-primary/10">
                          {opt.images.map((img, imgIdx) => (
                            <div key={imgIdx} className="relative w-14 h-14 rounded-md overflow-hidden border border-primary/20 shadow-sm group/img">
                              <img src={img.url || img.base64} alt={`Option ${idx+1} Img ${imgIdx}`} className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setPreviewImage(img.url || img.base64)} />
                              <button type="button" onClick={() => removeImage(idx, imgIdx)} className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover/img:opacity-100 transition-opacity">
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <Button type="button" variant="outline" size="sm" onClick={addOption} className="w-full h-8 border-dashed text-primary/70 hover:text-primary">
                    + Ajouter une option
                  </Button>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap md:flex-nowrap gap-3">
                  <Button type="button" variant="success" className="flex-1 h-11 shadow-sm" disabled={!formData.phone}
                    onClick={() => handleWhatsApp()}>
                    <MessageCircle size={18} className="mr-2" /> Discuter sur WhatsApp
                  </Button>
                  <Button type="button" className="flex-1 h-11 shadow-sm" onClick={handleGenerateAI} disabled={isGenerating}>
                    {isGenerating ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Sparkles size={18} className="mr-2" />}
                    {isGenerating ? "Génération..." : "Générer avec l'IA"}
                  </Button>
                </div>

                {/* AI Quote Panel */}
                {showAIQuote && (
                  <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-violet-50/50 to-emerald-50/30 p-5 space-y-4 shadow-inner">
                    <div className="flex items-center gap-2 text-sm font-bold text-indigo-700">
                      <Sparkles size={16} className="text-indigo-500" />
                      Devis généré — Modifiez avant d'envoyer
                    </div>
                    <Textarea 
                      value={aiQuoteText} 
                      onChange={handleAiTextChange}
                      rows={12}
                      className="bg-white/90 border-indigo-200 text-sm leading-relaxed font-mono shadow-sm resize-none"
                    />
                    <div className="flex gap-2">
                      <Button type="button" variant="success" size="sm" className="h-9" disabled={!formData.phone}
                        onClick={() => handleWhatsApp(aiQuoteText)}>
                        <Send size={14} className="mr-1.5" /> Envoyer via WhatsApp
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-9 bg-white"
                        onClick={() => handleEmail(aiQuoteText)}>
                        <Mail size={14} className="mr-1.5" /> Envoyer via Email
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-3 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} className="h-11 px-6">Annuler</Button>
            <Button type="submit" className="h-11 px-8" disabled={isSaving}>
              {isSaving ? <Loader2 size={18} className="mr-2 animate-spin" /> : null}
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
      {isAddingClient && <ClientForm onClose={() => setIsAddingClient(false)} onSave={handleClientSaved} />}
    </Dialog>
    <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
      <DialogContent className="max-w-4xl bg-transparent border-none shadow-none flex items-center justify-center [&>button]:hidden">
        {previewImage && (
          <div className="relative inline-block">
            <button type="button" onClick={() => setPreviewImage(null)} className="absolute -top-3 -right-3 bg-background hover:bg-muted text-foreground rounded-full p-1.5 shadow-lg border z-50 transition-colors">
              <X size={20} />
            </button>
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl" />
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default ProspectModal;
