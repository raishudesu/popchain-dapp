import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
  );
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Service role client that bypasses RLS
// WARNING: This should only be used for specific operations that need to bypass RLS
// Never expose the service role key in production frontend unless necessary
const serviceRoleKey = import.meta.env.VITE_SERVICE_ROLE_KEY;
const supabaseAdmin = serviceRoleKey
  ? createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export default supabase;
export { supabaseAdmin };
