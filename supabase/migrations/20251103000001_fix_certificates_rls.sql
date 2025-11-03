-- Fix RLS policy for certificates INSERT
-- Drop the existing INSERT policy and recreate it with a more reliable approach

DROP POLICY IF EXISTS "Users can insert own event certificates" ON public.certificates;

-- Create policy: Users can insert certificates for events they organized
-- This policy ensures the user is authenticated, matches the user_id, and owns the event
CREATE POLICY "Users can insert own event certificates"
  ON public.certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.event_id = certificates.event_id
      AND e.organizer_id = auth.uid()
    )
  );

