import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Loader2, Upload, Contact, Mail, Phone, MapPin, Building2, Briefcase, Search, Filter, User, Pencil } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const BanqueContacts = () => {
  const { isAdmin } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [contactTypes, setContactTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const ITEMS_PER_PAGE = 20;
  
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    nom: '', email: '', telephone: '', type: '', location: 'Algerie', compagnie: '', poste: '', ville: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [cRes, tRes] = await Promise.all([
      supabase.from('banque_contacts').select('*').order('created_at', { ascending: false }),
      supabase.from('contact_types').select('*').order('nom')
    ]);
    if (cRes.data) setContacts(cRes.data);
    if (tRes.data) setContactTypes(tRes.data);
    setLoading(false);
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!formData.nom) return;
    
    if (editingId) {
      const { data, error } = await supabase.from('banque_contacts').update(formData).eq('id', editingId).select();
      if (!error && data) {
        setContacts(contacts.map(c => c.id === editingId ? data[0] : c));
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ nom: '', email: '', telephone: '', type: '', location: 'Algerie', compagnie: '', poste: '', ville: '' });
      } else {
        alert("Erreur lors de la modification du contact");
      }
    } else {
      const { data, error } = await supabase.from('banque_contacts').insert([formData]).select();
      if (!error && data) {
        setContacts([data[0], ...contacts]);
        setIsModalOpen(false);
        setFormData({ nom: '', email: '', telephone: '', type: '', location: 'Algerie', compagnie: '', poste: '', ville: '' });
      } else {
        alert("Erreur lors de l'ajout du contact");
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce contact ?")) {
      await supabase.from('banque_contacts').delete().eq('id', id);
      setContacts(contacts.filter(c => c.id !== id));
    }
  };

  const handleCSVImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const rows = text.split(/\r?\n/).filter(r => r.trim());
      if (rows.length < 2) {
        alert("Le fichier CSV est vide ou invalide.");
        return;
      }
      
      const delimiter = rows[0].includes(';') ? ';' : (rows[0].includes('\t') ? '\t' : ',');
      const headers = rows[0].split(delimiter).map(h => h.trim().toLowerCase());
      const dataToInsert = [];
      
      for (let i = 1; i < rows.length; i++) {
        const values = rows[i].split(delimiter).map(v => v.trim());
        const contact = {};
        headers.forEach((h, index) => {
          contact[h] = values[index] || '';
        });
        
        let nom = contact.nom || contact.name || '';
        let email = contact.email || contact.mail || contact.courriel || null;
        let telephone = contact.telephone || contact.tel || contact.phone || null;
        let type = contact.type || contact.service || null;
        let location = contact.location || contact.pays || null;
        let ville = contact.ville || contact.lieu || contact.city || null;
        let compagnie = contact.compagnie || contact.company || contact.entreprise || null;
        let poste = contact.poste || contact.position || contact.role || null;

        if (ville && ['makkah', 'madinah', 'jeddah', 'riyadh'].includes(ville.toLowerCase())) {
          location = 'Saudia';
        }
        
        if (nom) {
          dataToInsert.push({
            nom, email, telephone, type, location, ville, compagnie, poste
          });
        }
      }
      
      if (dataToInsert.length > 0) {
        const { error } = await supabase.from('banque_contacts').insert(dataToInsert);
        if (!error) {
          fetchData();
          alert(`${dataToInsert.length} contacts importés avec succès !`);
        } else {
          alert('Erreur lors de l\'importation. Vérifiez le format du CSV.');
          console.error(error);
        }
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  let filteredContacts = contacts.filter(c => 
    (c.nom?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (c.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (c.telephone?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (c.compagnie?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (filterType !== 'all') {
    filteredContacts = filteredContacts.filter(c => 
      (c.type || '').toLowerCase().trim() === filterType.toLowerCase().trim()
    );
  }

  if (filterLocation !== 'all') {
    filteredContacts = filteredContacts.filter(c => {
      const loc = (c.location || '').trim();
      if (filterLocation === 'Autre') {
        return loc.toLowerCase() !== 'algerie' && loc.toLowerCase() !== 'saudia';
      }
      return loc.toLowerCase() === filterLocation.toLowerCase();
    });
  }

  const totalPages = Math.ceil(filteredContacts.length / ITEMS_PER_PAGE);
  const paginatedContacts = filteredContacts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary flex items-center gap-3">
            <Contact size={32} /> Contacts B2B
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Gérez vos contacts professionnels et importez des listes (CSV).</p>
        </div>
        <div className="flex gap-3">
          <Input 
            type="file" accept=".csv" ref={fileInputRef} 
            onChange={handleCSVImport} className="hidden" 
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="bg-white gap-2">
            <Upload size={16} /> Importer CSV
          </Button>
          <Button onClick={() => {
            setEditingId(null);
            setFormData({ nom: '', email: '', telephone: '', type: '', location: 'Algerie', compagnie: '', poste: '', ville: '' });
            setIsModalOpen(true);
          }} className="gap-2 shadow-md">
            <Plus size={16} /> Ajouter un Contact
          </Button>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl shadow-sm border mb-8 flex flex-col md:flex-row gap-5 items-end transition-all hover:shadow-md">
        <div className="flex-1 w-full">
          <Label className="text-xs mb-2 text-slate-500 font-medium flex items-center gap-1.5 uppercase tracking-wider">
            <Search size={14} className="text-primary" /> Rechercher
          </Label>
          <Input 
            placeholder="Nom, email, téléphone ou compagnie..." 
            value={searchTerm} 
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
            className="bg-slate-50 border-slate-200 focus-visible:ring-primary/30 h-11"
          />
        </div>
        <div className="w-full md:w-64">
          <Label className="text-xs mb-2 text-slate-500 font-medium flex items-center gap-1.5 uppercase tracking-wider">
            <Filter size={14} className="text-primary" /> Type de Contact
          </Label>
          <Select value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}>
            <option value="all">Tous les types</option>
            {contactTypes.map(t => (
              <option key={t.id} value={t.nom}>{t.nom}</option>
            ))}
          </Select>
        </div>
        <div className="w-full md:w-48">
          <Label className="text-xs mb-2 text-slate-500 font-medium flex items-center gap-1.5 uppercase tracking-wider">
            <MapPin size={14} className="text-primary" /> Location
          </Label>
          <Select value={filterLocation} onChange={e => { setFilterLocation(e.target.value); setCurrentPage(1); }}>
            <option value="all">Toutes les locations</option>
            <option value="Algerie">Algérie</option>
            <option value="Saudia">Saudia</option>
            <option value="Autre">Autre</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 rounded-tl-xl">Contact</th>
                  <th className="px-6 py-4">Entreprise</th>
                  <th className="px-6 py-4">Coordonnées</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Localisation</th>
                  <th className="px-6 py-4 text-right rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedContacts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-16">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Contact size={48} className="mb-4 text-slate-200" />
                        <p className="text-lg font-medium text-slate-500">Aucun contact trouvé</p>
                        <p className="text-sm mt-1">Essayez de modifier vos filtres ou ajoutez un nouveau contact.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedContacts.map(c => {
                    const initials = c.nom ? c.nom.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm shadow-inner shrink-0 border border-violet-200/50">
                              {initials}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 group-hover:text-primary transition-colors">{c.nom}</div>
                              {c.poste && (
                                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                                  <Briefcase size={12} className="text-slate-400" /> {c.poste}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {c.compagnie ? (
                            <div className="flex items-center gap-2 font-medium text-slate-700">
                              <Building2 size={14} className="text-slate-400 shrink-0" /> {c.compagnie}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            {c.email ? (
                              <div className="flex items-center gap-2 text-slate-600 text-sm">
                                <Mail size={13} className="text-slate-400" /> {c.email}
                              </div>
                            ) : null}
                            {c.telephone ? (
                              <div className="flex items-center gap-2 text-slate-600 font-medium text-xs">
                                <Phone size={13} className="text-emerald-500" /> {c.telephone}
                              </div>
                            ) : null}
                            {!c.email && !c.telephone && <span className="text-slate-300">—</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {c.type ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-100 shadow-sm">
                              {c.type}
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            {c.location === 'Algerie' && <span className="inline-flex items-center gap-1.5 text-green-700 font-semibold text-xs"><span className="text-base leading-none">🇩🇿</span> Algérie</span>}
                            {c.location === 'Saudia' && <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold text-xs"><span className="text-base leading-none">🇸🇦</span> Saudia</span>}
                            {!['Algerie', 'Saudia'].includes(c.location) && (c.location ? <span className="text-slate-600 font-medium text-xs">{c.location}</span> : <span className="text-slate-300">—</span>)}
                            
                            {c.ville && (
                              <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 w-fit px-2 py-0.5 rounded-md border border-slate-200">
                                <MapPin size={10} /> {c.ville}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <Button 
                              variant="ghost" size="icon" 
                              onClick={() => {
                                setEditingId(c.id);
                                setFormData({
                                  nom: c.nom || '', email: c.email || '', telephone: c.telephone || '', 
                                  type: c.type || '', location: c.location || 'Algerie', compagnie: c.compagnie || '', 
                                  poste: c.poste || '', ville: c.ville || ''
                                });
                                setIsModalOpen(true);
                              }} 
                              className="text-slate-400 hover:text-primary hover:bg-primary/10"
                            >
                              <Pencil size={16} />
                            </Button>
                            {isAdmin && (
                              <Button 
                                variant="ghost" size="icon" 
                                onClick={() => handleDelete(c.id)} 
                                className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                title="Supprimer le contact"
                              >
                                <Trash2 size={16} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t bg-slate-50/50">
              <span className="text-sm text-slate-500">
                Affichage de {(currentPage - 1) * ITEMS_PER_PAGE + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, filteredContacts.length)} sur {filteredContacts.length} contacts
              </span>
              <div className="flex gap-1">
                <Button 
                  variant="outline" size="sm" 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>
                <div className="flex items-center justify-center px-3 text-sm font-medium">
                  {currentPage} / {totalPages}
                </div>
                <Button 
                  variant="outline" size="sm" 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-indigo-800 p-6 text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3 relative z-10">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                {editingId ? <Pencil size={24} /> : <User size={24} />}
              </div>
              {editingId ? 'Modifier le Contact' : 'Nouveau Contact'}
            </DialogTitle>
            <p className="text-violet-100 mt-2 text-sm max-w-sm relative z-10 opacity-90">
              {editingId ? 'Mettez à jour les informations du contact sélectionné.' : 'Complétez les informations ci-dessous pour ajouter un contact à votre base de données.'}
            </p>
          </div>
          
          <form onSubmit={handleSaveContact} className="p-6">
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar pb-2">
              
              {/* Section: Informations Personnelles */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b pb-2">
                  <User size={16} /> Informations Personnelles
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold">Nom Complet <span className="text-red-500">*</span></Label>
                    <Input required value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} placeholder="Ex: Ahmed Yacine" className="h-11 border-slate-200 focus-visible:ring-violet-500/30" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold">Poste / Fonction</Label>
                    <Input value={formData.poste} onChange={e => setFormData({...formData, poste: e.target.value})} placeholder="Ex: General Manager" className="h-11 border-slate-200 focus-visible:ring-violet-500/30" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-600 font-semibold">Compagnie / Entreprise</Label>
                  <Input value={formData.compagnie} onChange={e => setFormData({...formData, compagnie: e.target.value})} placeholder="Ex: Sahl Group" className="h-11 border-slate-200 focus-visible:ring-violet-500/30" />
                </div>
              </div>

              {/* Section: Coordonnées */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b pb-2">
                  <Phone size={16} /> Coordonnées
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold">Email</Label>
                    <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@exemple.com" className="h-11 border-slate-200 focus-visible:ring-violet-500/30" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold">Téléphone</Label>
                    <Input value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} placeholder="+966..." className="h-11 border-slate-200 focus-visible:ring-violet-500/30" />
                  </div>
                </div>
              </div>

              {/* Section: Détails & Localisation */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b pb-2">
                  <MapPin size={16} /> Détails & Localisation
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold">Type de Contact</Label>
                    <Select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                      <option value="">Sélectionner...</option>
                      {contactTypes.map(t => <option key={t.id} value={t.nom}>{t.nom}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold">Pays</Label>
                    <Select value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>
                      <option value="Algerie">Algérie</option>
                      <option value="Saudia">Saudia</option>
                      <option value="Autre">Autre</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-600 font-semibold">Ville</Label>
                    <Input value={formData.ville} onChange={e => setFormData({...formData, ville: e.target.value})} placeholder="Ex: Makkah" className="h-11 border-slate-200 focus-visible:ring-violet-500/30" />
                  </div>
                </div>
              </div>

            </div>
            
            <div className="pt-6 mt-4 flex justify-end gap-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="px-6 h-11 border-slate-200">Annuler</Button>
              <Button type="submit" className="px-6 h-11 bg-violet-600 hover:bg-violet-700 shadow-md">
                <Plus size={16} className="mr-2" /> Enregistrer le Contact
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default BanqueContacts;
