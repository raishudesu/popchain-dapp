-- Supabase Migration for PopChain Events
-- Create events table to store event information from blockchain

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE, -- Event object ID from blockchain
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organizer_account_address TEXT NOT NULL, -- PopChainAccount object ID
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on event_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_events_event_id ON public.events(event_id);

-- Create index on organizer_id for organizer queries
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON public.events(organizer_id);

-- Create index on organizer_account_address for on-chain account lookups
CREATE INDEX IF NOT EXISTS idx_events_organizer_account ON public.events(organizer_account_address);

-- Enable Row Level Security (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create policy: Organizers can view their own events
CREATE POLICY "Organizers can view own events"
  ON public.events
  FOR SELECT
  USING (auth.uid() = organizer_id);

-- Create policy: Organizers can update their own events
CREATE POLICY "Organizers can update own events"
  ON public.events
  FOR UPDATE
  USING (auth.uid() = organizer_id);

-- Create policy: Organizers can insert their own events
CREATE POLICY "Organizers can insert own events"
  ON public.events
  FOR INSERT
  WITH CHECK (auth.uid() = organizer_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row updates
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_events_updated_at();

