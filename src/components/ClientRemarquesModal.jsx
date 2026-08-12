import React, { useState, useEffect } from 'react';
import { 
  X, MessageSquare, Send, Trash2, User, Clock, Shield, 
  Loader2, AlertCircle, Sparkles, CheckCircle2, MessageCircle,
  Copy, Check, Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/UserAvatar';

const ClientRemarquesModal = ({ isOpen, onClose, client, onRemarquesUpdated }) => {
  const { user, profile, role, isAdmin } = useAuth();

  const [remarques, setRemarques] = useState([]);
  const [profilesList, setProfilesList] = useState([]);
  const [nouvelleRemarque, setNouvelleRemarque] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [needsSqlMigration, setNeedsSqlMigration] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Active agent name from profile
  const activeAgentName = profile?.nom || user?.email?.split('@')[0] || 'Agent';
  const activeAgentRole = role || profile?.role || 'agent';

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const { data } = await supabase.from('profiles').select('*');
        if (data) setProfilesList(data);
      } catch (e) {
        console.warn('Could not fetch profiles in remarks:', e);
      }
    };
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (client?.id) {
      fetchRemarques();
    }
  }, [client?.id]);

  // Load from local storage fallback
  const getLocalRemarques = () => {
    try {
      const stored = localStorage.getItem(`client_remarques_${client.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveLocalRemarques = (list) => {
    try {
      localStorage.setItem(`client_remarques_${client.id}`, JSON.stringify(list));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  };

  const fetchRemarques = async () => {
    if (!client?.id) return;
    setLoading(true);
    setNeedsSqlMigration(false);

    try {
      // 1. Try fetching from dedicated 'client_remarques' table
      const { data, error } = await supabase
        .from('client_remarques')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRemarques(data);
      } else {
        // Table not created yet in Supabase
        if (error && (error.code === '42P01' || error.message?.includes('schema cache') || error.message?.includes('relation'))) {
          setNeedsSqlMigration(true);
        }

        // Fallback 1: check if client object has 'remarques' jsonb column
        if (Array.isArray(client.remarques) && client.remarques.length > 0) {
          setRemarques(client.remarques);
        } else {
          // Fallback 2: Local storage
          const localList = getLocalRemarques();
          setRemarques(localList);
        }
      }
    } catch (err) {
      console.warn('Fetch remarques error:', err);
      const localList = getLocalRemarques();
      setRemarques(localList);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRemarque = async (e) => {
    e.preventDefault();
    if (!nouvelleRemarque.trim()) return;

    setIsSubmitting(true);
    const remarqueText = nouvelleRemarque.trim();
    const nowIso = new Date().toISOString();

    const insertPayload = {
      client_id: client.id,
      auteur_nom: activeAgentName,
      auteur_role: activeAgentRole,
      auteur_avatar_url: profile?.avatar_url || null,
      remarque: remarqueText,
      created_at: nowIso
    };

    if (user?.id) {
      insertPayload.auteur_id = user.id;
    }

    try {
      // 1. Try inserting into Supabase client_remarques table
      const { data, error } = await supabase
        .from('client_remarques')
        .insert([insertPayload])
        .select();

      if (!error && data && data[0]) {
        const updated = [data[0], ...remarques];
        setRemarques(updated);
        saveLocalRemarques(updated);
        setNouvelleRemarque('');
        setNeedsSqlMigration(false);
        if (onRemarquesUpdated) onRemarquesUpdated(client.id, updated);
      } else {
        // Table not present in Supabase yet
        if (error && (error.code === '42P01' || error.message?.includes('schema cache') || error.message?.includes('relation'))) {
          setNeedsSqlMigration(true);
        }

        // Fallback 1: update clients.remarques JSONB column if exists
        const localEntry = {
          ...insertPayload,
          id: `local_${Date.now()}`
        };
        const updatedList = [localEntry, ...(remarques || [])];

        const { error: clientUpdateError } = await supabase
          .from('clients')
          .update({ remarques: updatedList })
          .eq('id', client.id);

        if (!clientUpdateError) {
          setRemarques(updatedList);
          saveLocalRemarques(updatedList);
          setNouvelleRemarque('');
          if (onRemarquesUpdated) onRemarquesUpdated(client.id, updatedList);
        } else {
          // Fallback 2: Local storage storage to avoid data loss
          setRemarques(updatedList);
          saveLocalRemarques(updatedList);
          setNouvelleRemarque('');
          if (onRemarquesUpdated) onRemarquesUpdated(client.id, updatedList);
        }
      }
    } catch (err) {
      console.error(err);
      // Ensure note is saved locally so user work is never lost
      const fallbackEntry = {
        ...insertPayload,
        id: `local_${Date.now()}`
      };
      const updatedList = [fallbackEntry, ...(remarques || [])];
      setRemarques(updatedList);
      saveLocalRemarques(updatedList);
      setNouvelleRemarque('');
      if (onRemarquesUpdated) onRemarquesUpdated(client.id, updatedList);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRemarque = async (remarqueId) => {
    if (!window.confirm("Supprimer cette remarque ?")) return;

    setDeletingId(remarqueId);
    try {
      // 1. Try delete from client_remarques table
      await supabase
        .from('client_remarques')
        .delete()
        .eq('id', remarqueId);

      const updated = remarques.filter(r => r.id !== remarqueId);

      // 2. Also update jsonb fallback if needed
      await supabase
        .from('clients')
        .update({ remarques: updated })
        .eq('id', client.id)
        .then();

      setRemarques(updated);
      saveLocalRemarques(updated);
      if (onRemarquesUpdated) onRemarquesUpdated(client.id, updated);
    } catch (err) {
      console.error(err);
      const updated = remarques.filter(r => r.id !== remarqueId);
      setRemarques(updated);
      saveLocalRemarques(updated);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  const handleCopySqlScript = () => {
    const sql = `-- Script pour créer la table client_remarques dans Supabase
CREATE TABLE IF NOT EXISTS public.client_remarques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    auteur_nom TEXT NOT NULL,
    auteur_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    auteur_role TEXT DEFAULT 'agent',
    remarque TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.client_remarques ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tous les acces client_remarques pour authentifies" ON public.client_remarques;
DROP POLICY IF EXISTS "Lecture client_remarques pour tous" ON public.client_remarques;
DROP POLICY IF EXISTS "Insertion client_remarques pour tous" ON public.client_remarques;
DROP POLICY IF EXISTS "Suppression client_remarques pour tous" ON public.client_remarques;

CREATE POLICY "Tous les acces client_remarques pour authentifies" ON public.client_remarques FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Lecture client_remarques pour tous" ON public.client_remarques FOR SELECT TO anon USING (true);
CREATE POLICY "Insertion client_remarques pour tous" ON public.client_remarques FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Suppression client_remarques pour tous" ON public.client_remarques FOR DELETE TO anon USING (true);

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS remarques JSONB DEFAULT '[]'::jsonb;`;

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  if (!isOpen || !client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[620px] p-0 overflow-hidden" onClose={onClose}>
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white px-6 py-5 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="text-emerald-400" size={20} />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Notes & Suivi d'Équipe
                </span>
              </div>
              <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                <span>{client.nom}</span>
                <span className={cn(
                  "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                  client.type === 'Entreprise' 
                    ? "bg-amber-500/20 text-amber-300 border-amber-400/30" 
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                )}>
                  {client.type || 'Particulier'}
                </span>
              </DialogTitle>
              <div className="text-xs text-slate-300 flex items-center gap-3 pt-0.5">
                {client.telephone && <span>📞 {client.telephone}</span>}
                {client.email && <span>✉️ {client.email}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* SQL Migration Alert Banner if table not yet created in Supabase */}
          {needsSqlMigration && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertCircle size={15} className="text-amber-600 shrink-0" />
                  <span>Configuration Supabase requise pour la synchronisation Cloud</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopySqlScript}
                  className="h-7 text-[11px] font-bold bg-white text-amber-900 border-amber-300 hover:bg-amber-100 gap-1"
                >
                  {copiedSql ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  {copiedSql ? "Script copié !" : "Copier le script SQL"}
                </Button>
              </div>
              <p className="text-[11px] text-amber-800/90 leading-relaxed">
                Pour enregistrer les remarques sur tous vos postes de travail, exécutez le script <b>create_client_remarques.sql</b> dans l'éditeur SQL de votre console Supabase.
              </p>
            </div>
          )}

          {/* New Remark Input Box */}
          <form onSubmit={handleAddRemarque} className="space-y-2.5 p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <UserAvatar user={profile || user} size="xs" />
                <span>Rédiger en tant que :</span>
                <span className="font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  {activeAgentName}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  ({activeAgentRole === 'admin' ? 'Administrateur' : 'Agent'})
                </span>
              </div>
            </div>

            <Textarea
              rows={3}
              placeholder="Ajouter une remarque interne (ex: client préfère les hôtels proches du Haram, rappeler mardi matin...)"
              value={nouvelleRemarque}
              onChange={e => setNouvelleRemarque(e.target.value)}
              className="bg-white border-slate-200 text-xs resize-none focus-visible:ring-primary leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400">
                La remarque sera enregistrée avec votre photo, votre nom et la date.
              </span>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !nouvelleRemarque.trim()}
                className="h-8 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 shadow-xs"
              >
                {isSubmitting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                Publier la remarque
              </Button>
            </div>
          </form>

          {/* Remarks Timeline / List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Clock size={13} /> Historique des remarques ({remarques.length})
              </h4>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400">
                <Loader2 size={24} className="mx-auto animate-spin mb-2" />
                <span className="text-xs">Chargement de l'historique...</span>
              </div>
            ) : remarques.length === 0 ? (
              <div className="py-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                <MessageCircle size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">Aucune remarque enregistrée pour le moment</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Utilisez le champ ci-dessus pour ajouter la première note d'équipe sur ce client.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {remarques.map((r, idx) => {
                  const authorProfile = profilesList.find(p => p.id === r.auteur_id || p.nom === r.auteur_nom);
                  const isAuthor = r.auteur_id === user?.id || r.auteur_nom === activeAgentName;
                  const canDelete = isAuthor || isAdmin;

                  return (
                    <div 
                      key={r.id || idx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs space-y-1.5 relative group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <UserAvatar 
                            user={authorProfile}
                            avatarUrl={r.auteur_avatar_url || authorProfile?.avatar_url}
                            name={r.auteur_nom}
                            size="sm"
                          />
                          <span className="text-xs font-bold text-slate-900">
                            {r.auteur_nom || 'Agent'}
                          </span>
                          <span className={cn(
                            "text-[9px] font-bold uppercase px-1.5 py-0.2 rounded",
                            r.auteur_role === 'admin' ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                          )}>
                            {r.auteur_role === 'admin' ? 'Admin' : 'Agent'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock size={10} />
                            {formatDate(r.created_at)}
                          </span>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRemarque(r.id)}
                              disabled={deletingId === r.id}
                              className="text-slate-300 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                              title="Supprimer cette remarque"
                            >
                              {deletingId === r.id ? (
                                <Loader2 size={12} className="animate-spin text-red-500" />
                              ) : (
                                <Trash2 size={12} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed pl-8">
                        {r.remarque || r.texte}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        <DialogFooter className="px-6 py-3 border-t bg-slate-50">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClientRemarquesModal;
