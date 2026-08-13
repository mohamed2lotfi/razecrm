import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Send, Trash2, User, Clock, 
  Loader2, AlertCircle, Sparkles, CheckCircle2,
  Copy, Check, Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import UserAvatar from '@/components/UserAvatar';

const ClientRemarquesModal = ({ isOpen, onClose, client, onRemarquesUpdated }) => {
  const { user, profile, role } = useAuth();

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
        if (error && (error.code === '42P01' || error.message?.includes('schema cache') || error.message?.includes('relation') || error.status === 404 || error.code === 'PGRST116')) {
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
      let { data, error } = await supabase
        .from('client_remarques')
        .insert([insertPayload])
        .select();

      // If error 400 occurred (e.g. missing auteur_avatar_url column on older table schema), retry with minimal fields
      if (error && (error.status === 400 || error.code === '42703' || error.message?.includes('column'))) {
        const minimalPayload = {
          client_id: client.id,
          auteur_nom: activeAgentName,
          auteur_role: activeAgentRole,
          remarque: remarqueText,
          created_at: nowIso
        };
        const retryRes = await supabase
          .from('client_remarques')
          .insert([minimalPayload])
          .select();
        data = retryRes.data;
        error = retryRes.error;
      }

      if (!error && data && data[0]) {
        const updated = [data[0], ...remarques];
        setRemarques(updated);
        saveLocalRemarques(updated);
        setNouvelleRemarque('');
        setNeedsSqlMigration(false);
        if (onRemarquesUpdated) onRemarquesUpdated(client.id, updated);
      } else {
        // Table not present in Supabase yet
        if (error && (error.code === '42P01' || error.message?.includes('schema cache') || error.message?.includes('relation') || error.status === 404)) {
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
    } catch {
      return isoString;
    }
  };

  const copyFallback = (text) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (err) {
      console.warn('Fallback copy error:', err);
    }
  };

  const handleCopySqlScript = () => {
    const sql = `-- Script pour créer ou mettre à jour la table client_remarques dans Supabase
CREATE TABLE IF NOT EXISTS public.client_remarques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    auteur_nom TEXT NOT NULL,
    auteur_id UUID,
    auteur_role TEXT DEFAULT 'agent',
    auteur_avatar_url TEXT,
    remarque TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.client_remarques ADD COLUMN IF NOT EXISTS auteur_avatar_url TEXT;
ALTER TABLE public.client_remarques ADD COLUMN IF NOT EXISTS auteur_id UUID;

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

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(sql).catch(() => copyFallback(sql));
    } else {
      copyFallback(sql);
    }
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
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/30" 
                    : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                )}>
                  {client.type || 'Particulier'}
                </span>
              </DialogTitle>
            </div>
          </div>
        </div>

        {/* SQL Migration Warning Banner */}
        {needsSqlMigration && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-3 flex items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-400 shrink-0" />
              <span>
                La table <strong>client_remarques</strong> n'est pas encore créée dans Supabase.
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopySqlScript}
              className="bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900 text-xs h-7 gap-1.5 shrink-0"
            >
              {copiedSql ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedSql ? 'Script Copié !' : 'Copier Script SQL'}</span>
            </Button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          
          {/* New Remarque Input Form */}
          <form onSubmit={handleAddRemarque} className="space-y-3">
            <div className="relative">
              <Textarea
                placeholder={`Écrire une remarque interne pour ${client.nom}...`}
                value={nouvelleRemarque}
                onChange={(e) => setNouvelleRemarque(e.target.value)}
                rows={3}
                className="resize-none pr-12 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-emerald-500"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !nouvelleRemarque.trim()}
                className="absolute bottom-2.5 right-2.5 h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </Button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <div className="flex items-center gap-1.5">
                <User size={12} className="text-emerald-500" />
                <span>Publié en tant que : <strong>{activeAgentName}</strong> ({activeAgentRole})</span>
              </div>
              <span>{remarques.length} remarque{remarques.length > 1 ? 's' : ''}</span>
            </div>
          </form>

          {/* Remarques History List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock size={13} />
              <span>Historique des échanges internes</span>
            </h4>

            {loading ? (
              <div className="py-8 text-center text-muted-foreground">
                <Loader2 size={20} className="animate-spin mx-auto mb-2 text-emerald-500" />
                <span className="text-xs">Chargement des remarques...</span>
              </div>
            ) : remarques.length === 0 ? (
              <div className="py-8 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <MessageSquare size={28} className="mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Aucune remarque enregistrée</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Ajoutez un mémo pour garder une trace des préférences ou consignes sur ce client.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {remarques.map((item, idx) => {
                  const authorProfile = profilesList.find(p => p.id === item.auteur_id || p.nom === item.auteur_nom);
                  const avatarUrl = item.auteur_avatar_url || authorProfile?.avatar_url;

                  return (
                    <div
                      key={item.id || idx}
                      className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-emerald-500/30 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <UserAvatar
                            name={item.auteur_nom || 'Agent'}
                            avatarUrl={avatarUrl}
                            role={item.auteur_role}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {item.auteur_nom || 'Agent'}
                              </span>
                              <span className={cn(
                                "text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border",
                                item.auteur_role === 'admin' 
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" 
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                              )}>
                                {item.auteur_role || 'agent'}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground block font-mono mt-0.5">
                              {formatDate(item.created_at)}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={() => handleDeleteRemarque(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                          title="Supprimer la remarque"
                        >
                          {deletingId === item.id ? (
                            <Loader2 size={13} className="animate-spin text-rose-500" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </div>

                      <p className="mt-2 text-xs text-slate-700 dark:text-slate-200 leading-relaxed pl-8 whitespace-pre-wrap">
                        {item.remarque}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-950 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Fermer
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default ClientRemarquesModal;
