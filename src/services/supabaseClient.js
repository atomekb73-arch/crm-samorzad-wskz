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

/**
 * Pobiera wszystkie rekordy z tabeli bez nagłówka x-organization-id (globalnie) z obsługą stronicowania > 1000.
 */
export async function fetchAllGlobalRows(table, options = {}) {
  const pageSize = 1000;
  let from = 0;
  let allRows = [];

  while (true) {
    let query = supabase
      .from(table)
      .select(options.select || '*');

    if (options.organizationIds && Array.isArray(options.organizationIds) && options.organizationIds.length > 0) {
      query = query.in('organization_id', options.organizationIds);
    }

    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending !== false });
    }

    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) {
      return { data: allRows.length > 0 ? allRows : null, error };
    }
    if (!Array.isArray(data) || data.length === 0) {
      break;
    }
    allRows = allRows.concat(data);
    if (data.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return { data: allRows, error: null };
}

/**
 * Pobiera wszystkie rekordy dla wskazanego tenanta (organization_id) z obsługą stronicowania powyżej limitu 1000 rekordów PostgREST.
 */
export async function fetchAllTenantRows(table, orgId, options = {}) {
  const cleanOrg = String(orgId || '').trim().toLowerCase();
  if (!cleanOrg) return { data: [], error: null };

  const tenantClient = getTenantSupabase(cleanOrg);
  const pageSize = 1000;
  let from = 0;
  let allRows = [];

  while (true) {
    let query = tenantClient
      .from(table)
      .select(options.select || '*')
      .eq('organization_id', cleanOrg);

    if (options.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending !== false });
    }

    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) {
      return { data: allRows.length > 0 ? allRows : null, error };
    }
    if (!Array.isArray(data) || data.length === 0) {
      break;
    }
    allRows = allRows.concat(data);
    if (data.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return { data: allRows, error: null };
}
