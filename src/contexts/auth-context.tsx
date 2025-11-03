import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDisconnectWallet } from "@mysten/dapp-kit";
import supabase from "@/utils/supabase";
import type { UserProfile } from "@/types/database";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null; profile: UserProfile | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isOrganizer: boolean;
  isAttendee: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { mutate: disconnectWallet } = useDisconnectWallet();

  // Query for current user session
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ["auth", "session"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
        throw error;
      }
      return data.session;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const user = sessionData?.user ?? null;

  // Query for user profile (only when user exists)
  const { data: profileData, isLoading: profileLoading } =
    useQuery<UserProfile | null>({
      queryKey: ["auth", "profile", user?.id],
      queryFn: async () => {
        if (!user) return null;

        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          // Handle case where profile doesn't exist (not an error for new users)
          if (error.code === "PGRST116") {
            console.log(
              "User profile not found, user may need to complete registration"
            );
            return null;
          }
          throw error;
        }

        return data;
      },
      enabled: !!user,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    });

  const profile = profileData ?? null;

  // Check if user is admin (you may need to adjust this logic based on your admin requirements)
  // For now, we'll check if the user has a special email or metadata field
  const isAdmin =
    profile?.email === import.meta.env.VITE_ADMIN_EMAIL ||
    (profile &&
      "is_admin" in profile &&
      (profile as UserProfile & { is_admin?: boolean }).is_admin === true) ||
    false;

  // Check roles based on profile.role
  // role: 0 = Attendee, 1 = Organizer, 2 = Both
  const isOrganizer = profile
    ? profile.role === 1 || profile.role === 2
    : false;
  const isAttendee = profile ? profile.role === 0 || profile.role === 2 : false;

  const loading = sessionLoading || (!!user && profileLoading);

  // Sign in mutation
  const signInMutation = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        return { user: null, profile: null };
      }

      // Update session in cache immediately (onAuthStateChange will also handle this)
      queryClient.setQueryData(["auth", "session"], data.session);

      // Fetch profile directly
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        // Handle case where profile doesn't exist (not an error for new users)
        if (profileError.code === "PGRST116") {
          console.log(
            "User profile not found, user may need to complete registration"
          );
          // Set null in cache
          queryClient.setQueryData(["auth", "profile", data.user.id], null);
          return { user: data.user, profile: null };
        }
        throw profileError;
      }

      // Set profile in cache
      queryClient.setQueryData(["auth", "profile", data.user.id], profileData);

      return { user: data.user, profile: profileData };
    },
  });

  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInMutation.mutateAsync({ email, password });
      return { error: null, profile: result.profile };
    } catch (error) {
      return { error: error as Error, profile: null };
    }
  };

  // Sign out mutation
  const signOutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      // Clear all auth-related queries
      queryClient.setQueryData(["auth", "session"], null);
      queryClient.setQueryData(["auth", "profile"], null);
      queryClient.removeQueries({ queryKey: ["auth"] });
    },
    onSuccess: () => {
      // Use window.location for reliable redirect
      window.location.href = "/login";
    },
  });

  const signOut = async () => {
    try {
      // Disconnect wallet first
      disconnectWallet();

      // Then sign out from Supabase
      await signOutMutation.mutateAsync();
    } catch (error) {
      console.error("Error during sign out:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signOut,
        isAdmin,
        isOrganizer,
        isAttendee,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
