import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bell, Check, CheckCheck, Clock, Plus, 
  Search, X, Sparkles, User, Users,
  ShieldAlert, AlertTriangle, ArrowUpRight, CheckCircle2, Eye, Calendar,
  Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import CreateAlertModal from './CreateAlertModal';
import DueAlertModal from './DueAlertModal';
import { playNotificationChime } from '@/lib/notifications';
import { useNavigate } from 'react-router-dom';

const PRIORITY_CONFIG = {
  urgent: { 
    label: 'Urgent', 
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500 animate-pulse',
    icon: ShieldAlert
  },
  high: { 
    label: 'Haute', 
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    icon: AlertTriangle
  },
  normal: { 
    label: 'Normale', 
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    icon: Bell
  },
  low: { 
    label: 'Basse', 
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
    icon: Clock
  }
};

const ENTITY_LABELS = {
  client: { label: 'Client', color: 'text-indigo-700 border-indigo-200 bg-indigo-50' },
  pipeline: { label: 'Devis & Prospect', color: 'text-emerald-700 border-emerald-200 bg-emerald-50' },
  devis: { label: 'Devis', color: 'text-emerald-700 border-emerald-200 bg-emerald-50' },
  omra_groupe: { label: 'Groupe Omra', color: 'text-amber-800 border-amber-200 bg-amber-50' },
  facture: { label: 'Facture', color: 'text-cyan-700 border-cyan-200 bg-cyan-50' },
  visa: { label: 'Visa', color: 'text-purple-700 border-purple-200 bg-purple-50' }
};

