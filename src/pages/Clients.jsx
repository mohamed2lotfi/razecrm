import React, { useState, useEffect } from 'react';
import { Plus, Users, Trash2, Loader2, Pencil, Search, ChevronLeft, ChevronRight, MessageSquare, FolderOpen, Sparkles } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import ClientForm from '@/components/ClientForm';
import ClientRemarquesModal from '@/components/ClientRemarquesModal';
import ClientDossierModal from '@/components/ClientDossierModal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const Clients = () => {
  const { isAdmin } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [selectedClientForRemarques, setSelectedClientForRemarques] = useState(null);
  const [selectedClientForDossier, setSelectedClientForDossier] = useState(null);

  // Pagination & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 20;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on new search
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchClients();
  }, [currentPage, debouncedSearch]);

  const fetchClients = async () => {
    setLoading(true);
    let query = supabase.from('clients').select('*, ventes(id), pipeline(id)', { count: 'exact' });
    
    if (debouncedSearch) {
      query = query.or(`nom.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,telephone.ilike.%${debouncedSearch}%`);
    }

    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && data) {
      setClients(data);
      if (count !== null) setTotalCount(count);
    }
    setLoading(false);
  };

  const handleSave = async (newClientData) => {
    const payload = {
      nom: newClientData.nom,
      email: newClientData.email || null,
      telephone: newClientData.telephone || null,
      type: newClientData.type || 'Particulier',
    };

    if (newClientData.id) {
      const { data, error } = await supabase
        .from('clients')
        .update(payload)
        .eq('id', newClientData.id)
        .select('*, ventes(id), pipeline(id)');

      if (error) {
        console.error('Error updating client:', error);
        alert('Erreur lors de la mise à jour du client : ' + error.message);
        return;
      }

      if (data && data.length > 0) {
        setClients(prev => prev.map(c => c.id === newClientData.id ? data[0] : c));
        setIsFormOpen(false);
        setEditingClient(null);
      }
    } else {
      const { data, error } = await supabase
        .from('clients')
        .insert([payload])
        .select('*, ventes(id), pipeline(id)');

      if (error) {
        console.error('Error creating client:', error);
        alert('Erreur lors de la création du client : ' + error.message);
        return;
      }

      if (data) {
        fetchClients();
        setIsFormOpen(false);
        setEditingClient(null);
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer ce client ?')) {
      await supabase.from('clients').delete().eq('id', id);
      fetchClients(); // Rafraîchir pour compenser la suppression
    }
  };

  const getClientBadge = (c) => {
    const vCount = c.ventes?.length || 0;
    const pCount = c.pipeline?.length || 0;
    
    if (vCount >= 5) return { label: 'Client Premium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    if (vCount >= 1) return { label: 'Client', color: 'bg-green-100 text-green-700 border-green-200' };
    if (pCount >= 1) return { label: 'Prospect', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    return { label: 'Nouveau', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Clients</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un client..." 
              className="pl-9 bg-white" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => { setEditingClient(null); setIsFormOpen(true); }} className="shrink-0">
            <Plus size={16} className="mr-2 hidden sm:inline" /> Ajouter un client
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Téléphone</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center">
                    <Loader2 size={32} className="mx-auto animate-spin text-primary mb-3" />
                    <p className="font-medium text-muted-foreground">Chargement des clients...</p>
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center">
                    <Users size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="font-medium text-muted-foreground">Aucun client trouvé</p>
                    {debouncedSearch && <p className="text-xs text-muted-foreground mt-1">Essayez un autre mot-clé.</p>}
                  </td>
                </tr>
              ) : clients.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors group">
                  <td className="px-4 py-3">
                    <Badge variant={c.type === 'Entreprise' ? 'warning' : 'success'} className="text-[10px]">
                      {c.type || 'Particulier'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const badge = getClientBadge(c);
                      return (
                        <span className={`inline-block px-2 py-0.5 border rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.color}`}>
                          {badge.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <button 
                      type="button" 
                      onClick={() => setSelectedClientForDossier(c)}
                      className="font-semibold text-slate-800 hover:text-primary transition-colors text-left flex items-center gap-1.5 group-hover:underline"
                    >
                      {c.nom}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.telephone || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedClientForDossier(c)}
                        className="gap-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 hover:text-emerald-900 border-emerald-200/80 text-xs text-emerald-800 font-bold transition-all shadow-2xs hover:shadow-xs"
                        title="Consulter la Fiche Client 360° (Achats, Omra, Devis, Chronologie, Relevé et Notes)"
                      >
                        <Sparkles size={13} className="text-emerald-600 animate-pulse" /> Fiche 360°
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedClientForRemarques(c)}
                        className="gap-1.5 bg-slate-50 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 text-xs text-slate-700 transition-colors"
                        title="Consulter et ajouter des remarques d'équipe sur ce client"
                      >
                        <MessageSquare size={13} className="text-amber-600" /> Remarques
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setEditingClient(c); setIsFormOpen(true); }}>
                        <Pencil size={14} /> Modifier
                      </Button>
                      {isAdmin && (
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(c.id)}>
                          <Trash2 size={14} /> Supprimer
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

      {/* Pagination Controls */}
      {!loading && totalCount > ITEMS_PER_PAGE && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4 bg-white/50 p-3 rounded-xl border border-primary/10">
          <span className="text-sm text-slate-600 font-medium">
            Affichage de <span className="font-extrabold text-primary">{clients.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span> à <span className="font-extrabold text-primary">{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}</span> sur <span className="font-extrabold text-primary">{totalCount}</span> clients
          </span>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              <ChevronLeft size={16} className="mr-1" /> Précédent
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage * ITEMS_PER_PAGE >= totalCount}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Suivant <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {isFormOpen && <ClientForm onClose={() => { setIsFormOpen(false); setEditingClient(null); }} onSave={handleSave} initialData={editingClient} />}
      
      {selectedClientForRemarques && (
        <ClientRemarquesModal
          isOpen={true}
          onClose={() => setSelectedClientForRemarques(null)}
          client={selectedClientForRemarques}
          onRemarquesUpdated={(clientId, updatedRemarques) => {
            setClients(prev => prev.map(c => c.id === clientId ? { ...c, remarques: updatedRemarques } : c));
          }}
        />
      )}

      {selectedClientForDossier && (
        <ClientDossierModal
          isOpen={true}
          onClose={() => setSelectedClientForDossier(null)}
          client={selectedClientForDossier}
        />
      )}
    </Layout>
  );
};

export default Clients;
