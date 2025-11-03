-- Supabase Migration for PopChain User Profiles
-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_hash TEXT NOT NULL UNIQUE, -- SHA-3-256 hash of email (hex string)
  user_type TEXT NOT NULL CHECK (user_type IN ('organizer', 'attendee')),
  wallet_address TEXT, -- Optional wallet address from dapp-kit
  popchain_account_address TEXT, -- PopChainAccount object ID after on-chain creation
  role INTEGER NOT NULL DEFAULT 0 CHECK (role IN (0, 1, 2)), -- 0=Attendee, 1=Organizer, 2=Both
  certificates TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of certificate object IDs
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on email_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_hash ON public.user_profiles(email_hash);

-- Create index on wallet_address for wallet-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_wallet_address ON public.user_profiles(wallet_address) WHERE wallet_address IS NOT NULL;

-- Create index on popchain_account_address for on-chain account lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_popchain_account ON public.user_profiles(popchain_account_address) WHERE popchain_account_address IS NOT NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Create policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Create policy: Service role can insert profiles (for registration)
CREATE POLICY "Service role can insert profiles"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row updates
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

