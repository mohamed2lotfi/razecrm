import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert as NativeAlert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors, Radius, Spacing } from '../../src/constants/theme';

export default function ProfileScreen() {
  const { user, profile, signOut, isAdmin } = useAuth();

  const handleLogout = () => {
    NativeAlert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter du CRM ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Déconnexion', 
          style: 'destructive', 
          onPress: async () => {
            await signOut();
          } 
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarLetter}>
            {(profile?.nom || 'A')[0].toUpperCase()}
          </Text>
        </View>

        <Text style={styles.profileName}>{profile?.nom || 'Agent'}</Text>
        <Text style={styles.profileEmail}>{user?.email || ''}</Text>

        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {isAdmin ? 'ADMINISTRATEUR' : 'AGENT CRM'}
          </Text>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>Informations Compte</Text>

        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoVal}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark-outline" size={18} color={Colors.textSecondary} />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Rôle CRM</Text>
            <Text style={styles.infoVal}>{profile?.role || 'agent'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="business-outline" size={18} color={Colors.textSecondary} />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Agence</Text>
            <Text style={styles.infoVal}>Agence de Voyages El-Mokhtar</Text>
          </View>
        </View>
      </View>

      {/* App Info Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>Application</Text>

        <View style={styles.infoRow}>
          <Ionicons name="phone-portrait-outline" size={18} color={Colors.textSecondary} />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Version Mobile</Text>
            <Text style={styles.infoVal}>1.0.0 (Build 2026)</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="cloud-done-outline" size={18} color={Colors.textSecondary} />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Base de Données</Text>
            <Text style={styles.infoVal}>Supabase Cloud (Temps-Réel)</Text>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity 
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
        <Text style={styles.logoutBtnText}>Se Déconnecter</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>CRM El-Mokhtar • Tous droits réservés</Text>
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
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    ...Colors.cardShadow,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Colors.cardShadow,
  },
  avatarLetter: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textInverse,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  profileEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginTop: Spacing.md,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    ...Colors.cardShadow,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.dangerLight,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.danger,
    marginTop: Spacing.md,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.dangerText,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: Spacing.xl,
  },
});
