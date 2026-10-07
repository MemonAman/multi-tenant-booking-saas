const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

if (!env.supabase.url || !env.supabase.anonKey) {
  console.warn('⚠️ Supabase credentials missing from environment variables.');
}

// Public / Anon client (respects RLS)
const supabaseAnon = createClient(
  env.supabase.url || 'https://placeholder-url.supabase.co',
  env.supabase.anonKey || 'placeholder-anon-key'
);

// Admin / Service Role client (bypasses RLS for system operations, server-side only)
const supabaseAdmin = createClient(
  env.supabase.url || 'https://placeholder-url.supabase.co',
  env.supabase.serviceRoleKey || env.supabase.anonKey || 'placeholder-service-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Creates a Supabase client attached to a specific user's Bearer token
 * so PostgreSQL RLS policies can evaluate auth.uid() correctly.
 */
function createScopedClient(accessToken) {
  return createClient(
    env.supabase.url,
    env.supabase.anonKey,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    }
  );
}

module.exports = {
  supabaseAnon,
  supabaseAdmin,
  createScopedClient
};
