import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Users, Calendar, Plane, Building2, Pencil, Trash2, 
  Loader2, CheckSquare, Sparkles, AlertTriangle, CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getChecklistStats, getDefaultChecklist, generateNextGroupCode } from '@/lib/omraChecklistConstants';
import OmraGroupForm from './OmraGroupForm';

const OmraGroupes = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
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
      const hotelsMaster = hRes.data || [];
      const mappedGroups = gRes.data.map(g => ({
        ...g,
        code: g.code || g.nom?.match(/OMRAETV\d+\/\d+/i)?.[0] || '',
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
      code: updateData.code || generateNextGroupCode(groupes, updateData.date_depart),
      date_depart: updateData.date_depart || null,
      date_retour: updateData.date_retour || null,
      compagnie: updateData.compagnie || null,
      nbr_places: parseInt(updateData.nbr_places) || 0,
      hotels: updateData.hotels || [],
      checklist: updateData.checklist || getDefaultChecklist(updateData.date_depart)
    };

    if (selectedGroup) {
      const { data, error } = await supabase.from('omra_groupes').update(payload).eq('id', id).select();
      if (!error && data) {
        setGroupes(groupes.map(g => g.id === id ? { ...g, ...data[0] } : g));
      } else if (error) {
        // Fallback sans colonnes optionnelles si migration SQL pas encore exécutée
        const fallbackPayload = {
          nom: payload.nom,
          date_depart: payload.date_depart,
          date_retour: payload.date_retour,
          compagnie: payload.compagnie,
          nbr_places: payload.nbr_places,
          hotels: payload.hotels
        };
        const fallbackRes = await supabase.from('omra_groupes').update(fallbackPayload).eq('id', id).select();
        if (!fallbackRes.error && fallbackRes.data) {
          setGroupes(groupes.map(g => g.id === id ? { ...g, ...fallbackRes.data[0], code: payload.code, checklist: payload.checklist } : g));
        } else {
          alert('Erreur lors de la mise à jour: ' + error.message);
        }
      }
    } else {
      const { data, error } = await supabase.from('omra_groupes').insert([payload]).select();
      if (!error && data) {
        setGroupes([data[0], ...groupes]);
      } else if (error) {
        // Fallback sans colonnes optionnelles
        const fallbackPayload = {
          nom: payload.nom,
          date_depart: payload.date_depart,
          date_retour: payload.date_retour,
          compagnie: payload.compagnie,
          nbr_places: payload.nbr_places,
          hotels: payload.hotels
        };
        const fallbackRes = await supabase.from('omra_groupes').insert([fallbackPayload]).select();
        if (!fallbackRes.error && fallbackRes.data) {
          setGroupes([{ ...fallbackRes.data[0], code: payload.code, checklist: payload.checklist }, ...groupes]);
        } else {
          alert('Erreur lors de la création: ' + error.message);
        }
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
        <div>
          <h2 className="text-xl font-bold">Gestion des Groupes Omra</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Suivi des départs, hébergements et préparation des vols</p>
        </div>
        <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90 shadow-sm">
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
          groupes.map(group => {
            const stats = getChecklistStats(group.checklist, group.date_depart);
            const groupCode = group.code || 'OMRAETV001/1448';

            return (
              <Card 
                key={group.id} 
                className="overflow-hidden hover:shadow-md transition-all duration-200 border bg-card flex flex-col justify-between"
              >
                <div>
                  <div className="h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />
                  
                  <CardHeader className="pb-3 relative">
                    <div className="absolute top-4 right-4 flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); handleEdit(group); }} title="Modifier">
                        <Pencil size={14} className="text-muted-foreground" />
                      </Button>
                      {isAdmin && (
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id, group.nom); }} 
                          title="Supprimer le groupe" 
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-1 pr-16">
                      <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-mono font-extrabold rounded-md shadow-2xs">
                        {groupCode}
                      </span>
                      <CardTitle 
                        className="text-lg font-bold flex items-center gap-2 cursor-pointer hover:text-primary transition-colors line-clamp-1"
                        onClick={() => navigate(`/omra/group/${group.id}`)}
                      >
                        <Users size={18} className="text-emerald-600 shrink-0" /> {group.nom}
                      </CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Infos vol */}
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-xs bg-muted/20 p-3 rounded-lg border">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar size={13} /> Départ
                      </div>
                      <div className="font-bold text-right text-foreground">{group.date_depart || '-'}</div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar size={13} /> Retour
                      </div>
                      <div className="font-medium text-right text-foreground">{group.date_retour || '-'}</div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Plane size={13} /> Compagnie
                      </div>
                      <div className="font-medium text-right">
                        <span className="bg-background px-1.5 py-0.5 rounded text-[11px] font-bold border">{group.compagnie || '-'}</span>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users size={13} /> Places
                      </div>
                      <div className="font-bold text-right text-foreground">{group.nbr_places || 0} pax</div>
                    </div>

                    {/* Section Checklist Vol */}
                    <div 
                      className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-lg cursor-pointer hover:bg-emerald-50/70 transition-colors"
                      onClick={() => navigate(`/omra/group/${group.id}?tab=checklist`)}
                      title="Ouvrir la checklist de préparation du vol"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <CheckSquare size={14} className="text-emerald-600" /> Checklist Vol
                        </span>
                        <span>{stats.ok}/{stats.total} ({stats.percent}%)</span>
                      </div>

                      <div className="w-full bg-emerald-200/50 dark:bg-emerald-900/50 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${stats.percent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5">
                        <span className="font-medium">
                          {stats.isComplete ? '✨ Prêt pour le vol' : `${stats.pasEncore} à faire, ${stats.enCours} en cours`}
                        </span>
                        {stats.enRetard > 0 && (
                          <span className="text-rose-600 font-extrabold flex items-center gap-0.5 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded border border-rose-200">
                            <AlertTriangle size={10} /> {stats.enRetard} en retard
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hôtels */}
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-1.5">
                        <Building2 size={13} /> Hôtels associés ({group.hotels?.length || 0})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {group.hotels?.length === 0 ? (
                          <span className="text-[11px] text-muted-foreground italic">Aucun hôtel configuré</span>
                        ) : (
                          group.hotels?.map((h, i) => (
                            <span key={i} className="text-[10px] bg-muted px-2 py-0.5 rounded font-bold uppercase border" title={h.location}>
                              {h.location || `Hôtel ${i + 1}`} {h.nbrEtoiles ? `(${h.nbrEtoiles}★)` : ''}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Footer avec Boutons d'action */}
                <div className="p-4 pt-0 border-t bg-muted/5 flex items-center justify-between gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate(`/omra/group/${group.id}?tab=checklist`)}
                    className="text-xs h-8 flex-1 border-emerald-200 text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
                  >
                    <CheckSquare size={13} className="mr-1.5 text-emerald-600" /> Checklist
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => navigate(`/omra/group/${group.id}`)}
                    className="text-xs h-8 flex-1"
                  >
                    Gérer <ArrowRight size={13} className="ml-1" />
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default OmraGroupes;
