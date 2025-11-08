-- Add tusky_upload_id to certificates table
-- This stores the Tusky upload ID which can be used to retrieve the blobId asynchronously

ALTER TABLE public.certificates
ADD COLUMN IF NOT EXISTS tusky_upload_id TEXT;

-- Add index for tusky_upload_id lookups
CREATE INDEX IF NOT EXISTS idx_certificates_tusky_upload_id ON public.certificates(tusky_upload_id) WHERE tusky_upload_id IS NOT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN public.certificates.tusky_upload_id IS 'Tusky upload ID used to retrieve blobId asynchronously. The blobId is computed deterministically from blob content and may take time to be populated.';

