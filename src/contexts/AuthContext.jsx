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
          role: 'admin', // Par défaut admin pour le compte principal si non défini
          avatar_url: null,
          telephone: ''
        };
        setProfile(fallbackProfile);
        return fallbackProfile;
      }
    } catch (err) {
      console.warn('Erreur lors du chargement du profil:', err);
      const fallback = {
        id: userId,
        email: userEmail,
        nom: userEmail ? userEmail.split('@')[0] : 'Utilisateur',
        role: 'admin',
        avatar_url: null,
        telephone: ''
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

  // Update profile information (nom, avatar_url, telephone)
  const updateProfile = async (updates) => {
    if (!user?.id) throw new Error("Utilisateur non connecté");

    const payload = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Update in Supabase
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email, ...payload })
      .select();

    if (error) {
      // Fallback local state if table doesn't have the column yet
      console.warn('Erreur DB profile update, fallback local:', error);
      setProfile(prev => ({ ...prev, ...updates }));
      return { ...profile, ...updates };
    }

    if (data && data[0]) {
      setProfile(data[0]);
      return data[0];
    } else {
      setProfile(prev => ({ ...prev, ...updates }));
      return { ...profile, ...updates };
    }
  };

  // Upload Avatar image (supports Supabase storage bucket with Base64 fallback)
  const uploadAvatar = async (file) => {
    if (!user?.id) throw new Error("Utilisateur non connecté");
    if (!file) throw new Error("Aucun fichier sélectionné");

    try {
      const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
      const filePath = `user_${user.id}_${Date.now()}.${fileExt}`;

      // Try uploading to Supabase 'avatars' storage bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          await updateProfile({ avatar_url: urlData.publicUrl });
          return urlData.publicUrl;
        }
      }
    } catch (storageErr) {
      console.warn("Storage upload failed, using Data URL fallback:", storageErr);
    }

    // Reliable fallback: convert to base64 Data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Url = reader.result;
          await updateProfile({ avatar_url: base64Url });
          resolve(base64Url);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Update Email via Supabase Auth
  const updateEmail = async (newEmail) => {
    if (!newEmail || newEmail.trim() === '') throw new Error("Veuillez saisir une adresse email valide");
    
    const { data, error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) throw error;

    // Update in profiles table as well
    if (user?.id) {
      await supabase.from('profiles').update({ email: newEmail.trim() }).eq('id', user.id);
      setProfile(prev => ({ ...prev, email: newEmail.trim() }));
    }

    return data;
  };

  // Update Password via Supabase Auth
  const updatePassword = async (newPassword) => {
    if (!newPassword || newPassword.length < 6) {
      throw new Error("Le mot de passe doit contenir au moins 6 caractères");
    }
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
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
    updateProfile,
    uploadAvatar,
    updateEmail,
    updatePassword,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
