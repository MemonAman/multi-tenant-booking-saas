const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

if (!env.supabase.url || !env.supabase.anonKey) {
  console.warn('⚠️ Supabase credentials missing from environment variables.');
}

const activeKey = (env.supabase.anonKey && env.supabase.anonKey.startsWith('eyJ'))
  ? env.supabase.anonKey
  : (env.supabase.serviceRoleKey || env.supabase.anonKey || 'placeholder-key');

const adminKey = env.supabase.serviceRoleKey || activeKey;

// Public / Anon client (respects RLS)
const supabaseAnon = createClient(
  env.supabase.url || 'https://placeholder-url.supabase.co',
  activeKey
);

// Admin / Service Role client (bypasses RLS for system operations, server-side only)
const supabaseAdmin = createClient(
  env.supabase.url || 'https://placeholder-url.supabase.co',
  adminKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${adminKey}`
      }
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
    activeKey,
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
