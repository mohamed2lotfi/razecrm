import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const ClientAuthContext = createContext({});

export const useClientAuth = () => {
  return useContext(ClientAuthContext);
};

export const ClientAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchClientProfile = async (currentUser) => {
    if (!currentUser) {
      setClientProfile(null);
      return;
    }
    try {
      // 1. Chercher dans public.profiles
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      // 2. Chercher dans public.clients par email
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('email', currentUser.email)
        .maybeSingle();

      setClientProfile({
        ...(profData || {}),
        clientId: clientData?.id || null,
        clientData: clientData || null,
        nom: profData?.nom || clientData?.nom || currentUser.email?.split('@')[0],
        email: currentUser.email
      });
    } catch (err) {
      console.warn('Erreur chargement profil client:', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchClientProfile(session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchClientProfile(session.user);
      } else {
        setClientProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async (nom, email, telephone, password) => {
    // 1. Inscription Auth Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nom,
          telephone,
          role: 'client'
        }
      }
    });

    if (error) throw error;

    // 2. Création automatique de la fiche client et profil
    if (data?.user) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email,
          nom,
          role: 'client'
        });

        await supabase.from('clients').insert([{
          nom,
          email,
          telephone,
          type: 'Particulier'
        }]);
      } catch (e) {
        console.warn('Erreur synchronisation client:', e);
      }
    }

    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setClientProfile(null);
  };

  const value = {
    session,
    user,
    clientProfile,
    isAuthenticated: !!session?.user,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile: () => fetchClientProfile(user)
  };

  return (
    <ClientAuthContext.Provider value={value}>
      {!loading && children}
    </ClientAuthContext.Provider>
  );
};
