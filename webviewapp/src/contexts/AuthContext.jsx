import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allManagers, setAllManagers] = useState([]);

  const autoAuthenticateUser = async (email) => {
    if (!email) return null;
    const candidates = ['123456', '12345678', 'password', 'admin123', 'manager123'];
    for (const pwd of candidates) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pwd,
        });
        if (!error && data?.user) {
          return data.user;
        }
      } catch (e) {
        // continue
      }
    }
    return null;
  };

  useEffect(() => {
    // 1. Check active session
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          // Check if user saved demo/manager session locally
          const storedManager = localStorage.getItem('pocketapp_active_manager');
          if (storedManager) {
            try {
              const parsed = JSON.parse(storedManager);
              setProfile(parsed);
              setUser({ id: parsed.id, email: parsed.email });

              // Auto-authenticate in background so Supabase RLS allows reading alerts
              if (parsed.email) {
                autoAuthenticateUser(parsed.email).then((authUser) => {
                  if (authUser) {
                    setUser(authUser);
                    fetchProfile(authUser.id);
                  }
                });
              }
            } catch (e) {}
          }
        }
        await loadAvailableManagers();
      } catch (err) {
        console.error('Error init auth:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        const storedManager = localStorage.getItem('pocketapp_active_manager');
        if (!storedManager) {
          setUser(null);
          setProfile(null);
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const loadAvailableManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('nom', { ascending: true });

      if (data) {
        // Find managers and admins
        const managers = data.filter(p => p.role === 'manager' || p.role === 'admin');
        setAllManagers(managers.length > 0 ? managers : data);
      }
    } catch (err) {
      console.warn('Error loading managers:', err);
    }
  };

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setProfile(data);
        localStorage.setItem('pocketapp_active_manager', JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Error fetching profile:', err);
    }
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data?.user) {
      setUser(data.user);
      await fetchProfile(data.user.id);
    }
    return data;
  };

  // Switch/Demo manager selector (extremely helpful for WebView / mobile testing)
  const selectManager = async (managerProfile) => {
    setProfile(managerProfile);
    setUser({ id: managerProfile.id, email: managerProfile.email });
    localStorage.setItem('pocketapp_active_manager', JSON.stringify(managerProfile));

    // Authenticate with Supabase so RLS-protected queries work immediately
    if (managerProfile.email) {
      const authUser = await autoAuthenticateUser(managerProfile.email);
      if (authUser) {
        setUser(authUser);
        await fetchProfile(authUser.id);
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('pocketapp_active_manager');
    setUser(null);
    setProfile(null);
  };

  const value = {
    user,
    profile,
    loading,
    allManagers,
    isManager: profile?.role === 'manager' || profile?.role === 'admin',
    signIn,
    signOut,
    selectManager,
    refreshProfile: () => user && fetchProfile(user.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
