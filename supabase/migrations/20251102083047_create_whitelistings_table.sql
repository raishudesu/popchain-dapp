-- Supabase Migration for PopChain Whitelistings
-- Create whitelistings table to track whitelisted emails for events

CREATE TABLE IF NOT EXISTS public.whitelistings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL, -- Event object ID from blockchain (references events.event_id)
  email TEXT NOT NULL,
  email_hash TEXT NOT NULL, -- SHA-3-256 hash (hex string)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, email_hash) -- Prevent duplicate whitelistings
);

-- Create index on event_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_whitelistings_event_id ON public.whitelistings(event_id);

-- Create index on email_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_whitelistings_email_hash ON public.whitelistings(email_hash);

-- Create index on email for email-based queries
CREATE INDEX IF NOT EXISTS idx_whitelistings_email ON public.whitelistings(email);

-- Enable Row Level Security (RLS)
ALTER TABLE public.whitelistings ENABLE ROW LEVEL SECURITY;

-- Create policy: Organizers can view whitelistings for their events
CREATE POLICY "Organizers can view whitelistings for own events"
  ON public.whitelistings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.event_id = whitelistings.event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- Create policy: Organizers can insert whitelistings for their events
CREATE POLICY "Organizers can insert whitelistings for own events"
  ON public.whitelistings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.event_id = whitelistings.event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- Create policy: Organizers can delete whitelistings for their events
CREATE POLICY "Organizers can delete whitelistings for own events"
  ON public.whitelistings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.event_id = whitelistings.event_id
      AND events.organizer_id = auth.uid()
    )
  );

