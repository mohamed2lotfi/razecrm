import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Search, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ClientForm from './ClientForm';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

const VenteForm = ({ onClose, onSave, initialData }) => {
  const [clients, setClients] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [fournisseursList, setFournisseursList] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Visa catalogue data
  const [visaCountries, setVisaCountries] = useState([]);
  const [visaTypes, setVisaTypes] = useState([]);
  const [selectedVisaCountryId, setSelectedVisaCountryId] = useState('');
  const [selectedVisaTypeId, setSelectedVisaTypeId] = useState('');
  const [selectedVisaType, setSelectedVisaType] = useState(null);
  const [dossierChecks, setDossierChecks] = useState({});

  // Airlines data
  const [airlines, setAirlines] = useState([]);
  const [selectedAirlineId, setSelectedAirlineId] = useState('');
  const [selectedAirline, setSelectedAirline] = useState(null);
  
  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return {
        id: initialData.id,
        date_vente: initialData.date_vente ? format(new Date(initialData.date_vente), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        client_id: initialData.client_id || '',
        details: initialData.details || '',
        fournisseur_id: initialData.fournisseur_id || '',
        service_id: initialData.service_id || '',
        tarifClientPrincipal: initialData.tarif_base || '',
        commission: initialData.commission || '',
        total: initialData.total || '',
        etat: initialData.etat || 'Payé'
      };
    }
    return {
      date_vente: format(new Date(), 'yyyy-MM-dd'),
      client_id: '', details: '', fournisseur_id: '', service_id: '',
      tarifClientPrincipal: '', commission: '', total: '', etat: 'Payé'
    };
  });

  const [personnes, setPersonnes] = useState([]);
  const [clientSearch, setClientSearch] = useState(initialData?.client_nom || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAddingClient, setIsAddingClient] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    fetchFormData();
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchFormData = async () => {
    setLoadingData(true);
    const [cRes, sRes, fRes, vcRes, vtRes, aRes] = await Promise.all([
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('services').select('*').order('created_at'),
      supabase.from('fournisseurs').select('*').order('created_at'),
      supabase.from('visa_countries').select('*').order('nom'),
      supabase.from('visa_types').select('*').order('nom'),
      supabase.from('airlines').select('*').order('nom')
    ]);
    if (cRes.data) setClients(cRes.data);
    if (sRes.data) setServicesList(sRes.data);
    if (fRes.data) setFournisseursList(fRes.data);
    if (vcRes.data) setVisaCountries(vcRes.data);
    if (vtRes.data) setVisaTypes(vtRes.data);
    if (aRes.data) setAirlines(aRes.data);
    setLoadingData(false);
  };

  // Detect if selected service is "Visa" or "Billeterie"
  const selectedServiceName = servicesList.find(s => s.id === formData.service_id)?.nom || '';
  const isVisaService = selectedServiceName.toLowerCase().includes('visa');
  const isBilleterieService = selectedServiceName.toLowerCase().includes('billet');

  // Filter visa types by selected country
  const filteredVisaTypes = visaTypes.filter(vt => vt.country_id === selectedVisaCountryId);

  const handleVisaCountryChange = (countryId) => {
    setSelectedVisaCountryId(countryId);
    setSelectedVisaTypeId('');
    setSelectedVisaType(null);
  };

  const handleVisaTypeChange = (typeId) => {
    setSelectedVisaTypeId(typeId);
    const vt = visaTypes.find(v => v.id === typeId);
    setSelectedVisaType(vt || null);
    if (vt) {
      // Auto-fill tarif_base for main client, auto-calculate commission
      const tarifVenteUnit = Number(vt.tarif_vente) || 0;
      const tarifBaseUnit = Number(vt.tarif_base) || 0;
      const updatedPersonnes = personnes.map(p => ({ ...p, tarif: tarifBaseUnit }));
      setPersonnes(updatedPersonnes);
      
      // Reset dossier checks
      const checks = {};
      if (vt.dossier) vt.dossier.forEach(doc => { checks[doc] = false; });
      setDossierChecks(checks);

      setFormData(prev => {
        const nbPassagers = (isEntreprise ? 0 : 1) + updatedPersonnes.length;
        const totalVente = tarifVenteUnit * nbPassagers;
        const totalAchat = tarifBaseUnit * nbPassagers;
        const commission = totalVente - totalAchat;
        return { 
          ...prev, 
          tarifClientPrincipal: tarifBaseUnit.toString(),
          commission: commission.toString(), 
          total: totalVente.toString() 
        };
      });
    }
  };

  const selectedClient = clients.find(c => c.id === formData.client_id);
  const isEntreprise = selectedClient?.type === 'Entreprise';

  const getCurrentTarifBase = (mainTarif, personsArray, isEntr) => {
    const base = isEntr ? 0 : (parseFloat(mainTarif) || 0);
    return base + personsArray.reduce((acc, p) => acc + (parseFloat(p.tarif) || 0), 0);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      const currentClient = name === 'client_id' ? clients.find(c => c.id === value) : selectedClient;
      const currentIsEntreprise = currentClient?.type === 'Entreprise';
      const currentMainTarif = name === 'tarifClientPrincipal' ? value : prev.tarifClientPrincipal;
      const currentTarifBase = getCurrentTarifBase(currentMainTarif, personnes, currentIsEntreprise);

      // Check if service changed to Billeterie or Visa, reset related states if needed
      if (name === 'service_id') {
        const newServiceName = servicesList.find(s => s.id === value)?.nom || '';
        if (!newServiceName.toLowerCase().includes('billet')) {
          setSelectedAirlineId('');
          setSelectedAirline(null);
        }
      }

      if (name === 'tarifClientPrincipal' || name === 'commission' || name === 'client_id') {
        const comm = parseFloat(name === 'commission' ? value : prev.commission) || 0;
        newData.total = (currentTarifBase + comm).toString();
      } else if (name === 'total') {
        newData.commission = ((parseFloat(value) || 0) - currentTarifBase).toString();
      }
      return newData;
    });
  };

  const handleSelectClient = (client) => {
    setClientSearch(client.nom);
    handleChange({ target: { name: 'client_id', value: client.id } });
    setShowDropdown(false);
  };

  const handleSaveNewClient = async (newClientData) => {
    const { data, error } = await supabase.from('clients').insert([newClientData]).select();
    if (!error && data) {
      const insertedClient = data[0];
      setClients(prev => [insertedClient, ...prev]);
      setClientSearch(insertedClient.nom);
      setFormData(prev => ({ ...prev, client_id: insertedClient.id }));
      setIsAddingClient(false);
    }
  };

  const addPersonne = () => {
    const newP = { nom: '', tarif: selectedVisaType ? (Number(selectedVisaType.tarif_base) || 0) : '' };
    const updated = [...personnes, newP];
    setPersonnes(updated);
    if (isVisaService && selectedVisaType) {
      recalcVisaTotals(updated);
    }
  };
  
  const removePersonne = (index) => {
    const updated = personnes.filter((_, i) => i !== index);
    setPersonnes(updated);
    if (isVisaService && selectedVisaType) {
      recalcVisaTotals(updated);
    } else {
      setFormData(prev => {
        const tb = getCurrentTarifBase(prev.tarifClientPrincipal, updated, isEntreprise);
        return { ...prev, total: (tb + (parseFloat(prev.commission) || 0)).toString() };
      });
    }
  };

  const recalcVisaTotals = (updatedPersonnes) => {
    if (!selectedVisaType) return;
    const tarifVenteUnit = Number(selectedVisaType.tarif_vente) || 0;
    const tarifBaseUnit = Number(selectedVisaType.tarif_base) || 0;
    const nbPassagers = (isEntreprise ? 0 : 1) + updatedPersonnes.length;
    const totalVente = tarifVenteUnit * nbPassagers;
    const totalAchat = tarifBaseUnit * nbPassagers;
    const commission = totalVente - totalAchat;
    setFormData(prev => ({
      ...prev,
      commission: commission.toString(),
      total: totalVente.toString()
    }));
  };

  const updatePersonne = (index, field, value) => {
    const updated = [...personnes];
    updated[index][field] = value;
    setPersonnes(updated);
    setFormData(prev => {
      const tb = getCurrentTarifBase(prev.tarifClientPrincipal, updated, isEntreprise);
      return { ...prev, total: (tb + (parseFloat(prev.commission) || 0)).toString() };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.client_id) { alert('Veuillez sélectionner un client.'); return; }
    if (isVisaService && (!selectedVisaCountryId || !selectedVisaTypeId)) {
      alert('Veuillez sélectionner un pays et un type de visa.'); return;
    }
    if (isBilleterieService && !selectedAirlineId) {
      alert('Veuillez sélectionner une compagnie aérienne.'); return;
    }
    const tarifBase = getCurrentTarifBase(formData.tarifClientPrincipal, personnes, isEntreprise);
    
    let fullDetails = formData.details;
    if (personnes.length > 0) {
       fullDetails += ` | Passagers: ${personnes.map(p => p.nom).join(', ')}`;
    }
    if (isVisaService && selectedVisaType) {
      const countryName = visaCountries.find(c => c.id === selectedVisaCountryId)?.nom || '';
      fullDetails = `Visa ${selectedVisaType.nom} — ${countryName}${fullDetails ? ' | ' + fullDetails : ''}`;
    }
    if (isBilleterieService && selectedAirline) {
      fullDetails = `[Billet ${selectedAirline.code_iata} - ${selectedAirline.nom}]${fullDetails ? ' ' + fullDetails : ''}`;
    }

    const saveData = {
      id: formData.id,
      date_vente: formData.date_vente,
      client_nom: selectedClient?.nom || initialData?.client_nom || 'Inconnu',
      client_id: formData.client_id,
      details: fullDetails,
      fournisseur_id: formData.fournisseur_id || null,
      service_id: formData.service_id || null,
      tarif_base: tarifBase,
      commission: parseFloat(formData.commission) || 0,
      total: parseFloat(formData.total) || 0,
      etat: formData.etat
    };

    // Attach visa metadata if applicable
    if (isVisaService && selectedVisaType) {
      saveData._visaMeta = {
        country_id: selectedVisaCountryId,
        visa_type_id: selectedVisaTypeId,
        tarif_base_unit: Number(selectedVisaType.tarif_base) || 0,
        tarif_vente_unit: Number(selectedVisaType.tarif_vente) || 0,
        dossier: selectedVisaType.dossier || [],
        dossierChecks: dossierChecks,
        passagers: [
          ...(isEntreprise ? [] : [{ nom: selectedClient?.nom || 'Client principal', tarif_vente: parseFloat(formData.tarifClientPrincipal) || 0 }]),
          ...personnes.filter(p => p.nom.trim()).map(p => ({ nom: p.nom, tarif_vente: parseFloat(p.tarif) || 0 }))
        ]
      };
    }

    onSave(saveData);
  };

  const currentTarifBase = getCurrentTarifBase(formData.tarifClientPrincipal, personnes, isEntreprise);
  const filteredClients = clients.filter(c => c.nom.toLowerCase().includes(clientSearch.toLowerCase()));

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[650px] p-0 overflow-hidden" onClose={onClose}>
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-5 border-b">
          <DialogHeader>
            <DialogTitle className="text-2xl font-extrabold flex items-center gap-2">
              {initialData ? <Pencil className="text-primary" size={24} /> : <Plus className="text-primary" size={24} />}
              {initialData ? 'Modifier la Vente' : 'Ajouter une Vente'}
            </DialogTitle>
          </DialogHeader>
        </div>
        
        {loadingData ? (
          <div className="flex justify-center items-center h-48">
             <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-foreground">Date de vente <span className="text-red-500">*</span></Label>
              <Input type="date" name="date_vente" required value={formData.date_vente} onChange={handleChange} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors" />
            </div>
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
          </div>

          <div className="space-y-2.5">
            <Label className="text-sm font-bold text-foreground">Détails</Label>
            <Input name="details" placeholder="Ex: Vols ALG-ORY..." value={formData.details} onChange={handleChange} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-foreground">Fournisseur</Label>
              <Select name="fournisseur_id" value={formData.fournisseur_id} onChange={handleChange} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors">
                <option value="">Sélectionner</option>
                {fournisseursList.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </Select>
            </div>
            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-foreground">Service</Label>
              <Select name="service_id" value={formData.service_id} onChange={handleChange} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors">
                <option value="">Sélectionner</option>
                {servicesList.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </Select>
            </div>
          </div>

          {/* Billeterie Conditional Fields */}
          {isBilleterieService && (
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50/30 p-5 space-y-4">
              <Label className="text-sm font-bold text-blue-800 flex items-center gap-2">✈️ Compagnie Aérienne</Label>
              <div className="flex gap-4 items-end">
                <div className="space-y-1.5 flex-1 max-w-sm">
                  <Label className="text-xs font-semibold text-slate-600">Sélectionner la compagnie</Label>
                  <Select 
                    value={selectedAirlineId} 
                    onChange={e => {
                      setSelectedAirlineId(e.target.value);
                      setSelectedAirline(airlines.find(a => a.id === e.target.value) || null);
                    }} 
                    className="h-10 bg-white border-blue-300"
                  >
                    <option value="">-- Choisir --</option>
                    {airlines.map(a => <option key={a.id} value={a.id}>{a.code_iata} - {a.nom}</option>)}
                  </Select>
                </div>
                {selectedAirline && (
                  <div className="h-10 px-4 flex items-center bg-blue-100 border border-blue-200 rounded-md text-sm">
                    <span className="font-semibold text-blue-800">
                      Commission indicative : {Number(selectedAirline.commission || 0).toLocaleString('fr-DZ')} DZD
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Visa Conditional Fields */}
          {isVisaService && (
            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/30 p-5 space-y-4">
              <Label className="text-sm font-bold text-emerald-800 flex items-center gap-2">🌍 Catalogue Visa</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Pays</Label>
                  <Select value={selectedVisaCountryId} onChange={e => handleVisaCountryChange(e.target.value)} className="h-10 bg-white border-emerald-300">
                    <option value="">-- Sélectionner un pays --</option>
                    {visaCountries.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Type de Visa</Label>
                  <Select value={selectedVisaTypeId} onChange={e => handleVisaTypeChange(e.target.value)} className="h-10 bg-white border-emerald-300" disabled={!selectedVisaCountryId}>
                    <option value="">-- Sélectionner --</option>
                    {filteredVisaTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.nom}</option>)}
                  </Select>
                </div>
              </div>
              {selectedVisaType && (
                <div className="space-y-3 pt-2">
                  <div className="flex gap-4 text-xs">
                    <span className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded font-medium">Achat/px: {Number(selectedVisaType.tarif_base||0).toLocaleString('fr-DZ')} DZD</span>
                    <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded font-bold">Vente/px: {Number(selectedVisaType.tarif_vente||0).toLocaleString('fr-DZ')} DZD</span>
                    {selectedVisaType.duree_traitement && <span className="bg-slate-100 border px-2.5 py-1 rounded">⏱️ {selectedVisaType.duree_traitement}</span>}
                  </div>
                  {selectedVisaType.dossier && selectedVisaType.dossier.length > 0 && (
                    <div>
                      <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">📋 Réception du dossier :</Label>
                      <div className="space-y-1.5">
                        {selectedVisaType.dossier.map((doc, i) => (
                          <label key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                            dossierChecks[doc] ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}>
                            <input type="checkbox" checked={!!dossierChecks[doc]} onChange={() => setDossierChecks(prev => ({...prev, [doc]: !prev[doc]}))} className="accent-emerald-600 w-4 h-4" />
                            <span className={`text-sm ${dossierChecks[doc] ? 'text-emerald-800 line-through font-medium' : 'text-foreground'}`}>{doc}</span>
                            {dossierChecks[doc] && <span className="text-[10px] text-emerald-600 ml-auto">✓ Reçu</span>}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Persons Section */}
          <div className="rounded-xl border border-primary/10 bg-primary/5 p-5 space-y-4 shadow-inner">
            <div className="flex items-center justify-between border-b border-primary/10 pb-3">
              <Label className="text-sm font-bold text-primary">Tarifs et Passagers</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPersonne} className="h-8 bg-white hover:bg-muted transition-colors">
                <Plus size={14} className="mr-1" /> Ajouter
              </Button>
            </div>
            
            {isEntreprise ? (
              <div className="bg-amber-100/50 text-amber-800 border border-amber-200 rounded-lg p-3.5 text-sm font-medium flex items-center gap-2">
                Entreprise sélectionnée — veuillez ajouter les bénéficiaires ci-dessous.
              </div>
            ) : (
              <div className="flex gap-3 items-center">
                <span className="flex-[2] text-sm font-bold text-muted-foreground">Client Principal</span>
                <Input className="flex-1 h-10 bg-white" type="number" name="tarifClientPrincipal" placeholder="Tarif (DZD)"
                  value={formData.tarifClientPrincipal} onChange={handleChange} />
                <div className="w-9" />
              </div>
            )}

            {personnes.map((p, i) => (
              <div key={i} className="flex gap-3 items-center">
                <Input className="flex-[2] h-10 bg-white" placeholder={`Bénéficiaire ${i + 1}`} value={p.nom} onChange={e => updatePersonne(i, 'nom', e.target.value)} />
                <Input className="flex-1 h-10 bg-white" type="number" placeholder="Tarif (DZD)" value={p.tarif} onChange={e => updatePersonne(i, 'tarif', e.target.value)} />
                <Button type="button" variant="destructive" size="icon" className="h-10 w-10 shadow-sm" onClick={() => removePersonne(i)}><Trash2 size={16} /></Button>
              </div>
            ))}

            <div className="flex justify-between items-center pt-3 border-t border-primary/10 font-bold text-sm text-foreground">
              <span>Tarif de base global :</span>
              <span className="text-lg text-primary">{currentTarifBase.toLocaleString('fr-DZ')} DZD</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-foreground">Commission globale</Label>
              <Input type="number" name="commission" value={formData.commission} onChange={handleChange} className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors" />
            </div>
            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-primary">Total final (DZD)</Label>
              <Input type="number" name="total" className="h-11 font-extrabold bg-primary/10 text-primary border-primary/30 text-lg shadow-sm"
                value={formData.total} onChange={handleChange} />
            </div>
            <div className="space-y-2.5">
              <Label className="text-sm font-bold text-foreground">État</Label>
              <Select name="etat" value={formData.etat} onChange={handleChange} className="h-11 bg-muted/20 font-bold">
                <option value="Payé">Payé</option>
                <option value="Reservé">Reservé</option>
                <option value="Annulé">Annulé</option>
              </Select>
            </div>
          </div>

          </div>
          <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-3 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} className="h-11 px-6">Annuler</Button>
            <Button type="submit" className="h-11 px-8">Enregistrer la vente</Button>
          </div>
        </form>
        )}
      </DialogContent>
      {isAddingClient && <ClientForm onClose={() => setIsAddingClient(false)} onSave={handleSaveNewClient} />}
    </Dialog>
  );
};

export default VenteForm;
