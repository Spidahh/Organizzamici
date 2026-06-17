-- SCHEMA SQL PER ORGANIZZAMICI (SUPABASE) — versione SENZA LOGIN
-- Modello "link segreto": niente autenticazione, l'id UUID dell'evento è la
-- chiave d'accesso. Le policy RLS sono permissive (lettura/scrittura anon).
-- Eseguibile interamente nell'SQL Editor di Supabase.

-- 1. EVENTI
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,                  -- id locale del dispositivo organizzatore
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT DEFAULT 'altro'::text NOT NULL,
    location TEXT NOT NULL,
    custom_location TEXT,
    beds_available INTEGER DEFAULT 0 NOT NULL,
    selected_dates TEXT[] DEFAULT '{}'::text[] NOT NULL,
    collaborative_destination BOOLEAN DEFAULT false NOT NULL,
    track_beds BOOLEAN DEFAULT true NOT NULL
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS events_all ON public.events;
CREATE POLICY events_all ON public.events FOR ALL USING (true) WITH CHECK (true);

-- 2. RISPOSTE / PARTECIPAZIONI
CREATE TABLE IF NOT EXISTS public.responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,                   -- id locale del dispositivo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_name TEXT NOT NULL,
    city TEXT NOT NULL,
    transport_mode TEXT NOT NULL,
    needs_bed BOOLEAN DEFAULT false NOT NULL,
    has_car BOOLEAN DEFAULT false NOT NULL,
    car_seats INTEGER DEFAULT 0 NOT NULL,
    rest_days INTEGER[] DEFAULT '{6,0}'::integer[] NOT NULL,
    votes JSONB DEFAULT '{}'::jsonb NOT NULL,
    destination_votes JSONB DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT unique_event_user UNIQUE (event_id, user_id)
);
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS responses_all ON public.responses;
CREATE POLICY responses_all ON public.responses FOR ALL USING (true) WITH CHECK (true);

-- 3. PROPOSTE DESTINAZIONE
CREATE TABLE IF NOT EXISTS public.destination_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    link TEXT
);
ALTER TABLE public.destination_proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dest_all ON public.destination_proposals;
CREATE POLICY dest_all ON public.destination_proposals FOR ALL USING (true) WITH CHECK (true);

-- 4. RISORSE & LINK
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    title TEXT NOT NULL,
    desc_text TEXT,
    url TEXT NOT NULL,
    category TEXT DEFAULT 'altro'::text NOT NULL
);
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS res_all ON public.resources;
CREATE POLICY res_all ON public.resources FOR ALL USING (true) WITH CHECK (true);

-- 5. COMMENTI
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    author TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp TEXT NOT NULL
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS comments_all ON public.comments;
CREATE POLICY comments_all ON public.comments FOR ALL USING (true) WITH CHECK (true);

-- 6. REALTIME (aggiornamenti in diretta tra tutti i dispositivi)
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.events; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.responses; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.destination_proposals; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.resources; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.comments; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
