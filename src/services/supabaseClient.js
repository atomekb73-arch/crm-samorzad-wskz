import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  import.meta.env?.VITE_SUPABASE_URL || 'https://zlpvnxzqylfghdxgkyyf.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_LvTzZNNQRupmV2qVgyMKbg_DhAbs3Dm';

/**
 * Klient Supabase w trybie READ-ONLY dla Kancelarii Samorządu Studenckiego WSKZ.
 * Domyślny klient globalny (bez narzuconego nagłówka pojedynczego tenanta).
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const _tenantClientsCache = new Map();

/**
 * Zwraca instancję klienta Supabase z nagłówkiem tenanta ('x-organization-id'),
 * co pozwala odczytać tabele objęte politykami RLS danego koła naukowego.
 */
export function getTenantSupabase(orgId) {
  const cleanOrg = String(orgId || '').trim().toLowerCase();
  if (!cleanOrg) return supabase;
  if (_tenantClientsCache.has(cleanOrg)) {
    return _tenantClientsCache.get(cleanOrg);
  }
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'x-organization-id': cleanOrg,
      },
    },
  });
  _tenantClientsCache.set(cleanOrg, client);
  return client;
}
