import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId, userEmail) => {
    try {
      if (!userId) {
        setProfile(null);
        return null;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setProfile(data);
        return data;
      } else {
        // Fallback si la table profiles existe mais le profil n'a pas encore été créé
        const fallbackProfile = {
          id: userId,
          email: userEmail,
          nom: userEmail ? userEmail.split('@')[0] : 'Utilisateur',
          role: 'admin' // Par défaut admin pour le compte principal si non défini
        };
        setProfile(fallbackProfile);
        return fallbackProfile;
      }
    } catch (err) {
      console.warn('Erreur lors du chargement du profil:', err);
      const fallback = {
        id: userId,
        email: userEmail,
        role: 'admin'
      };
      setProfile(fallback);
      return fallback;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Obtenir la session actuelle
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Écouter les changements d'état de l'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id, session.user.email);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user?.id) {
      return await fetchProfile(user.id, user.email);
    }
    return null;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data?.user) {
      await fetchProfile(data.user.id, data.user.email);
    }
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  const role = profile?.role || 'agent';
  const isAdmin = role === 'admin';
  const isAgent = role === 'agent';

  const value = {
    session,
    user,
    profile,
    role,
    isAdmin,
    isAgent,
    refreshProfile,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

