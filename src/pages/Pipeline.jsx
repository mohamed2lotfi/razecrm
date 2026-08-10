import React, { useState, useEffect } from 'react';
import { ReactSortable } from 'react-sortablejs';
import { Plus, Phone, GripVertical, Loader2, LayoutGrid, List, Trash2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import ProspectModal from '@/components/ProspectModal';
import VenteForm from '@/components/VenteForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const COLUMNS = [
  { id: 'nouvelle', title: 'Demande devis', color: 'bg-blue-500', light: 'bg-blue-50 border-blue-200 text-blue-700' },
  { id: 'en_cours', title: 'En cours', color: 'bg-amber-500', light: 'bg-amber-50 border-amber-200 text-amber-700' },
  { id: 'envoye', title: 'Devis envoyé', color: 'bg-violet-500', light: 'bg-violet-50 border-violet-200 text-violet-700' },
  { id: 'converti', title: 'Converti', color: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-200 text-emerald-700', isSplit: true },
  { id: 'ferme', title: 'Fermé', color: 'bg-red-500', light: 'bg-red-50 border-red-200 text-red-700' },
];

const Pipeline = () => {
  const [pipelineData, setPipelineData] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [isNew, setIsNew] = useState(false);

  // Conversion States
  const [pendingVenteClient, setPendingVenteClient] = useState(null);
  const [omraModalOpen, setOmraModalOpen] = useState(false);
  const [omraGroups, setOmraGroups] = useState([]);
  const [selectedOmraGroupId, setSelectedOmraGroupId] = useState('');
  const [selectedOmraClientId, setSelectedOmraClientId] = useState(null);
  const navigate = useNavigate();

  const [columnsState, setColumnsState] = useState({
    nouvelle: [], en_cours: [], envoye: [], converti_vente: [], converti_omra: [], ferme: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [pipelineRes, servicesRes, clientsRes, omraRes] = await Promise.all([
      supabase.from('pipeline').select('*, clients(*)').order('date_creation', { ascending: false }),
      supabase.from('services').select('*').order('created_at'),
      supabase.from('clients').select('*').order('nom', { ascending: true }),
      supabase.from('omra_groupes').select('*').order('created_at', { ascending: false })
    ]);

    if (servicesRes.data) setServicesList(servicesRes.data);
    if (clientsRes.data) setClientsList(clientsRes.data);
    if (omraRes.data) setOmraGroups(omraRes.data);
    if (pipelineRes.data) setPipelineData(pipelineRes.data);
    setLoading(false);
  };

  useEffect(() => {
    setColumnsState({
      nouvelle: pipelineData.filter(t => t.status === 'nouvelle'),
      en_cours: pipelineData.filter(t => t.status === 'en_cours'),
      envoye: pipelineData.filter(t => t.status === 'envoye'),
      converti_vente: pipelineData.filter(t => t.status === 'converti_vente' || t.status === 'termine'), // retro-compatibility
      converti_omra: pipelineData.filter(t => t.status === 'converti_omra'),
      ferme: pipelineData.filter(t => t.status === 'ferme'),
    });
  }, [pipelineData]);

  const handleSetList = async (colId, newList) => {
    setColumnsState(prev => {
      // Avoid extra renders if list hasn't changed
      if (JSON.stringify(prev[colId].map(t=>t.id)) === JSON.stringify(newList.map(t=>t.id))) {
        return prev;
      }
      
      const nextState = { ...prev, [colId]: newList };
      
      // Sync local state
      const flat = [
        ...nextState.nouvelle.map(t => ({...t, status: 'nouvelle'})),
        ...nextState.en_cours.map(t => ({...t, status: 'en_cours'})),
        ...nextState.envoye.map(t => ({...t, status: 'envoye'})),
        ...nextState.converti_vente.map(t => ({...t, status: 'converti_vente'})),
        ...nextState.converti_omra.map(t => ({...t, status: 'converti_omra'})),
        ...nextState.ferme.map(t => ({...t, status: 'ferme'})),
      ];
      setPipelineData(flat);
      
      return nextState;
    });

    // Update in Supabase
    // We only want to update the item that was moved. 
    // Since ReactSortable gives us the whole list, the easiest way to ensure consistency 
    // without tracking the exact dragged item is to blindly update all items in the new list to this colId.
    // However, it's better to find the difference or just update all if it's small.
    // For now, let's just update all items in this column to have the new status.
    for (const item of newList) {
      if (item.status !== colId) {
        await supabase.from('pipeline').update({ status: colId }).eq('id', item.id);
        
        // Trigger conversion events
        if (colId === 'converti_vente') {
          setPendingVenteClient(item.client_id || null);
        } else if (colId === 'converti_omra') {
          setSelectedOmraClientId(item.client_id || null);
          setOmraModalOpen(true);
        }
      }
    }
  };

  const handleCreate = () => { setSelectedProspect(null); setIsNew(true); setIsModalOpen(true); };
  const handleCardClick = (p) => { setSelectedProspect(p); setIsNew(false); setIsModalOpen(true); };
  
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Voulez-vous vraiment supprimer ce devis ?')) {
      const { error } = await supabase.from('pipeline').delete().eq('id', id);
      if (!error) {
        setPipelineData(prev => prev.filter(p => p.id !== id));
      } else {
        alert("Erreur de suppression: " + error.message);
      }
    }
  };
  
  const handleSave = async (prospectData) => {
    const { 
      id, client_id, nom_prospect, phone, email, service_id, 
      details_demande, details_devis, devis_ia, status 
    } = prospectData;
    const client = clientsList.find(c => c.id === client_id);
    
    const updateData = {
      client_id: client_id || null,
      nom_prospect: nom_prospect || (client ? client.nom : 'Client inconnu'),
      phone: phone || (client ? client.telephone : null),
      email: email || (client ? client.email : null),
      details_demande, details_devis, devis_ia, status,
      service_id: service_id === '' ? null : service_id
    };
    
    if (isNew) {
      const { data, error } = await supabase.from('pipeline').insert([updateData]).select();
      if (error) {
        console.error('Error inserting prospect:', error);
        alert('Erreur lors de la création : ' + error.message);
      } else if (data) {
        setPipelineData(prev => [data[0], ...prev]);
        setIsModalOpen(false);
      }
    } else {
      const { data, error } = await supabase.from('pipeline').update(updateData).eq('id', id).select();
      if (error) {
        console.error('Error updating prospect:', error);
        alert('Erreur lors de la mise à jour : ' + error.message);
      } else if (data) {
        setPipelineData(prev => prev.map(x => x.id === data[0].id ? data[0] : x));
        setIsModalOpen(false);
      }
    }
  };

  const getServiceName = (service_id) => {
    return servicesList.find(s => s.id === service_id)?.nom || 'Service Inconnu';
  };

  // --- KPI Computations ---
  const getColumnKPI = (colId) => {
    const nNouvelle = columnsState.nouvelle?.length || 0;
    const nEnCours = columnsState.en_cours?.length || 0;
    const nEnvoye = columnsState.envoye?.length || 0;
    const nConverti = (columnsState.converti_vente?.length || 0) + (columnsState.converti_omra?.length || 0);
    const nFerme = columnsState.ferme?.length || 0;

    switch (colId) {
      case 'nouvelle': {
        const today = new Date().toDateString();
        const todayCount = (columnsState.nouvelle || []).filter(t => t.date_creation && new Date(t.date_creation).toDateString() === today).length;
        return { label: `${todayCount} demande${todayCount > 1 ? 's' : ''} aujourd'hui`, color: 'text-blue-600' };
      }
      case 'en_cours': {
        const total = nNouvelle + nEnCours;
        const pct = total > 0 ? Math.round((nEnCours / total) * 100) : 0;
        return { label: `Taux de traitement ${pct}%`, color: 'text-amber-600' };
      }
      case 'envoye': {
        const total = nEnCours + nEnvoye;
        const pct = total > 0 ? Math.round((nEnvoye / total) * 100) : 0;
        return { label: `Taux de réponse ${pct}%`, color: 'text-violet-600' };
      }
      case 'converti': {
        const total = nEnvoye + nConverti + nFerme;
        const pct = total > 0 ? Math.round((nConverti / total) * 100) : 0;
        return { label: `Taux de conversion ${pct}%`, color: 'text-emerald-600' };
      }
      case 'ferme': {
        const total = nEnvoye + nConverti + nFerme;
        const pct = total > 0 ? Math.round((nFerme / total) * 100) : 0;
        return { label: `Taux d'échec ${pct}%`, color: 'text-red-600' };
      }
      default:
        return null;
    }
  };

  const handleConfirmOmraGroup = () => {
    if (selectedOmraGroupId) {
      setOmraModalOpen(false);
      navigate(`/omra/group/${selectedOmraGroupId}?clientId=${selectedOmraClientId || ''}&openForm=true`);
    } else {
      alert("Veuillez sélectionner un groupe.");
    }
  };

  const renderTaskCard = (task, col) => (
    <div
      key={task.id}
      onClick={() => handleCardClick(task)}
      className="group p-3.5 mb-2 bg-background rounded-lg border shadow-sm transition-shadow cursor-grab hover:border-primary/30"
    >
      <div className="flex items-start gap-2">
        <GripVertical size={14} className="mt-0.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{task.clients?.nom || task.nom_prospect}</p>
          {task.service_id && (
            <span className={cn("inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded border", col.light)}>
              {getServiceName(task.service_id)}
            </span>
          )}
          {(task.clients?.phone || task.phone) && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Phone size={10} /> {task.clients?.phone || task.phone}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Devis</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted/50 rounded-lg p-1 border">
            <button onClick={() => setViewMode('kanban')} className={cn("px-3 py-1.5 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors", viewMode === 'kanban' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <LayoutGrid size={16} /> Kanban
            </button>
            <button onClick={() => setViewMode('list')} className={cn("px-3 py-1.5 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors", viewMode === 'list' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <List size={16} /> Liste
            </button>
          </div>
          <Button onClick={handleCreate}><Plus size={16} /> Créer une demande</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="flex gap-4 pb-4 overflow-x-auto" style={{ animationDelay: '80ms', minHeight: 'calc(100vh - 160px)' }}>
          {COLUMNS.map(col => (
            <div key={col.id} className="flex flex-col w-[300px] min-w-[300px] flex-shrink-0 rounded-xl bg-muted/40 border">
              <div className="p-4 pb-3 space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <div className={cn("w-2.5 h-2.5 rounded-full", col.color)} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex-1">
                    {col.title}
                  </h3>
                  {!col.isSplit && (
                    <span className="text-[10px] font-bold text-muted-foreground bg-background border rounded-full px-2 py-0.5">
                      {columnsState[col.id]?.length || 0}
                    </span>
                  )}
                </div>
                {(() => {
                  const kpi = getColumnKPI(col.id);
                  return kpi ? (
                    <p className={cn("text-[10px] font-semibold px-0.5", kpi.color)}>
                      {kpi.label}
                    </p>
                  ) : null;
                })()}
              </div>

              {col.isSplit ? (
                <div className="flex-1 flex flex-col gap-4 px-2 pb-4">
                  {/* VENTE */}
                  <div className="flex-1 min-h-[160px] bg-emerald-500/5 rounded-lg border border-emerald-500/20 p-2 flex flex-col">
                    <h4 className="text-[10px] font-bold uppercase text-emerald-700 mb-2 px-1 flex justify-between">
                      Vente
                      <span className="text-[10px] font-bold bg-background border border-emerald-500/30 px-1.5 rounded-full">{columnsState['converti_vente']?.length || 0}</span>
                    </h4>
                    <ReactSortable
                      list={columnsState['converti_vente'] || []}
                      setList={(newList) => handleSetList('converti_vente', newList)}
                      group="pipeline"
                      animation={150}
                      ghostClass="opacity-40"
                      dragClass="cursor-grabbing"
                      className="flex-1 min-h-[100px]"
                    >
                       {(columnsState['converti_vente'] || []).map(task => renderTaskCard(task, col))}
                    </ReactSortable>
                  </div>
                  {/* OMRA */}
                  <div className="flex-1 min-h-[160px] bg-violet-500/5 rounded-lg border border-violet-500/20 p-2 flex flex-col">
                    <h4 className="text-[10px] font-bold uppercase text-violet-700 mb-2 px-1 flex justify-between">
                      Omra
                      <span className="text-[10px] font-bold bg-background border border-violet-500/30 px-1.5 rounded-full">{columnsState['converti_omra']?.length || 0}</span>
                    </h4>
                    <ReactSortable
                      list={columnsState['converti_omra'] || []}
                      setList={(newList) => handleSetList('converti_omra', newList)}
                      group="pipeline"
                      animation={150}
                      ghostClass="opacity-40"
                      dragClass="cursor-grabbing"
                      className="flex-1 min-h-[100px]"
                    >
                       {(columnsState['converti_omra'] || []).map(task => renderTaskCard(task, col))}
                    </ReactSortable>
                  </div>
                </div>
              ) : (
                <ReactSortable
                  list={columnsState[col.id] || []}
                  setList={(newList) => handleSetList(col.id, newList)}
                  group="pipeline"
                  animation={150}
                  ghostClass="opacity-40"
                  dragClass="cursor-grabbing"
                  className="flex-1 px-2 pb-4 min-h-[160px] rounded-b-xl"
                >
                  {(columnsState[col.id] || []).map(task => renderTaskCard(task, col))}
                </ReactSortable>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-background border rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Nom du prospect</th>
                  <th className="px-6 py-4">Téléphone</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Service</th>
                  <th className="px-6 py-4">Agent chargé</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4">Date de création</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pipelineData.map(task => {
                  let col = COLUMNS.find(c => c.id === task.status);
                  if (!col && task.status === 'converti_vente') col = COLUMNS.find(c => c.id === 'converti');
                  if (!col && task.status === 'converti_omra') col = COLUMNS.find(c => c.id === 'converti');
                  if (!col && task.status === 'ferme') col = COLUMNS.find(c => c.id === 'ferme');
                  return (
                    <tr key={task.id} onClick={() => handleCardClick(task)} className="hover:bg-muted/30 cursor-pointer transition-colors group">
                      <td className="px-6 py-4 font-semibold">{task.clients?.nom || task.nom_prospect}</td>
                      <td className="px-6 py-4 text-muted-foreground">{task.clients?.phone || task.phone || '-'}</td>
                      <td className="px-6 py-4 text-muted-foreground">{task.clients?.email || task.email || '-'}</td>
                      <td className="px-6 py-4">
                        {task.service_id ? (
                          <span className={cn("inline-block text-[10px] font-semibold px-2 py-0.5 rounded border", col?.light || 'bg-gray-100')}>
                            {getServiceName(task.service_id)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground italic">Non assigné</td>
                      <td className="px-6 py-4">
                        <span className={cn("inline-block text-[10px] font-semibold px-2 py-1 rounded border uppercase tracking-wider", col?.light || 'bg-gray-100')}>
                          {col?.title || task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {task.date_creation ? new Date(task.date_creation).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isAdmin && (
                          <Button variant="ghost" size="sm" onClick={(e) => handleDelete(e, task.id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" title="Supprimer le devis">
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {pipelineData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Aucun devis trouvé</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ProspectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        onSave={handleSave} prospect={selectedProspect} isNew={isNew} servicesList={servicesList} clientsList={clientsList} />

      {pendingVenteClient !== null && (() => {
        const c = clientsList.find(c => c.id === pendingVenteClient);
        return (
          <VenteForm 
            onClose={() => setPendingVenteClient(null)} 
            initialData={{ client_id: c?.id, client_nom: c?.nom }} 
            onSave={async (venteData) => {
              const { error } = await supabase.from('ventes').insert([venteData]);
              if (!error) {
                setPendingVenteClient(null);
                // Optionally navigate to Ventes or just show success
              } else {
                alert("Erreur lors de la création de la vente : " + error.message);
              }
            }}
          />
        );
      })()}

      {omraModalOpen && (
        <Dialog open={true} onOpenChange={() => setOmraModalOpen(false)}>
          <DialogContent className="max-w-md" onClose={() => setOmraModalOpen(false)}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-500/10 text-violet-600">
                  <LayoutGrid size={18} />
                </div>
                Sélectionner le Groupe Omra
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1.5">
                Dans quel groupe souhaitez-vous enregistrer ce client ?
              </p>
            </DialogHeader>
            <div className="px-6 pb-2">
              <Label className="text-sm font-medium mb-2 block">Groupe Omra</Label>
              <Select value={selectedOmraGroupId} onChange={e => setSelectedOmraGroupId(e.target.value)}>
                <option value="">-- Choisir un groupe --</option>
                {omraGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.nom} ({g.statut})</option>
                ))}
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOmraModalOpen(false)}>Annuler</Button>
              <Button onClick={handleConfirmOmraGroup}>Continuer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
};

export default Pipeline;
