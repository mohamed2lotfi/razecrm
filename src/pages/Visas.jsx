import React, { useState, useEffect } from 'react';
import { Loader2, Search, X, CheckCircle2, Circle, Clock, ChevronDown, Trash2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const STATUTS = ['Nouveau', 'En cours de traitement', 'Issu', 'Délivré'];

const statutColor = (s) => {
  if (s === 'Nouveau') return 'bg-blue-100 text-blue-800 border-blue-200';
  if (s === 'En cours de traitement') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (s === 'Issu') return 'bg-purple-100 text-purple-800 border-purple-200';
  if (s === 'Délivré') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  return 'bg-slate-100 text-slate-700';
};

const Visas = () => {
  const { isAdmin } = useAuth();
  const [demandes, setDemandes] = useState([]);
  const [countries, setCountries] = useState([]);
  const [visaTypesMap, setVisaTypesMap] = useState({});
  const [countriesMap, setCountriesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const [filterStatut, setFilterStatut] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail modal
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [dossierDocs, setDossierDocs] = useState([]);
  const [loadingDossier, setLoadingDossier] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [dRes, cRes, vtRes] = await Promise.all([
      supabase.from('visa_demandes').select('*').order('created_at', { ascending: false }),
      supabase.from('visa_countries').select('*').order('nom'),
      supabase.from('visa_types').select('*')
    ]);

    if (dRes.data) setDemandes(dRes.data);
    if (cRes.data) {
      setCountries(cRes.data);
      const cMap = {};
      cRes.data.forEach(c => { cMap[c.id] = c.nom; });
      setCountriesMap(cMap);
    }
    if (vtRes.data) {
      const vtMap = {};
      vtRes.data.forEach(vt => { vtMap[vt.id] = vt.nom; });
      setVisaTypesMap(vtMap);
    }
    setLoading(false);
  };

  const openDetail = async (demande) => {
    setSelectedDemande(demande);
    setLoadingDossier(true);
    const { data } = await supabase.from('visa_dossier_tracking').select('*').eq('demande_id', demande.id).order('created_at');
    if (data) setDossierDocs(data);
    setLoadingDossier(false);
  };

  const toggleDocRecu = async (doc) => {
    const newRecu = !doc.recu;
    const newDate = newRecu ? new Date().toISOString() : null;
    
    const { error } = await supabase.from('visa_dossier_tracking')
      .update({ recu: newRecu, date_reception: newDate })
      .eq('id', doc.id);

    if (!error) {
      setDossierDocs(prev => prev.map(d => d.id === doc.id ? { ...d, recu: newRecu, date_reception: newDate } : d));
    }
  };

  const changeStatut = async (demandeId, newStatut) => {
    const { error } = await supabase.from('visa_demandes').update({ statut: newStatut }).eq('id', demandeId);
    if (!error) {
      setDemandes(prev => prev.map(d => d.id === demandeId ? { ...d, statut: newStatut } : d));
      if (selectedDemande && selectedDemande.id === demandeId) {
        setSelectedDemande(prev => ({ ...prev, statut: newStatut }));
      }
    }
  };

  const handleDeleteDemande = async (demandeId, passagerNom, e) => {
    if (e) e.stopPropagation();

    const confirmMessage = passagerNom
      ? `Êtes-vous sûr de vouloir supprimer définitivement la demande de visa pour "${passagerNom}" ?`
      : `Êtes-vous sûr de vouloir supprimer définitivement cette demande de visa ?`;

    if (!window.confirm(confirmMessage)) return;

    setDeletingId(demandeId);
    try {
      // 1. Delete associated tracking documents first
      const { error: trackErr } = await supabase
        .from('visa_dossier_tracking')
        .delete()
        .eq('demande_id', demandeId);

      if (trackErr) {
        console.warn("Erreur suppression dossier tracking:", trackErr);
      }

      // 2. Delete visa demande
      const { error } = await supabase
        .from('visa_demandes')
        .delete()
        .eq('id', demandeId);

      if (error) {
        throw error;
      }

      setDemandes(prev => prev.filter(d => d.id !== demandeId));
      if (selectedDemande && selectedDemande.id === demandeId) {
        setSelectedDemande(null);
      }
    } catch (err) {
      console.error("Erreur lors de la suppression de la demande de visa:", err);
      alert("Erreur lors de la suppression : " + (err.message || "Une erreur est survenue"));
    } finally {
      setDeletingId(null);
    }
  };

  const fmtDate = (d) => {
    try { return format(parseISO(d), 'dd MMM yyyy', { locale: fr }); } catch { return d || '—'; }
  };
  const fmtDateTime = (d) => {
    try { return format(parseISO(d), 'dd MMM yyyy à HH:mm', { locale: fr }); } catch { return d || '—'; }
  };

  const filtered = demandes.filter(d => {
    if (filterStatut && d.statut !== filterStatut) return false;
    if (filterCountry && d.country_id !== filterCountry) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return d.passager_nom?.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total: demandes.length,
    nouveau: demandes.filter(d => d.statut === 'Nouveau').length,
    encours: demandes.filter(d => d.statut === 'En cours de traitement').length,
    delivre: demandes.filter(d => d.statut === 'Délivré').length,
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-3">
          🛂 Suivi des Visas
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Demandes</div>
          <div className="text-2xl font-extrabold mt-1">{stats.total}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-bold text-blue-600 uppercase">Nouveau</div>
          <div className="text-2xl font-extrabold text-blue-700 mt-1">{stats.nouveau}</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-bold text-amber-600 uppercase">En Cours</div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">{stats.encours}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-bold text-emerald-600 uppercase">Délivré</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{stats.delivre}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 h-10" placeholder="Rechercher un passager..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className="h-10 w-52 bg-white">
          <option value="">Tous les statuts</option>
          {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className="h-10 w-52 bg-white">
          <option value="">Tous les pays</option>
          {countries.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-48"><Loader2 className="animate-spin text-primary" size={32} /></div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 border-b">Passager</th>
                  <th className="px-4 py-3 border-b">Pays</th>
                  <th className="px-4 py-3 border-b">Type Visa</th>
                  <th className="px-4 py-3 border-b">Achat (DZD)</th>
                  <th className="px-4 py-3 border-b">Vente (DZD)</th>
                  <th className="px-4 py-3 border-b">Statut</th>
                  <th className="px-4 py-3 border-b">Date</th>
                  <th className="px-4 py-3 border-b text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan="8" className="text-center py-8 text-muted-foreground italic">Aucune demande de visa.</td></tr>
                )}
                {filtered.map(d => (
                  <tr key={d.id} className="border-b hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => openDetail(d)}>
                    <td className="px-4 py-3 font-bold">{d.passager_nom}</td>
                    <td className="px-4 py-3">{countriesMap[d.country_id] || '—'}</td>
                    <td className="px-4 py-3">{visaTypesMap[d.visa_type_id] || '—'}</td>
                    <td className="px-4 py-3 text-red-600 font-medium">{Number(d.tarif_base || 0).toLocaleString('fr-DZ')}</td>
                    <td className="px-4 py-3 text-emerald-600 font-bold">{Number(d.tarif_vente || 0).toLocaleString('fr-DZ')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${statutColor(d.statut)}`}>
                        {d.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(d.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); openDetail(d); }}>
                          Détails
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={deletingId === d.id}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                            title="Supprimer cette demande"
                            onClick={(e) => handleDeleteDemande(d.id, d.passager_nom, e)}
                          >
                            {deletingId === d.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDemande && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">🛂 {selectedDemande.passager_nom}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {countriesMap[selectedDemande.country_id]} — {visaTypesMap[selectedDemande.visa_type_id]}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setSelectedDemande(null)}>
                <X size={18}/>
              </Button>
            </div>

            <div className="p-5 space-y-5">
              {/* Statut */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Statut de la demande</label>
                <div className="flex flex-wrap gap-2">
                  {STATUTS.map(s => (
                    <button
                      key={s}
                      onClick={() => changeStatut(selectedDemande.id, s)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                        selectedDemande.statut === s
                          ? statutColor(s) + ' ring-2 ring-offset-1 ring-current'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tarifs */}
              <div className="flex gap-4">
                <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <div className="text-[10px] font-bold text-red-500 uppercase">Achat</div>
                  <div className="text-lg font-extrabold text-red-700">{Number(selectedDemande.tarif_base || 0).toLocaleString('fr-DZ')} DZD</div>
                </div>
                <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                  <div className="text-[10px] font-bold text-emerald-500 uppercase">Vente</div>
                  <div className="text-lg font-extrabold text-emerald-700">{Number(selectedDemande.tarif_vente || 0).toLocaleString('fr-DZ')} DZD</div>
                </div>
              </div>

              {/* Dossier Tracking */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">📋 Suivi du dossier</label>
                {loadingDossier ? (
                  <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary" size={20} /></div>
                ) : dossierDocs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-3 text-center bg-slate-50 rounded-lg border border-dashed">Aucun document requis pour ce visa.</p>
                ) : (
                  <div className="space-y-2">
                    {dossierDocs.map(doc => (
                      <div
                        key={doc.id}
                        onClick={() => toggleDocRecu(doc)}
                        className={`flex items-center justify-between px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                          doc.recu 
                            ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {doc.recu 
                            ? <CheckCircle2 size={20} className="text-emerald-600" /> 
                            : <Circle size={20} className="text-slate-300" />
                          }
                          <span className={`text-sm font-medium ${doc.recu ? 'text-emerald-800 line-through' : 'text-foreground'}`}>
                            {doc.document_nom}
                          </span>
                        </div>
                        {doc.recu && doc.date_reception && (
                          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                            <Clock size={12} /> {fmtDateTime(doc.date_reception)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
              {isAdmin ? (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deletingId === selectedDemande.id}
                  className="gap-1.5 text-xs font-semibold"
                  onClick={(e) => handleDeleteDemande(selectedDemande.id, selectedDemande.passager_nom, e)}
                >
                  {deletingId === selectedDemande.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Supprimer ce visa
                </Button>
              ) : <div />}
              <Button variant="outline" size="sm" onClick={() => setSelectedDemande(null)}>Fermer</Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Visas;
