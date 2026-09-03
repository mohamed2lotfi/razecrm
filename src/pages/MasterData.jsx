import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Loader2, Pencil, Check, X, Users, UserPlus, ShieldCheck, UserCheck, Shield, Coffee, MapPin, Footprints, Star, Image as ImageIcon, Sparkles, Building2, Eye, Upload, Flag, Globe } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import CountryFlag from '@/components/CountryFlag';
import UserAvatar from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const AgencySettings = () => {
  const [settings, setSettings] = useState({ nom_agence: '', adresse: '', telephone: '', email: '', logo_url: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('agency_settings').select('*').single();
    if (data) {
      setSettings(data);
    }
    setLoading(false);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, logo_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Ensure we don't send the updated_at or other generated fields that might cause issues if they exist differently
      const { updated_at, ...dataToSave } = settings;
      
      const { data, error } = await supabase.from('agency_settings').upsert({ id: 1, ...dataToSave }).select();
      
      if (error) {
        console.error("Save error:", error);
        alert(`Erreur de sauvegarde : ${error.message}\n\nAvez-vous exécuté le script SQL fourni dans le walkthrough ?`);
      } else {
        alert('Paramètres enregistrés avec succès !');
      }
    } catch (err) {
      console.error(err);
      alert('Une erreur inattendue est survenue.');
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center h-48"><Loader2 className="animate-spin text-primary m-auto" size={32} /></div>;

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Informations de l'Agence (En-tête PDF)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Logo de l'Agence</label>
            <div className="flex items-center gap-4">
              {settings.logo_url && (
                <div className="w-16 h-16 rounded border bg-slate-50 flex items-center justify-center overflow-hidden">
                  <img src={settings.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
              )}
              <Input type="file" accept="image/png, image/jpeg" onChange={handleLogoUpload} className="flex-1" />
              {settings.logo_url && (
                <Button variant="outline" size="sm" onClick={() => setSettings({...settings, logo_url: ''})}>Retirer</Button>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Nom de l'Agence</label>
            <Input value={settings.nom_agence || ''} onChange={e => setSettings({...settings, nom_agence: e.target.value})} placeholder="ex: AGENCY VOYAGES" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Téléphone</label>
            <Input value={settings.telephone || ''} onChange={e => setSettings({...settings, telephone: e.target.value})} placeholder="ex: +213 555..." />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Adresse complète</label>
            <Input value={settings.adresse || ''} onChange={e => setSettings({...settings, adresse: e.target.value})} placeholder="Adresse de l'agence..." />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Email</label>
            <Input type="email" value={settings.email || ''} onChange={e => setSettings({...settings, email: e.target.value})} placeholder="contact@agence.com" />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="mt-4">
          {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Check size={16} className="mr-2" />} 
          Enregistrer les informations
        </Button>
      </CardContent>
    </Card>
  );
};

const AirlinesSettings = () => {
  const { isAdmin } = useAuth();
  const [airlines, setAirlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newAirline, setNewAirline] = useState({ code_iata: '', nom: '', commission: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('airlines').select('*').order('nom');
    if (data) setAirlines(data);
    setLoading(false);
  };

  const addAirline = async (e) => {
    e.preventDefault();
    if (newAirline.code_iata && newAirline.nom) {
      const { data, error } = await supabase.from('airlines').insert([{
        code_iata: newAirline.code_iata.toUpperCase(),
        nom: newAirline.nom,
        commission: parseFloat(newAirline.commission) || 0
      }]).select();
      if (!error && data) setAirlines([...airlines, data[0]]);
      setNewAirline({ code_iata: '', nom: '', commission: '' });
    }
  };

  const removeAirline = async (id) => {
    await supabase.from('airlines').delete().eq('id', id);
    setAirlines(airlines.filter(a => a.id !== id));
  };

  if (loading) return <div className="flex justify-center h-48"><Loader2 className="animate-spin text-primary m-auto" size={32} /></div>;

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Catalogue des Compagnies Aériennes (Billeterie)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={addAirline} className="grid grid-cols-4 gap-2">
          <Input placeholder="Code IATA (ex: AH)" value={newAirline.code_iata} onChange={e => setNewAirline({...newAirline, code_iata: e.target.value.toUpperCase()})} className="uppercase" />
          <Input placeholder="Nom" value={newAirline.nom} onChange={e => setNewAirline({...newAirline, nom: e.target.value})} className="col-span-2" />
          <Input type="number" placeholder="Commission (DZD)" value={newAirline.commission} onChange={e => setNewAirline({...newAirline, commission: e.target.value})} />
          <Button type="submit" disabled={!newAirline.code_iata || !newAirline.nom} className="col-span-4 mt-2">
            <Plus size={16} className="mr-1" /> Ajouter la compagnie
          </Button>
        </form>
        <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto pr-2">
          {airlines.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-3 bg-white rounded-lg border hover:bg-slate-50 transition-colors">
              <div>
                <span className="font-bold text-xs bg-slate-100 text-slate-700 border px-2 py-1 rounded-md mr-3">{a.code_iata}</span>
                <span className="font-semibold">{a.nom}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-emerald-600 font-bold text-sm bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                  Com: {Number(a.commission || 0).toLocaleString('fr-DZ')} DZD
                </span>
                {isAdmin && (
                  <Button type="button" variant="destructive" size="icon-sm" onClick={() => removeAirline(a.id)}>
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {airlines.length === 0 && <p className="text-sm text-muted-foreground text-center py-6 border-2 border-dashed rounded-xl">Aucune compagnie aérienne configurée.</p>}
        </div>
      </CardContent>
    </Card>
  );
};

const ContactTypesSettings = () => {
  const { isAdmin } = useAuth();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newType, setNewType] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editNom, setEditNom] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from('contact_types').select('*').order('nom');
    if (data) setTypes(data);
    setLoading(false);
  };

  const addType = async (e) => {
    e.preventDefault();
    if (newType.trim()) {
      const { data, error } = await supabase.from('contact_types').insert([{ nom: newType.trim() }]).select();
      if (!error && data) setTypes([...types, data[0]]);
      setNewType('');
    }
  };

  const updateType = async (id) => {
    if (editNom.trim()) {
      const { data, error } = await supabase.from('contact_types').update({ nom: editNom.trim() }).eq('id', id).select();
      if (!error && data) {
        setTypes(types.map(t => t.id === id ? data[0] : t));
        setEditingId(null);
      }
    }
  };

  const removeType = async (id) => {
    await supabase.from('contact_types').delete().eq('id', id);
    setTypes(types.filter(t => t.id !== id));
  };

  if (loading) return <div className="flex justify-center h-48"><Loader2 className="animate-spin text-primary m-auto" size={32} /></div>;

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Types de Contacts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={addType} className="flex gap-2">
          <Input placeholder="Nouveau type (ex: Agence de voyage)" value={newType} onChange={e => setNewType(e.target.value)} />
          <Button type="submit" disabled={!newType.trim()}>
            <Plus size={16} className="mr-1" /> Ajouter
          </Button>
        </form>
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
          {types.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors">
              {editingId === t.id ? (
                <div className="flex items-center gap-2 flex-1 mr-2">
                  <Input 
                    value={editNom} 
                    onChange={(e) => setEditNom(e.target.value)} 
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Button type="button" size="icon-sm" onClick={() => updateType(t.id)} className="bg-green-600 hover:bg-green-700">
                    <Check size={14} />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditingId(null)}>
                    <X size={14} />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="text-sm font-semibold">{t.nom}</span>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => { setEditingId(t.id); setEditNom(t.nom); }}>
                      <Pencil size={14} className="text-blue-600" />
                    </Button>
                    {isAdmin && (
                      <Button type="button" variant="destructive" size="icon-sm" onClick={() => removeType(t.id)}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          {types.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucun type configuré</p>}
        </div>
      </CardContent>
    </Card>
  );
};


const OmraSettings = () => {
  const { isAdmin } = useAuth();
  const [compagnies, setCompagnies] = useState([]);
  const [intermediaires, setIntermediaires] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newCompagnie, setNewCompagnie] = useState({ code: '', nom: '' });
  const [newIntermediaire, setNewIntermediaire] = useState({ nom: '', type: 'partenaire' });
  
  // Hotel Form State (Modal)
  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const [editingHotelId, setEditingHotelId] = useState(null);
  const [hotelFormData, setHotelFormData] = useState({
    nom: '',
    nom_ar: '',
    description: '',
    description_ar: '',
    location: 'mecca',
    nbr_etoiles: '4',
    petit_dejeuner: true,
    vue_haram: false,
    distance_metres: 150,
    temps_marche: '2 à 3 min à pied',
    porte_proche: 'Porte Roi Abdulaziz',
    lat: 21.4195,
    lng: 39.8272,
    image: '',
    gallery: []
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleUploadHotelImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `hotels/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('agency-media')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from('agency-media')
        .getPublicUrl(fileName);

      if (publicData?.publicUrl) {
        setHotelFormData(prev => ({
          ...prev,
          image: publicData.publicUrl,
          gallery: prev.gallery?.length ? [...prev.gallery, publicData.publicUrl] : [publicData.publicUrl]
        }));
      }
    } catch (err) {
      console.error('Erreur upload:', err);
      alert('Erreur lors du téléchargement de l\'image: ' + (err.message || err));
    } finally {
      setUploadingImage(false);
    }
  };

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

  // Helper to compute exact distance from Kaaba / Nabawi using Haversine formula
  const computeHaramDistance = (lat, lng, city = 'mecca') => {
    const haramCoords = city === 'medina' 
      ? { lat: 24.467216, lng: 39.610940 } 
      : { lat: 21.422487, lng: 39.826206 };
    
    const R = 6371e3; // meters
    const φ1 = lat * Math.PI / 180;
    const φ2 = haramCoords.lat * Math.PI / 180;
    const Δφ = (haramCoords.lat - lat) * Math.PI / 180;
    const Δλ = (haramCoords.lng - lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  };

  const handleGoogleMapsPaste = (inputStr) => {
    if (!inputStr) return;
    const text = inputStr.trim();

    // 1. Matches "21.419523, 39.827214" or "21.419523 39.827214"
    const coordRegex = /(-?\d+\.\d+)[\s,]+(-?\d+\.\d+)/;
    const match = text.match(coordRegex);

    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);

      if (!isNaN(lat) && !isNaN(lng)) {
        const dist = computeHaramDistance(lat, lng, hotelFormData.location);
        const walkingMins = Math.max(1, Math.ceil(dist / 70));
        setHotelFormData(prev => ({
          ...prev,
          lat: lat,
          lng: lng,
          distance_metres: dist,
          temps_marche: `${walkingMins} min à pied`
        }));
      }
    }
  };

  const openCreateHotel = () => {
    setEditingHotelId(null);
    setHotelFormData({
      nom: '',
      nom_ar: '',
      description: '',
      description_ar: '',
      location: 'mecca',
      nbr_etoiles: '4',
      petit_dejeuner: true,
      vue_haram: false,
      distance_metres: 150,
      temps_marche: '2 à 3 min à pied',
      porte_proche: 'Porte Roi Abdulaziz',
      lat: 21.4195,
      lng: 39.8272,
      image: '',
      gallery: []
    });
    setHotelModalOpen(true);
  };

  const openEditHotel = (h) => {
    setEditingHotelId(h.id);
    setHotelFormData({
      nom: h.nom || '',
      nom_ar: h.nom_ar || '',
      description: h.description || '',
      description_ar: h.description_ar || '',
      location: h.location || 'mecca',
      nbr_etoiles: String(h.nbr_etoiles || '4'),
      petit_dejeuner: h.petit_dejeuner !== false,
      vue_haram: h.vue_haram === true,
      distance_metres: h.distance_metres || 0,
      temps_marche: h.temps_marche || '',
      porte_proche: h.porte_proche || '',
      lat: h.lat || (h.location === 'medina' ? 24.4705 : 21.4195),
      lng: h.lng || (h.location === 'medina' ? 39.6118 : 39.8272),
      image: h.image || '',
      gallery: h.gallery || []
    });
    setHotelModalOpen(true);
  };

  const saveHotel = async (e) => {
    e.preventDefault();
    if (!hotelFormData.nom) return;

    try {
      if (editingHotelId) {
        const { data, error } = await supabase
          .from('hotels')
          .update(hotelFormData)
          .eq('id', editingHotelId)
          .select();

        if (!error && data) {
          setHotels(hotels.map(h => h.id === editingHotelId ? data[0] : h));
          setHotelModalOpen(false);
        }
      } else {
        const { data, error } = await supabase
          .from('hotels')
          .insert([hotelFormData])
          .select();

        if (!error && data) {
          setHotels([...hotels, data[0]]);
          setHotelModalOpen(false);
        }
      }
    } catch (err) {
      console.error('Erreur sauvegarde hotel:', err);
      alert('Erreur lors de la sauvegarde de l\'hôtel.');
    }
  };

  const removeHotel = async (id) => {
    if (confirm('Voulez-vous vraiment supprimer cet hôtel ?')) {
      await supabase.from('hotels').delete().eq('id', id);
      setHotels(hotels.filter(h => h.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                  {isAdmin && (
                    <Button type="button" variant="destructive" size="icon-sm" onClick={() => removeCompagnie(c.id)}>
                      <Trash2 size={14} />
                    </Button>
                  )}
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
                  {isAdmin && (
                    <Button type="button" variant="destructive" size="icon-sm" onClick={() => removeIntermediaire(int.id)}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              ))}
              {intermediaires.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Aucun intermédiaire configuré</p>}
            </div>
          </CardContent>
        </Card>

        {/* Hôtels Omra */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 size={20} className="text-primary" /> Hôtels Omra
            </CardTitle>
            <Button size="sm" onClick={openCreateHotel} className="gap-1 shadow-sm">
              <Plus size={15} /> Nouveau
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {hotels.map((h) => (
                <div key={h.id} className="p-3 bg-muted/30 rounded-xl border hover:bg-muted/60 transition-colors flex items-center justify-between gap-3 text-sm group">
                  <div className="flex items-center gap-3 min-w-0">
                    {h.image ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border">
                        <img src={h.image} alt={h.nom} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-bold text-xs">
                        {h.nbr_etoiles}★
                      </div>
                    )}
                    <div className="truncate">
                      <div className="font-bold text-xs truncate">{h.nom}</div>
                      {h.nom_ar && <div className="text-[11px] text-muted-foreground truncate font-arabic">{h.nom_ar}</div>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase border",
                          h.location === 'mecca' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        )}>
                          {h.location === 'mecca' ? 'La Mecque' : 'Médine'}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {h.distance_metres || 0}m
                        </span>
                        {h.petit_dejeuner && (
                          <span className="text-[9px] bg-blue-500/10 text-blue-600 border border-blue-500/20 px-1 rounded flex items-center gap-0.5">
                            <Coffee size={10} /> P.Dèj
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button type="button" variant="outline" size="icon-sm" onClick={() => openEditHotel(h)}>
                      <Pencil size={13} />
                    </Button>
                    {isAdmin && (
                      <Button type="button" variant="destructive" size="icon-sm" onClick={() => removeHotel(h.id)}>
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {hotels.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-xs text-muted-foreground mb-3">Aucun hôtel configuré dans le Master Data</p>
                  <Button size="sm" variant="outline" onClick={openCreateHotel}>Ajouter un hôtel</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal d'ajout / Édition Complète d'Hôtel */}
      {hotelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card text-card-foreground border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/40">
              <div className="flex items-center gap-2">
                <Building2 className="text-primary" size={20} />
                <h3 className="font-bold text-base">
                  {editingHotelId ? "Modifier l'Hôtel" : "Ajouter un Nouvel Hôtel"}
                </h3>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setHotelModalOpen(false)}>
                <X size={16} />
              </Button>
            </div>

            <form onSubmit={saveHotel} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Noms bilingues */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Nom de l'hôtel (Français / Anglais) *</label>
                  <Input
                    required
                    placeholder="Ex: Hôtel Shada Makkah (Tilal)"
                    value={hotelFormData.nom}
                    onChange={e => setHotelFormData({ ...hotelFormData, nom: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Nom en Arabe (الاسم بالعربية)</label>
                  <Input
                    placeholder="مثال: فندق شدا مكة (تلال)"
                    value={hotelFormData.nom_ar}
                    onChange={e => setHotelFormData({ ...hotelFormData, nom_ar: e.target.value })}
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Localisation, Etoiles, Distance */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Ville</label>
                  <Select
                    value={hotelFormData.location}
                    onChange={e => {
                      const loc = e.target.value;
                      setHotelFormData({
                        ...hotelFormData,
                        location: loc,
                        lat: loc === 'medina' ? 24.4705 : 21.4195,
                        lng: loc === 'medina' ? 39.6118 : 39.8272
                      });
                    }}
                  >
                    <option value="mecca">La Mecque (Mecca)</option>
                    <option value="medina">Médine (Medina)</option>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Étoiles</label>
                  <Select
                    value={hotelFormData.nbr_etoiles}
                    onChange={e => setHotelFormData({ ...hotelFormData, nbr_etoiles: e.target.value })}
                  >
                    <option value="1">1 Étoile ⭐</option>
                    <option value="2">2 Étoiles ⭐⭐</option>
                    <option value="3">3 Étoiles ⭐⭐⭐</option>
                    <option value="4">4 Étoiles ⭐⭐⭐⭐</option>
                    <option value="5">5 Étoiles ⭐⭐⭐⭐⭐</option>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Distance au Haram (Mètres) *</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Ex: 150"
                    value={hotelFormData.distance_metres}
                    onChange={e => setHotelFormData({ ...hotelFormData, distance_metres: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Temps de marche & Porte la plus proche */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Temps de marche à pied</label>
                  <Input
                    placeholder="Ex: 2 à 3 min à pied"
                    value={hotelFormData.temps_marche}
                    onChange={e => setHotelFormData({ ...hotelFormData, temps_marche: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Porte d'accès au Haram</label>
                  <Input
                    placeholder="Ex: Porte Roi Abdulaziz & Ajyad"
                    value={hotelFormData.porte_proche}
                    onChange={e => setHotelFormData({ ...hotelFormData, porte_proche: e.target.value })}
                  />
                </div>
              </div>

              {/* Coordonnées GPS & Helper Google Maps */}
              <div className="p-3.5 bg-muted/40 rounded-xl border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-primary">
                    <MapPin size={14} /> Positionnement GPS Réel (Leaflet / Google Maps)
                  </span>
                  <span className="text-[10px] text-muted-foreground">Standard WGS84</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground block mb-1">
                    🎯 Coller coordonnées Google Maps (ex: 21.41952, 39.82721)
                  </label>
                  <Input
                    placeholder="Collez ici les coordonnées ou un lien Google Maps..."
                    onChange={e => handleGoogleMapsPaste(e.target.value)}
                    className="bg-background text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block">Latitude</label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Ex: 21.4195"
                      value={hotelFormData.lat}
                      onChange={e => {
                        const newLat = parseFloat(e.target.value) || 0;
                        setHotelFormData(prev => {
                          const dist = computeHaramDistance(newLat, prev.lng, prev.location);
                          return {
                            ...prev,
                            lat: newLat,
                            distance_metres: dist,
                            temps_marche: `${Math.max(1, Math.ceil(dist / 70))} min à pied`
                          };
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground block">Longitude</label>
                    <Input
                      type="number"
                      step="any"
                      placeholder="Ex: 39.8272"
                      value={hotelFormData.lng}
                      onChange={e => {
                        const newLng = parseFloat(e.target.value) || 0;
                        setHotelFormData(prev => {
                          const dist = computeHaramDistance(prev.lat, newLng, prev.location);
                          return {
                            ...prev,
                            lng: newLng,
                            distance_metres: dist,
                            temps_marche: `${Math.max(1, Math.ceil(dist / 70))} min à pied`
                          };
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Toggles : Petit-déjeuner & Vue Kaaba */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={hotelFormData.petit_dejeuner}
                    onChange={e => setHotelFormData({ ...hotelFormData, petit_dejeuner: e.target.checked })}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold flex items-center gap-1"><Coffee size={13} className="text-amber-500" /> Petit-déjeuner Inclus</span>
                    <span className="text-[10px] text-muted-foreground">Formule avec buffet</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={hotelFormData.vue_haram}
                    onChange={e => setHotelFormData({ ...hotelFormData, vue_haram: e.target.checked })}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold flex items-center gap-1"><Eye size={13} className="text-emerald-500" /> Vue Kaaba / Haram</span>
                    <span className="text-[10px] text-muted-foreground">Vue directe ou partielle</span>
                  </div>
                </label>
              </div>

              {/* Photo de l'Hôtel (Upload direct Storage + URL) */}
              <div className="p-3.5 bg-muted/40 rounded-xl border space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-primary" /> Photo Principale de l'Hôtel
                  </label>
                  <span className="text-[10px] text-muted-foreground">Storage Supabase</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Image Preview Box */}
                  <div className="w-24 h-20 rounded-xl overflow-hidden border bg-background flex items-center justify-center flex-shrink-0 relative group">
                    {hotelFormData.image ? (
                      <>
                        <img src={hotelFormData.image} alt="Aperçu" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setHotelFormData({ ...hotelFormData, image: '' })}
                          className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-2 text-muted-foreground">
                        <ImageIcon size={20} className="mx-auto mb-1 opacity-50" />
                        <span className="text-[9px] block">Aucune image</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-center gap-2">
                      <label className={cn(
                        "cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors shadow-sm",
                        uploadingImage ? "bg-muted text-muted-foreground cursor-wait" : "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}>
                        {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        <span>{uploadingImage ? 'Téléchargement...' : 'Télécharger une photo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadHotelImage}
                          disabled={uploadingImage}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[11px] text-muted-foreground">ou saisir un lien direct</span>
                    </div>

                    <Input
                      placeholder="https://... URL directe de la photo"
                      value={hotelFormData.image}
                      onChange={e => setHotelFormData({ ...hotelFormData, image: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Descriptions bilingues */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Description (Français / Anglais)</label>
                  <Textarea
                    rows="2"
                    placeholder="Description du confort, de l'emplacement et des services..."
                    value={hotelFormData.description}
                    onChange={e => setHotelFormData({ ...hotelFormData, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Description en Arabe (الوصف)</label>
                  <Textarea
                    rows="2"
                    placeholder="وصف الفندق ومميزاته والقرب من الحرم..."
                    value={hotelFormData.description_ar}
                    onChange={e => setHotelFormData({ ...hotelFormData, description_ar: e.target.value })}
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setHotelModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  {editingHotelId ? "Enregistrer les modifications" : "Créer l'Hôtel"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
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
              <div className="text-xs text-muted-foreground mb-2 space-y-1">
                <p>Personnalisez le comportement de l'IA lors de la génération de devis. Les tokens ci-dessous sont automatiquement remplacés selon les choix de l'agent :</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <code className="bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded text-[11px]">[client reques]</code>
                  <code className="bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded text-[11px]">[agent offre]</code>
                  <code className="bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded text-[11px]">[langue]</code>
                  <code className="bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded text-[11px]">[forme]</code>
                  <code className="bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded text-[11px]">[emojis]</code>
                  <code className="bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded text-[11px]">[client_nom]</code>
                  <code className="bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded text-[11px]">[destination]</code>
                  <code className="bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded text-[11px]">[instructions_extra]</code>
                </div>
              </div>
              <Textarea 
                placeholder="Ex: Tu es un conseiller voyage expert. Rédige le devis final dans la langue: [langue], avec le ton: [forme], et consigne emojis: [emojis]. Nom client: [client_nom], Destination: [destination]. Demande: [client reques] Offre: [agent offre]. Instructions: [instructions_extra]" 
                className="min-h-[140px] text-xs font-mono"
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
  const { isAdmin } = useAuth();
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
                {isAdmin && <Button variant="destructive" size="icon-sm" onClick={() => removeEnveloppe(env.id)}><Trash2 size={14}/></Button>}
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
                            {isAdmin && <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => removeSousEnveloppe(se.id)}><Trash2 size={12}/></Button>}
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

const VisaCatalogueSettings = () => {
  const { isAdmin } = useAuth();
  const [countries, setCountries] = useState([]);
  const [visaTypes, setVisaTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [countryForm, setCountryForm] = useState({ id: null, nom: '', nom_ar: '', code_iso: 'sa', flag_icon: '🇸🇦' });

  const [isVisaModalOpen, setIsVisaModalOpen] = useState(false);
  const [visaForm, setVisaForm] = useState({ 
    id: null, 
    country_id: '', 
    nom: '', 
    nom_ar: '', 
    tarif_base: 0, 
    tarif_vente: 0, 
    duree_traitement: '', 
    duree_traitement_ar: '', 
    dossierInput: '', 
    dossierArInput: '' 
  });

  const popularFlags = [
    { code: 'sa', flag: '🇸🇦', name: 'Arabie Saoudite', name_ar: 'المملكة العربية السعودية' },
    { code: 'ae', flag: '🇦🇪', name: 'Émirats Arabes Unis (Dubaï)', name_ar: 'الإمارات العربية المتحدة' },
    { code: 'tr', flag: '🇹🇷', name: 'Turquie', name_ar: 'تركيا' },
    { code: 'eg', flag: '🇪🇬', name: 'Égypte', name_ar: 'مصر' },
    { code: 'eu', flag: '🇪🇺', name: 'Espace Schengen', name_ar: 'دول فضاء شنغن' },
    { code: 'gb', flag: '🇬🇧', name: 'Royaume-Uni', name_ar: 'المملكة المتحدة' },
    { code: 'us', flag: '🇺🇸', name: 'États-Unis', name_ar: 'الولايات المتحدة' },
    { code: 'qa', flag: '🇶🇦', name: 'Qatar', name_ar: 'قطر' },
    { code: 'om', flag: '🇴🇲', name: 'Oman', name_ar: 'عمان' },
    { code: 'my', flag: '🇲🇾', name: 'Malaisie', name_ar: 'ماليزيا' },
    { code: 'tn', flag: '🇹🇳', name: 'Tunisie', name_ar: 'تونس' },
    { code: 'ma', flag: '🇲🇦', name: 'Maroc', name_ar: 'المغرب' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [cRes, vRes] = await Promise.all([
      supabase.from('visa_countries').select('*').order('nom'),
      supabase.from('visa_types').select('*').order('nom')
    ]);
    if (cRes.data) setCountries(cRes.data);
    if (vRes.data) setVisaTypes(vRes.data);
    setLoading(false);
  };

  const handleSaveCountry = async () => {
    if (!countryForm.nom.trim()) return;

    const payload = {
      nom: countryForm.nom.trim(),
      nom_ar: countryForm.nom_ar?.trim() || countryForm.nom.trim(),
      code_iso: countryForm.code_iso?.toLowerCase().trim() || 'sa',
      flag_icon: countryForm.flag_icon || '🌍'
    };

    if (countryForm.id) {
      const { data, error } = await supabase.from('visa_countries').update(payload).eq('id', countryForm.id).select();
      if (!error && data) setCountries(countries.map(c => c.id === countryForm.id ? data[0] : c));
    } else {
      const { data, error } = await supabase.from('visa_countries').insert([payload]).select();
      if (!error && data) setCountries([...countries, data[0]]);
    }
    setIsCountryModalOpen(false);
    setCountryForm({ id: null, nom: '', nom_ar: '', code_iso: 'sa', flag_icon: '🇸🇦' });
  };

  const handleRemoveCountry = async (id) => {
    if (window.confirm("Êtes-vous sûr ? Tous les visas liés à ce pays seront également supprimés.")) {
      try {
        const { error: typesErr } = await supabase.from('visa_types').delete().eq('country_id', id);
        if (typesErr) console.warn("Erreur suppression types de visa:", typesErr);

        const { error } = await supabase.from('visa_countries').delete().eq('id', id);
        if (error) {
          alert("Erreur lors de la suppression du pays : " + error.message);
          return;
        }
        setCountries(countries.filter(c => c.id !== id));
        setVisaTypes(visaTypes.filter(v => v.country_id !== id));
      } catch (err) {
        alert("Erreur inattendue : " + (err.message || err));
      }
    }
  };

  const handleEditCountry = (c) => {
    setCountryForm({
      id: c.id,
      nom: c.nom || '',
      nom_ar: c.nom_ar || '',
      code_iso: c.code_iso || 'sa',
      flag_icon: c.flag_icon || '🌍'
    });
    setIsCountryModalOpen(true);
  };

  const handleSaveVisa = async () => {
    if (!visaForm.nom.trim() || !visaForm.country_id) return;
    
    let dossierArr = [];
    if (visaForm.dossierInput) {
      dossierArr = visaForm.dossierInput.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
    }

    let dossierArArr = [];
    if (visaForm.dossierArInput) {
      dossierArArr = visaForm.dossierArInput.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
    }

    const payload = {
      country_id: visaForm.country_id,
      nom: visaForm.nom.trim(),
      nom_ar: visaForm.nom_ar?.trim() || visaForm.nom.trim(),
      tarif_base: Number(visaForm.tarif_base) || 0,
      tarif_vente: Number(visaForm.tarif_vente) || 0,
      duree_traitement: visaForm.duree_traitement || '',
      duree_traitement_ar: visaForm.duree_traitement_ar || visaForm.duree_traitement || '',
      dossier: dossierArr,
      dossier_ar: dossierArArr
    };

    if (visaForm.id) {
      const { data, error } = await supabase.from('visa_types').update(payload).eq('id', visaForm.id).select();
      if (!error && data) setVisaTypes(visaTypes.map(v => v.id === visaForm.id ? data[0] : v));
    } else {
      const { data, error } = await supabase.from('visa_types').insert([payload]).select();
      if (!error && data) setVisaTypes([...visaTypes, data[0]]);
    }
    setIsVisaModalOpen(false);
  };

  const handleRemoveVisa = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce visa ?")) {
      try {
        const { error } = await supabase.from('visa_types').delete().eq('id', id);
        if (error) {
          alert("Erreur lors de la suppression du visa : " + error.message);
          return;
        }
        setVisaTypes(visaTypes.filter(v => v.id !== id));
      } catch (err) {
        alert("Erreur inattendue : " + (err.message || err));
      }
    }
  };

  const handleEditVisa = (v) => {
    setVisaForm({
      id: v.id,
      country_id: v.country_id,
      nom: v.nom || '',
      nom_ar: v.nom_ar || '',
      tarif_base: v.tarif_base || 0,
      tarif_vente: v.tarif_vente || 0,
      duree_traitement: v.duree_traitement || '',
      duree_traitement_ar: v.duree_traitement_ar || '',
      dossierInput: v.dossier ? v.dossier.join(', ') : '',
      dossierArInput: v.dossier_ar ? v.dossier_ar.join(', ') : ''
    });
    setIsVisaModalOpen(true);
  };

  if (loading) return <div className="flex justify-center h-24 items-center"><Loader2 className="animate-spin text-primary" size={24} /></div>;

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-700 flex items-center gap-2">
            <Settings size={18} /> Catalogue des Visas & Drapeaux
          </h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="bg-white gap-1" onClick={() => { setCountryForm({ id: null, nom: '', nom_ar: '', code_iso: 'sa', flag_icon: '🇸🇦' }); setIsCountryModalOpen(true); }}>
              <Flag size={14} /> Ajouter Pays
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => { setVisaForm({ id: null, country_id: '', nom: '', nom_ar: '', tarif_base: 0, tarif_vente: 0, duree_traitement: '', duree_traitement_ar: '', dossierInput: '', dossierArInput: '' }); setIsVisaModalOpen(true); }}>
              <Plus size={14} /> Ajouter Type Visa
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 border-b">Pays & Drapeau</th>
                <th className="px-4 py-3 border-b">Type de Visa</th>
                <th className="px-4 py-3 border-b">Achat (DZD)</th>
                <th className="px-4 py-3 border-b">Vente (DZD)</th>
                <th className="px-4 py-3 border-b">Durée / Délai</th>
                <th className="px-4 py-3 border-b">Dossier Requis</th>
                <th className="px-4 py-3 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {countries.length === 0 && (
                 <tr><td colSpan="7" className="text-center py-8 text-muted-foreground italic">Aucun pays ni visa configuré.</td></tr>
              )}
              {countries.map(c => {
                 const cVisas = visaTypes.filter(v => v.country_id === c.id);
                 const flagDisplay = c.flag_icon || (c.code_iso ? `https://flagcdn.com/w40/${c.code_iso.toLowerCase()}.png` : '🌍');

                 if (cVisas.length === 0) {
                    return (
                      <tr key={c.id} className="border-b group">
                         <td className="px-4 py-3 font-bold text-slate-800 bg-emerald-50/20 align-top border-r" rowSpan={1}>
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-2">
                                 {c.code_iso ? (
                                   <img src={`https://flagcdn.com/w40/${c.code_iso.toLowerCase()}.png`} alt={c.nom} className="w-6 h-4 object-cover rounded shadow-sm" />
                                 ) : (
                                   <span className="text-lg">{c.flag_icon || '🌍'}</span>
                                 )}
                                 <div>
                                   <div>{c.nom}</div>
                                   {c.nom_ar && <div className="text-xs text-muted-foreground font-arabic">{c.nom_ar}</div>}
                                 </div>
                               </div>
                               <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-blue-600" onClick={() => handleEditCountry(c)}><Pencil size={12}/></Button>
                                 {isAdmin && <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-destructive" onClick={() => handleRemoveCountry(c.id)}><Trash2 size={12}/></Button>}
                               </div>
                            </div>
                         </td>
                         <td colSpan="6" className="px-4 py-3 text-muted-foreground text-xs italic text-center">Aucun visa configuré pour ce pays.</td>
                      </tr>
                    );
                 }
                 return cVisas.map((v, index) => (
                    <tr key={v.id} className="border-b hover:bg-slate-50 transition-colors group">
                       {index === 0 && (
                         <td className="px-4 py-3 font-bold text-slate-800 bg-emerald-50/20 align-top border-r" rowSpan={cVisas.length}>
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-2">
                                 {c.code_iso ? (
                                   <img src={`https://flagcdn.com/w40/${c.code_iso.toLowerCase()}.png`} alt={c.nom} className="w-6 h-4 object-cover rounded shadow-sm" />
                                 ) : (
                                   <span className="text-lg">{c.flag_icon || '🌍'}</span>
                                 )}
                                 <div>
                                   <div>{c.nom}</div>
                                   {c.nom_ar && <div className="text-xs text-muted-foreground font-arabic">{c.nom_ar}</div>}
                                 </div>
                               </div>
                               <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-blue-600" onClick={() => handleEditCountry(c)}><Pencil size={12}/></Button>
                                  {isAdmin && <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-destructive" onClick={() => handleRemoveCountry(c.id)}><Trash2 size={12}/></Button>}
                               </div>
                            </div>
                         </td>
                       )}
                       <td className="px-4 py-3">
                         <div className="font-medium">{v.nom}</div>
                         {v.nom_ar && <div className="text-xs text-muted-foreground font-arabic">{v.nom_ar}</div>}
                       </td>
                       <td className="px-4 py-3 text-red-600 font-medium">{Number(v.tarif_base || 0).toLocaleString('fr-DZ')}</td>
                       <td className="px-4 py-3 text-emerald-600 font-bold">{Number(v.tarif_vente || 0).toLocaleString('fr-DZ')}</td>
                       <td className="px-4 py-3">{v.duree_traitement || '—'}</td>
                       <td className="px-4 py-3 text-[11px]">
                         {v.dossier && v.dossier.length > 0 ? (
                           <div className="flex flex-wrap gap-1 max-w-[250px]">
                             {v.dossier.map((doc, i) => <span key={i} className="bg-slate-100 border px-1.5 py-0.5 rounded text-slate-600">{doc}</span>)}
                           </div>
                         ) : '—'}
                       </td>
                       <td className="px-4 py-3 text-right">
                         <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <Button variant="ghost" size="icon-sm" className="h-7 w-7 text-blue-600 hover:bg-blue-100" onClick={() => handleEditVisa(v)}>
                             <Pencil size={14}/>
                           </Button>
                           {isAdmin && (
                             <Button variant="ghost" size="icon-sm" className="h-7 w-7 text-destructive hover:bg-red-100" onClick={() => handleRemoveVisa(v.id)}>
                               <Trash2 size={14}/>
                             </Button>
                           )}
                         </div>
                       </td>
                    </tr>
                 ));
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Country Modal avec Drapeaux */}
      {isCountryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Flag size={18} className="text-primary" />
                {countryForm.id ? "Modifier le Pays" : "Ajouter un Pays & Drapeau"}
              </h2>
              <Button variant="ghost" size="icon-sm" onClick={() => setIsCountryModalOpen(false)}>
                <X size={16} />
              </Button>
            </div>
            
            <div className="p-5 space-y-4">
              {/* Presets rapides de drapeaux */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">Sélection rapide du pays :</label>
                <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto p-1 border rounded-xl bg-slate-50">
                  {popularFlags.map(pf => (
                    <button
                      key={pf.code}
                      type="button"
                      onClick={() => setCountryForm({
                        ...countryForm,
                        nom: pf.name,
                        nom_ar: pf.name_ar,
                        code_iso: pf.code,
                        flag_icon: pf.flag
                      })}
                      className={cn(
                        "p-1.5 rounded-lg border text-left text-xs flex items-center gap-1.5 transition-all hover:bg-white",
                        countryForm.code_iso === pf.code ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 font-bold" : "bg-white/60"
                      )}
                    >
                      <span className="text-base">{pf.flag}</span>
                      <span className="truncate text-[10px]">{pf.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Nom du pays (Français)</label>
                  <Input 
                    placeholder="ex: Arabie Saoudite" 
                    value={countryForm.nom} 
                    onChange={e => setCountryForm({...countryForm, nom: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Nom en Arabe</label>
                  <Input 
                    placeholder="مثال: السعودية" 
                    value={countryForm.nom_ar} 
                    onChange={e => setCountryForm({...countryForm, nom_ar: e.target.value})}
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Code Pays ISO (2 lettres)</label>
                  <Input 
                    placeholder="ex: sa, ae, tr, eg, fr..." 
                    value={countryForm.code_iso} 
                    onChange={e => setCountryForm({...countryForm, code_iso: e.target.value.toLowerCase()})} 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Emoji Drapeau</label>
                  <Input 
                    placeholder="ex: 🇸🇦, 🇦🇪, 🇹🇷" 
                    value={countryForm.flag_icon} 
                    onChange={e => setCountryForm({...countryForm, flag_icon: e.target.value})} 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setIsCountryModalOpen(false)}>Annuler</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveCountry}>Enregistrer</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visa Modal Bilingue */}
      {isVisaModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
              <h2 className="font-bold text-base">{visaForm.id ? "Modifier le Type de Visa" : "Nouveau Type de Visa"}</h2>
              <Button variant="ghost" size="icon-sm" onClick={() => setIsVisaModalOpen(false)}>
                <X size={16} />
              </Button>
            </div>
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Pays associé *</label>
                <Select className="w-full border-slate-300 rounded-md bg-white p-2 border text-sm" value={visaForm.country_id} onChange={e => setVisaForm({...visaForm, country_id: e.target.value})}>
                   <option value="">-- Sélectionner un pays --</option>
                   {countries.map(c => <option key={c.id} value={c.id}>{c.flag_icon || '🌍'} {c.nom}</option>)}
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Nom du Visa (Français) *</label>
                  <Input placeholder="ex: E-Visa Tourisme 1 An" value={visaForm.nom} onChange={e => setVisaForm({...visaForm, nom: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Nom en Arabe (الاسم)</label>
                  <Input placeholder="مثال: تأشيرة سياحة سنة" value={visaForm.nom_ar} onChange={e => setVisaForm({...visaForm, nom_ar: e.target.value})} dir="rtl" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-xs font-semibold text-slate-600 mb-1 block">Tarif Achat (DZD)</label>
                   <Input type="number" placeholder="Coût" value={visaForm.tarif_base} onChange={e => setVisaForm({...visaForm, tarif_base: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-xs font-semibold text-slate-600 mb-1 block">Tarif Vente (DZD) *</label>
                   <Input type="number" placeholder="Vente" value={visaForm.tarif_vente} onChange={e => setVisaForm({...visaForm, tarif_vente: e.target.value})} />
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                   <label className="text-xs font-semibold text-slate-600 mb-1 block">Délai de Traitement (FR)</label>
                   <Input placeholder="ex: 24 à 48 heures" value={visaForm.duree_traitement} onChange={e => setVisaForm({...visaForm, duree_traitement: e.target.value})} />
                </div>
                <div>
                   <label className="text-xs font-semibold text-slate-600 mb-1 block">Délai (Arabe)</label>
                   <Input placeholder="مثال: 24 إلى 48 ساعة" value={visaForm.duree_traitement_ar} onChange={e => setVisaForm({...visaForm, duree_traitement_ar: e.target.value})} dir="rtl" />
                </div>
              </div>

              <div>
                 <label className="text-xs font-semibold text-slate-600 mb-1 block">Pièces Requises (Français - Séparer par des virgules)</label>
                 <Input placeholder="Passeport (6 mois), Photo d'identité..." value={visaForm.dossierInput} onChange={e => setVisaForm({...visaForm, dossierInput: e.target.value})} />
              </div>

              <div>
                 <label className="text-xs font-semibold text-slate-600 mb-1 block">Pièces Requises (Arabe - مفصولة بفواصل)</label>
                 <Input placeholder="جواز السفر، صورة شمسية..." value={visaForm.dossierArInput} onChange={e => setVisaForm({...visaForm, dossierArInput: e.target.value})} dir="rtl" />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsVisaModalOpen(false)}>Annuler</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!visaForm.nom || !visaForm.country_id} onClick={handleSaveVisa}>Enregistrer</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UsersSettings = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [newUser, setNewUser] = useState({
    nom: '',
    email: '',
    password: '',
    role: 'agent'
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Erreur chargement profils:', err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));
      alert('Rôle mis à jour avec succès !');
    } catch (err) {
      console.error('Erreur changement rôle:', err);
      alert('Erreur lors du changement de rôle : ' + err.message);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password || !newUser.nom) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (newUser.password.length < 6) {
      alert('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setSavingUser(true);
    try {
      // 1. Créer le compte Auth dans Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            nom: newUser.nom,
            role: newUser.role
          }
        }
      });

      if (authError) throw authError;

      // 2. Insérer / Mettre à jour dans public.profiles pour assurer la synchronisation immédiate
      if (authData?.user) {
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          email: newUser.email,
          nom: newUser.nom,
          role: newUser.role
        });
      }

      alert(`Utilisateur "${newUser.nom}" créé avec succès en tant que ${newUser.role === 'admin' ? 'Administrateur' : 'Agent'} !`);
      setIsAddModalOpen(false);
      setNewUser({ nom: '', email: '', password: '', role: 'agent' });
      fetchProfiles();
    } catch (err) {
      console.error('Erreur création utilisateur:', err);
      alert('Erreur lors de la création du compte : ' + err.message);
    } finally {
      setSavingUser(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="max-w-4xl">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="text-primary" size={22} />
              Gestion des Utilisateurs & Rôles d'Accès
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Gérez les accès de votre équipe et attribuez les privilèges <strong>Admin</strong> (accès complet) ou <strong>Agent</strong> (accès opérationnel).
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="bg-primary hover:bg-primary/90 text-white font-semibold">
            <UserPlus size={16} className="mr-2" /> Nouvel Utilisateur
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {errorMsg && (
            <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-800 dark:text-amber-300 text-xs">
              <p className="font-bold mb-1">Configuration de la base de données :</p>
              <p>La table <code>profiles</code> n'a pas pu être interrogée ({errorMsg}).</p>
              <p className="mt-1">Pensez à exécuter le script <code>create_profiles.sql</code> dans l'éditeur SQL de votre console Supabase.</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun profil utilisateur trouvé.</p>
              <p className="text-xs mt-1">Exécutez le script SQL de migration pour synchroniser les utilisateurs existants.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase">Utilisateur</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase">Email</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground text-xs uppercase">Rôle Actuel</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground text-xs uppercase">Changer le Rôle</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground text-xs uppercase">Date de création</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {profiles.map(p => {
                    const initials = (p.nom?.charAt(0) || p.email?.charAt(0) || 'U').toUpperCase();
                    const isAdminUser = p.role === 'admin';

                    return (
                      <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <UserAvatar user={p} size="md" />
                            <span className="font-bold text-slate-800 dark:text-slate-200">{p.nom || 'Sans nom'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">{p.email || '—'}</td>
                        <td className="px-4 py-3.5 text-center">
                          {isAdminUser ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              <ShieldCheck size={13} /> Administrateur
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                              <UserCheck size={13} /> Agent
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <select
                            value={p.role || 'agent'}
                            onChange={(e) => handleRoleChange(p.id, e.target.value)}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border bg-background hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
                          >
                            <option value="admin">Administrateur</option>
                            <option value="agent">Agent</option>
                          </select>
                        </td>
                        <td className="px-4 py-3.5 text-right text-xs text-muted-foreground">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Nouvel Utilisateur */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-5 border-b">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <UserPlus className="text-primary" size={20} />
                Créer un Compte Utilisateur
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Créez un nouvel accès pour un membre de votre équipe.</p>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">Nom complet</label>
                <Input
                  placeholder="Ex: Sarah Benali"
                  value={newUser.nom}
                  onChange={e => setNewUser({ ...newUser, nom: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">Adresse Email</label>
                <Input
                  type="email"
                  placeholder="agent@agence.com"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">Mot de passe temporaire</label>
                <Input
                  type="password"
                  placeholder="Minimum 6 caractères"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground mb-1.5 block">Rôle attribué</label>
                <Select
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="agent">Agent (Opérationnel, sans accès finance/admin)</option>
                  <option value="admin">Administrateur (Accès total)</option>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t mt-6">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={savingUser} className="bg-primary hover:bg-primary/90 text-white font-semibold">
                  {savingUser ? <><Loader2 size={16} className="animate-spin mr-2" /> Création...</> : 'Créer le compte'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ── COMPOSANT : DESTINATIONS (Packages & Voyages) ───────────────────────────
const DestinationsSettings = () => {
  const { isAdmin } = useAuth();
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const emptyDestination = {
    nom: '',
    nom_ar: '',
    emoji: '✈️',
    description: '',
    description_ar: '',
    image_url: ''
  };

  const [formData, setFormData] = useState(emptyDestination);

  const POPULAR_EMOJIS = ['🇹🇷', '🇦🇪', '🇲🇾', '🇸🇦', '🇪🇬', '🇹🇳', '🇪🇸', '🇫🇷', '🇹🇭', '🇲🇦', '🇶🇦', '🇮🇹', '🇬🇷', '🇯🇴', '🇲🇻', '🌴', '🏖️', '✈️'];

  useEffect(() => {
    fetchDestinations();
  }, []);

  const fetchDestinations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('*')
        .order('nom', { ascending: true });
      if (!error && data) {
        setDestinations(data);
      }
    } catch (err) {
      console.warn("Table destinations non encore initialisée:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingDestination(null);
    setFormData(emptyDestination);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dest) => {
    setEditingDestination(dest);
    setFormData({
      nom: dest.nom || '',
      nom_ar: dest.nom_ar || '',
      emoji: dest.emoji || '✈️',
      description: dest.description || '',
      description_ar: dest.description_ar || '',
      image_url: dest.image_url || ''
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `destinations/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('agency-media')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        alert("Erreur lors de l'envoi de l'image: " + uploadError.message);
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('agency-media')
          .getPublicUrl(fileName);

        setFormData(prev => ({ ...prev, image_url: publicUrlData.publicUrl }));
      }
    } catch (err) {
      console.error(err);
      alert("Erreur inattendue lors de l'upload.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.nom.trim()) {
      alert("Le nom de la destination est obligatoire.");
      return;
    }

    const payload = {
      nom: formData.nom.trim(),
      nom_ar: formData.nom_ar?.trim() || null,
      emoji: formData.emoji || '✈️',
      description: formData.description?.trim() || null,
      description_ar: formData.description_ar?.trim() || null,
      image_url: formData.image_url || null,
      updated_at: new Date().toISOString()
    };

    if (editingDestination) {
      const { data, error } = await supabase
        .from('destinations')
        .update(payload)
        .eq('id', editingDestination.id)
        .select();

      if (!error && data) {
        setDestinations(prev => prev.map(d => d.id === editingDestination.id ? data[0] : d));
        setIsModalOpen(false);
      } else {
        alert("Erreur lors de la modification: " + error?.message);
      }
    } else {
      const { data, error } = await supabase
        .from('destinations')
        .insert([payload])
        .select();

      if (!error && data) {
        setDestinations(prev => [...prev, data[0]].sort((a, b) => a.nom.localeCompare(b.nom)));
        setIsModalOpen(false);
      } else {
        alert("Erreur lors de l'ajout: " + error?.message);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette destination ?")) return;

    const { error } = await supabase.from('destinations').delete().eq('id', id);
    if (!error) {
      setDestinations(prev => prev.filter(d => d.id !== id));
    } else {
      alert("Erreur lors de la suppression: " + error.message);
    }
  };

  const filtered = destinations.filter(d => 
    d.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.nom_ar && d.nom_ar.includes(searchTerm)) ||
    (d.description && d.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-xl font-extrabold flex items-center gap-2">
              <Globe size={22} className="text-primary" /> Destinations des Packages
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Gérez les pays et villes de destination pour vos packages de voyages organisés et séjours à la carte.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Rechercher destination..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-9 text-xs w-48 bg-muted/20"
            />
            <Button onClick={handleOpenAdd} className="h-9 text-xs font-bold gap-1.5 shrink-0">
              <Plus size={15} /> Ajouter une Destination
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-primary" size={28} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 bg-muted/10 rounded-2xl border border-dashed">
              <p className="text-sm text-muted-foreground italic">Aucune destination trouvée.</p>
              <Button onClick={handleOpenAdd} variant="outline" size="sm" className="mt-3 text-xs font-bold">
                <Plus size={14} className="mr-1" /> Créer la première destination
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filtered.map(dest => (
                <div key={dest.id} className="p-4 bg-muted/20 hover:bg-muted/40 border rounded-2xl transition-all shadow-sm flex flex-col justify-between group">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CountryFlag emoji={dest.emoji} destinationName={dest.nom} className="w-8 h-6 rounded-xs shadow-xs" fallbackEmoji="✈️" />
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-foreground truncate leading-snug">{dest.nom}</h4>
                          {dest.nom_ar && (
                            <span className="text-xs text-muted-foreground font-arabic block truncate" dir="rtl">
                              {dest.nom_ar}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleOpenEdit(dest)}
                          className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                          title="Modifier"
                        >
                          <Pencil size={13} />
                        </Button>
                        {isAdmin && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(dest.id)}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            title="Supprimer"
                          >
                            <Trash2 size={13} />
                          </Button>
                        )}
                      </div>
                    </div>

                    {dest.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-1">
                        {dest.description}
                      </p>
                    )}
                  </div>

                  {dest.image_url && (
                    <div className="mt-3 w-full h-24 rounded-xl overflow-hidden border">
                      <img src={dest.image_url} alt={dest.nom} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modal Ajout / Modification Destination ──────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/20">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Globe size={18} className="text-primary" />
                {editingDestination ? "Modifier la Destination" : "Ajouter une Nouvelle Destination"}
              </h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setIsModalOpen(false)} className="h-8 w-8">
                <X size={16} />
              </Button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Emoji Picker */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Drapeau / Emoji <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    value={formData.emoji}
                    onChange={e => setFormData({ ...formData, emoji: e.target.value })}
                    className="h-10 w-16 text-center text-xl font-bold"
                    placeholder="🇹🇷"
                  />
                  <div className="flex flex-wrap gap-1 flex-1">
                    {POPULAR_EMOJIS.map(em => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setFormData({ ...formData, emoji: em })}
                        className={cn(
                          "w-8 h-8 rounded-lg text-base border flex items-center justify-center hover:bg-muted transition-colors",
                          formData.emoji === em ? "border-primary bg-primary/10 shadow-sm" : "border-border"
                        )}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nom Français & Arabe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Nom (Français) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="Ex: Turquie, Dubaï, Malaisie..."
                    value={formData.nom}
                    onChange={e => setFormData({ ...formData, nom: e.target.value })}
                    className="h-10 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Nom en Arabe (Affichage vitrine)
                  </label>
                  <Input
                    placeholder="Ex: تركيا، دبي، ماليزيا..."
                    dir="rtl"
                    value={formData.nom_ar}
                    onChange={e => setFormData({ ...formData, nom_ar: e.target.value })}
                    className="h-10 text-xs font-arabic"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Description / Villes Clés
                </label>
                <Input
                  placeholder="Ex: Istanbul, Antalya, Cappadoce, Trabzon..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="h-10 text-xs"
                />
              </div>

              {/* Image / Couverture */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Image / Photo de Couverture (Optionnel)
                </label>
                <div className="flex items-center gap-3">
                  {formData.image_url ? (
                    <div className="relative w-16 h-12 rounded-lg overflow-hidden border shrink-0">
                      <img src={formData.image_url} alt="Aperçu" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: '' })}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : null}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="h-10 text-xs flex-1"
                  />
                </div>
                {uploadingImage && <p className="text-[10px] text-primary animate-pulse mt-1">Téléversement en cours...</p>}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-9 text-xs">
                  Annuler
                </Button>
                <Button type="submit" className="h-9 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-white">
                  <Check size={14} /> {editingDestination ? "Mettre à jour" : "Enregistrer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const MasterData = () => {
  const { isAdmin } = useAuth();
  const [services, setServices] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [activeTab, setActiveTab] = useState('destinations');
  const [newService, setNewService] = useState('');
  const [newFournisseur, setNewFournisseur] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

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

  const handleEditStart = (item) => {
    setEditingId(item.id);
    setEditValue(item.nom);
  };

  const handleEditSave = async (id, type) => {
    if (!editValue.trim()) {
      setEditingId(null);
      return;
    }
    const { data, error } = await supabase.from(type).update({ nom: editValue.trim() }).eq('id', id).select();
    if (!error && data) {
      if (type === 'services') setServices(services.map(s => s.id === id ? data[0] : s));
      else if (type === 'fournisseurs') setFournisseurs(fournisseurs.map(f => f.id === id ? data[0] : f));
    }
    setEditingId(null);
  };

  const allTabs = [
    { key: 'destinations', label: 'Destinations' },
    { key: 'users', label: 'Utilisateurs & Rôles', adminOnly: true },
    { key: 'agency', label: 'Info Agence' },
    { key: 'services', label: 'Services' },
    { key: 'fournisseurs', label: 'Fournisseurs' },
    { key: 'visa_catalogue', label: 'Catalogue Visa' },
    { key: 'airlines', label: 'Compagnies Aériennes' },
    { key: 'contact_types', label: 'Types de Contacts' },
    { key: 'enveloppes', label: 'Enveloppes Outcomes' },
    { key: 'omra', label: 'Omra Settings' },
    { key: 'ai', label: 'Configuration IA', adminOnly: true },
  ];

  const tabs = allTabs.filter(tab => !tab.adminOnly || isAdmin);

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

        {activeTab === 'destinations' ? (
          <DestinationsSettings />
        ) : activeTab === 'users' ? (
          <UsersSettings />
        ) : activeTab === 'agency' ? (
          <AgencySettings />
        ) : activeTab === 'enveloppes' ? (
          <EnveloppesSettings />
        ) : activeTab === 'airlines' ? (
          <AirlinesSettings />
        ) : activeTab === 'contact_types' ? (
          <ContactTypesSettings />
        ) : activeTab === 'visa_catalogue' ? (
          <VisaCatalogueSettings />
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
                          {editingId === item.id ? (
                            <div className="flex items-center flex-1 mr-2 gap-2">
                              <Input 
                                value={editValue} 
                                onChange={(e) => setEditValue(e.target.value)} 
                                className="h-8"
                                autoFocus
                                onKeyDown={(e) => { if(e.key === 'Enter') handleEditSave(item.id, activeTab); if(e.key === 'Escape') setEditingId(null); }}
                              />
                              <Button type="button" variant="ghost" size="icon-sm" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100" onClick={() => handleEditSave(item.id, activeTab)}>
                                <Check size={16} />
                              </Button>
                              <Button type="button" variant="ghost" size="icon-sm" className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-200" onClick={() => setEditingId(null)}>
                                <X size={16} />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="font-medium text-sm">{item.nom}</span>
                              <div className="flex items-center gap-1">
                                <Button type="button" variant="ghost" size="icon-sm" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100" onClick={() => handleEditStart(item)}>
                                  <Pencil size={14} />
                                </Button>
                                {isAdmin && (
                                  <Button type="button" variant="destructive" size="icon-sm" onClick={() => handleRemove(item.id, activeTab)}>
                                    <Trash2 size={14} />
                                  </Button>
                                )}
                              </div>
                            </>
                          )}
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
