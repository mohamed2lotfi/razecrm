import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  nom?: string;
  email?: string;
  role?: string;
  avatar_url?: string;
  telephone?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const fetchProfile = async (userId: string, userEmail?: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (isMounted.current) {
        if (data) {
          setProfile(data);
        } else {
          setProfile({
            id: userId,
            email: userEmail,
            nom: userEmail ? userEmail.split('@')[0] : 'Agent',
            role: 'agent',
          });
        }
      }
    } catch (err) {
      console.warn('Erreur chargement profil mobile:', err);
      if (isMounted.current) {
        setProfile({
          id: userId,
          email: userEmail,
          nom: userEmail ? userEmail.split('@')[0] : 'Agent',
          role: 'agent',
        });
      }
    }
  };

  useEffect(() => {
    isMounted.current = true;

    // Safety timeout: Never stay stuck on loading screen for more than 2.5s
    const timeoutId = setTimeout(() => {
      if (isMounted.current) {
        setLoading(false);
      }
    }, 2500);

    // Initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted.current) {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id, session.user.email);
        }
        setLoading(false);
        clearTimeout(timeoutId);
      }
    }).catch(() => {
      if (isMounted.current) {
        setLoading(false);
        clearTimeout(timeoutId);
      }
    });

    // Auth change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted.current) {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id, session.user.email);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted.current = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data?.user) {
      await fetchProfile(data.user.id, data.user.email);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id, user.email);
    }
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isAdmin,
        loading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
