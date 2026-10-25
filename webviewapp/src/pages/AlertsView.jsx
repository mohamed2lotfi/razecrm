import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, Check, CheckCheck, Clock, ShieldAlert, AlertTriangle, 
  Calendar, Search, RefreshCw, CheckCircle2, Inbox, ArrowUpRight,
  Filter, Sparkles, Tag, Eye
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const PRIORITY_STYLES = {
  urgent: {
    label: 'Urgente',
    badge: 'bg-red-500/15 text-red-500 dark:text-red-400 border-red-500/30',
    dot: 'bg-red-500 animate-pulse',
    icon: ShieldAlert,
  },
  high: {
    label: 'Haute',
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    dot: 'bg-amber-500',
    icon: AlertTriangle,
  },
  normal: {
    label: 'Normale',
    badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    dot: 'bg-blue-500',
    icon: Bell,
  },
  low: {
    label: 'Basse',
    badge: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
    dot: 'bg-slate-400',
    icon: Clock,
  },
};

const AlertsView = ({ onUnreadCountChange, onRefreshCount }) => {
  const { profile, user } = useAuth();
  const [recipientAlerts, setRecipientAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState('unread'); // 'unread' | 'all' | 'done'
  const [searchTerm, setSearchTerm] = useState('');

  const currentUserId = profile?.id || user?.id;

  useEffect(() => {
    if (currentUserId) {
      fetchAlerts();

      // Realtime listener for live updates when viewing alerts tab
      const channel = supabase
        .channel(`alerts-view-${currentUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'alert_recipients',
            filter: `recipient_id=eq.${currentUserId}`,
          },
          () => {
            fetchAlerts();
            if (onRefreshCount) onRefreshCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUserId]);

  const fetchAlerts = async () => {
    if (!currentUserId) return;
    setLoading(true);

    try {
      // 1. Fetch from alert_recipients for this user only
      const { data, error } = await supabase
        .from('alert_recipients')
        .select(`
          id,
          recipient_id,
          is_seen,
          seen_at,
          is_done,
          done_at,
          created_at,
          alert:alerts (
            id,
            title,
            content,
            priority,
            status,
            alert_at,
            entity_type,
            entity_id,
            created_at,
            created_by,
            author:profiles!alerts_created_by_fkey (nom, email)
          )
        `)
        .eq('recipient_id', currentUserId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRecipientAlerts(data);
        const unread = data.filter(item => !item.is_seen && !item.is_done).length;
        if (onUnreadCountChange) onUnreadCountChange(unread);
      } else if (error) {
        console.warn('Alerts fetch notice, checking fallback:', error);
        // Fallback: Check if alerts has created_by or recipient in metadata
        const { data: directAlerts } = await supabase
          .from('alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);

        if (directAlerts) {
          const mapped = directAlerts.map(a => ({
            id: `direct_${a.id}`,
            recipient_id: currentUserId,
            is_seen: false,
            is_done: false,
            created_at: a.created_at,
            alert: a
          }));
          setRecipientAlerts(mapped);
          if (onUnreadCountChange) onUnreadCountChange(mapped.length);
        }
      }
    } catch (err) {
      console.error('Error fetching alerts for manager:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAlerts();
  };

  const handleToggleDone = async (item) => {
    const nextDone = !item.is_done;
    const now = new Date().toISOString();

    // Optimistic update
    setRecipientAlerts(prev => prev.map(a => {
      if (a.id === item.id) {
        return {
          ...a,
          is_done: nextDone,
          done_at: nextDone ? now : null,
          is_seen: true,
          seen_at: a.seen_at || now,
        };
      }
      return a;
    }));

    try {
      if (!String(item.id).startsWith('direct_')) {
        await supabase
          .from('alert_recipients')
          .update({
            is_done: nextDone,
            done_at: nextDone ? now : null,
            is_seen: true,
            seen_at: item.seen_at || now,
            updated_at: now
          })
          .eq('id', item.id);
      }
    } catch (err) {
      console.warn('Error updating done status:', err);
    }

    // Recompute unread
    setTimeout(() => {
      const remainingUnread = recipientAlerts.filter(a => {
        if (a.id === item.id) return !nextDone;
        return !a.is_seen && !a.is_done;
      }).length;
      if (onUnreadCountChange) onUnreadCountChange(remainingUnread);
      if (onRefreshCount) onRefreshCount();
    }, 50);
  };

  const handleMarkSeen = async (item) => {
    if (item.is_seen) return;
    const now = new Date().toISOString();

    setRecipientAlerts(prev => prev.map(a => {
      if (a.id === item.id) {
        return { ...a, is_seen: true, seen_at: now };
      }
      return a;
    }));

    try {
      if (!String(item.id).startsWith('direct_')) {
        await supabase
          .from('alert_recipients')
          .update({ is_seen: true, seen_at: now, updated_at: now })
          .eq('id', item.id);
      }
    } catch (err) {
      console.warn('Error updating seen status:', err);
    }

    const unread = recipientAlerts.filter(a => a.id !== item.id && !a.is_seen && !a.is_done).length;
    if (onUnreadCountChange) onUnreadCountChange(unread);
    if (onRefreshCount) onRefreshCount();
  };

  // Format date helper
  const formatDateAgo = (dStr) => {
    if (!dStr) return '';
    try {
      const d = new Date(dStr);
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dStr;
    }
  };

  // Filtered Alerts
  const filteredAlerts = useMemo(() => {
    return recipientAlerts.filter(item => {
      const alert = item.alert || {};

      // Filter Tab
      if (filterTab === 'unread' && (item.is_done || item.is_seen)) return false;
      if (filterTab === 'done' && !item.is_done) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const title = (alert.title || '').toLowerCase();
        const content = (alert.content || '').toLowerCase();
        const author = (alert.author?.nom || '').toLowerCase();
        const entity = (alert.entity_type || '').toLowerCase();
        if (!title.includes(q) && !content.includes(q) && !author.includes(q) && !entity.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [recipientAlerts, filterTab, searchTerm]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: recipientAlerts.length,
      unread: recipientAlerts.filter(a => !a.is_done && !a.is_seen).length,
      done: recipientAlerts.filter(a => a.is_done).length,
    };
  }, [recipientAlerts]);

  return (
    <div className="space-y-4 pb-20">
      {/* Search & Filters */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher dans mes alertes..."
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
            onClick={() => setFilterTab('unread')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterTab === 'unread'
                ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>Non lues</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filterTab === 'unread' ? 'bg-red-900 text-red-100 font-black' : 'bg-slate-100 dark:bg-slate-800 text-red-500 font-bold'
            }`}>
              {counts.unread}
            </span>
          </button>

          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterTab === 'all'
                ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-950 shadow'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>Toutes</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filterTab === 'all' ? 'bg-slate-700 dark:bg-slate-400/30 text-white dark:text-slate-950 font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setFilterTab('done')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterTab === 'done'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>Traitées</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filterTab === 'done' ? 'bg-emerald-950 text-emerald-200 font-black' : 'bg-slate-100 dark:bg-slate-800 text-emerald-500 font-bold'
            }`}>
              {counts.done}
            </span>
          </button>
        </div>
      </div>

      {/* Main Alert List */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 mx-auto border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Chargement de vos alertes...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="py-16 text-center space-y-3 px-4 glass-card rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-slate-400">
            <Inbox size={26} className="text-emerald-500 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Aucune alerte trouvée</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              {searchTerm
                ? "Aucun résultat pour cette recherche."
                : filterTab === 'unread'
                ? "Excellent ! Vous n'avez aucune alerte non traitée."
                : "Vos alertes et notifications s'afficheront ici."}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Actualiser</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((item) => {
            const alert = item.alert || {};
            const priorityConfig = PRIORITY_STYLES[alert.priority] || PRIORITY_STYLES.normal;
            const PriorityIcon = priorityConfig.icon;
            const isDone = item.is_done;
            const isUnread = !item.is_seen && !item.is_done;

            return (
              <div
                key={item.id}
                onClick={() => handleMarkSeen(item)}
                className={`glass-card rounded-2xl p-4 transition-all duration-200 relative overflow-hidden border ${
                  isUnread
                    ? 'border-red-500/40 bg-gradient-to-br from-white dark:from-slate-900 via-white dark:via-slate-900/95 to-red-500/5 shadow-md shadow-red-950/5'
                    : isDone
                    ? 'border-emerald-500/30 opacity-75 bg-slate-50/60 dark:bg-slate-900/50'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Header line: Priority + Date */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${priorityConfig.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dot}`} />
                      <PriorityIcon size={11} />
                      <span>{priorityConfig.label}</span>
                    </span>

                    {alert.entity_type && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {alert.entity_type}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                    {formatDateAgo(alert.alert_at || alert.created_at || item.created_at)}
                  </span>
                </div>

                {/* Title */}
                <h3 className={`font-extrabold text-sm tracking-tight mb-1 ${
                  isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'
                }`}>
                  {alert.title || 'Alerte Manager'}
                </h3>

                {/* Content */}
                {alert.content && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3 whitespace-pre-line bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    {alert.content}
                  </p>
                )}

                {/* Footer with Author & Actions */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Par <strong className="text-slate-700 dark:text-slate-200 font-bold">{alert.author?.nom || 'Admin'}</strong>
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleDone(item);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs ${
                      isDone
                        ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                    }`}
                  >
                    {isDone ? (
                      <>
                        <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                        <span>Fait (Rouvrir)</span>
                      </>
                    ) : (
                      <>
                        <Check size={13} />
                        <span>Marquer traité</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlertsView;
