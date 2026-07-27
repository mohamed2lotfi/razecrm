import React, { useState, useEffect } from 'react';
import { Plus, Users, Trash2, Loader2, Pencil } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ClientForm from '@/components/ClientForm';
import { supabase } from '@/lib/supabase';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('clients').select('*, ventes(id), pipeline(id)').order('created_at', { ascending: false });
    if (!error && data) {
      setClients(data);
    }
    setLoading(false);
  };

  const handleSave = async (newClientData) => {
    if (newClientData.id) {
      const { data, error } = await supabase.from('clients').update(newClientData).eq('id', newClientData.id).select();
      if (!error && data) {
        setClients(clients.map(c => c.id === newClientData.id ? data[0] : c));
        setIsFormOpen(false);
        setEditingClient(null);
      }
    } else {
      const { data, error } = await supabase.from('clients').insert([newClientData]).select();
      if (!error && data) {
        setClients([data[0], ...clients]);
        setIsFormOpen(false);
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer ce client ?')) {
      await supabase.from('clients').delete().eq('id', id);
      setClients(prev => prev.filter(c => c.id !== id));
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Clients</h1>
        <Button onClick={() => { setEditingClient(null); setIsFormOpen(true); }}><Plus size={16} /> Ajouter un client</Button>
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
                  <td colSpan="5" className="py-16 text-center">
                    <Loader2 size={32} className="mx-auto animate-spin text-primary mb-3" />
                    <p className="font-medium text-muted-foreground">Chargement des clients...</p>
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-16 text-center">
                    <Users size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="font-medium text-muted-foreground">Aucun client trouvé</p>
                    <p className="text-xs text-muted-foreground mt-1">Cliquez sur "Ajouter un client" pour commencer.</p>
                  </td>
                </tr>
              ) : clients.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
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
                  <td className="px-4 py-3 font-medium">{c.nom}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.telephone || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => { setEditingClient(c); setIsFormOpen(true); }}>
                        <Pencil size={14} /> Modifier
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(c.id)}>
                        <Trash2 size={14} /> Supprimer
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && <ClientForm onClose={() => { setIsFormOpen(false); setEditingClient(null); }} onSave={handleSave} initialData={editingClient} />}
    </Layout>
  );
};

export default Clients;
