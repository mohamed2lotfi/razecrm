import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Building2, ArrowLeft, Plane, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

const CurrencyInput = ({ label, value, onChange }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-bold text-muted-foreground">{label}</Label>
    <div className="relative">
      <Input 
        type="number" 
        value={value} 
        onChange={onChange} 
        className="pr-12 text-right h-10 bg-muted/20 focus-visible:bg-transparent transition-colors" 
        placeholder="0"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
        DZD
      </div>
    </div>
  </div>
);

const OmraGroupForm = ({ onCancel, onSave, group }) => {
  const [compagnies, setCompagnies] = useState([]);
  const [hotelsMaster, setHotelsMaster] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);

  const [formData, setFormData] = useState({
    nom: '',
    date_depart: '',
    date_retour: '',
    compagnie: '',
    nbr_places: '',
    hotels: []
  });

  useEffect(() => {
    const fetchMasterData = async () => {
      setLoadingMaster(true);
      const [cRes, hRes] = await Promise.all([
        supabase.from('compagnies_aeriennes').select('*'),
        supabase.from('hotels').select('*')
      ]);
      if (cRes.data) setCompagnies(cRes.data);
      if (hRes.data) setHotelsMaster(hRes.data);
      setLoadingMaster(false);
    };
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (group) {
      setFormData(group);
    } else {
      setFormData({
        nom: '',
        date_depart: '',
        date_retour: '',
        compagnie: '',
        nbr_places: '',
        hotels: []
      });
    }
  }, [group]);

  const handleAddHotel = () => {
    setFormData(prev => ({
      ...prev,
      hotels: [
        ...prev.hotels,
        {
          hotelId: '',
          ch5: '',
          ch4: '',
          ch3: '',
          ch2: '',
          single: '',
          reductionChd: '',
          commission: '',
          restauration: '',
          nbrChambres: ''
        }
      ]
    }));
  };

  const handleRemoveHotel = (index) => {
    setFormData(prev => ({
      ...prev,
      hotels: prev.hotels.filter((_, i) => i !== index)
    }));
  };

  const handleHotelChange = (index, field, value) => {
    setFormData(prev => {
      const newHotels = [...prev.hotels];
      newHotels[index] = { ...newHotels[index], [field]: value };
      return { ...prev, hotels: newHotels };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft size={20} />
        </Button>
        <h2 className="text-2xl font-extrabold">{group ? 'Modifier le Groupe' : 'Nouveau Groupe Omra'}</h2>
      </div>

      <Card className="overflow-hidden border-0 shadow-lg ring-1 ring-black/5">
        <CardContent className="p-8">
          {loadingMaster ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="animate-spin text-primary" size={48} />
              <p className="text-muted-foreground font-medium">Chargement des données...</p>
            </div>
          ) : (
          <form id="omra-group-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Section 1: Informations du vol/groupe */}
            <div className="space-y-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b pb-3 flex items-center gap-2"><Plane size={16} /> Informations Générales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-foreground">Nom du groupe <span className="text-red-500">*</span></Label>
                  <Input 
                    required 
                    placeholder="Ex: Groupe VIP Octobre" 
                    value={formData.nom} 
                    onChange={e => setFormData({...formData, nom: e.target.value})} 
                    className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-foreground">Nombre de places <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number" 
                    required 
                    placeholder="Ex: 50" 
                    value={formData.nbr_places || ''} 
                    onChange={e => setFormData({...formData, nbr_places: e.target.value})} 
                    className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-foreground">Date de départ <span className="text-red-500">*</span></Label>
                  <Input 
                    type="date" 
                    required 
                    value={formData.date_depart || ''} 
                    onChange={e => setFormData({...formData, date_depart: e.target.value})} 
                    className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-bold text-foreground">Date de retour <span className="text-red-500">*</span></Label>
                  <Input 
                    type="date" 
                    required 
                    value={formData.date_retour || ''} 
                    onChange={e => setFormData({...formData, date_retour: e.target.value})} 
                    className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                  />
                </div>
                <div className="space-y-2.5 md:col-span-2">
                  <Label className="text-sm font-bold text-foreground">Compagnie Aérienne</Label>
                  {compagnies.length === 0 ? (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                      Veuillez configurer les compagnies dans le Master Data en premier.
                    </div>
                  ) : (
                    <Select 
                      required 
                      value={formData.compagnie} 
                      onChange={e => setFormData({...formData, compagnie: e.target.value})}
                      className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                    >
                      <option value="">Sélectionnez une compagnie</option>
                      {compagnies.map((c, i) => (
                        <option key={i} value={c.code}>{c.code} - {c.nom}</option>
                      ))}
                    </Select>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Hôtels */}
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2"><Building2 size={16} /> Configuration des Hôtels</h3>
                <Button type="button" size="sm" variant="outline" onClick={handleAddHotel} className="h-9">
                  <Plus size={14} className="mr-2" /> Ajouter un hôtel
                </Button>
              </div>

              {formData.hotels.length === 0 ? (
                <div className="text-center py-8 bg-muted/20 border border-dashed rounded-lg">
                  <Building2 size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Aucun hôtel ajouté à ce vol.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {formData.hotels.map((hotel, index) => (
                    <div key={index} className="bg-muted/10 border rounded-xl p-5 relative">
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="icon" 
                        className="absolute -top-3 -right-3 rounded-full shadow-md"
                        onClick={() => handleRemoveHotel(index)}
                      >
                        <Trash2 size={16} />
                      </Button>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Choix de l'hôtel */}
                        <div className="space-y-2.5 lg:col-span-2">
                          <Label className="text-sm font-bold text-foreground">Sélection de l'hôtel (Master Data)</Label>
                          <Select 
                            required 
                            value={hotel.hotelId} 
                            onChange={e => handleHotelChange(index, 'hotelId', e.target.value)}
                            className="h-11 bg-muted/20 focus-visible:bg-transparent transition-colors"
                          >
                            <option value="">Sélectionnez un hôtel</option>
                            {hotelsMaster.map((h, i) => {
                              const etoiles = h.nbr_etoiles || h.nbrEtoiles || '4';
                              const loc = h.location === 'mecca' ? 'La Mecque' : h.location === 'medina' ? 'Médine' : (h.location ? h.location.toUpperCase() : '');
                              const label = `${h.nom ? h.nom : 'Hôtel'}${loc ? ' (' + loc + ')' : ''} - ${etoiles} Étoiles ★`;
                              return <option key={h.id || i} value={h.id}>{label}</option>;
                            })}
                            {/* Support pour les anciens enregistrements avec libellé textuel */}
                            {hotel.hotelId && !hotelsMaster.some(h => h.id === hotel.hotelId) && (
                              <option value={hotel.hotelId}>
                                {hotel.hotelId.replace(/undefined\s*étoiles/gi, '').trim() || hotel.hotelId}
                              </option>
                            )}
                          </Select>
                        </div>

                        {/* Tarifs */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-semibold uppercase text-muted-foreground">Tarifs (DZD)</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <CurrencyInput label="CH5 (Quintuble)" value={hotel.ch5} onChange={e => handleHotelChange(index, 'ch5', e.target.value)} />
                            <CurrencyInput label="CH4 (Quadruple)" value={hotel.ch4} onChange={e => handleHotelChange(index, 'ch4', e.target.value)} />
                            <CurrencyInput label="CH3 (Triple)" value={hotel.ch3} onChange={e => handleHotelChange(index, 'ch3', e.target.value)} />
                            <CurrencyInput label="CH2 (Double)" value={hotel.ch2} onChange={e => handleHotelChange(index, 'ch2', e.target.value)} />
                            <CurrencyInput label="Single" value={hotel.single} onChange={e => handleHotelChange(index, 'single', e.target.value)} />
                            <CurrencyInput label="Réduction CHD" value={hotel.reductionChd} onChange={e => handleHotelChange(index, 'reductionChd', e.target.value)} />
                          </div>
                        </div>

                        {/* Autres paramètres */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-semibold uppercase text-muted-foreground">Paramètres & Suppléments</h4>
                          <div className="grid grid-cols-1 gap-4">
                            <CurrencyInput label="Commission Intermédiaire / Hôtel" value={hotel.commission} onChange={e => handleHotelChange(index, 'commission', e.target.value)} />
                            <CurrencyInput label="Tarif Restauration (Supplément)" value={hotel.restauration} onChange={e => handleHotelChange(index, 'restauration', e.target.value)} />
                            
                            <div className="space-y-2 mt-2">
                              <Label className="text-xs text-muted-foreground">Nombre de chambres disponibles</Label>
                              <Input 
                                type="number" 
                                placeholder="Ex: 15" 
                                value={hotel.nbrChambres} 
                                onChange={e => handleHotelChange(index, 'nbrChambres', e.target.value)} 
                              />
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="pt-8 border-t flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onCancel} className="h-11 px-6">Annuler</Button>
              <Button type="submit" className="min-w-[180px] h-11 px-8">Enregistrer</Button>
            </div>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OmraGroupForm;
