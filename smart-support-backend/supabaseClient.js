const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;
let isConfigured = false;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  isConfigured = true;
} else {
  console.warn('ℹ️  Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable persistent storage.');
}

function requireSupabase() {
  if (!isConfigured || !supabase) {
    throw new Error('Supabase client not configured');
  }
  return supabase;
}

module.exports = {
  supabase,
  isSupabaseConfigured: () => isConfigured,
  requireSupabase
};
