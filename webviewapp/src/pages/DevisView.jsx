import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, AlertCircle, CheckCircle2, Clock, FileText, RefreshCw, Sparkles, Inbox } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DevisCard from '../components/DevisCard';
import DevisDetailModal from '../components/DevisDetailModal';

const DevisView = ({ onPendingCountChange }) => {
  const { profile, user } = useAuth();
  const [devisList, setDevisList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('tous'); // 'tous' | 'en_attente' | 'repondu'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevis, setSelectedDevis] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchDevis();
  }, [profile?.id]);

  const fetchDevis = async () => {
    setLoading(true);
    try {
      let loaded = [];

      // 1. Try fetching from manager_devis table
      try {
        let query = supabase
          .from('manager_devis')
          .select('*')
          .order('created_at', { ascending: false });

        // If manager has specific ID and is not admin, filter by manager_id or manager_nom
        if (profile?.id && profile?.role === 'manager') {
          query = query.or(`manager_id.eq.${profile.id},manager_nom.ilike.%${profile.nom}%`);
        }

        const { data, error } = await query;
        if (!error && data) {
          loaded = data;
        }
      } catch (err) {
        console.warn('Could not query manager_devis table:', err);
      }

      // 2. Also check pipeline table for any transmissions saved in JSON metadata as fallback
      if (loaded.length === 0) {
        try {
          const { data: pipeData } = await supabase
            .from('pipeline')
            .select('*, clients(*)')
            .order('date_creation', { ascending: false });

          if (pipeData) {
            const extracted = [];
            pipeData.forEach((pipe) => {
              if (pipe.details_devis && pipe.details_devis.trim().startsWith('{')) {
                try {
                  const parsed = JSON.parse(pipe.details_devis);
                  if (parsed.manager_sent) {
                    const ms = parsed.manager_sent;
                    // Check if it belongs to this manager or if all managers
                    const isForMe = !profile?.id || profile?.role === 'admin' || 
                      ms.manager_id === profile.id || 
                      (profile.nom && ms.manager_nom && ms.manager_nom.toLowerCase().includes(profile.nom.toLowerCase()));

                    if (isForMe) {
                      extracted.push({
                        id: `pipe_${pipe.id}`,
                        pipeline_id: pipe.id,
                        client_nom: pipe.clients?.nom || pipe.nom_prospect || 'Client',
                        destination: parsed.destination || 'Voyage',
                        destination_emoji: parsed.destination_emoji || '✈️',
                        date_devis: pipe.date_creation,
                        date_depart: parsed.date_depart || null,
                        date_retour: parsed.date_retour || null,
                        description_demande: pipe.details_demande || 'Demande client',
                        agent_nom: ms.agent_nom || parsed.agent_nom || 'Agent',
                        agent_id: parsed.agent_id,
                        manager_id: ms.manager_id,
                        manager_nom: ms.manager_nom,
                        priorite: parsed.priorite || 'Moyenne',
                        status: parsed.manager_response ? 'repondu' : (ms.status || 'en_attente'),
                        reponse_texte: parsed.manager_response?.reponse_texte || null,
                        reponse_photo_url: parsed.manager_response?.reponse_photo_url || null,
                        reponse_date: parsed.manager_response?.reponse_date || null,
                        created_at: ms.sent_at || pipe.date_creation
                      });
                    }
                  }
                } catch (e) {}
              }
            });
            if (extracted.length > 0) {
              loaded = extracted;
            }
          }
        } catch (err2) {
          console.warn('Fallback pipeline check failed:', err2);
        }
      }

      setDevisList(loaded);

      // Notify parent of pending count
      const pending = loaded.filter(d => d.status === 'en_attente').length;
      if (onPendingCountChange) onPendingCountChange(pending);

    } catch (err) {
      console.error('Fetch devis error:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchDevis();
  };

  // Filtered devis
  const filteredDevis = useMemo(() => {
    return devisList.filter((d) => {
      // Status filter
      if (filterStatus === 'en_attente' && d.status !== 'en_attente') return false;
      if (filterStatus === 'repondu' && d.status !== 'repondu') return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const dest = (d.destination || '').toLowerCase();
        const client = (d.client_nom || '').toLowerCase();
        const agent = (d.agent_nom || '').toLowerCase();
        const desc = (d.description_demande || '').toLowerCase();
        if (!dest.includes(q) && !client.includes(q) && !agent.includes(q) && !desc.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [devisList, filterStatus, searchTerm]);

  // Counts
  const counts = useMemo(() => {
    return {
      tous: devisList.length,
      en_attente: devisList.filter(d => d.status === 'en_attente').length,
      repondu: devisList.filter(d => d.status === 'repondu').length,
    };
  }, [devisList]);

  const handleCardClick = (devis) => {
    setSelectedDevis(devis);
    setIsModalOpen(true);
  };

  const handleSavedResponse = (updatedDevis) => {
    setDevisList((prev) =>
      prev.map((d) => (d.id === updatedDevis.id ? updatedDevis : d))
    );
    // recalculate pending
    const newPending = devisList.map(d => d.id === updatedDevis.id ? updatedDevis : d)
      .filter(d => d.status === 'en_attente').length;
    if (onPendingCountChange) onPendingCountChange(newPending);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Search & Refresh Bar */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par destination, client, agent..."
            className="w-full bg-white dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 text-xs pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded"
            >
              Effacer
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            onClick={() => setFilterStatus('tous')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterStatus === 'tous'
                ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-950 shadow'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>Tous</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filterStatus === 'tous' ? 'bg-slate-700 dark:bg-slate-400/30 text-white dark:text-slate-950 font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              {counts.tous}
            </span>
          </button>

          <button
            onClick={() => setFilterStatus('en_attente')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterStatus === 'en_attente'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>En attente</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filterStatus === 'en_attente' ? 'bg-amber-950 text-amber-200 font-black' : 'bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 font-bold'
            }`}>
              {counts.en_attente}
            </span>
          </button>

          <button
            onClick={() => setFilterStatus('repondu')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterStatus === 'repondu'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>Répondus</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filterStatus === 'repondu' ? 'bg-emerald-950 text-emerald-200 font-black' : 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold'
            }`}>
              {counts.repondu}
            </span>
          </button>
        </div>
      </div>

      {/* List Container */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 mx-auto border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Chargement des devis managers...</p>
        </div>
      ) : filteredDevis.length === 0 ? (
        <div className="py-16 text-center space-y-3 px-4 glass-card rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-slate-400">
            <Inbox size={26} className="text-emerald-500 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Aucun devis trouvé</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              {searchTerm
                ? "Aucun résultat pour cette recherche."
                : filterStatus === 'en_attente'
                ? "Bravo ! Vous avez répondu à toutes les demandes de devis."
                : "Les devis envoyés par les agents du CRM apparaîtront directement ici."}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs"
          >
            <RefreshCw size={12} />
            <span>Actualiser</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDevis.map((item) => (
            <DevisCard
              key={item.id}
              devis={item}
              onClick={() => handleCardClick(item)}
            />
          ))}
        </div>
      )}

      {/* Detail & Response Modal */}
      <DevisDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        devis={selectedDevis}
        onSaved={handleSavedResponse}
      />
    </div>
  );
};

export default DevisView;
