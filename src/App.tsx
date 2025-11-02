import { Routes, Route } from "react-router";
import PublicLayout from "./components/layouts/public-layout";
import LandingPage from "./pages/landing-page";
import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";
import "@/styles/App.css";
import AdminLayout from "./pages/admin/components/admin-layout";
import AdminDashboard from "./pages/admin/dashboard";
import AttendeeLayout from "./pages/attendee/components/attendee-layout";
import AttendeeDashboard from "./pages/attendee/dashboard";
import OrganizerLayout from "./pages/organizer/components/organizer-layout";
import OrganizerDashboard from "./pages/organizer/dashboard";
import ScanQrPage from "./pages/scan-qr";
import { Toaster } from "./components/ui/sonner";
import { ProtectedRoute } from "./components/auth/protected-route";
import { GuestRoute } from "./components/auth/guest-route";

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute requiredRole="admin" />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute requiredRole="attendee" />}>
          <Route element={<AttendeeLayout />}>
            <Route path="/attendee/dashboard" element={<AttendeeDashboard />} />
          </Route>
        </Route>
        <Route element={<ProtectedRoute requiredRole="organizer" />}>
          <Route element={<OrganizerLayout />}>
            <Route
              path="/organizer/dashboard"
              element={<OrganizerDashboard />}
            />
          </Route>
        </Route>

        {/* <Route path="*" element={<NotFound />} /> */}

        <Route path="/scan-qr/:certId" element={<ScanQrPage />} />
      </Routes>
      <Toaster />
    </>
  );
}
