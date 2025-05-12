import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase env vars missing:', { url: !!supabaseUrl, key: !!supabaseAnonKey });
    throw new Error('Supabase environment variables are not set when creating client');
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}

// Optional: For convenience if you need the client directly sometimes, but prefer the function call
// export const supabase = getSupabaseClient(); // This line would recreate the original problem in some contexts 