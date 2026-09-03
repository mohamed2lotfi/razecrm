import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { Colors, Radius, Spacing } from '../../src/constants/theme';

export default function ClientsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all'); // 'all' | 'Particulier' | 'Entreprise'

  const fetchClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('nom', { ascending: true })
        .limit(100);

      if (!error && data) {
        setClients(data);
      }
    } catch (err) {
      console.warn('Erreur chargement clients mobile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClients();
  };

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      if (selectedType !== 'all') {
        const type = c.type || 'Particulier';
        if (type !== selectedType) return false;
      }

      if (search) {
        const q = search.toLowerCase();
        const nom = (c.nom || '').toLowerCase();
        const tel = (c.telephone || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const ville = (c.ville || '').toLowerCase();

        return nom.includes(q) || tel.includes(q) || email.includes(q) || ville.includes(q);
      }

      return true;
    });
  }, [clients, selectedType, search]);

  const handleCall = (phone: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const handleWhatsApp = (phone: string, nom: string) => {
    if (!phone) return;
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '213' + cleanPhone.substring(1);
    const message = encodeURIComponent(`Bonjour ${nom}, nous vous contactons depuis l'Agence de Voyages El-Mokhtar.`);
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${message}`);
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom, téléphone, ville..."
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

      {/* Filter Type Pills */}
      <View style={styles.typeRow}>
        <TouchableOpacity
          style={[styles.typePill, selectedType === 'all' && styles.typePillActive]}
          onPress={() => setSelectedType('all')}
        >
          <Text style={[styles.typePillText, selectedType === 'all' && styles.typePillTextActive]}>
            Tous ({clients.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typePill, selectedType === 'Particulier' && styles.typePillActive]}
          onPress={() => setSelectedType('Particulier')}
        >
          <Text style={[styles.typePillText, selectedType === 'Particulier' && styles.typePillTextActive]}>
            Particuliers ({clients.filter(c => (c.type || 'Particulier') === 'Particulier').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typePill, selectedType === 'Entreprise' && styles.typePillActive]}
          onPress={() => setSelectedType('Entreprise')}
        >
          <Text style={[styles.typePillText, selectedType === 'Entreprise' && styles.typePillTextActive]}>
            Entreprises ({clients.filter(c => c.type === 'Entreprise').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Clients Feed */}
      <ScrollView
        style={styles.feed}
        contentContainerStyle={styles.feedContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : filteredClients.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={36} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Aucun client trouvé</Text>
          </View>
        ) : (
          filteredClients.map(client => {
            const isEntreprise = client.type === 'Entreprise';
            return (
              <View key={client.id} style={styles.clientCard}>
                <View style={styles.clientHeader}>
                  <View style={styles.clientAvatar}>
                    <Text style={styles.avatarLetter}>
                      {(client.nom || 'C')[0].toUpperCase()}
                    </Text>
                  </View>
                  
                  <View style={styles.clientInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.clientName} numberOfLines={1}>
                        {client.nom}
                      </Text>
                      <View style={[styles.typeBadge, isEntreprise && styles.typeBadgeEnt]}>
                        <Text style={[styles.typeBadgeText, isEntreprise && styles.typeBadgeTextEnt]}>
                          {client.type || 'Particulier'}
                        </Text>
                      </View>
                    </View>

                    {client.ville ? (
                      <Text style={styles.clientCity}>📍 {client.ville}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Contact details */}
                <View style={styles.contactRow}>
                  {client.telephone ? (
                    <Text style={styles.contactText}>📞 {client.telephone}</Text>
                  ) : null}
                  {client.email ? (
                    <Text style={styles.contactText}>✉️ {client.email}</Text>
                  ) : null}
                </View>

                {/* Direct Action Buttons */}
                {client.telephone ? (
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.callBtn}
                      onPress={() => handleCall(client.telephone)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="call" size={14} color={Colors.info} />
                      <Text style={styles.callBtnText}>Appeler</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.waBtn}
                      onPress={() => handleWhatsApp(client.telephone, client.nom)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="logo-whatsapp" size={14} color={Colors.success} />
                      <Text style={styles.waBtnText}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
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
  typeRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  typePill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  typePillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  typePillTextActive: {
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
  clientCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    ...Colors.cardShadow,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },
  clientInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
    flex: 1,
  },
  typeBadge: {
    backgroundColor: Colors.infoLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs || 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.infoText,
    textTransform: 'uppercase',
  },
  typeBadgeEnt: {
    backgroundColor: '#f3e8ff',
  },
  typeBadgeTextEnt: {
    color: '#6b21a8',
  },
  clientCity: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  contactRow: {
    marginTop: Spacing.sm,
    gap: 2,
  },
  contactText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.infoLight,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.infoText,
  },
  waBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.successLight,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  waBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.successText,
  },
});
