import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClientOptions } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function nodeWebRealtimeOptions(): Partial<SupabaseClientOptions<'public'>> {
  if (Platform.OS !== 'web' || typeof window !== 'undefined') return {};

  const StaticRenderWebSocket = class {
    constructor() {
      throw new Error('Supabase Realtime is unavailable during Node-side web rendering.');
    }
  } as unknown as NonNullable<SupabaseClientOptions<'public'>['realtime']>['transport'];

  return {
    realtime: {
      transport: StaticRenderWebSocket,
    },
  };
}

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-key',
  {
    auth: {
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: Platform.OS === 'web' ? 'implicit' : 'pkce',
    },
    ...nodeWebRealtimeOptions(),
  }
);
