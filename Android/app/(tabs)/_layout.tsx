import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/theme';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';

export default function TabLayout() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const fetchUnread = async () => {
      try {
        const { count, error } = await supabase
          .from('alert_recipients')
          .select('id, alert:alerts!inner(alert_at, status)', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .eq('is_seen', false)
          .eq('is_done', false)
          .eq('alert.status', 'active');

        if (!error && typeof count === 'number') {
          setUnreadCount(count);
        }
      } catch {}
    };

    fetchUnread();

    const channel = supabase
      .channel(`mobile_alerts_badge_${user.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'alert_recipients',
          filter: `recipient_id=eq.${user.id}`
        },
        () => {
          fetchUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
        headerStyle: {
          backgroundColor: Colors.surface,
          borderBottomColor: Colors.border,
          borderBottomWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '800',
          color: Colors.text,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          headerTitle: 'Tableau de Bord',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alertes',
          headerTitle: 'Notifications & Alertes',
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: Colors.danger,
            fontSize: 9,
            fontWeight: '900',
          },
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="pipeline"
        options={{
          title: 'Devis',
          headerTitle: 'Pipeline & Devis',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
          headerTitle: 'Répertoire Clients',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          headerTitle: 'Mon Espace Agent',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
        }}
      />

      {/* Hide two.tsx template file from tabs */}
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
