-- Add tier_index to certificates table
-- tier_index is a u64 (0-3) representing the index in the event's tiers vector
-- 0 = PopPass, 1 = PopBadge, 2 = PopMedal, 3 = PopTrophy

ALTER TABLE public.certificates
ADD COLUMN IF NOT EXISTS tier_index INTEGER;

-- Set tier_index for existing rows based on tier_name
UPDATE public.certificates
SET tier_index = CASE
  WHEN tier_name = 'PopPass' THEN 0
  WHEN tier_name = 'PopBadge' THEN 1
  WHEN tier_name = 'PopMedal' THEN 2
  WHEN tier_name = 'PopTrophy' THEN 3
  ELSE 0
END
WHERE tier_index IS NULL;

-- Make tier_index NOT NULL after setting defaults
ALTER TABLE public.certificates
ALTER COLUMN tier_index SET NOT NULL,
ALTER COLUMN tier_index SET DEFAULT 0;

-- Add constraint to ensure valid tier_index (0-3)
ALTER TABLE public.certificates
DROP CONSTRAINT IF EXISTS valid_tier_index;
ALTER TABLE public.certificates
ADD CONSTRAINT valid_tier_index CHECK (
  tier_index >= 0 AND tier_index <= 3
);

-- Add index for tier_index queries
CREATE INDEX IF NOT EXISTS idx_certificates_tier_index ON public.certificates(tier_index);

