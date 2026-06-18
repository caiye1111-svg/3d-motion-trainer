'use client';

import { createBrowserClient } from '@supabase/ssr';

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (clientInstance) return clientInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Return a no-op mock when Supabase is not configured
  if (!url || !key || url === 'your-supabase-url') {
    clientInstance = createNoopClient();
    return clientInstance;
  }

  clientInstance = createBrowserClient(url, key);
  return clientInstance;
}

/** Returns a mock client that returns null/empty for all auth queries */
function createNoopClient(): ReturnType<typeof createBrowserClient> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noop = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase 未配置' } }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error: { message: 'Supabase 未配置' } }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }), order: () => Promise.resolve({ data: [], error: null }) }), order: () => Promise.resolve({ data: [], error: null }) }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      upsert: () => Promise.resolve({ data: null, error: null }),
    }),
    rpc: () => Promise.resolve({ data: null, error: null }),
  } as unknown as ReturnType<typeof createBrowserClient>;

  return noop;
}
