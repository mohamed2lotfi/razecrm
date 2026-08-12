import React, { useState, useEffect } from 'react';
import { Plus, Users, Calendar, Plane, Building2, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import OmraGroupForm from './OmraGroupForm';

const OmraGroupes = () => {
  const { isAdmin } = useAuth();
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    fetchGroupes();
  }, []);

  const fetchGroupes = async () => {
    setLoading(true);
    const [gRes, hRes] = await Promise.all([
      supabase.from('omra_groupes').select('*').order('created_at', { ascending: false }),
      supabase.from('hotels').select('*')
    ]);
    if (gRes.data) {
      // Map hotel info
      const hotelsMaster = hRes.data || [];
      const mappedGroups = gRes.data.map(g => ({
        ...g,
        hotels: (g.hotels || []).map(h => {
          const matchedHotel = hotelsMaster.find(m => m.id === h.hotelId || m.nom === h.hotelId || (typeof h.hotelId === 'string' && h.hotelId.startsWith(m.nom)));
          const cleanLoc = (h.location || h.hotelId || 'Hôtel Inconnu').replace(/undefined\s*étoiles/gi, '').trim();
          return {
            ...h,
            location: matchedHotel ? matchedHotel.nom : cleanLoc,
            nbrEtoiles: matchedHotel ? (matchedHotel.nbr_etoiles || matchedHotel.nbrEtoiles || '4') : (h.nbrEtoiles || '4')
          };
        })
      }));
      setGroupes(mappedGroups);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setSelectedGroup(null);
    setView('form');
  };

  const handleEdit = (group) => {
    setSelectedGroup(group);
    setView('form');
  };

  const handleDeleteGroup = async (groupId, groupNom) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le groupe Omra "${groupNom}" ?\n\nTous les enregistrements, pèlerins et paiements associés seront supprimés.`)) {
      return;
    }

    try {
      setLoading(true);
      await supabase.from('omra_paiements').delete().eq('groupe_id', groupId);
      await supabase.from('omra_paiements_commissions').delete().eq('groupe_id', groupId);
      await supabase.from('omra_enregistrements').delete().eq('groupe_id', groupId);
      const { error } = await supabase.from('omra_groupes').delete().eq('id', groupId);
      
      if (error) {
        alert("Erreur lors de la suppression du groupe : " + error.message);
      } else {
        setGroupes(prev => prev.filter(g => g.id !== groupId));
      }
    } catch (err) {
      alert("Une erreur inattendue est survenue : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (group) => {
    const { id, created_at, ...updateData } = group;
    
    // Formatting data for Supabase
    const payload = {
      nom: updateData.nom,
      date_depart: updateData.date_depart || null,
      date_retour: updateData.date_retour || null,
      compagnie: updateData.compagnie || null,
      nbr_places: parseInt(updateData.nbr_places) || 0,
      hotels: updateData.hotels || []
    };

    if (selectedGroup) {
      const { data, error } = await supabase.from('omra_groupes').update(payload).eq('id', id).select();
      if (!error && data) {
        setGroupes(groupes.map(g => g.id === id ? data[0] : g));
      } else if (error) {
        alert('Erreur lors de la mise à jour: ' + error.message);
      }
    } else {
      const { data, error } = await supabase.from('omra_groupes').insert([payload]).select();
      if (!error && data) {
        setGroupes([data[0], ...groupes]);
      } else if (error) {
        alert('Erreur lors de la création: ' + error.message);
      }
    }
    setView('list');
  };

  if (view === 'form') {
    return (
      <OmraGroupForm 
        group={selectedGroup}
        onSave={handleSave}
        onCancel={() => setView('list')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Gestion des Groupes</h2>
        <Button onClick={handleCreate}>
          <Plus size={16} className="mr-2" /> Créer un groupe
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : groupes.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-muted/20 border border-dashed rounded-xl">
            <p className="text-muted-foreground">Aucun groupe Omra n'a été créé.</p>
            <Button variant="link" onClick={handleCreate} className="mt-2">Créer le premier groupe</Button>
          </div>
        ) : (
          groupes.map(group => (
            <Card key={group.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-2 bg-gradient-to-r from-emerald-400 to-emerald-600" />
              <CardHeader className="pb-3 relative">
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(group)} title="Modifier">
                    <Pencil size={14} className="text-muted-foreground" />
                  </Button>
                  {isAdmin && (
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      onClick={() => handleDeleteGroup(group.id, group.nom)} 
                      title="Supprimer le groupe" 
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users size={18} className="text-emerald-600" /> {group.nom}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar size={14} /> Départ
                  </div>
                  <div className="font-medium text-right">{group.date_depart || '-'}</div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar size={14} /> Retour
                  </div>
                  <div className="font-medium text-right">{group.date_retour || '-'}</div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Plane size={14} /> Compagnie
                  </div>
                  <div className="font-medium text-right">
                    <span className="bg-muted px-1.5 py-0.5 rounded text-xs border">{group.compagnie || '-'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users size={14} /> Places
                  </div>
                  <div className="font-medium text-right">{group.nbr_places || 0}</div>
                </div>

                <div className="pt-3 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium mb-2">
                    <Building2 size={14} /> Hôtels associés ({group.hotels?.length || 0})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {group.hotels?.map((h, i) => (
                      <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold uppercase" title={h.location}>
                        {h.location || `Hôtel ${i + 1}`} {h.nbrEtoiles ? `(${h.nbrEtoiles}★)` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default OmraGroupes;
