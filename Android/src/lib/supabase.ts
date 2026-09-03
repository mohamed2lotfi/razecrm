import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = 'https://lsrrnzfaygvgvbnistte.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzcnJuemZheWd2Z3ZibmlzdHRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5ODM5MDMsImV4cCI6MjEwMDU1OTkwM30.6b2phutViDtKK1WhSxkE82Oz5LEdbOQsciU_rTc_2rw';

// Only bypass AsyncStorage during Node.js server-side web rendering
const isNodeSSR = Platform.OS === 'web' && typeof window === 'undefined';

const safeStorage = {
  getItem: async (key: string) => {
    if (isNodeSSR) return null;
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.warn('AsyncStorage getItem error:', e);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    if (isNodeSSR) return;
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn('AsyncStorage setItem error:', e);
    }
  },
  removeItem: async (key: string) => {
    if (isNodeSSR) return;
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('AsyncStorage removeItem error:', e);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: !isNodeSSR,
    persistSession: !isNodeSSR,
    detectSessionInUrl: false,
  },
});
