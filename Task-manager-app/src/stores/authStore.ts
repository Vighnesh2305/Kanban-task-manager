import { create } from 'zustand';
import { localDb } from '../lib/storage';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  switchUser: (user: UserProfile) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,

  initialize: async () => {
    // Check localStorage for saved user
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        set({ user: parsed });
        localDb.registerUser(parsed);
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
    set({ loading: false });
  },

  signIn: async (email: string, password: string) => {
    try {
      // Simple validation
      if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
      }

      const cleanEmail = email.trim().toLowerCase();
      // Look up existing profile or create one
      const existing = localDb.findUserByEmail(cleanEmail);

      const user: UserProfile = existing || {
        id: cleanEmail.replace(/[^a-z0-9]/g, ''),
        email: cleanEmail,
        full_name: cleanEmail.split('@')[0],
        created_at: new Date().toISOString(),
      };

      localDb.registerUser(user);
      set({ user });
      localStorage.setItem('user', JSON.stringify(user));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  signUp: async (email: string, password: string, fullName: string) => {
    try {
      if (!email || !password || !fullName) {
        return { success: false, error: 'All fields are required' };
      }

      const cleanEmail = email.trim().toLowerCase();
      const user: UserProfile = {
        id: cleanEmail.replace(/[^a-z0-9]/g, ''),
        email: cleanEmail,
        full_name: fullName.trim(),
        created_at: new Date().toISOString(),
      };

      localDb.registerUser(user);
      set({ user });
      localStorage.setItem('user', JSON.stringify(user));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  signOut: () => {
    set({ user: null });
    localStorage.removeItem('user');
  },

  switchUser: (user: UserProfile) => {
    set({ user });
    localStorage.setItem('user', JSON.stringify(user));
  }
}));
