-- ============================================================================
-- SCHEMA: CRM SAMORZĄDU STUDENCKIEGO WSKZ - REPOZYTORIUM AKTÓW I KANCELARII
-- ============================================================================

-- 1. Typy wyliczeniowe dla statusów i organów Samorządu
DO $$ BEGIN
  CREATE TYPE document_status_enum AS ENUM (
    'obowiazujacy',       -- Akt w mocy prawnej
    'w_przygotowaniu',    -- Projekt uchwały / roboczy protokół
    'uchylony',           -- Zastąpiony nową uchwałą / nieważny
    'do_zatwierdzenia'    -- Oczekuje na podpis Przewodniczącego / Władz Uczelni
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE correspondence_direction_enum AS ENUM (
    'IN',   -- Pismo wchodzące do Samorządu
    'OUT'   -- Pismo wychodzące od Samorządu
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE body_type_enum AS ENUM (
    'zarzad',             -- Zarząd / Prezydium Samorządu
    'rada_samorzadu',     -- Rada Samorządu Studenckiego
    'komisja_stypendialna',
    'komisja_dydaktyczna',
    'komisja_rewizyjna',
    'inne'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Tabela główna: Akty Prawne, Uchwały, Regulaminy i Statuty
CREATE TABLE IF NOT EXISTS public.official_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL DEFAULT 'samorzad_wskz',
  academic_year TEXT NOT NULL DEFAULT '2026/2027',    -- np. '2026/2027'
  code TEXT NOT NULL,                                  -- np. 'UCHWAŁA/SS_WSKZ/ZS/01/2026'
  title TEXT NOT NULL,
  category TEXT NOT NULL,                              -- 'Uchwały Zarządu', 'Uchwały Rady Samorządu', 'Regulaminy i Statuty', itp.
  body_type body_type_enum NOT NULL DEFAULT 'zarzad',
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_date DATE,                                 -- Data wejścia w życie
  status document_status_enum NOT NULL DEFAULT 'obowiazujacy',
  description TEXT,
  file_url TEXT,                                       -- Supabase Storage lub Google Drive
  storage_path TEXT,                                   -- Ścieżka w buckecie jeśli plik uploadowany
  content_json JSONB,                                  -- Pełna treść strukturalna (dla uchwał/protokołów generowanych w CRM)
  is_public BOOLEAN NOT NULL DEFAULT false,            -- Czy widoczny publicznie dla studentów WSKZ
  superseded_by UUID REFERENCES public.official_documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_official_documents_code UNIQUE (organization_id, code)
);

-- 3. Tabela powiązana: Protokoły z Posiedzeń Samorządu
CREATE TABLE IF NOT EXISTS public.meeting_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL DEFAULT 'samorzad_wskz',
  academic_year TEXT NOT NULL DEFAULT '2026/2027',    -- np. '2026/2027'
  protocol_number TEXT NOT NULL,                       -- np. 'PROT/SS_WSKZ/ZS/01/2026'
  meeting_id TEXT,                                     -- ID z kalendarza Teamup / Google Calendar
  meeting_code TEXT,                                   -- np. 'P01' (Posiedzenie Zarządu 1)
  meeting_date DATE NOT NULL,
  meeting_time TEXT DEFAULT '18:00 - 20:00',
  location TEXT DEFAULT 'Biuro Samorządu / Google Meet',
  body_type body_type_enum NOT NULL DEFAULT 'zarzad',
  title TEXT NOT NULL,
  chairperson TEXT NOT NULL,                           -- Przewodniczący zebrania
  recorder TEXT NOT NULL,                              -- Protokolant
  attendees_count INT NOT NULL DEFAULT 0,
  agenda TEXT NOT NULL,                                -- Porządek obrad
  discussion_content TEXT NOT NULL,                    -- Przebieg dyskusji i głosowań
  resolutions_summary TEXT,                            -- Podjęte uchwały i wnioski
  attendees_list JSONB DEFAULT '[]'::jsonb,            -- Lista obecności: [{ name, index, role, present }]
  drive_url TEXT,
  storage_path TEXT,
  document_ref_id UUID REFERENCES public.official_documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_meeting_protocols_number UNIQUE (organization_id, protocol_number)
);

-- 4. Tabela Kancelarii: Dziennik Podawczy / Korespondencja
CREATE TABLE IF NOT EXISTS public.correspondence_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL DEFAULT 'samorzad_wskz',
  academic_year TEXT NOT NULL DEFAULT '2026/2027',
  signature TEXT NOT NULL,                             -- np. 'DK/2026/11/01'
  direction correspondence_direction_enum NOT NULL DEFAULT 'IN',
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,       -- Data wpływu / nadania
  sender TEXT NOT NULL,                                -- Nadawca (np. Rektor WSKZ, Student, PSRP)
  recipient TEXT NOT NULL,                             -- Odbiorca (np. Zarząd Samorządu WSKZ)
  subject TEXT NOT NULL,                               -- Tytuł / Przedmiot sprawy
  summary TEXT,                                        -- Streszczenie / Kluczowe ustalenia
  status TEXT NOT NULL DEFAULT 'W toku',               -- 'W toku', 'Zrealizowane', 'Zarchiwizowane'
  drive_url TEXT,                                      -- Link do skanu pisma
  storage_path TEXT,
  hash TEXT,                                           -- Hash deduplikacyjny
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_correspondence_signature UNIQUE (organization_id, signature)
);

