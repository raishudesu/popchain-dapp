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
    // Admins should only have access to admin routes
    if (isAdmin && requiredRole !== "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }

    // Non-admins trying to access admin routes should be redirected
    if (requiredRole === "admin" && !isAdmin) {
      // Redirect based on user's actual role
      if (isOrganizer && !isAttendee) {
        return <Navigate to="/organizer/dashboard" replace />;
      } else if (isAttendee && !isOrganizer) {
        return <Navigate to="/attendee/dashboard" replace />;
      } else if (isOrganizer && isAttendee) {
        // User has both roles, redirect to organizer by default
        return <Navigate to="/organizer/dashboard" replace />;
      } else {
        return <Navigate to="/" replace />;
      }
    }

    // Check role-based access for non-admin routes
    let hasAccess = false;

    switch (requiredRole) {
      case "admin":
        hasAccess = isAdmin;
        break;
      case "organizer":
        hasAccess = isOrganizer;
        break;
      case "attendee":
        hasAccess = isAttendee;
        break;
    }

    if (!hasAccess) {
      // Redirect based on user's actual role
      if (isAdmin) {
        return <Navigate to="/admin/dashboard" replace />;
      } else if (isOrganizer && !isAttendee) {
        return <Navigate to="/organizer/dashboard" replace />;
      } else if (isAttendee && !isOrganizer) {
        return <Navigate to="/attendee/dashboard" replace />;
      } else if (isOrganizer && isAttendee) {
        // User has both roles, redirect to organizer by default
        return <Navigate to="/organizer/dashboard" replace />;
      } else {
        return <Navigate to="/" replace />;
      }
    }
  }

  return <Outlet />;
}
