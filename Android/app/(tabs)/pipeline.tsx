import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors, Radius, Spacing } from '../../src/constants/theme';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  nouvelle: { label: 'Demande', bg: Colors.infoLight, text: Colors.infoText },
  en_cours: { label: 'En cours', bg: Colors.warningLight, text: Colors.warningText },
  envoye: { label: 'Devis envoyé', bg: '#f3e8ff', text: '#6b21a8' },
  converti_vente: { label: 'Vente', bg: Colors.successLight, text: Colors.successText },
  converti_omra: { label: 'Omra', bg: Colors.successLight, text: Colors.successText },
  ferme: { label: 'Fermé', bg: Colors.surfaceSubtle, text: Colors.textMuted },
};

export default function PipelineScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pipelineData, setPipelineData] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  const fetchPipeline = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pipeline')
        .select('*, clients(*)')
        .order('date_creation', { ascending: false })
        .limit(60);

      if (!error && data) {
        setPipelineData(data);
      }
    } catch (err) {
      console.warn('Erreur chargement pipeline mobile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPipeline();
  };

  const parseMeta = (detailsStr: string) => {
    try {
      if (detailsStr && detailsStr.trim().startsWith('{')) {
        return JSON.parse(detailsStr);
      }
    } catch {}
    return {};
  };

  const filteredPipeline = useMemo(() => {
    return pipelineData.filter(item => {
      if (selectedStatus !== 'all' && item.status !== selectedStatus) {
        return false;
      }

      if (search) {
        const q = search.toLowerCase();
        const clientNom = (item.clients?.nom || item.nom_prospect || '').toLowerCase();
        const meta = parseMeta(item.details_devis);
        const nomDevis = (meta.nom_devis || '').toLowerCase();
        const dest = (meta.destination || '').toLowerCase();
        const agent = (meta.agent_nom || '').toLowerCase();

        return clientNom.includes(q) || nomDevis.includes(q) || dest.includes(q) || agent.includes(q);
      }

      return true;
    });
  }, [pipelineData, selectedStatus, search]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par client, destination, devis..."
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

      {/* Status Filter Horizontal Scroll */}
      <View style={styles.filterScrollWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity 
            style={[styles.filterChip, selectedStatus === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedStatus('all')}
          >
            <Text style={[styles.filterChipText, selectedStatus === 'all' && styles.filterChipTextActive]}>
              Tous ({pipelineData.length})
            </Text>
          </TouchableOpacity>

          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = pipelineData.filter(p => p.status === key).length;
            const isActive = selectedStatus === key;
            return (
              <TouchableOpacity 
                key={key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedStatus(key)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {cfg.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Feed */}
      <ScrollView
        style={styles.feed}
        contentContainerStyle={styles.feedContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : filteredPipeline.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={36} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Aucun devis trouvé</Text>
          </View>
        ) : (
          filteredPipeline.map(item => {
            const meta = parseMeta(item.details_devis);
            const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.nouvelle;
            const isAssignedToMe = meta.agent_id && meta.agent_id === user?.id;

            return (
              <View key={item.id} style={styles.devisCard}>
                <View style={styles.cardHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusConfig.text }]}>
                      {statusConfig.label}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(item.date_creation)}</Text>
                </View>

                <Text style={styles.clientName}>
                  {item.clients?.nom || item.nom_prospect || 'Client Prospect'}
                </Text>

                {meta.nom_devis ? (
                  <Text style={styles.nomDevisText}>{meta.nom_devis}</Text>
                ) : null}

                <View style={styles.detailsRow}>
                  {meta.destination ? (
                    <View style={styles.detailTag}>
                      <Ionicons name="location-outline" size={12} color={Colors.primary} />
                      <Text style={styles.detailTagText}>{meta.destination}</Text>
                    </View>
                  ) : null}

                  {meta.priorite ? (
                    <View style={styles.detailTag}>
                      <Ionicons name="flag-outline" size={12} color={Colors.warning} />
                      <Text style={styles.detailTagText}>{meta.priorite}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.agentTag}>
                    <Ionicons name="person-outline" size={12} color={Colors.textSecondary} />
                    <Text style={[styles.agentText, isAssignedToMe && styles.agentTextMe]}>
                      {meta.agent_nom ? (isAssignedToMe ? `${meta.agent_nom} (Moi)` : meta.agent_nom) : 'Non assigné'}
                    </Text>
                  </View>

                  {item.phone || item.clients?.telephone ? (
                    <Text style={styles.phoneText}>
                      📞 {item.phone || item.clients?.telephone}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
  },
  filterScrollWrapper: {
    paddingBottom: Spacing.sm,
  },
  filterScroll: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.textInverse,
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    padding: Spacing.md,
    paddingTop: 0,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    fontWeight: '600',
  },
  devisCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    ...Colors.cardShadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 2,
  },
  nomDevisText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  detailTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  detailTagText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
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
  agentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  agentText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  agentTextMe: {
    color: Colors.primary,
    fontWeight: '800',
  },
  phoneText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