-- Indeksy pod szybkie wyszukiwanie i filtrowanie
CREATE INDEX IF NOT EXISTS idx_docs_org_year ON public.official_documents(organization_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_docs_category ON public.official_documents(category);
CREATE INDEX IF NOT EXISTS idx_docs_status ON public.official_documents(status);
CREATE INDEX IF NOT EXISTS idx_protocols_org_date ON public.meeting_protocols(organization_id, meeting_date);
CREATE INDEX IF NOT EXISTS idx_correspondence_search ON public.correspondence_log(organization_id, direction, entry_date);

-- ============================================================================
-- POLITYKI BEZPIECZEŃSTWA (ROW LEVEL SECURITY - RLS)
-- ============================================================================
ALTER TABLE public.official_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.correspondence_log ENABLE ROW LEVEL SECURITY;

-- 1. Odczyt aktów: zalogowani członkowie lub dokumenty publiczne (is_public = true)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Odczyt aktów samorządu" ON public.official_documents;
  CREATE POLICY "Odczyt aktów samorządu" ON public.official_documents
    FOR SELECT
    USING (
      (auth.role() = 'authenticated' AND organization_id = 'samorzad_wskz')
      OR is_public = true
      OR auth.role() = 'anon'
    );
END $$;

-- 2. Zarządzanie aktami
DO $$ BEGIN
  DROP POLICY IF EXISTS "Zarządzanie aktami przez Samorząd" ON public.official_documents;
  CREATE POLICY "Zarządzanie aktami przez Samorząd" ON public.official_documents
    FOR ALL
    TO authenticated
    USING (organization_id = 'samorzad_wskz')
    WITH CHECK (organization_id = 'samorzad_wskz');
END $$;

-- 3. Polityki dla Protokołów i Korespondencji
DO $$ BEGIN
  DROP POLICY IF EXISTS "Dostęp do protokołów dla Samorządu" ON public.meeting_protocols;
  CREATE POLICY "Dostęp do protokołów dla Samorządu" ON public.meeting_protocols
    FOR ALL
    TO authenticated
    USING (organization_id = 'samorzad_wskz')
    WITH CHECK (organization_id = 'samorzad_wskz');
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Dostęp do korespondencji dla Samorządu" ON public.correspondence_log;
  CREATE POLICY "Dostęp do korespondencji dla Samorządu" ON public.correspondence_log
    FOR ALL
    TO authenticated
    USING (organization_id = 'samorzad_wskz')
    WITH CHECK (organization_id = 'samorzad_wskz');
END $$;
