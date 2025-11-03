-- Add tier information to certificates table
-- Tiers: PopPass (Basic), PopBadge (Standard), PopMedal (Premium), PopTrophy (Exclusive)

-- Add columns (nullable first for existing rows)
ALTER TABLE public.certificates
ADD COLUMN IF NOT EXISTS tier_name TEXT,
ADD COLUMN IF NOT EXISTS tier_level TEXT, -- Basic, Standard, Premium, Exclusive
ADD COLUMN IF NOT EXISTS tier_description TEXT, -- Proof of Attendance, Activity/Side Quest, etc.
ADD COLUMN IF NOT EXISTS tier_image_url TEXT; -- URL to tier image (pop_pass.png, pop_badge.png, etc.)

-- Set default for existing rows
-- Note: tier_image_url will need to be set manually or via application logic
UPDATE public.certificates
SET tier_name = 'PopPass',
    tier_level = 'Basic',
    tier_description = 'Proof of Attendance'
WHERE tier_name IS NULL;

-- Now make tier_name NOT NULL
ALTER TABLE public.certificates
ALTER COLUMN tier_name SET NOT NULL,
ALTER COLUMN tier_name SET DEFAULT 'PopPass';

-- Add constraint to ensure valid tier names
ALTER TABLE public.certificates
DROP CONSTRAINT IF EXISTS valid_tier_name;
ALTER TABLE public.certificates
ADD CONSTRAINT valid_tier_name CHECK (
  tier_name IN ('PopPass', 'PopBadge', 'PopMedal', 'PopTrophy')
);

-- Add index for tier queries
CREATE INDEX IF NOT EXISTS idx_certificates_tier_name ON public.certificates(tier_name);

