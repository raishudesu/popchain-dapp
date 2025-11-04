-- Allow authenticated users to view certificates by ID for claiming purposes
-- This is needed for attendees to view certificate templates when claiming

CREATE POLICY "Authenticated users can view certificates by ID for claiming"
  ON public.certificates
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
  );

