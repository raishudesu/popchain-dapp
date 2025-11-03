// Database types for Supabase tables

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile;
        Insert: UserProfileInsert;
        Update: UserProfileUpdate;
      };
      events: {
        Row: Event;
        Insert: EventInsert;
        Update: EventUpdate;
      };
      whitelistings: {
        Row: Whitelisting;
        Insert: WhitelistingInsert;
        Update: WhitelistingUpdate;
      };
      certificates: {
        Row: Certificate;
        Insert: CertificateInsert;
        Update: CertificateUpdate;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export interface UserProfile {
  id: string; // UUID from Supabase auth.users
  first_name: string;
  last_name: string;
  email: string;
  email_hash: string; // Hex string of SHA-3-256 hash
  user_type: "organizer" | "attendee";
  wallet_address: string | null; // Optional wallet address from dapp-kit
  popchain_account_address: string | null; // PopChainAccount object ID after on-chain creation
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  // Additional fields based on smart contract
  role: number; // 0 = Attendee, 1 = Organizer, 2 = Both (matches smart contract enum)
  certificates: string[]; // Array of certificate object IDs
}

export interface UserProfileInsert {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  email_hash: string;
  user_type: "organizer" | "attendee";
  wallet_address?: string | null;
  popchain_account_address?: string | null;
  role: number;
  certificates?: string[];
}

export interface UserProfileUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  email_hash?: string;
  user_type?: "organizer" | "attendee";
  wallet_address?: string | null;
  popchain_account_address?: string | null;
  role?: number;
  certificates?: string[];
  updated_at?: string;
}

export interface Event {
  id: string; // UUID from Supabase
  event_id: string; // Event object ID from blockchain
  name: string;
  description: string;
  organizer_id: string; // UUID from auth.users
  organizer_account_address: string; // PopChainAccount object ID
  active: boolean;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface EventInsert {
  event_id: string;
  name: string;
  description: string;
  organizer_id: string;
  organizer_account_address: string;
  active?: boolean;
}

export interface EventUpdate {
  event_id?: string;
  name?: string;
  description?: string;
  organizer_id?: string;
  organizer_account_address?: string;
  active?: boolean;
  updated_at?: string;
}

export interface Whitelisting {
  id: string; // UUID from Supabase
  event_id: string; // Event object ID from blockchain
  email: string;
  email_hash: string; // SHA-3-256 hash (hex string)
  created_at: string; // ISO timestamp
}

export interface WhitelistingInsert {
  event_id: string;
  email: string;
  email_hash: string;
}

export interface WhitelistingUpdate {
  event_id?: string;
  email?: string;
  email_hash?: string;
}

export interface Certificate {
  id: string; // UUID from Supabase
  event_id: string; // Event object ID from blockchain
  user_id: string; // UUID from auth.users
  image_url: string; // URL to the certificate image in Supabase storage
  name: string | null; // Optional name for the certificate
  is_default: boolean; // Whether this is a default certificate
  tier_name: string; // Tier name: PopPass, PopBadge, PopMedal, PopTrophy
  tier_index: number; // Tier index in event's tiers vector: 0=PopPass, 1=PopBadge, 2=PopMedal, 3=PopTrophy
  tier_level: string | null; // Tier level: Basic, Standard, Premium, Exclusive
  tier_description: string | null; // Tier description
  tier_image_url: string | null; // URL to tier image
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface CertificateInsert {
  event_id: string;
  user_id: string;
  image_url: string;
  name?: string | null;
  is_default?: boolean;
  tier_name: string;
  tier_index: number; // Tier index: 0=PopPass, 1=PopBadge, 2=PopMedal, 3=PopTrophy
  tier_level?: string | null;
  tier_description?: string | null;
  tier_image_url?: string | null;
}

export interface CertificateUpdate {
  event_id?: string;
  user_id?: string;
  image_url?: string;
  name?: string | null;
  is_default?: boolean;
  tier_name?: string;
  tier_index?: number;
  tier_level?: string | null;
  tier_description?: string | null;
  tier_image_url?: string | null;
  updated_at?: string;
}
