/**
 * � SUPABASE DISABLED
 * Cloud sync functionality has been removed.
 * All data is stored locally using localStorage.
 */

// Mock Supabase client for backward compatibility
export const supabase = null;

// Always return false - Supabase is not configured
export const isSupabaseConfigured = () => false;

// Empty auth helpers - not used
export const authHelpers = {
  getCurrentUser: async () => null,
  getSession: async () => null,
  signUp: async () => {
    throw new Error('Auth not available');
  },
  signIn: async () => {
    throw new Error('Auth not available');
  },
  signInWithOAuth: async () => {
    throw new Error('Auth not available');
  },
  signInWithMagicLink: async () => {
    throw new Error('Auth not available');
  },
  signOut: async () => {},
  resetPassword: async () => {
    throw new Error('Auth not available');
  },
  updatePassword: async () => {
    throw new Error('Auth not available');
  },
  updateUser: async () => {
    throw new Error('Auth not available');
  }
};

export default supabase;