// Safe date parser for PostgreSQL timestamps
const parseDate = (dateString) => {
  if (!dateString) return null;
  let str = String(dateString);
  if (!str.includes('Z') && !str.includes('+') && !str.includes('-')) {
    str += 'Z';
  } else if (!str.endsWith('Z') && !str.includes('+') && str.includes('T')) {
    str += 'Z';
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date(dateString) : parsed;
};

const formatTimeAgo = (dateString) => {
  const date = parseDate(dateString);
  if (!date || isNaN(date.getTime())) return '';
  
  const now = Date.now();
  const diffInSeconds = Math.floor((now - date.getTime()) / 1000);

  if (diffInSeconds < -60) {
    const futureSec = Math.abs(diffInSeconds);
    if (futureSec < 3600) return `Dans ${Math.floor(futureSec / 60)} min`;
    if (futureSec < 86400) return `Dans ${Math.floor(futureSec / 3600)} h`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  if (diffInSeconds < 60 && diffInSeconds >= 0) return 'À l\'instant';
  if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} h`;
  if (diffInSeconds < 86400 * 7) return `Il y a ${Math.floor(diffInSeconds / 86400)} j`;
  
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const formatExactDate = (dateString) => {
  const date = parseDate(dateString);
  if (!date || isNaN(date.getTime())) return '';
  return date.toLocaleString('fr-FR', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// 1. Debounced Search Input (Light Mode)
const SearchBar = memo(({ onSearchChange }) => {
  const [value, setValue] = useState('');

  const handleChange = (e) => {
    const nextVal = e.target.value;
    setValue(nextVal);
    onSearchChange(nextVal);
  };

  const handleClear = () => {
    setValue('');
    onSearchChange('');
  };

  return (
    <div className="relative mt-2">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        type="text"
        placeholder="Rechercher par mot-clé, nom, dossier..."
        value={value}
        onChange={handleChange}
        className="w-full pl-8 pr-8 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
      />
      {value && (
        <button 
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
});

// 2. Memoized MyAlertCard (Light Mode with Admin Delete)
const MyAlertCard = memo(({ item, onMarkDone, onMarkUndone, onNavigateEntity, onDeleteAlert, canDelete }) => {
  const alert = item.alert;
  if (!alert) return null;
  const priorityConfig = PRIORITY_CONFIG[alert.priority] || PRIORITY_CONFIG.normal;
  const entityBadge = alert.entity_type ? ENTITY_LABELS[alert.entity_type] || { label: alert.entity_type, color: 'text-slate-600 border-slate-200 bg-slate-100' } : null;
  const alertDate = alert.alert_at ? parseDate(alert.alert_at) : null;
  const isFutureScheduled = alertDate && alertDate > new Date();
  const isUnread = !isFutureScheduled && !item.is_seen && !item.is_done;

  return (
    <div
      className={`p-3.5 rounded-xl border transition-all flex flex-col gap-2 ${
        isUnread 
          ? 'bg-white border-primary/40 shadow-sm ring-1 ring-primary/10' 
          : 'bg-white/80 border-slate-200/80 hover:bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${priorityConfig.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dot}`} />
            {priorityConfig.label}
          </span>

          {entityBadge && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${entityBadge.color}`}>
              {entityBadge.label}
            </span>
          )}

          {isFutureScheduled ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-bold shadow-2xs">
              <Calendar size={10} />
              <span>Prévu {formatTimeAgo(alert.alert_at)}</span>
            </span>
          ) : alert.status === 'scheduled' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
              <span>⏰ Déclenché</span>
            </span>
          ) : null}
        </div>

        <span 
          className="text-[11px] font-medium text-slate-500 flex items-center gap-1 shrink-0 cursor-help"
          title={`Date prévue / créée : ${formatExactDate(alert.alert_at || alert.created_at)}`}
        >
          <Clock size={12} />
          {formatTimeAgo(alert.alert_at || alert.created_at)}
        </span>
      </div>

      <div>
        <h5 className={`text-xs font-bold leading-snug ${isUnread ? 'text-slate-900 font-black' : 'text-slate-800'}`}>
          {alert.title}
        </h5>
        {alert.content && (
          <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed font-normal">
            {alert.content}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
        {alert.author?.nom ? (
          <span className="text-[11px] text-slate-500 truncate max-w-[150px]">
            Par <span className="text-slate-800 font-semibold">{alert.author.nom}</span>
          </span>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          {alert.entity_type && (
            <button
              onClick={() => onNavigateEntity(alert.entity_type, alert.entity_id)}
              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-semibold text-slate-700 transition-colors flex items-center gap-1"
            >
              <span>Ouvrir</span>
              <ArrowUpRight size={12} />
            </button>
          )}

          {!item.is_done ? (
            <button
              onClick={() => onMarkDone(item.id)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-colors flex items-center gap-1 active:scale-95 shadow-sm"
            >
              <Check size={12} />
              <span>Fait</span>
            </button>
          ) : (
            <button
              onClick={() => onMarkUndone(item.id)}
              className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
            >
              <CheckCircle2 size={12} /> Fait (Rouvrir)
            </button>
          )}

          {canDelete && (
            <button
              onClick={() => onDeleteAlert(alert.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Supprimer l'alerte (Admin)"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// 3. Memoized TeamAlertCard (Light Mode with Admin Delete)
const TeamAlertCard = memo(({ alert, onNavigateEntity, onDeleteAlert, canDelete }) => {
  const priorityConfig = PRIORITY_CONFIG[alert.priority] || PRIORITY_CONFIG.normal;
  const entityBadge = alert.entity_type ? ENTITY_LABELS[alert.entity_type] || { label: alert.entity_type, color: 'text-slate-600 border-slate-200 bg-slate-100' } : null;
  const alertDate = alert.alert_at ? parseDate(alert.alert_at) : null;
  const isFutureScheduled = alertDate && alertDate > new Date();
  const recs = alert.recipients || [];
  const seenRecsCount = recs.filter(r => r.is_seen).length;
  const doneRecsCount = recs.filter(r => r.is_done).length;
  const isAllSeen = recs.length > 0 && seenRecsCount === recs.length;
  const isAllDone = recs.length > 0 && doneRecsCount === recs.length;

  return (
    <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${priorityConfig.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dot}`} />
            {priorityConfig.label}
          </span>

          {entityBadge && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${entityBadge.color}`}>
              {entityBadge.label}
            </span>
          )}

          {isFutureScheduled && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-bold shadow-2xs">
              <Calendar size={10} />
              <span>Prévu {formatTimeAgo(alert.alert_at)}</span>
            </span>
          )}

          {/* Group Status Badge */}
          {isAllDone ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
              <CheckCheck size={11} />
              <span>100% Fait ({doneRecsCount}/{recs.length})</span>
            </span>
          ) : isAllSeen ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
              <Eye size={11} />
              <span>Lu par tous ({doneRecsCount}/{recs.length} faits)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-bold">
              <span>Non lu par tous ({seenRecsCount}/{recs.length} vus)</span>
            </span>
          )}
        </div>

        <span 
          className="text-[11px] font-medium text-slate-500 flex items-center gap-1 shrink-0 cursor-help"
          title={`Date prévue / créée : ${formatExactDate(alert.alert_at || alert.created_at)}`}
        >
          <Clock size={12} />
          {formatTimeAgo(alert.alert_at || alert.created_at)}
        </span>
      </div>

      <div>
        <h5 className="text-xs font-bold leading-snug text-slate-900">
          {alert.title}
        </h5>
        {alert.content && (
          <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed font-normal">
            {alert.content}
          </p>
        )}
      </div>

      {/* Assigned Agent Tags */}
      <div className="flex items-center gap-1 flex-wrap pt-0.5">
        <span className="text-[11px] text-slate-500 font-medium">Pour :</span>
        {recs.length === 0 ? (
          <span className="text-[11px] text-slate-400 italic">Tous les membres</span>
        ) : (
          recs.map(r => (
            <span
              key={r.id}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border ${
                r.is_done 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 line-through'
                  : r.is_seen
                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
              }`}
              title={r.is_done ? 'Action complétée' : r.is_seen ? 'Alerte consultée' : 'Pas encore consultée'}
            >
              {r.is_done ? <Check size={10} /> : r.is_seen ? <Eye size={10} /> : <User size={10} />}
              <span>{r.user?.nom || 'Agent'}</span>
            </span>
          ))
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
        <span className="text-[11px] text-slate-500">
          Par <span className="text-slate-800 font-semibold">{alert.author?.nom || 'Admin'}</span>
        </span>

        <div className="flex items-center gap-1.5">
          {alert.entity_type && (
            <button
              onClick={() => onNavigateEntity(alert.entity_type, alert.entity_id)}
              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-semibold text-slate-700 flex items-center gap-1 transition-colors"
            >
              <span>Ouvrir</span>
              <ArrowUpRight size={12} />
            </button>
          )}

          {canDelete && (
            <button
              onClick={() => onDeleteAlert(alert.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Supprimer l'alerte (Admin)"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default function AlertsBell() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  
  // Data state
  const [myAlerts, setMyAlerts] = useState([]);
  const [allAlerts, setAllAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Tabs state
  const [scopeTab, setScopeTab] = useState('my');    // 'my' | 'team'
  const [subTab, setSubTab] = useState('unread');     // 'unread' | 'scheduled' | 'read' | 'done'
  const [searchFilter, setSearchFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activePopupItem, setActivePopupItem] = useState(null);
  
  const hasLoadedTeamAlerts = useRef(false);
  const isMarkingSeenRef = useRef(false);
  const dismissedAlertIdsRef = useRef(new Set());
  const snoozedAlertsRef = useRef(new Map());

  // Debounced search handler
  const searchTimeoutRef = useRef(null);
  const handleSearchChange = useCallback((text) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchFilter(text.trim().toLowerCase());
    }, 100);
  }, []);

  // 1. Fetch unread count (includes due scheduled alerts)
  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const nowUtc = new Date().toISOString();
      const { count, error } = await supabase
        .from('alert_recipients')
        .select('id, alert:alerts!inner(alert_at, status)', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_seen', false)
        .eq('is_done', false)
        .in('alert.status', ['active', 'scheduled'])
        .lte('alert.alert_at', nowUtc);

      if (!error && typeof count === 'number') {
        setUnreadCount(count);
      }
    } catch {
      // Silent error
    }
  }, [user?.id]);

  // 2. Fetch "Mes alertes"
  const fetchMyAlerts = useCallback(async (showSpinner = false) => {
    if (!user?.id) return;
    if (showSpinner) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('alert_recipients')
        .select(`
          id,
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
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(60);

      if (!error && data) {
        setMyAlerts(data);
      }
    } catch (err) {
      console.warn('Erreur chargement mes alertes:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [user?.id]);

  // 3. Fetch "Toutes les alertes"
  const fetchAllAlerts = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select(`
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
          author:profiles!alerts_created_by_fkey (nom, email),
          recipients:alert_recipients (
            id,
            recipient_id,
            is_seen,
            is_done,
            user:profiles!alert_recipients_recipient_id_fkey (id, nom, email)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(60);

      if (!error && data) {
        setAllAlerts(data);
        hasLoadedTeamAlerts.current = true;
      }
    } catch (err) {
      console.warn('Erreur chargement alertes équipe:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  // Initial load and auto-refresh timer (30s)
  useEffect(() => {
    if (user?.id) {
      fetchUnreadCount();
      fetchMyAlerts(false);

      const channel = supabase
        .channel(`alerts_bell_${user.id}`)
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'alert_recipients',
            filter: `recipient_id=eq.${user.id}`
          },
          () => {
            fetchUnreadCount();
            fetchMyAlerts(false);
          }
        )
        .subscribe();

      // Periodically re-evaluate due scheduled alerts
      const interval = setInterval(() => {
        fetchUnreadCount();
        fetchMyAlerts(false);
        if (hasLoadedTeamAlerts.current) {
          fetchAllAlerts(false);
        }
      }, 30000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    }
  }, [user?.id, fetchUnreadCount, fetchMyAlerts, fetchAllAlerts]);

  // Lazy-load team alerts on tab switch
  useEffect(() => {
    if (isOpen && scopeTab === 'team' && !hasLoadedTeamAlerts.current) {
      fetchAllAlerts(true);
    }
  }, [isOpen, scopeTab, fetchAllAlerts]);

  // Auto-seen on open for personal alerts that are ALREADY DUE (never mark future scheduled alerts prematurely)
  useEffect(() => {
    if (isOpen && user?.id && unreadCount > 0 && !isMarkingSeenRef.current) {
      isMarkingSeenRef.current = true;
      const now = new Date();
      const nowIso = now.toISOString();

      const dueItemIds = myAlerts
        .filter(item => {
          if (item.is_seen || item.is_done) return false;
          if (!item.alert?.alert_at) return true;
          const d = parseDate(item.alert.alert_at);
          return !d || d <= now;
        })
        .map(item => item.id);

      if (dueItemIds.length > 0) {
        setMyAlerts(prev => prev.map(item => 
          dueItemIds.includes(item.id) ? { ...item, is_seen: true, seen_at: nowIso } : item
        ));
        setUnreadCount(0);

        supabase
          .from('alert_recipients')
          .update({ is_seen: true, seen_at: nowIso })
          .in('id', dueItemIds)
          .then(() => {
            isMarkingSeenRef.current = false;
          })
          .catch(() => {
            isMarkingSeenRef.current = false;
          });
      } else {
        isMarkingSeenRef.current = false;
      }
    }
  }, [isOpen, user?.id, unreadCount, myAlerts]);

  // Center Screen Popup Trigger when an alert arrives at its scheduled time
  useEffect(() => {
    if (!myAlerts || myAlerts.length === 0) return;
    const now = Date.now();

    const dueItem = myAlerts.find(item => {
      if (item.is_seen || item.is_done) return false;
      if (!item.alert?.id) return false;
      if (dismissedAlertIdsRef.current.has(item.alert.id)) return false;

      // Check if temporarily snoozed locally
      const snoozedUntil = snoozedAlertsRef.current.get(item.alert.id);
      if (snoozedUntil && snoozedUntil > now) return false;

      const d = item.alert.alert_at ? parseDate(item.alert.alert_at) : parseDate(item.alert.created_at);
      return d && d.getTime() <= now;
    });

    if (dueItem && (!activePopupItem || activePopupItem.alert?.id !== dueItem.alert?.id)) {
      setActivePopupItem(dueItem);
      playNotificationChime(dueItem.alert?.priority || 'normal');
    }
  }, [myAlerts, activePopupItem]);

  // Actions (declared before popup handlers)
  const handleMarkAsDone = useCallback(async (recipientRecordId) => {
    const now = new Date().toISOString();
    setMyAlerts(prev => prev.map(item => 
      item.id === recipientRecordId 
        ? { ...item, is_done: true, done_at: now, is_seen: true, seen_at: now } 
        : item
    ));

    await supabase
      .from('alert_recipients')
      .update({ is_done: true, done_at: now, is_seen: true, seen_at: now })
      .eq('id', recipientRecordId);

    fetchAllAlerts(false);
    fetchUnreadCount();
  }, [fetchAllAlerts, fetchUnreadCount]);

  const handleMarkAsUndone = useCallback(async (recipientRecordId) => {
    setMyAlerts(prev => prev.map(item => 
      item.id === recipientRecordId ? { ...item, is_done: false, done_at: null } : item
    ));

    await supabase
      .from('alert_recipients')
      .update({ is_done: false, done_at: null })
      .eq('id', recipientRecordId);

    fetchAllAlerts(false);
    fetchUnreadCount();
  }, [fetchAllAlerts, fetchUnreadCount]);

  // Snooze alert by X minutes (defaults to 5 minutes)
  const handleSnoozeAlert = useCallback(async (alertId, minutes = 5) => {
    if (!alertId) return;
    const snoozeMs = minutes * 60 * 1000;
    const newAlertTime = Date.now() + snoozeMs;
    const newAlertAt = new Date(newAlertTime).toISOString();

    // 1. Immediately record local snooze to prevent instant re-pop
    snoozedAlertsRef.current.set(alertId, newAlertTime);
    dismissedAlertIdsRef.current.delete(alertId);
    setActivePopupItem(null);

    // 2. Optimistic local state update
    setMyAlerts(prev => prev.map(item => 
      item.alert?.id === alertId 
        ? { ...item, is_seen: false, alert: { ...item.alert, alert_at: newAlertAt, status: 'scheduled' } } 
        : item
    ));

    // 3. Persist to DB (Try RPC snooze_alert first, then fallback to direct UPDATE)
    try {
      const { error: rpcErr } = await supabase.rpc('snooze_alert', {
        p_alert_id: alertId,
        p_minutes: minutes
      });

      if (rpcErr) {
        await supabase
          .from('alerts')
          .update({ alert_at: newAlertAt, status: 'scheduled' })
          .eq('id', alertId);
      }

      fetchUnreadCount();
    } catch (err) {
      console.warn('Erreur décalage alerte:', err);
    }
  }, [fetchUnreadCount]);

  const handleClosePopup = useCallback(() => {
    if (activePopupItem?.alert?.id) {
      dismissedAlertIdsRef.current.add(activePopupItem.alert.id);
    }
    setActivePopupItem(null);
  }, [activePopupItem]);

  const handlePopupMarkSeen = useCallback(async (recipientRecordId) => {
    const now = new Date().toISOString();
    if (activePopupItem?.alert?.id) {
      dismissedAlertIdsRef.current.add(activePopupItem.alert.id);
    }
    setMyAlerts(prev => prev.map(item => 
      item.id === recipientRecordId 
        ? { ...item, is_seen: true, seen_at: now } 
        : item
    ));
    setActivePopupItem(null);

    await supabase
      .from('alert_recipients')
      .update({ is_seen: true, seen_at: now })
      .eq('id', recipientRecordId);

    fetchUnreadCount();
  }, [activePopupItem, fetchUnreadCount]);

  const handlePopupMarkDone = useCallback(async (recipientRecordId) => {
    if (activePopupItem?.alert?.id) {
      dismissedAlertIdsRef.current.add(activePopupItem.alert.id);
    }
    await handleMarkAsDone(recipientRecordId);
    setActivePopupItem(null);
  }, [activePopupItem, handleMarkAsDone]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (activePopupItem) {
          handleClosePopup();
        } else if (isOpen) {
          setIsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activePopupItem, handleClosePopup]);

  // Mark all due unread as done
  const handleMarkAllDone = useCallback(async () => {
    const now = new Date();
    const nowIso = now.toISOString();
    const targetIds = myAlerts
      .filter(item => {
        if (item.is_done) return false;
        if (!item.alert?.alert_at) return true;
        const d = parseDate(item.alert.alert_at);
        return !d || d <= now;
      })
      .map(item => item.id);

    if (targetIds.length === 0) return;

    setMyAlerts(prev => prev.map(item => 
      targetIds.includes(item.id) ? { ...item, is_done: true, done_at: nowIso, is_seen: true, seen_at: nowIso } : item
    ));
    setUnreadCount(0);

    await supabase
      .from('alert_recipients')
      .update({ is_done: true, done_at: nowIso, is_seen: true, seen_at: nowIso })
      .in('id', targetIds);

    fetchAllAlerts(false);
  }, [myAlerts, fetchAllAlerts]);

  // Delete an alert (Admin or Author)
  const handleDeleteAlert = useCallback(async (alertId) => {
    if (!alertId) return;
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette alerte ?")) return;

    // Optimistic state removal
    setMyAlerts(prev => prev.filter(item => item.alert?.id !== alertId));
    setAllAlerts(prev => prev.filter(alert => alert.id !== alertId));

    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', alertId);

      if (error) {
        console.error("Erreur suppression alerte:", error);
        fetchMyAlerts(false);
        fetchAllAlerts(false);
        alert("Erreur lors de la suppression : " + error.message);
      } else {
        fetchUnreadCount();
      }
    } catch (err) {
      console.error("Erreur suppression alerte:", err);
    }
  }, [fetchMyAlerts, fetchAllAlerts, fetchUnreadCount]);

  const handleNavigateEntity = useCallback((entityType, entityId) => {
    setIsOpen(false);
    if (!entityType) return;
    switch (entityType) {
      case 'client':
        navigate(`/clients?search=${entityId || ''}`);
        break;
      case 'pipeline':
      case 'devis':
        navigate(`/pipeline`);
        break;
      case 'omra_groupe':
        navigate(`/omra/group/${entityId}`);
        break;
      case 'facture':
        navigate('/facturation');
        break;
      case 'visa':
        navigate('/visas');
        break;
      default:
        break;
    }
  }, [navigate]);

  // Memoized Tab Counts (with distinction between due and scheduled)
  const counts = useMemo(() => {
    const now = new Date();
    const isDue = (alertObj) => {
      if (!alertObj?.alert_at) return true;
      const d = parseDate(alertObj.alert_at);
      return !d || d <= now;
    };

    // 1. Mes alertes (Personal)
    const myUnread = myAlerts.filter(a => isDue(a.alert) && !a.is_seen && !a.is_done).length;
    const myScheduled = myAlerts.filter(a => !isDue(a.alert) && !a.is_done).length;
    const myRead = myAlerts.filter(a => isDue(a.alert) && a.is_seen && !a.is_done).length;
    const myDone = myAlerts.filter(a => a.is_done).length;

    // 2. Toutes les alertes (Team Consensus Rules):
    const allDone = allAlerts.filter(a => {
      const recs = a.recipients || [];
      return recs.length > 0 && recs.every(r => r.is_done);
    }).length;

    const allScheduled = allAlerts.filter(a => {
      const recs = a.recipients || [];
      const isAllDone = recs.length > 0 && recs.every(r => r.is_done);
      return !isDue(a) && !isAllDone;
    }).length;

    const allRead = allAlerts.filter(a => {
      if (!isDue(a)) return false;
      const recs = a.recipients || [];
      if (recs.length === 0) return false;
      const isAllSeen = recs.every(r => r.is_seen);
      const isAllDone = recs.every(r => r.is_done);
      return isAllSeen && !isAllDone;
    }).length;

    const allUnread = allAlerts.filter(a => {
      if (!isDue(a)) return false;
      const recs = a.recipients || [];
      if (recs.length === 0) return true;
      const isAllSeen = recs.every(r => r.is_seen);
      const isAllDone = recs.every(r => r.is_done);
      return !isAllSeen && !isAllDone;
    }).length;

    return { myUnread, myScheduled, myRead, myDone, allUnread, allScheduled, allRead, allDone };
  }, [myAlerts, allAlerts]);

  // Memoized Filtered Feed for "Mes alertes"
  const filteredMyAlerts = useMemo(() => {
    const now = new Date();
    const isDue = (alertObj) => {
      if (!alertObj?.alert_at) return true;
      const d = parseDate(alertObj.alert_at);
      return !d || d <= now;
    };

    return myAlerts.filter(item => {
      if (!item.alert) return false;
      
      const due = isDue(item.alert);

      if (subTab === 'unread') {
        if (!due || item.is_seen || item.is_done) return false;
      } else if (subTab === 'scheduled') {
        if (due || item.is_done) return false;
      } else if (subTab === 'read') {
        if (!due || !item.is_seen || item.is_done) return false;
      } else if (subTab === 'done') {
        if (!item.is_done) return false;
      }

      if (searchFilter) {
        const matchTitle = item.alert.title?.toLowerCase().includes(searchFilter);
        const matchContent = item.alert.content?.toLowerCase().includes(searchFilter);
        const matchAuthor = item.alert.author?.nom?.toLowerCase().includes(searchFilter);
        const matchEntity = item.alert.entity_type?.toLowerCase().includes(searchFilter);
        return matchTitle || matchContent || matchAuthor || matchEntity;
      }
      return true;
    });
  }, [myAlerts, subTab, searchFilter]);

  // Memoized Filtered Feed for "Toutes les alertes"
  const filteredAllAlerts = useMemo(() => {
    const now = new Date();
    const isDue = (alertObj) => {
      if (!alertObj?.alert_at) return true;
      const d = parseDate(alertObj.alert_at);
      return !d || d <= now;
    };

    return allAlerts.filter(alert => {
      const recs = alert.recipients || [];
      const hasRecs = recs.length > 0;
      const isAllDone = hasRecs && recs.every(r => r.is_done);
      const isAllSeen = hasRecs && recs.every(r => r.is_seen);
      const due = isDue(alert);

      if (subTab === 'done') {
        if (!isAllDone) return false;
      } else if (subTab === 'scheduled') {
        if (due || isAllDone) return false;
      } else if (subTab === 'read') {
        if (!due || !isAllSeen || isAllDone) return false;
      } else if (subTab === 'unread') {
        if (!due || isAllSeen || isAllDone) return false;
      }

      if (searchFilter) {
        const matchTitle = alert.title?.toLowerCase().includes(searchFilter);
        const matchContent = alert.content?.toLowerCase().includes(searchFilter);
        const matchAuthor = alert.author?.nom?.toLowerCase().includes(searchFilter);
        const matchRecipients = recs.some(r => r.user?.nom?.toLowerCase().includes(searchFilter));
        const matchEntity = alert.entity_type?.toLowerCase().includes(searchFilter);
        return matchTitle || matchContent || matchAuthor || matchRecipients || matchEntity;
      }
      return true;
    });
  }, [allAlerts, subTab, searchFilter]);

  return (
    <>
      {/* Sidebar Bell Trigger Button */}
      <button
        onClick={() => {
          const nextState = !isOpen;
          setIsOpen(nextState);
          if (nextState) {
            fetchMyAlerts(false);
          }
        }}
        className={`relative p-2.5 rounded-xl border transition-colors active:scale-95 group flex items-center justify-center shrink-0 ${
          isOpen 
            ? 'bg-primary/20 border-primary text-white shadow-md' 
            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-amber-400/40 text-zinc-300 hover:text-white'
        }`}
        title="Alertes & Notifications"
      >
        <Bell size={17} className={`transition-transform ${unreadCount > 0 ? 'text-amber-300' : ''}`} />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[17px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Center Panel in Clean Light Mode */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-none flex">
          {/* Backdrop Overlay */}
          <div 
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/40 pointer-events-auto transition-opacity"
          />

          {/* Light Mode Drawer Panel */}
          <div className="pointer-events-auto fixed left-4 right-4 sm:left-[272px] sm:right-auto top-3 bottom-3 sm:w-[480px] z-[10000] flex flex-col">
            
            {/* Outer Box in Pure White with Crisp Slate Borders */}
            <div className="flex-1 flex flex-col bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden text-slate-900">
              
              {/* Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/80">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
                      <Bell size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        Centre de Notifications
                        {unreadCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                            {unreadCount} à traiter
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-500">Rappels, devis & alertes programmées</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <Plus size={13} />
                      <span>Alerte</span>
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Fermer (Échap)"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Level 1: Primary Tabs (Mes alertes vs Toutes les alertes) */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 border border-slate-200 rounded-xl mb-2.5">
                  <button
                    onClick={() => setScopeTab('my')}
                    className={`flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      scopeTab === 'my'
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <User size={13} className={scopeTab === 'my' ? 'text-primary' : 'text-slate-400'} />
                    <span>Mes alertes</span>
                    {counts.myUnread > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-[10px] font-black text-white">
                        {counts.myUnread}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setScopeTab('team');
                      if (!hasLoadedTeamAlerts.current) {
                        fetchAllAlerts(true);
                      }
                    }}
                    className={`flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      scopeTab === 'team'
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Users size={13} className={scopeTab === 'team' ? 'text-amber-600' : 'text-slate-400'} />
                    <span>Toutes les alertes</span>
                    <span className="text-[10px] text-slate-400 font-medium">({allAlerts.length})</span>
                  </button>
                </div>

                {/* Level 2: Sub-Tabs (À traiter | Planifiées | Consultées | Faites) */}
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 border border-slate-200/60 rounded-xl text-[11px]">
                  <button
                    onClick={() => setSubTab('unread')}
                    className={`py-1.5 rounded-lg text-center font-bold transition-all ${
                      subTab === 'unread' 
                        ? 'bg-primary text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    À traiter ({scopeTab === 'my' ? counts.myUnread : counts.allUnread})
                  </button>
                  <button
                    onClick={() => setSubTab('scheduled')}
                    className={`py-1.5 rounded-lg text-center font-bold transition-all ${
                      subTab === 'scheduled' 
                        ? 'bg-primary text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    Planifiées ({scopeTab === 'my' ? counts.myScheduled : counts.allScheduled})
                  </button>
                  <button
                    onClick={() => setSubTab('read')}
                    className={`py-1.5 rounded-lg text-center font-bold transition-all ${
                      subTab === 'read' 
                        ? 'bg-primary text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    Consultées ({scopeTab === 'my' ? counts.myRead : counts.allRead})
                  </button>
                  <button
                    onClick={() => setSubTab('done')}
                    className={`py-1.5 rounded-lg text-center font-bold transition-all ${
                      subTab === 'done' 
                        ? 'bg-primary text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    Faites ({scopeTab === 'my' ? counts.myDone : counts.allDone})
                  </button>
                </div>

                {/* Search Bar */}
                <SearchBar onSearchChange={handleSearchChange} />
              </div>

              {/* Alerts List Feed (Light Theme) */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-50/50">
                {loading ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Chargement...
                  </div>
                ) : scopeTab === 'my' ? (
                  filteredMyAlerts.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                      <Sparkles size={20} className="text-slate-300 mb-1" />
                      <p className="font-bold text-slate-700">
                        {subTab === 'scheduled' ? 'Aucun rappel futur planifié' : 'Aucune alerte dans cet état'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {subTab === 'scheduled' ? 'Vous pouvez planifier des alertes avec le bouton + ci-dessus.' : 'Toutes vos alertes sont à jour.'}
                      </p>
                    </div>
                  ) : (
                    filteredMyAlerts.map(item => (
                      <MyAlertCard
                        key={item.id}
                        item={item}
                        onMarkDone={handleMarkAsDone}
                        onMarkUndone={handleMarkAsUndone}
                        onNavigateEntity={handleNavigateEntity}
                        onDeleteAlert={handleDeleteAlert}
                        canDelete={isAdmin || item.alert?.created_by === user?.id}
                      />
                    ))
                  )
                ) : (
                  filteredAllAlerts.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                      <Users size={20} className="text-slate-300 mb-1" />
                      <p className="font-bold text-slate-700">Aucune alerte d'équipe dans cet état</p>
                    </div>
                  ) : (
                    filteredAllAlerts.map(alert => (
                      <TeamAlertCard
                        key={alert.id}
                        alert={alert}
                        onNavigateEntity={handleNavigateEntity}
                        onDeleteAlert={handleDeleteAlert}
                        canDelete={isAdmin || alert.created_by === user?.id}
                      />
                    ))
                  )
                )}
              </div>

              {/* Bottom Status Bar (Light Mode) */}
              <div className="p-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
                <span>{scopeTab === 'my' ? `Mes alertes : ${myAlerts.length}` : `Alertes d'équipe : ${allAlerts.length}`}</span>
                {scopeTab === 'my' && (counts.myUnread > 0 || counts.myRead > 0) && (
                  <button
                    onClick={handleMarkAllDone}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                  >
                    <CheckCheck size={13} />
                    <span>Tout marquer comme fait</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal to create alerts in Light Mode */}
      <CreateAlertModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchUnreadCount();
          fetchMyAlerts(false);
          if (hasLoadedTeamAlerts.current) {
            fetchAllAlerts(false);
          }
        }}
      />

      {/* Center Screen Popup Modal when alert time arrives */}
      <DueAlertModal
        alertItem={activePopupItem}
        onClose={handleClosePopup}
        onSnooze={handleSnoozeAlert}
        onMarkSeen={handlePopupMarkSeen}
        onMarkDone={handlePopupMarkDone}
        onNavigate={handleNavigateEntity}
      />
    </>
  );
}
