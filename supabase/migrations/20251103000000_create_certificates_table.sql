-- Supabase Migration for PopChain Certificates
-- Create certificates table to store certificate layouts for events

CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES public.events(event_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL, -- URL to the certificate image in Supabase storage
  name TEXT, -- Optional name for the certificate
  is_default BOOLEAN NOT NULL DEFAULT false, -- Whether this is a default certificate
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on event_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_certificates_event_id ON public.certificates(event_id);

-- Create index on user_id for user queries
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON public.certificates(user_id);

-- Create index on is_default for filtering default certificates
CREATE INDEX IF NOT EXISTS idx_certificates_is_default ON public.certificates(is_default);

-- Enable Row Level Security (RLS)
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view certificates for events they organized
CREATE POLICY "Users can view own event certificates"
  ON public.certificates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.event_id = certificates.event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- Create policy: Users can view default certificates
CREATE POLICY "Anyone can view default certificates"
  ON public.certificates
  FOR SELECT
  USING (is_default = true);

-- Create policy: Users can insert certificates for events they organized
CREATE POLICY "Users can insert own event certificates"
  ON public.certificates
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.events
      WHERE events.event_id = certificates.event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- Create policy: Users can update certificates for events they organized
CREATE POLICY "Users can update own event certificates"
  ON public.certificates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.event_id = certificates.event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- Create policy: Users can delete certificates for events they organized
CREATE POLICY "Users can delete own event certificates"
  ON public.certificates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.event_id = certificates.event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_certificates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row updates
CREATE TRIGGER update_certificates_updated_at
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_certificates_updated_at();

