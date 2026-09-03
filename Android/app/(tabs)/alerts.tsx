import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Alert as NativeAlert,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { Colors, Radius, Spacing } from '../../src/constants/theme';

export default function AlertsScreen() {
  const { user, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myAlerts, setMyAlerts] = useState<any[]>([]);
  const [allAlerts, setAllAlerts] = useState<any[]>([]);
  
  const [scopeTab, setScopeTab] = useState<'my' | 'team'>('my');
  const [subTab, setSubTab] = useState<'unread' | 'read' | 'done'>('unread');
  const [search, setSearch] = useState('');

  // Fetch "Mes alertes"
  const fetchMyAlerts = useCallback(async () => {
    if (!user?.id) return;
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
        .limit(50);

      if (!error && data) {
        setMyAlerts(data);
      }
    } catch (err) {
      console.warn('Erreur chargement mes alertes mobile:', err);
    }
  }, [user?.id]);

  // Fetch "Toutes les alertes"
  const fetchAllAlerts = useCallback(async () => {
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
        .limit(50);

      if (!error && data) {
        setAllAlerts(data);
      }
    } catch (err) {
      console.warn('Erreur chargement alertes équipe mobile:', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMyAlerts(), fetchAllAlerts()]);
    setLoading(false);
    setRefreshing(false);
  }, [fetchMyAlerts, fetchAllAlerts]);

  useEffect(() => {
    if (user?.id) {
      loadData();

      // Realtime listener
      const channel = supabase
        .channel(`mobile_alerts_feed_${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'alert_recipients' },
          () => {
            fetchMyAlerts();
            fetchAllAlerts();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, loadData, fetchMyAlerts, fetchAllAlerts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Mark done handler
  const handleToggleDone = async (recipientId: string, currentDone: boolean) => {
    const nextDone = !currentDone;
    const now = new Date().toISOString();

    setMyAlerts(prev => prev.map(item => 
      item.id === recipientId 
        ? { ...item, is_done: nextDone, done_at: nextDone ? now : null, is_seen: true } 
        : item
    ));

    await supabase
      .from('alert_recipients')
      .update({ 
        is_done: nextDone, 
        done_at: nextDone ? now : null,
        is_seen: true,
        seen_at: now
      })
      .eq('id', recipientId);

    fetchAllAlerts();
  };

  // Admin delete handler
  const handleDelete = (alertId: string) => {
    NativeAlert.alert(
      'Supprimer l\'alerte',
      'Voulez-vous supprimer définitivement cette alerte pour tous les membres ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            setMyAlerts(prev => prev.filter(item => item.alert?.id !== alertId));
            setAllAlerts(prev => prev.filter(item => item.id !== alertId));

            await supabase
              .from('alerts')
              .delete()
              .eq('id', alertId);
          }
        }
      ]
    );
  };

  // Filtered lists
  const filteredMyAlerts = useMemo(() => {
    return myAlerts.filter(item => {
      if (!item.alert) return false;
      if (subTab === 'unread' && (item.is_seen || item.is_done)) return false;
      if (subTab === 'read' && (!item.is_seen || item.is_done)) return false;
      if (subTab === 'done' && !item.is_done) return false;

      if (search) {
        const q = search.toLowerCase();
        return (
          item.alert.title?.toLowerCase().includes(q) ||
          item.alert.content?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [myAlerts, subTab, search]);

  const filteredAllAlerts = useMemo(() => {
    return allAlerts.filter(alert => {
      const recs = alert.recipients || [];
      const hasRecs = recs.length > 0;
      const isAllDone = hasRecs && recs.every((r: any) => r.is_done);
      const isAllSeen = hasRecs && recs.every((r: any) => r.is_seen);

      if (subTab === 'done' && !isAllDone) return false;
      if (subTab === 'read' && (!isAllSeen || isAllDone)) return false;
      if (subTab === 'unread' && (isAllSeen || isAllDone)) return false;

      if (search) {
        const q = search.toLowerCase();
        return (
          alert.title?.toLowerCase().includes(q) ||
          alert.content?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allAlerts, subTab, search]);

  // Counts
  const counts = useMemo(() => {
    const myUnread = myAlerts.filter(a => !a.is_seen && !a.is_done).length;
    const myRead = myAlerts.filter(a => a.is_seen && !a.is_done).length;
    const myDone = myAlerts.filter(a => a.is_done).length;

    const allDone = allAlerts.filter(a => {
      const recs = a.recipients || [];
      return recs.length > 0 && recs.every((r: any) => r.is_done);
    }).length;

    const allRead = allAlerts.filter(a => {
      const recs = a.recipients || [];
      return recs.length > 0 && recs.every((r: any) => r.is_seen) && !recs.every((r: any) => r.is_done);
    }).length;

    const allUnread = allAlerts.filter(a => {
      const recs = a.recipients || [];
      return recs.length === 0 || (!recs.every((r: any) => r.is_seen) && !recs.every((r: any) => r.is_done));
    }).length;

    return { myUnread, myRead, myDone, allUnread, allRead, allDone };
  }, [myAlerts, allAlerts]);

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { bg: Colors.dangerLight, text: Colors.dangerText, label: 'Urgent' };
      case 'high':
        return { bg: Colors.warningLight, text: Colors.warningText, label: 'Haute' };
      case 'low':
        return { bg: Colors.surfaceSubtle, text: Colors.textSecondary, label: 'Basse' };
      default:
        return { bg: Colors.infoLight, text: Colors.infoText, label: 'Normale' };
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      
      {/* Scope Selector Tabs */}
      <View style={styles.scopeContainer}>
        <TouchableOpacity
          style={[styles.scopeBtn, scopeTab === 'my' && styles.scopeBtnActive]}
          onPress={() => setScopeTab('my')}
          activeOpacity={0.8}
        >
          <Ionicons name="person" size={14} color={scopeTab === 'my' ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.scopeBtnText, scopeTab === 'my' && styles.scopeBtnTextActive]}>
            Mes alertes
          </Text>
          {counts.myUnread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{counts.myUnread}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.scopeBtn, scopeTab === 'team' && styles.scopeBtnActive]}
          onPress={() => setScopeTab('team')}
          activeOpacity={0.8}
        >
          <Ionicons name="people" size={14} color={scopeTab === 'team' ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.scopeBtnText, scopeTab === 'team' && styles.scopeBtnTextActive]}>
            Toutes les alertes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub Status Pills */}
      <View style={styles.subTabsContainer}>
        <TouchableOpacity
          style={[styles.subTabPill, subTab === 'unread' && styles.subTabPillActive]}
          onPress={() => setSubTab('unread')}
        >
          <Text style={[styles.subTabText, subTab === 'unread' && styles.subTabTextActive]}>
            Non lues ({scopeTab === 'my' ? counts.myUnread : counts.allUnread})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabPill, subTab === 'read' && styles.subTabPillActive]}
          onPress={() => setSubTab('read')}
        >
          <Text style={[styles.subTabText, subTab === 'read' && styles.subTabTextActive]}>
            Lues ({scopeTab === 'my' ? counts.myRead : counts.allRead})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabPill, subTab === 'done' && styles.subTabPillActive]}
          onPress={() => setSubTab('done')}
        >
          <Text style={[styles.subTabText, subTab === 'done' && styles.subTabTextActive]}>
            Faites ({scopeTab === 'my' ? counts.myDone : counts.allDone})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une alerte..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Feed */}
      <ScrollView
        style={styles.feed}
        contentContainerStyle={styles.feedContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : scopeTab === 'my' ? (
          filteredMyAlerts.length === 0 ? (
            <View style={styles.emptyFeed}>
              <Ionicons name="sparkles-outline" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyFeedTitle}>Aucune alerte</Text>
              <Text style={styles.emptyFeedSub}>Toutes vos alertes sont à jour dans cet état.</Text>
            </View>
          ) : (
            filteredMyAlerts.map(item => {
              const pStyle = getPriorityStyle(item.alert?.priority);
              return (
                <View key={item.id} style={styles.alertCard}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.priorityPill, { backgroundColor: pStyle.bg }]}>
                      <Text style={[styles.priorityPillText, { color: pStyle.text }]}>{pStyle.label}</Text>
                    </View>
                    <Text style={styles.timeText}>{formatTime(item.alert?.created_at)}</Text>
                  </View>

                  <Text style={styles.cardTitle}>{item.alert?.title}</Text>
                  {item.alert?.content ? (
                    <Text style={styles.cardContent}>{item.alert.content}</Text>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <Text style={styles.authorText}>
                      Par {item.alert?.author?.nom || 'Admin'}
                    </Text>

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.doneBtn, item.is_done && styles.doneBtnActive]}
                        onPress={() => handleToggleDone(item.id, item.is_done)}
                        activeOpacity={0.8}
                      >
                        <Ionicons 
                          name={item.is_done ? "checkmark-circle" : "checkmark"} 
                          size={14} 
                          color={item.is_done ? Colors.success : Colors.textSecondary} 
                        />
                        <Text style={[styles.doneBtnText, item.is_done && styles.doneBtnTextActive]}>
                          {item.is_done ? 'Fait' : 'Marquer Fait'}
                        </Text>
                      </TouchableOpacity>

                      {(isAdmin || item.alert?.created_by === user?.id) && (
                        <TouchableOpacity
                          style={styles.deleteBtn}
                          onPress={() => handleDelete(item.alert?.id)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="trash-outline" size={14} color={Colors.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )
        ) : (
          filteredAllAlerts.length === 0 ? (
            <View style={styles.emptyFeed}>
              <Ionicons name="people-outline" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyFeedTitle}>Aucune alerte d'équipe</Text>
            </View>
          ) : (
            filteredAllAlerts.map(alert => {
              const pStyle = getPriorityStyle(alert.priority);
              const recs = alert.recipients || [];
              return (
                <View key={alert.id} style={styles.alertCard}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.priorityPill, { backgroundColor: pStyle.bg }]}>
                      <Text style={[styles.priorityPillText, { color: pStyle.text }]}>{pStyle.label}</Text>
                    </View>
                    <Text style={styles.timeText}>{formatTime(alert.created_at)}</Text>
                  </View>

                  <Text style={styles.cardTitle}>{alert.title}</Text>
                  {alert.content ? (
                    <Text style={styles.cardContent}>{alert.content}</Text>
                  ) : null}

                  {/* Recipients chips */}
                  <View style={styles.recsRow}>
                    <Text style={styles.recsLabel}>Pour :</Text>
                    {recs.map((r: any) => (
                      <View key={r.id} style={[styles.recChip, r.is_done && styles.recChipDone]}>
                        <Text style={[styles.recChipText, r.is_done && styles.recChipTextDone]}>
                          {r.user?.nom || 'Agent'}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.authorText}>
                      Par {alert.author?.nom || 'Admin'}
                    </Text>

                    {(isAdmin || alert.created_by === user?.id) && (
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(alert.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="trash-outline" size={14} color={Colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )
        )}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scopeContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    margin: Spacing.md,
    marginBottom: Spacing.xs,
    padding: 4,
    borderRadius: Radius.md,
  },
  scopeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  scopeBtnActive: {
    backgroundColor: Colors.surface,
    ...Colors.cardShadow,
  },
  scopeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  scopeBtnTextActive: {
    color: Colors.text,
  },
  unreadBadge: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  unreadBadgeText: {
    color: Colors.textInverse,
    fontSize: 9,
    fontWeight: '900',
  },
  subTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  subTabPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  subTabPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  subTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  subTabTextActive: {
    color: Colors.textInverse,
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    paddingHorizontal: Spacing.md,
    height: 38,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  emptyFeed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyFeedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptyFeedSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  alertCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    ...Colors.cardShadow,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  priorityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs || 4,
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  timeText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 18,
    marginTop: 2,
  },
  cardContent: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  recsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  recsLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  recChip: {
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs || 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recChipDone: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },
  recChipText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  recChipTextDone: {
    color: Colors.successText,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  authorText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  doneBtnActive: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },
  doneBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  doneBtnTextActive: {
    color: Colors.successText,
    fontWeight: '800',
  },
  deleteBtn: {
    padding: 4,
  },
});
