'use client';

import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { User as AppUser } from '@/types';

interface AuthState {
  user: User | null;
  profile: AppUser | null;
  loading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, nickname: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  loadProfile: () => Promise<void>;
  updateLevel: (level: number) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,

  initialize: async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      set({ user, loading: false });

      if (user) {
        // Load profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        set({ profile: profile || null });
      }
    } catch {
      set({ loading: false });
    }
  },

  signUp: async (email, password, nickname) => {
    set({ error: null });
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nickname },
      },
    });

    if (error) {
      set({ error: error.message });
      return { error: error.message };
    }

    if (data.user) {
      set({ user: data.user });
    }

    return { error: null };
  },

  signIn: async (email, password) => {
    set({ error: null });
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      set({ error: error.message });
      return { error: error.message };
    }

    if (data.user) {
      set({ user: data.user });
      await get().loadProfile();
    }

    return { error: null };
  },

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  loadProfile: async () => {
    const { user } = get();
    if (!user) return;

    const supabase = createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      set({ profile });
    }
  },

  updateLevel: async (level: number) => {
    const { user, profile } = get();
    if (!user) return;

    const supabase = createClient();
    await supabase
      .from('profiles')
      .update({ current_level: level, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    set({ profile: profile ? { ...profile, current_level: level } : null });
  },

  clearError: () => set({ error: null }),
}));
