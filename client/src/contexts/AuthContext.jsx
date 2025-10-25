import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, authHelpers, isSupabaseConfigured } from '../config/supabase';

const defaultContextValue = {
  user: null,
  session: null,
  loading: true,
  isGuest: false,
  isConfigured: false,
  signUp: async () => {},
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signInWithGitHub: async () => {},
  signInWithMagicLink: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
  updateProfile: async () => {},
  enterAsGuest: () => {},
  exitGuest: () => {},
};

const AuthContext = createContext(defaultContextValue);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [isConfigured] = useState(isSupabaseConfigured());
  
  // DEBUG: Log AuthContext state (only in development)
  if (import.meta.env.DEV) {
    console.log('🔐 AuthContext State:', {
      isConfigured,
      loading,
      hasUser: !!user,
      isGuest
    });
  }

  const exitGuest = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('seedboxlite_guest');
    }
    setIsGuest(false);
  }, []);

  const enterAsGuest = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('seedboxlite_guest', 'true');
    }
    setSession(null);
    setUser(null);
    setIsGuest(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedGuest = localStorage.getItem('seedboxlite_guest');
    if (storedGuest === 'true') {
      setIsGuest(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    let authSubscription;

    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          return;
        }

        setSession(data.session);
        setUser(data.session?.user ?? null);
        if (data.session?.user) {
          exitGuest();
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    const handleAuthEvent = async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      if (newSession?.user) {
        exitGuest();
      }
    };

    initializeAuth();

    const subscription = supabase.auth.onAuthStateChange(handleAuthEvent);
    authSubscription = subscription?.data?.subscription;

    return () => {
      authSubscription?.unsubscribe();
    };
  }, [isConfigured, exitGuest]);

  const signUp = async (email, password, metadata = {}) => {
    if (!isConfigured) {
      throw new Error('Supabase not configured');
    }

    try {
      const data = await authHelpers.signUp(email, password, {
        username: metadata.username,
        full_name: metadata.fullName,
        avatar_url: metadata.avatarUrl,
      });
      exitGuest();
      return data;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signIn = async (email, password) => {
    if (!isConfigured) {
      throw new Error('Supabase not configured');
    }

    try {
      const data = await authHelpers.signIn(email, password);
      exitGuest();
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    if (!isConfigured) {
      throw new Error('Supabase not configured');
    }

    try {
      const data = await authHelpers.signInWithOAuth('google');
      exitGuest();
      return data;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  const signInWithGitHub = async () => {
    if (!isConfigured) {
      throw new Error('Supabase not configured');
    }

    try {
      const data = await authHelpers.signInWithOAuth('github');
      exitGuest();
      return data;
    } catch (error) {
      console.error('GitHub sign in error:', error);
      throw error;
    }
  };

  const signInWithMagicLink = async (email) => {
    if (!isConfigured) {
      throw new Error('Supabase not configured');
    }

    try {
      const data = await authHelpers.signInWithMagicLink(email);
      exitGuest();
      return data;
    } catch (error) {
      console.error('Magic link error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    if (!isConfigured) {
      throw new Error('Supabase not configured');
    }

    try {
      await authHelpers.signOut();
      setUser(null);
      setSession(null);
      exitGuest();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const resetPassword = async (email) => {
    if (!isConfigured) {
      throw new Error('Supabase not configured');
    }

    try {
      const data = await authHelpers.resetPassword(email);
      return data;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const updatePassword = async (newPassword) => {
    if (!isConfigured) {
      throw new Error('Supabase not configured');
    }

    try {
      const data = await authHelpers.updatePassword(newPassword);
      return data;
    } catch (error) {
      console.error('Password update error:', error);
      throw error;
    }
  };

  const updateProfile = async (updates) => {
    if (!isConfigured) {
      throw new Error('Supabase not configured');
    }

    try {
      const data = await authHelpers.updateUser(updates);
      return data;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    isGuest,
    isConfigured,
    configured: isConfigured, // Alias for compatibility
    signUp,
    signIn,
    signInWithGoogle,
    signInWithGitHub,
    signInWithMagicLink,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    enterAsGuest,
    exitGuest,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
