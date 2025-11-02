import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/contexts/auth-context";

/**
 * GuestRoute component - redirects logged-in users to their appropriate dashboard
 * Use this wrapper for login and register pages
 */
export function GuestRoute() {
  const { user, profile, loading, isAdmin, isOrganizer, isAttendee } =
    useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <img
            src="/logos/popchain_logo.png"
            alt="logo"
            className="w-12 h-12 animate-bounce"
          />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect logged-in users to their appropriate dashboard
  if (user && profile) {
    if (isAdmin) {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (isOrganizer && !isAttendee) {
      return <Navigate to="/organizer/dashboard" replace />;
    } else if (isAttendee && !isOrganizer) {
      return <Navigate to="/attendee/dashboard" replace />;
    } else if (isOrganizer && isAttendee) {
      // User has both roles, redirect to organizer by default
      return <Navigate to="/organizer/dashboard" replace />;
    }
  }

  return <Outlet />;
}
