// FIX: Manually define `import.meta.env` types because the `vite/client` reference was not working.
// This is necessary when the TypeScript configuration doesn't automatically pick up Vite's client types.
declare global {
  interface ImportMeta {
    readonly env: {
      readonly VITE_SUPABASE_URL: string;
      readonly VITE_SUPABASE_ANON_KEY: string;
    };
  }
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are not loaded.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
