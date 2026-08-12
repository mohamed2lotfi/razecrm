import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import CountryFlag from '@/components/CountryFlag';
import { 
  Package, Plus, Search, Calendar, Clock, MapPin, 
  Plane, Bus, Stamp, Hotel, Star, Copy, Edit2, 
  Trash2, Eye, Upload, Check, X, Sparkles, Building2, 
  ArrowRight, Printer, RefreshCw, Tag, Layers, CheckCircle2, XCircle
} from 'lucide-react';

export const FORMULES_REPAS = [
  { value: 'sans', label: 'Sans repas (Hébergement seul)' },
  { value: 'petit_dej', label: 'Petit-déjeuner inclus (BB)' },
  { value: 'demi_pension', label: 'Demi-pension (DP)' },
  { value: 'pension_complete', label: 'Pension complète (PC)' },
  { value: 'soft_all_inclusive', label: 'Soft All Inclusive' },
  { value: 'all_inclusive', label: 'All Inclusive (Tout Inclus)' }
];

export const VISA_STATUS_OPTIONS = [
  { value: 'incluse', label: 'Visa incluse', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'non_incluse', label: 'Visa non incluse', badgeColor: 'bg-rose-100 text-rose-800 border-rose-200' },
  { value: 'traitement_dossier', label: 'Traitement dossier visa', badgeColor: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'none', label: 'Non spécifié', badgeColor: 'bg-slate-100 text-slate-700 border-slate-200' }
];

