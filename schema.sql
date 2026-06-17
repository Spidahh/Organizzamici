-- SCHEMA SQL PER LE TABELLE DI ORGANIZZAMICI (SUPABASE)

-- 1. Abilitazione estensione UUID (se non già attiva)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabella EVENTI
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- RLS (Row Level Security) per Events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Politiche di accesso per Events
CREATE POLICY "Tutti possono visualizzare gli eventi tramite ID" 
ON public.events FOR SELECT USING (true);

CREATE POLICY "Gli utenti autenticati possono creare eventi" 
ON public.events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Solo l'owner può aggiornare l'evento" 
ON public.events FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Solo l'owner può cancellare l'evento" 
ON public.events FOR DELETE USING (auth.uid() = owner_id);


-- 3. Tabella RISPOSTE / PARTECIPAZIONI (Responses)
CREATE TABLE public.responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- RLS per Responses
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- Politiche di accesso per Responses
CREATE POLICY "Tutti possono visualizzare le risposte di un evento" 
ON public.responses FOR SELECT USING (true);

CREATE POLICY "Gli utenti autenticati possono aggiungere la propria risposta" 
ON public.responses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Gli utenti possono aggiornare solo la propria risposta" 
ON public.responses FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Gli utenti possono rimuovere solo la propria risposta" 
ON public.responses FOR DELETE USING (auth.uid() = user_id);


-- 4. Tabella PROPOSTE DESTINAZIONE (Destination Proposals)
CREATE TABLE public.destination_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    link TEXT
);

-- RLS per Destination Proposals
ALTER TABLE public.destination_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutti possono vedere le proposte di destinazione" 
ON public.destination_proposals FOR SELECT USING (true);

CREATE POLICY "Gli utenti autenticati possono inserire proposte" 
ON public.destination_proposals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Solo l'owner dell'evento o chi ha inserito la proposta può eliminarla" 
ON public.destination_proposals FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.events 
        WHERE events.id = destination_proposals.event_id 
        AND events.owner_id = auth.uid()
    )
);


-- 5. Tabella RISORSE & LINK (Resources)
CREATE TABLE public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    title TEXT NOT NULL,
    desc_text TEXT,
    url TEXT NOT NULL,
    category TEXT DEFAULT 'altro'::text NOT NULL
);

-- RLS per Resources
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutti possono vedere le risorse dell'evento" 
ON public.resources FOR SELECT USING (true);

CREATE POLICY "Gli utenti autenticati possono inserire risorse" 
ON public.resources FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Gli utenti autenticati possono cancellare risorse" 
ON public.resources FOR DELETE WITH CHECK (auth.uid() IS NOT NULL);


-- 6. Tabella COMMENTI (Comments)
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    author TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp TEXT NOT NULL
);

-- RLS per Comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutti possono leggere i commenti dell'evento" 
ON public.comments FOR SELECT USING (true);

CREATE POLICY "Gli utenti autenticati possono inserire commenti" 
ON public.comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
