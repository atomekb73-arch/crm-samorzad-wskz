import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env?.VITE_SUPABASE_URL || 'https://zlpvnxzqylfghdxgkyyf.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_LvTzZNNQRupmV2qVgyMKbg_DhAbs3Dm';

/**
 * Klient Supabase w trybie READ-ONLY dla Kancelarii Samorządu Studenckiego WSKZ.
 * 
 * KRYTYCZNE DLA RLS:
 * Klient celowo NIE wysyła nagłówka pojedynczego tenanta ('x-organization-id'),
 * dzięki czemu polityki RLS pozwalają na zbiorczy, wielokołowy odczyt tabel
 * 'meeting_metadata' oraz 'attendance' dla wszystkich 14 Kół Naukowych naraz.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