const Packages = () => {
  const { isAdmin } = useAuth();
  const [packages, setPackages] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatut, setSelectedStatut] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState(null);
  const [activeFormTab, setActiveFormTab] = useState('general');
  const [uploadingCover, setUploadingCover] = useState(false);

  // Detail / Print Modal State
  const [previewPackage, setPreviewPackage] = useState(null);

  const emptyPackageForm = {
    nom: '',
    nom_ar: '',
    destination_id: '',
    type: 'organise',
    duree: '7 jours / 6 nuits',
    duree_ar: '7 أيام / 6 ليالي',
    date_debut_validite: '',
    date_fin_validite: '',
    billet_avion_inclus: true,
    compagnie_id: '',
    departs: [
      { id: '1', label: 'Départ 1', date_depart: '', date_retour: '', note: '' }
    ],
    transfert_inclus: true,
    visa_status: 'non_incluse',
    hotels: [
      {
        id: 'h1',
        nom: '',
        location: '',
        etoiles: 4,
        formule: 'petit_dej',
        tarifs: {
          quadruple: '',
          triple: '',
          double: '',
          single: ''
        }
      }
    ],
    description: '',
    description_ar: '',
    inclusions: ['Vol aller-retour', 'Hébergement en hôtel', 'Transfert aéroport - hôtel'],
    exclusions: ['Dépenses personnelles', 'Assurance voyage optionnelle'],
    image_url: '',
    statut: 'actif',
    en_vedette: false
  };

  const [formData, setFormData] = useState(emptyPackageForm);
  const [newInclusionText, setNewInclusionText] = useState('');
  const [newExclusionText, setNewExclusionText] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [packRes, destRes] = await Promise.all([
        supabase.from('packages').select('*').order('created_at', { ascending: false }),
        supabase.from('destinations').select('*').order('nom', { ascending: true })
      ]);

      if (packRes.data) setPackages(packRes.data);
      if (destRes.data) setDestinations(destRes.data);
    } catch (err) {
      console.error("Erreur lors du chargement des packages:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStartingPrice = (pkg) => {
    if (!pkg.hotels || !Array.isArray(pkg.hotels) || pkg.hotels.length === 0) return null;
    let min = Infinity;
    pkg.hotels.forEach(h => {
      if (h.tarifs) {
        Object.values(h.tarifs).forEach(val => {
          const num = Number(val);
          if (!isNaN(num) && num > 0 && num < min) {
            min = num;
          }
        });
      }
    });
    return min === Infinity ? null : min;
  };

  const getDestinationObj = (destId) => {
    return destinations.find(d => d.id === destId) || null;
  };

  const handleOpenAdd = () => {
    setEditingPackageId(null);
    setFormData({
      ...emptyPackageForm,
      destination_id: destinations[0]?.id || ''
    });
    setActiveFormTab('general');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pkg) => {
    setEditingPackageId(pkg.id);
    setFormData({
      nom: pkg.nom || '',
      nom_ar: pkg.nom_ar || '',
      destination_id: pkg.destination_id || destinations[0]?.id || '',
      type: pkg.type || 'organise',
      duree: pkg.duree || '7 jours / 6 nuits',
      duree_ar: pkg.duree_ar || '',
      date_debut_validite: pkg.date_debut_validite || '',
      date_fin_validite: pkg.date_fin_validite || '',
      billet_avion_inclus: pkg.billet_avion_inclus !== undefined ? pkg.billet_avion_inclus : true,
      compagnie_id: pkg.compagnie_id || '',
      departs: Array.isArray(pkg.departs) && pkg.departs.length > 0 ? pkg.departs : [{ id: '1', label: 'Départ 1', date_depart: '', date_retour: '', note: '' }],
      transfert_inclus: pkg.transfert_inclus !== undefined ? pkg.transfert_inclus : true,
      visa_status: pkg.visa_status || 'non_incluse',
      hotels: Array.isArray(pkg.hotels) && pkg.hotels.length > 0 ? pkg.hotels : emptyPackageForm.hotels,
      description: pkg.description || '',
      description_ar: pkg.description_ar || '',
      inclusions: Array.isArray(pkg.inclusions) ? pkg.inclusions : [],
      exclusions: Array.isArray(pkg.exclusions) ? pkg.exclusions : [],
      image_url: pkg.image_url || '',
      statut: pkg.statut || 'actif',
      en_vedette: Boolean(pkg.en_vedette)
    });
    setActiveFormTab('general');
    setIsModalOpen(true);
  };

  const handleDuplicate = async (pkg) => {
    const cloneNom = `${pkg.nom} (Copie)`;
    const { id, created_at, updated_at, ...cloneData } = pkg;
    
    try {
      const { data, error } = await supabase.from('packages').insert([{
        ...cloneData,
        nom: cloneNom,
        statut: 'brouillon',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]).select();

      if (!error && data) {
        setPackages(prev => [data[0], ...prev]);
      } else {
        alert("Erreur lors de la duplication: " + error?.message);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors du clonage.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous certain de vouloir supprimer ce package ?")) return;

    try {
      const { error } = await supabase.from('packages').delete().eq('id', id);
      if (!error) {
        setPackages(prev => prev.filter(p => p.id !== id));
      } else {
        alert("Erreur: " + error.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `packages/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('agency-media')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        alert("Erreur upload: " + uploadError.message);
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('agency-media')
          .getPublicUrl(fileName);

        setFormData(prev => ({ ...prev, image_url: publicUrlData.publicUrl }));
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi de la photo.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleAddDepart = () => {
    setFormData(prev => ({
      ...prev,
      departs: [
        ...prev.departs,
        { id: String(Date.now()), label: `Départ ${prev.departs.length + 1}`, date_depart: '', date_retour: '', note: '' }
      ]
    }));
  };

  const handleDepartChange = (idx, field, value) => {
    setFormData(prev => {
      const list = [...prev.departs];
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, departs: list };
    });
  };

  const handleRemoveDepart = (idx) => {
    setFormData(prev => ({
      ...prev,
      departs: prev.departs.filter((_, i) => i !== idx)
    }));
  };

  const handleAddHotel = () => {
    setFormData(prev => ({
      ...prev,
      hotels: [
        ...prev.hotels,
        {
          id: `h_${Date.now()}`,
          nom: '',
          location: '',
          etoiles: 4,
          formule: 'petit_dej',
          tarifs: { quadruple: '', triple: '', double: '', single: '' }
        }
      ]
    }));
  };

  const handleHotelChange = (idx, field, value) => {
    setFormData(prev => {
      const list = [...prev.hotels];
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, hotels: list };
    });
  };

  const handleHotelTarifChange = (hotelIdx, roomType, value) => {
    setFormData(prev => {
      const list = [...prev.hotels];
      list[hotelIdx] = {
        ...list[hotelIdx],
        tarifs: {
          ...list[hotelIdx].tarifs,
          [roomType]: value
        }
      };
      return { ...prev, hotels: list };
    });
  };

  const handleRemoveHotel = (idx) => {
    setFormData(prev => ({
      ...prev,
      hotels: prev.hotels.filter((_, i) => i !== idx)
    }));
  };

  const handleAddInclusion = () => {
    if (!newInclusionText.trim()) return;
    setFormData(prev => ({
      ...prev,
      inclusions: [...(prev.inclusions || []), newInclusionText.trim()]
    }));
    setNewInclusionText('');
  };

  const handleRemoveInclusion = (idx) => {
    setFormData(prev => ({
      ...prev,
      inclusions: prev.inclusions.filter((_, i) => i !== idx)
    }));
  };

  const handleAddExclusion = () => {
    if (!newExclusionText.trim()) return;
    setFormData(prev => ({
      ...prev,
      exclusions: [...(prev.exclusions || []), newExclusionText.trim()]
    }));
    setNewExclusionText('');
  };

  const handleRemoveExclusion = (idx) => {
    setFormData(prev => ({
      ...prev,
      exclusions: prev.exclusions.filter((_, i) => i !== idx)
    }));
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    if (!formData.nom.trim()) {
      alert("Veuillez renseigner le nom du package.");
      return;
    }

    const payload = {
      nom: formData.nom.trim(),
      nom_ar: formData.nom_ar?.trim() || null,
      destination_id: formData.destination_id || null,
      type: formData.type || 'organise',
      duree: formData.duree || '7 jours / 6 nuits',
      duree_ar: formData.duree_ar?.trim() || null,
      date_debut_validite: formData.date_debut_validite || null,
      date_fin_validite: formData.date_fin_validite || null,
      billet_avion_inclus: Boolean(formData.billet_avion_inclus),
      compagnie_id: formData.compagnie_id || null,
      departs: formData.departs || [],
      transfert_inclus: Boolean(formData.transfert_inclus),
      visa_status: formData.visa_status || 'non_incluse',
      hotels: formData.hotels || [],
      description: formData.description?.trim() || null,
      description_ar: formData.description_ar?.trim() || null,
      inclusions: formData.inclusions || [],
      exclusions: formData.exclusions || [],
      image_url: formData.image_url || null,
      statut: formData.statut || 'actif',
      en_vedette: Boolean(formData.en_vedette),
      updated_at: new Date().toISOString()
    };

    try {
      if (editingPackageId) {
        const { data, error } = await supabase
          .from('packages')
          .update(payload)
          .eq('id', editingPackageId)
          .select();

        if (!error && data) {
          setPackages(prev => prev.map(p => p.id === editingPackageId ? data[0] : p));
          setIsModalOpen(false);
        } else {
          alert("Erreur de modification: " + error?.message);
        }
      } else {
        const { data, error } = await supabase
          .from('packages')
          .insert([payload])
          .select();

        if (!error && data) {
          setPackages(prev => [data[0], ...prev]);
          setIsModalOpen(false);
        } else {
          alert("Erreur de création: " + error?.message);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Erreur inattendue lors de l'enregistrement.");
    }
  };

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = 
      pkg.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pkg.nom_ar && pkg.nom_ar.includes(searchTerm)) ||
      (pkg.description && pkg.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDest = selectedDestination === 'all' || pkg.destination_id === selectedDestination;
    const matchesType = selectedType === 'all' || pkg.type === selectedType;
    const matchesStatut = selectedStatut === 'all' || pkg.statut === selectedStatut;

    return matchesSearch && matchesDest && matchesType && matchesStatut;
  });

  return (
    <Layout>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2.5">
            <Package size={26} className="text-primary" /> Packages & Séjours
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gérez vos offres de voyages organisés et séjours sur-mesure (vols, hôtels, multi-départs et tarification).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleOpenAdd} className="h-10 text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm">
            <Plus size={16} /> Créer un Package
          </Button>
        </div>
      </div>

      {/* ── Key Statistics Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Package size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">{packages.length}</div>
              <div className="text-xs text-muted-foreground">Total Packages</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-600">
                {packages.filter(p => p.statut === 'actif').length}
              </div>
              <div className="text-xs text-muted-foreground">Offres Actives</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-amber-600">
                {packages.filter(p => p.en_vedette).length}
              </div>
              <div className="text-xs text-muted-foreground">En Vedette (Site)</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <MapPin size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-blue-600">{destinations.length}</div>
              <div className="text-xs text-muted-foreground">Destinations</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters & Search Bar ─────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Rechercher un package par nom, ville ou description..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-10 text-xs bg-muted/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={selectedDestination}
                onChange={e => setSelectedDestination(e.target.value)}
                className="h-10 text-xs w-44 bg-muted/20"
              >
                <option value="all">Toutes les destinations</option>
                {destinations.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.emoji} {d.nom}
                  </option>
                ))}
              </Select>

              <Select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="h-10 text-xs w-36 bg-muted/20"
              >
                <option value="all">Tous les types</option>
                <option value="organise">Voyage Organisé</option>
                <option value="a_la_carte">À la carte</option>
              </Select>

              <Select
                value={selectedStatut}
                onChange={e => setSelectedStatut(e.target.value)}
                className="h-10 text-xs w-32 bg-muted/20"
              >
                <option value="all">Tous statuts</option>
                <option value="actif">Actif</option>
                <option value="brouillon">Brouillon</option>
                <option value="archive">Archivé</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Content Grid ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className="animate-spin text-primary" size={32} />
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="text-center py-20 bg-muted/10 rounded-2xl border border-dashed">
          <Package size={40} className="mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-bold text-base text-foreground">Aucun package trouvé</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchTerm || selectedDestination !== 'all' 
              ? "Aucune offre ne correspond à vos filtres de recherche." 
              : "Créez votre première offre de package touristique."}
          </p>
          <Button onClick={handleOpenAdd} className="mt-4 text-xs font-bold gap-1.5">
            <Plus size={14} /> Créer un Package
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map(pkg => {
            const dest = getDestinationObj(pkg.destination_id);
            const startPrice = getStartingPrice(pkg);
            const visaOpt = VISA_STATUS_OPTIONS.find(v => v.value === pkg.visa_status) || VISA_STATUS_OPTIONS[1];

            return (
              <div 
                key={pkg.id} 
                className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Card Cover Image */}
                  <div className="relative h-48 w-full bg-muted overflow-hidden">
                    {pkg.image_url ? (
                      <img 
                        src={pkg.image_url} 
                        alt={pkg.nom} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-tr from-muted to-muted/60">
                        <Package size={32} className="opacity-40 mb-1" />
                        <span className="text-[11px]">Sans image</span>
                      </div>
                    )}

                    {/* Destination Pill (Top Left) */}
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                      <CountryFlag emoji={dest?.emoji} destinationName={dest?.nom} className="w-4 h-3" fallbackEmoji="✈️" />
                      <span>{dest?.nom || 'Destination'}</span>
                    </div>

                    {/* Statut & Featured (Top Right) */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {pkg.en_vedette && (
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <Sparkles size={10} /> Vedette
                        </span>
                      )}
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shadow-sm",
                        pkg.statut === 'actif' ? "bg-emerald-500 text-white" :
                        pkg.statut === 'brouillon' ? "bg-amber-500 text-white" : "bg-slate-500 text-white"
                      )}>
                        {pkg.statut}
                      </span>
                    </div>

                    {/* Type Badge (Bottom Left) */}
                    <div className="absolute bottom-3 left-3">
                      <span className="bg-primary/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md">
                        {pkg.type === 'organise' ? 'Voyage Organisé' : 'À la carte'}
                      </span>
                    </div>

                    {/* Duration Badge (Bottom Right) */}
                    <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-white text-[11px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Clock size={12} className="text-amber-400" />
                      <span>{pkg.duree}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-3.5">
                    <div>
                      <h3 className="font-bold text-base text-foreground leading-snug group-hover:text-primary transition-colors">
                        {pkg.nom}
                      </h3>
                      {pkg.nom_ar && (
                        <span className="text-xs text-muted-foreground font-arabic block mt-0.5" dir="rtl">
                          {pkg.nom_ar}
                        </span>
                      )}
                    </div>

                    {/* Departures summary */}
                    {Array.isArray(pkg.departs) && pkg.departs.length > 0 && (
                      <div className="bg-muted/30 p-2.5 rounded-xl border border-dashed space-y-1">
                        <div className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                          <Calendar size={12} className="text-primary" />
                          <span>{pkg.departs.length} créneau(x) de départ :</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {pkg.departs.slice(0, 2).map((dep, idx) => (
                            <span key={idx} className="text-[10px] bg-background border px-2 py-0.5 rounded font-mono font-medium">
                              {dep.date_depart ? `${dep.date_depart} → ${dep.date_retour || ''}` : dep.label}
                            </span>
                          ))}
                          {pkg.departs.length > 2 && (
                            <span className="text-[10px] text-muted-foreground font-bold self-center">
                              +{pkg.departs.length - 2} autre(s)
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Service Perks Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {pkg.billet_avion_inclus && (
                        <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Plane size={11} /> Vol {pkg.compagnie_id ? `(${pkg.compagnie_id})` : 'Inclus'}
                        </span>
                      )}
                      {pkg.transfert_inclus && (
                        <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Bus size={11} /> Transfert VIP
                        </span>
                      )}
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1", visaOpt.badgeColor)}>
                        <Stamp size={11} /> {visaOpt.label}
                      </span>
                    </div>

                    {/* Hotels summary */}
                    {Array.isArray(pkg.hotels) && pkg.hotels.length > 0 && (
                      <div className="pt-2 border-t text-xs text-muted-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1 font-medium">
                          <Hotel size={13} className="text-primary" />
                          {pkg.hotels[0].nom || 'Hôtel inclus'}
                        </span>
                        <div className="flex items-center text-amber-400">
                          {Array.from({ length: pkg.hotels[0].etoiles || 4 }).map((_, i) => (
                            <Star key={i} size={11} className="fill-amber-400" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Price & Actions */}
                <div className="p-5 pt-3 border-t bg-muted/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">À partir de</span>
                    <div className="text-lg font-black text-primary">
                      {startPrice ? `${startPrice.toLocaleString()} DZD` : 'Sur devis'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setPreviewPackage(pkg)}
                      className="h-8 w-8 text-slate-600 hover:bg-slate-100"
                      title="Aperçu / Fiche détaillée"
                    >
                      <Eye size={15} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDuplicate(pkg)}
                      className="h-8 w-8 text-amber-600 hover:bg-amber-50"
                      title="Dupliquer ce package"
                    >
                      <Copy size={14} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleOpenEdit(pkg)}
                      className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                      title="Modifier"
                    >
                      <Edit2 size={14} />
                    </Button>
                    {isAdmin && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(pkg.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal de Création & Édition de Package ───────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden" onClose={() => setIsModalOpen(false)}>
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-4 border-b flex items-center justify-between">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
                <Package size={20} className="text-primary" />
                {editingPackageId ? "Modifier le Package" : "Créer un Nouveau Package de Voyage"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Renseignez les détails du séjour, la logistique de vol, les hôtels et la grille tarifaire par chambre.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Form Tabs Navigation */}
          <div className="flex border-b bg-muted/20 px-6 gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveFormTab('general')}
              className={cn(
                "py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5",
                activeFormTab === 'general' ? "border-primary text-primary bg-background" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers size={14} /> 1. Généralités
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab('vols')}
              className={cn(
                "py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5",
                activeFormTab === 'vols' ? "border-primary text-primary bg-background" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Plane size={14} /> 2. Vols & Départs ({formData.departs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab('hotels')}
              className={cn(
                "py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5",
                activeFormTab === 'hotels' ? "border-primary text-primary bg-background" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Hotel size={14} /> 3. Hôtels & Tarifs ({formData.hotels.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab('programme')}
              className={cn(
                "py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5",
                activeFormTab === 'programme' ? "border-primary text-primary bg-background" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles size={14} /> 4. Programme & Inclusions
            </button>
          </div>

          <form onSubmit={handleSavePackage} className="p-6 space-y-6 max-h-[72vh] overflow-y-auto custom-scrollbar">
            
            {/* ── TAB 1 : GÉNÉRALITÉS ───────────────────────────────────────── */}
            {activeFormTab === 'general' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold">Nom du Package (Français) <span className="text-red-500">*</span></Label>
                    <Input
                      required
                      placeholder="Ex: Découverte Istanbul & Cappadoce 5★"
                      value={formData.nom}
                      onChange={e => setFormData({ ...formData, nom: e.target.value })}
                      className="h-10 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold">Nom en Arabe (Affichage vitrine)</Label>
                    <Input
                      placeholder="Ex: برنامج إسطنبول وكابادوكيا 5 نجوم"
                      dir="rtl"
                      value={formData.nom_ar}
                      onChange={e => setFormData({ ...formData, nom_ar: e.target.value })}
                      className="h-10 text-xs font-arabic mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-bold">Destination <span className="text-red-500">*</span></Label>
                    <Select
                      required
                      value={formData.destination_id}
                      onChange={e => setFormData({ ...formData, destination_id: e.target.value })}
                      className="h-10 text-xs mt-1 bg-background"
                    >
                      <option value="">Sélectionner une destination...</option>
                      {destinations.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.emoji} {d.nom}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-bold">Type de Séjour</Label>
                    <Select
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                      className="h-10 text-xs mt-1 bg-background"
                    >
                      <option value="organise">Voyage Organisé</option>
                      <option value="a_la_carte">Voyage à la carte</option>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-bold">Durée du Séjour</Label>
                    <Input
                      placeholder="Ex: 7 jours / 6 nuits"
                      value={formData.duree}
                      onChange={e => setFormData({ ...formData, duree: e.target.value })}
                      className="h-10 text-xs mt-1"
                    />
                  </div>
                </div>

                {/* Validity Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/20 border">
                  <div>
                    <Label className="text-xs font-bold">Date Début Validité Offre</Label>
                    <Input
                      type="date"
                      value={formData.date_debut_validite}
                      onChange={e => setFormData({ ...formData, date_debut_validite: e.target.value })}
                      className="h-9 text-xs mt-1 bg-background"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Date Fin Validité Offre</Label>
                    <Input
                      type="date"
                      value={formData.date_fin_validite}
                      onChange={e => setFormData({ ...formData, date_fin_validite: e.target.value })}
                      className="h-9 text-xs mt-1 bg-background"
                    />
                  </div>
                </div>

                {/* Photo de Couverture */}
                <div className="p-4 rounded-xl bg-muted/20 border space-y-3">
                  <Label className="text-xs font-bold block">Photo Principale de Couverture</Label>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {formData.image_url ? (
                      <div className="relative w-32 h-20 rounded-xl overflow-hidden border shrink-0 group">
                        <img src={formData.image_url} alt="Aperçu" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: '' })}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-20 rounded-xl bg-muted border border-dashed flex flex-col items-center justify-center text-muted-foreground text-[10px] shrink-0">
                        <Upload size={18} className="mb-1 opacity-50" />
                        <span>Aucune image</span>
                      </div>
                    )}
                    <div className="flex-1 w-full space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        disabled={uploadingCover}
                        className="h-9 text-xs"
                      />
                      <Input
                        placeholder="Ou collez directement une URL d'image..."
                        value={formData.image_url}
                        onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>
                </div>

                {/* Statut & Vedette */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-muted/20 border">
                  <div className="flex items-center gap-3">
                    <Label className="text-xs font-bold">Statut de publication :</Label>
                    <Select
                      value={formData.statut}
                      onChange={e => setFormData({ ...formData, statut: e.target.value })}
                      className="h-8 text-xs w-32 bg-background font-bold"
                    >
                      <option value="actif">Actif</option>
                      <option value="brouillon">Brouillon</option>
                      <option value="archive">Archivé</option>
                    </Select>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer bg-background px-3 py-1.5 rounded-lg border text-xs font-bold select-none">
                    <input
                      type="checkbox"
                      checked={formData.en_vedette}
                      onChange={e => setFormData({ ...formData, en_vedette: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-500"
                    />
                    <Sparkles size={14} className="text-amber-500" />
                    <span>Mettre en avant sur la page d'accueil (Vedette)</span>
                  </label>
                </div>
              </div>
            )}

            {/* ── TAB 2 : VOLS, DÉPARTS & PRESTATIONS ───────────────────────── */}
            {activeFormTab === 'vols' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                
                {/* Vol & Compagnie */}
                <div className="p-4 rounded-xl bg-muted/20 border space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-sm">
                      <input
                        type="checkbox"
                        checked={formData.billet_avion_inclus}
                        onChange={e => setFormData({ ...formData, billet_avion_inclus: e.target.checked })}
                        className="w-4 h-4 rounded text-primary"
                      />
                      <Plane size={16} className="text-primary" />
                      <span>Billet d'avion inclus</span>
                    </label>
                  </div>

                  {formData.billet_avion_inclus && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                      <div>
                        <Label className="text-xs font-bold">Compagnie Aérienne</Label>
                        <Input
                          placeholder="Ex: Turkish Airlines, Air Algérie, Saudia..."
                          value={formData.compagnie_id}
                          onChange={e => setFormData({ ...formData, compagnie_id: e.target.value })}
                          className="h-9 text-xs mt-1 bg-background"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Départs Disponibles (Multi-créneaux) */}
                <div className="p-4 rounded-xl bg-muted/20 border space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Calendar size={16} className="text-primary" />
                        Créneaux de Départs Disponibles ({formData.departs.length})
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Ajoutez les différentes sessions de départ pour ce package.
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddDepart} className="h-8 text-xs font-bold">
                      <Plus size={13} className="mr-1" /> Ajouter un départ
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {formData.departs.map((dep, idx) => (
                      <div key={dep.id || idx} className="p-3 bg-background border rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <Input
                          placeholder={`Libellé (ex: Départ ${idx + 1})`}
                          value={dep.label}
                          onChange={e => handleDepartChange(idx, 'label', e.target.value)}
                          className="h-8 text-xs sm:w-36 font-bold"
                        />

                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex-1">
                            <span className="text-[10px] text-muted-foreground block font-bold">Date Départ</span>
                            <Input
                              type="date"
                              value={dep.date_depart}
                              onChange={e => handleDepartChange(idx, 'date_depart', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>

                          <span className="text-muted-foreground pt-4">→</span>

                          <div className="flex-1">
                            <span className="text-[10px] text-muted-foreground block font-bold">Date Retour</span>
                            <Input
                              type="date"
                              value={dep.date_retour}
                              onChange={e => handleDepartChange(idx, 'date_retour', e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>

                        <Input
                          placeholder="Note (ex: Vol direct)"
                          value={dep.note}
                          onChange={e => handleDepartChange(idx, 'note', e.target.value)}
                          className="h-8 text-xs sm:w-36"
                        />

                        {formData.departs.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleRemoveDepart(idx)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 self-end sm:self-center"
                          >
                            <Trash2 size={13} />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transfert & Visa Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Transfert */}
                  <div className="p-4 rounded-xl bg-muted/20 border flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.transfert_inclus}
                        onChange={e => setFormData({ ...formData, transfert_inclus: e.target.checked })}
                        className="w-4 h-4 rounded text-primary"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                          <Bus size={14} className="text-emerald-600" />
                          Transfert Aéroport ↔ Hôtel Inclus
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          Transport en van VIP ou bus climatisé
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Visa */}
                  <div className="p-4 rounded-xl bg-muted/20 border space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Stamp size={14} className="text-primary" />
                      Statut des Visas
                    </Label>
                    <Select
                      value={formData.visa_status}
                      onChange={e => setFormData({ ...formData, visa_status: e.target.value })}
                      className="h-9 text-xs bg-background font-medium"
                    >
                      {VISA_STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

              </div>
            )}

            {/* ── TAB 3 : HÔTELS & TARIFS PAR CHAMBRE ───────────────────────── */}
            {activeFormTab === 'hotels' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <Hotel size={16} className="text-primary" />
                      Hébergements & Tarifs par Chambre ({formData.hotels.length})
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Configurez un ou plusieurs hôtels avec la formule de repas et les tarifs par type de chambre.
                    </p>
                  </div>

                  <Button type="button" variant="outline" size="sm" onClick={handleAddHotel} className="h-8 text-xs font-bold">
                    <Plus size={13} className="mr-1" /> Ajouter un Hôtel
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.hotels.map((hotel, idx) => (
                    <div key={hotel.id || idx} className="p-4 bg-muted/20 border rounded-2xl space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b">
                        <span className="font-bold text-xs flex items-center gap-2 text-foreground">
                          <Building2 size={14} className="text-primary" />
                          Hôtel #{idx + 1}
                        </span>

                        {formData.hotels.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleRemoveHotel(idx)}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 size={13} />
                          </Button>
                        )}
                      </div>

                      {/* Hotel Basic Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <Label className="text-[11px] font-bold">Nom de l'Hôtel</Label>
                          <Input
                            placeholder="Ex: Crowne Plaza Istanbul Old City"
                            value={hotel.nom}
                            onChange={e => handleHotelChange(idx, 'nom', e.target.value)}
                            className="h-8 text-xs mt-1 bg-background"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px] font-bold">Localisation / Ville</Label>
                          <Input
                            placeholder="Ex: Istanbul (Sultanahmet)"
                            value={hotel.location}
                            onChange={e => handleHotelChange(idx, 'location', e.target.value)}
                            className="h-8 text-xs mt-1 bg-background"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-[11px] font-bold">Étoiles</Label>
                          <Select
                            value={String(hotel.etoiles || 4)}
                            onChange={e => handleHotelChange(idx, 'etoiles', Number(e.target.value))}
                            className="h-8 text-xs mt-1 bg-background"
                          >
                            <option value="1">1 Étoile (★)</option>
                            <option value="2">2 Étoiles (★★)</option>
                            <option value="3">3 Étoiles (★★★)</option>
                            <option value="4">4 Étoiles (★★★★)</option>
                            <option value="5">5 Étoiles (★★★★★)</option>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-[11px] font-bold">Formule de Repas</Label>
                          <Select
                            value={hotel.formule || 'petit_dej'}
                            onChange={e => handleHotelChange(idx, 'formule', e.target.value)}
                            className="h-8 text-xs mt-1 bg-background font-medium"
                          >
                            {FORMULES_REPAS.map(f => (
                              <option key={f.value} value={f.value}>
                                {f.label}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>

                      {/* Tarification par chambre */}
                      <div className="bg-background p-3.5 rounded-xl border space-y-2">
                        <Label className="text-[11px] font-bold flex items-center gap-1.5 text-primary">
                          <Tag size={12} /> Grille Tarifaire par Type de Chambre (en DZD)
                        </Label>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground block">Quadruple (4 pers)</span>
                            <Input
                              type="number"
                              placeholder="Montant DZD"
                              value={hotel.tarifs?.quadruple || ''}
                              onChange={e => handleHotelTarifChange(idx, 'quadruple', e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground block">Triple (3 pers)</span>
                            <Input
                              type="number"
                              placeholder="Montant DZD"
                              value={hotel.tarifs?.triple || ''}
                              onChange={e => handleHotelTarifChange(idx, 'triple', e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground block">Double (2 pers)</span>
                            <Input
                              type="number"
                              placeholder="Montant DZD"
                              value={hotel.tarifs?.double || ''}
                              onChange={e => handleHotelTarifChange(idx, 'double', e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground block">Single (1 pers)</span>
                            <Input
                              type="number"
                              placeholder="Montant DZD"
                              value={hotel.tarifs?.single || ''}
                              onChange={e => handleHotelTarifChange(idx, 'single', e.target.value)}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB 4 : PROGRAMME & INCLUSIONS ───────────────────────────── */}
            {activeFormTab === 'programme' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                
                {/* Description FR / AR */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold">Description & Programme (Français)</Label>
                    <Textarea
                      rows={4}
                      placeholder="Présentation générale du séjour, visites guidées, excursions incluses..."
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold">الوصف والبرنامج (بالعربية)</Label>
                    <Textarea
                      rows={4}
                      dir="rtl"
                      placeholder="وصف البرنامج السياحي، الرحلات والجولات المنظمة..."
                      value={formData.description_ar}
                      onChange={e => setFormData({ ...formData, description_ar: e.target.value })}
                      className="text-xs font-arabic mt-1"
                    />
                  </div>
                </div>

                {/* Inclusions & Exclusions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Inclusions */}
                  <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
                    <Label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      Inclusions (Ce qui est compris)
                    </Label>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Ajouter une inclusion..."
                        value={newInclusionText}
                        onChange={e => setNewInclusionText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddInclusion(); } }}
                        className="h-8 text-xs bg-white"
                      />
                      <Button type="button" size="sm" onClick={handleAddInclusion} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Plus size={13} />
                      </Button>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {(formData.inclusions || []).map((inc, i) => (
                        <div key={i} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border text-xs">
                          <span className="flex items-center gap-1.5 text-emerald-950">
                            <Check size={12} className="text-emerald-600" /> {inc}
                          </span>
                          <button type="button" onClick={() => handleRemoveInclusion(i)} className="text-muted-foreground hover:text-destructive">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Exclusions */}
                  <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200/80 space-y-3">
                    <Label className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <XCircle size={14} className="text-rose-600" />
                      Exclusions (Non compris)
                    </Label>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Ajouter une exclusion..."
                        value={newExclusionText}
                        onChange={e => setNewExclusionText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddExclusion(); } }}
                        className="h-8 text-xs bg-white"
                      />
                      <Button type="button" size="sm" onClick={handleAddExclusion} className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white">
                        <Plus size={13} />
                      </Button>
                    </div>

                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {(formData.exclusions || []).map((exc, i) => (
                        <div key={i} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border text-xs">
                          <span className="flex items-center gap-1.5 text-rose-950">
                            <X size={12} className="text-rose-600" /> {exc}
                          </span>
                          <button type="button" onClick={() => handleRemoveExclusion(i)} className="text-muted-foreground hover:text-destructive">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Submodal Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                {activeFormTab !== 'general' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (activeFormTab === 'vols') setActiveFormTab('general');
                      else if (activeFormTab === 'hotels') setActiveFormTab('vols');
                      else if (activeFormTab === 'programme') setActiveFormTab('hotels');
                    }}
                    className="h-9 text-xs"
                  >
                    Précédent
                  </Button>
                )}
                {activeFormTab !== 'programme' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (activeFormTab === 'general') setActiveFormTab('vols');
                      else if (activeFormTab === 'vols') setActiveFormTab('hotels');
                      else if (activeFormTab === 'hotels') setActiveFormTab('programme');
                    }}
                    className="h-9 text-xs font-bold"
                  >
                    Suivant <ArrowRight size={13} className="ml-1" />
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="h-9 text-xs"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="h-9 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-white shadow-sm"
                >
                  <Check size={14} />
                  {editingPackageId ? "Mettre à jour le Package" : "Créer le Package"}
                </Button>
              </div>
            </div>

          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal d'Aperçu & Impression Fiche Package ────────────────────── */}
      {previewPackage && (
        <Dialog open={Boolean(previewPackage)} onOpenChange={() => setPreviewPackage(null)}>
          <DialogContent className="max-w-2xl p-6" onClose={() => setPreviewPackage(null)}>
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center gap-3">
                <CountryFlag emoji={getDestinationObj(previewPackage.destination_id)?.emoji} destinationName={getDestinationObj(previewPackage.destination_id)?.nom} className="w-8 h-6 rounded-xs shadow-xs" fallbackEmoji="✈️" />
                <div>
                  <DialogTitle className="text-lg font-black">{previewPackage.nom}</DialogTitle>
                  <DialogDescription className="text-xs">
                    {previewPackage.duree} • {previewPackage.type === 'organise' ? 'Voyage Organisé' : 'À la carte'}
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="h-8 text-xs font-bold gap-1.5"
              >
                <Printer size={13} /> Imprimer Fiche
              </Button>
            </div>

            <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {previewPackage.image_url && (
                <div className="w-full h-44 rounded-xl overflow-hidden border">
                  <img src={previewPackage.image_url} alt={previewPackage.nom} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Inclusions summary */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/20 p-3.5 rounded-xl border">
                <div>
                  <span className="font-bold block text-muted-foreground">Vol :</span>
                  <span>{previewPackage.billet_avion_inclus ? `Inclus (${previewPackage.compagnie_id || 'Compagnie régulière'})` : 'Non inclus'}</span>
                </div>
                <div>
                  <span className="font-bold block text-muted-foreground">Transfert :</span>
                  <span>{previewPackage.transfert_inclus ? 'Inclus (Aéroport ↔ Hôtel)' : 'Non inclus'}</span>
                </div>
                <div>
                  <span className="font-bold block text-muted-foreground">Visa :</span>
                  <span>{VISA_STATUS_OPTIONS.find(v => v.value === previewPackage.visa_status)?.label || 'Non spécifié'}</span>
                </div>
                <div>
                  <span className="font-bold block text-muted-foreground">Validité :</span>
                  <span>{previewPackage.date_debut_validite ? `${previewPackage.date_debut_validite} au ${previewPackage.date_fin_validite}` : 'Toute l\'année'}</span>
                </div>
              </div>

              {/* Hotels & Prices */}
              {Array.isArray(previewPackage.hotels) && previewPackage.hotels.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">Hôtels & Grille Tarifaire</h4>
                  {previewPackage.hotels.map((h, i) => (
                    <div key={i} className="p-3 bg-muted/10 border rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span>{h.nom} ({h.location || ''})</span>
                        <span className="text-amber-500">{'★'.repeat(h.etoiles || 4)}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Formule : {FORMULES_REPAS.find(f => f.value === h.formule)?.label || h.formule}
                      </div>
                      {h.tarifs && (
                        <div className="grid grid-cols-4 gap-2 pt-2 border-t text-center">
                          <div className="bg-background p-1.5 rounded border">
                            <span className="text-[9px] text-muted-foreground block font-bold">Quadruple</span>
                            <span className="font-mono font-bold text-primary">{h.tarifs.quadruple ? `${Number(h.tarifs.quadruple).toLocaleString()} DZD` : '—'}</span>
                          </div>
                          <div className="bg-background p-1.5 rounded border">
                            <span className="text-[9px] text-muted-foreground block font-bold">Triple</span>
                            <span className="font-mono font-bold text-primary">{h.tarifs.triple ? `${Number(h.tarifs.triple).toLocaleString()} DZD` : '—'}</span>
                          </div>
                          <div className="bg-background p-1.5 rounded border">
                            <span className="text-[9px] text-muted-foreground block font-bold">Double</span>
                            <span className="font-mono font-bold text-primary">{h.tarifs.double ? `${Number(h.tarifs.double).toLocaleString()} DZD` : '—'}</span>
                          </div>
                          <div className="bg-background p-1.5 rounded border">
                            <span className="text-[9px] text-muted-foreground block font-bold">Single</span>
                            <span className="font-mono font-bold text-primary">{h.tarifs.single ? `${Number(h.tarifs.single).toLocaleString()} DZD` : '—'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Description */}
              {previewPackage.description && (
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">Programme & Description</h4>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line bg-muted/10 p-3 rounded-xl border">
                    {previewPackage.description}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
};

export default Packages;
