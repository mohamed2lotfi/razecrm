import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { supabase } from './lib/supabase';
import { Bell, ArrowRight, X, Sparkles } from 'lucide-react';
import MobileHeader from './components/MobileHeader';
import BottomNavbar from './components/BottomNavbar';
import DevisView from './pages/DevisView';
import FlightsView from './pages/FlightsView';
import SimulatorView from './pages/SimulatorView';
import AlertsView from './pages/AlertsView';
import LoginView from './pages/LoginView';

// Audio chime using Web Audio API (cross-platform, zero dependencies)
const playNotificationChime = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Audio context may be restricted before user gesture
  }
};

const PocketAppContent = () => {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('devis'); // 'devis' | 'vols' | 'simulateur' | 'alertes'
  const [pendingDevisCount, setPendingDevisCount] = useState(0);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [bannerAlert, setBannerAlert] = useState(null);

  const currentUserId = profile?.id || user?.id;

  // Global unread alerts fetcher
  const fetchGlobalUnreadCount = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const { count, error } = await supabase
        .from('alert_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', currentUserId)
        .eq('is_seen', false)
        .eq('is_done', false);

      if (!error && typeof count === 'number') {
        setUnreadAlertsCount(count);
      }
    } catch (err) {
      console.warn('Error fetching global alert count:', err);
    }
  }, [currentUserId]);

  // Realtime subscription + polling interval for instant alerts
  useEffect(() => {
    if (!currentUserId) return;

    fetchGlobalUnreadCount();

    // 1. Polling interval (every 10s) to keep badge accurate
    const interval = setInterval(fetchGlobalUnreadCount, 10000);

    // 2. Realtime WebSocket listener on alert_recipients
    const channel = supabase
      .channel(`pocketapp-alerts-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alert_recipients',
          filter: `recipient_id=eq.${currentUserId}`,
        },
        async (payload) => {
          fetchGlobalUnreadCount();

          if (payload.eventType === 'INSERT') {
            try {
              const { data: alertData } = await supabase
                .from('alerts')
                .select('id, title, content, priority')
                .eq('id', payload.new.alert_id)
                .single();

              const alertInfo = alertData || {
                title: 'Nouvelle alerte CRM',
                content: 'Une alerte vient d\'être assignée à votre profil manager.',
              };

              setBannerAlert(alertInfo);
              playNotificationChime();
              if (navigator.vibrate) navigator.vibrate([150, 75, 150]);
            } catch (e) {
              setBannerAlert({
                title: 'Nouvelle alerte CRM',
                content: 'Vous avez reçu une nouvelle alerte.',
              });
              playNotificationChime();
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchGlobalUnreadCount]);

  // Auto-dismiss banner after 8 seconds
  useEffect(() => {
    if (bannerAlert) {
      const timer = setTimeout(() => {
        setBannerAlert(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [bannerAlert]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-950 flex flex-col items-center justify-center p-4 transition-colors">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wide">Chargement de la PocketApp...</p>
      </div>
    );
  }

  if (!user && !profile) {
    return <LoginView />;
  }

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'vols':
        return 'رحلات العمرة القادمة';
      case 'simulateur':
        return 'Simulateur Devis';
      case 'alertes':
        return 'Mes Alertes';
      case 'devis':
      default:
        return 'Devis Managers';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200 w-full max-w-full relative">
      {/* Mobile Top Header with Theme Toggle & Refresh */}
      <MobileHeader title={getHeaderTitle()} />

      {/* Floating In-App Alert Notification Banner */}
      {bannerAlert && (
        <div className="fixed top-16 left-4 right-4 z-50 max-w-md mx-auto animate-in slide-in-from-top-4 duration-300">
          <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-2xl p-3.5 shadow-2xl shadow-red-950/40 border border-white/20 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 mt-0.5">
              <Bell size={18} className="animate-bounce" />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 px-1.5 py-0.5 rounded-full">
                  Alerte Reçue
                </span>
                <span className="text-[10px] text-red-100 font-medium">À l'instant</span>
              </div>
              <h4 className="font-extrabold text-xs text-white truncate mt-1">
                {bannerAlert.title}
              </h4>
              {bannerAlert.content && (
                <p className="text-[11px] text-red-100 line-clamp-1 mt-0.5">
                  {bannerAlert.content}
                </p>
              )}
              <button
                onClick={() => {
                  setBannerAlert(null);
                  setActiveTab('alertes');
                }}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-black bg-white text-red-700 px-2.5 py-1 rounded-lg active:scale-95 transition-all shadow-xs"
              >
                <span>Consulter l'alerte</span>
                <ArrowRight size={12} />
              </button>
            </div>
            <button
              onClick={() => setBannerAlert(null)}
              className="w-7 h-7 rounded-lg bg-black/10 hover:bg-black/20 flex items-center justify-center text-white/80 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content View (Restricted to mobile width) */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-4 pb-20">
        {activeTab === 'devis' && (
          <DevisView onPendingCountChange={setPendingDevisCount} />
        )}
        {activeTab === 'vols' && <FlightsView />}
        {activeTab === 'simulateur' && <SimulatorView />}
        {activeTab === 'alertes' && (
          <AlertsView
            onUnreadCountChange={setUnreadAlertsCount}
            onRefreshCount={fetchGlobalUnreadCount}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNavbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingCount={pendingDevisCount}
        alertsCount={unreadAlertsCount}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PocketAppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
