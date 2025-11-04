import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import PopLoader from "../pop-loader";

interface ProtectedRouteProps {
  requiredRole?: "admin" | "organizer" | "attendee";
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading, isAdmin, isOrganizer, isAttendee } =
    useAuth();

  if (loading) {
    return <PopLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive mb-4">
            User profile not found. Please contact support.
          </p>
          <button
            onClick={() => (window.location.href = "/login")}
            className="text-blue-500 hover:underline"
          >
            Return to login
          </button>
        </div>
      </div>
    );
  }

  if (requiredRole) {
    // Check role-based access
    let hasAccess = false;

    switch (requiredRole) {
      case "admin":
        // Only admins can access admin routes
        hasAccess = isAdmin;
        break;
      case "organizer":
        // Organizers can access (if not admin)
        // Admin+organizer can access (even if also attendee, they can access organizer)
        // Admin+attendee (without organizer role) cannot access organizer routes
        hasAccess = (isOrganizer && !isAdmin) || (isAdmin && isOrganizer);
        break;
      case "attendee":
        // Attendees can access (if not admin)
        // Admin+attendee can access (even if also organizer, they can access attendee)
        // Admin+organizer (without attendee role) cannot access attendee routes
        hasAccess = (isAttendee && !isAdmin) || (isAdmin && isAttendee);
        break;
    }

    if (!hasAccess) {
      // Redirect based on user's actual role
      // If user is admin, redirect to admin dashboard
      if (isAdmin) {
        return <Navigate to="/admin/dashboard" replace />;
      } else if (isOrganizer && !isAttendee) {
        // Only organizer, redirect to organizer dashboard
        return <Navigate to="/organizer/dashboard" replace />;
      } else if (isAttendee && !isOrganizer) {
        // Only attendee, redirect to attendee dashboard
        return <Navigate to="/attendee/dashboard" replace />;
      } else if (isOrganizer && isAttendee) {
        // User has both roles (but not admin), redirect to organizer by default
        return <Navigate to="/organizer/dashboard" replace />;
      } else {
        // No role found, redirect to home
        return <Navigate to="/" replace />;
      }
    }
  }

  return <Outlet />;
}
