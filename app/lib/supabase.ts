import 'react-native-url-polyfill/auto'
import 'react-native-get-random-values'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase credentials are missing.\n' +
    'Copy app/.env.example to app/.env.local and fill in your project URL and anon key.\n' +
    'Get them from: https://supabase.com/dashboard → project → API settings'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Implicit flow on purpose: Hermes (the RN JS engine) lacks crypto.subtle,
    // so PKCE falls back to code_challenge_method=plain, which Google's OAuth
    // server appears to reject or stall on. Implicit returns tokens in the URL
    // hash; the sign-in handler consumes them via setSession. Revisit when we
    // move to a dev build with a proper crypto polyfill.
    flowType: 'implicit',
  },
})
