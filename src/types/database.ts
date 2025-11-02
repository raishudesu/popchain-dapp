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
