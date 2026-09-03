import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { Colors, Radius, Spacing } from '../../src/constants/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    unreadAlerts: 0,
    activeDevis: 0,
    totalClients: 0,
    omraInscrits: 0,
  });
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Fetch unread alerts count
      const { count: unreadCount } = await supabase
        .from('alert_recipients')
        .select('id, alert:alerts!inner(status)', { count: 'exact', head: true })
        .eq('recipient_id', user?.id)
        .eq('is_seen', false)
        .eq('is_done', false)
        .eq('alert.status', 'active');

      // 2. Fetch active devis count
      const { count: devisCount } = await supabase
        .from('pipeline')
        .select('id', { count: 'exact', head: true })
        .in('status', ['nouvelle', 'en_cours', 'envoye']);

      // 3. Fetch clients count
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('id', { count: 'exact', head: true });

      // 4. Fetch Omra inscriptions count
      const { count: omraCount } = await supabase
        .from('pelerins')
        .select('id', { count: 'exact', head: true });

      // 5. Recent alerts for this user
      const { data: alertsData } = await supabase
        .from('alert_recipients')
        .select(`
          id,
          is_seen,
          is_done,
          created_at,
          alert:alerts (
            id,
            title,
            content,
            priority,
            created_at
          )
        `)
        .eq('recipient_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3);

      setStats({
        unreadAlerts: unreadCount || 0,
        activeDevis: devisCount || 0,
        totalClients: clientsCount || 0,
        omraInscrits: omraCount || 0,
      });

      setRecentAlerts(alertsData || []);
    } catch (err) {
      console.warn('Erreur chargement dashboard mobile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id, fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Bonjour';
    if (hours < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement du CRM...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
    >
      {/* Agent Welcome Card */}
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeHeader}>
          <View>
            <Text style={styles.greetingText}>{getGreeting()},</Text>
            <Text style={styles.agentName}>{profile?.nom || 'Agent'}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{profile?.role?.toUpperCase() || 'AGENT'}</Text>
            </View>
          </View>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {(profile?.nom || 'A')[0].toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* KPI Stats Grid */}
      <Text style={styles.sectionTitle}>Statistiques Clés</Text>
      <View style={styles.statsGrid}>
        
        <TouchableOpacity 
          style={styles.statCard} 
          onPress={() => router.push('/(tabs)/alerts')}
          activeOpacity={0.8}
        >
          <View style={[styles.statIconBadge, { backgroundColor: Colors.dangerLight }]}>
            <Ionicons name="notifications" size={20} color={Colors.danger} />
          </View>
          <Text style={styles.statValue}>{stats.unreadAlerts}</Text>
          <Text style={styles.statLabel}>Alertes non lues</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statCard} 
          onPress={() => router.push('/(tabs)/pipeline')}
          activeOpacity={0.8}
        >
          <View style={[styles.statIconBadge, { backgroundColor: Colors.infoLight }]}>
            <Ionicons name="document-text" size={20} color={Colors.info} />
          </View>
          <Text style={styles.statValue}>{stats.activeDevis}</Text>
          <Text style={styles.statLabel}>Devis en cours</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statCard} 
          onPress={() => router.push('/(tabs)/clients')}
          activeOpacity={0.8}
        >
          <View style={[styles.statIconBadge, { backgroundColor: Colors.successLight }]}>
            <Ionicons name="people" size={20} color={Colors.success} />
          </View>
          <Text style={styles.statValue}>{stats.totalClients}</Text>
          <Text style={styles.statLabel}>Clients actifs</Text>
        </TouchableOpacity>

        <View style={styles.statCard}>
          <View style={[styles.statIconBadge, { backgroundColor: Colors.warningLight }]}>
            <Ionicons name="airplane" size={20} color={Colors.warning} />
          </View>
          <Text style={styles.statValue}>{stats.omraInscrits}</Text>
          <Text style={styles.statLabel}>Pèlerins Omra</Text>
        </View>

      </View>

      {/* Quick Action Shortcuts */}
      <Text style={styles.sectionTitle}>Accès Rapide</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/alerts')}
          activeOpacity={0.8}
        >
          <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
          <Text style={styles.actionText}>Voir mes Alertes</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/pipeline')}
          activeOpacity={0.8}
        >
          <Ionicons name="funnel-outline" size={18} color={Colors.primary} />
          <Text style={styles.actionText}>Pipeline Devis</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Alerts Feed */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Dernières Alertes</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/alerts')}>
          <Text style={styles.seeAllText}>Tout voir</Text>
        </TouchableOpacity>
      </View>

      {recentAlerts.length === 0 ? (
        <View style={styles.emptyAlertsCard}>
          <Ionicons name="checkmark-circle-outline" size={28} color={Colors.success} />
          <Text style={styles.emptyAlertsTitle}>Tout est à jour !</Text>
          <Text style={styles.emptyAlertsSub}>Aucune alerte urgente en attente.</Text>
        </View>
      ) : (
        recentAlerts.map(item => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.recentAlertCard}
            onPress={() => router.push('/(tabs)/alerts')}
            activeOpacity={0.8}
          >
            <View style={styles.alertCardHeader}>
              <View style={[
                styles.priorityDot, 
                { backgroundColor: item.alert?.priority === 'urgent' ? Colors.danger : item.alert?.priority === 'high' ? Colors.warning : Colors.info }
              ]} />
              <Text style={styles.alertTitle} numberOfLines={1}>
                {item.alert?.title || 'Notification'}
              </Text>
            </View>
            {item.alert?.content ? (
              <Text style={styles.alertContent} numberOfLines={2}>
                {item.alert.content}
              </Text>
            ) : null}
          </TouchableOpacity>
        ))
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  welcomeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
    ...Colors.cardShadow,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  agentName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: Colors.primaryLight,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    marginTop: Spacing.xs,
  },
  roleText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Colors.cardShadow,
  },
  avatarInitial: {
    color: Colors.textInverse,
    fontSize: 20,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    width: '47.5%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Colors.cardShadow,
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    ...Colors.cardShadow,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyAlertsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyAlertsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  emptyAlertsSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  recentAlertCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    ...Colors.cardShadow,
  },
  alertCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  alertContent: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 16,
  },
});
