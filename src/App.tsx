import { Routes, Route } from "react-router";
import PublicLayout from "./components/layouts/layout";
import LandingPage from "./pages/landing-page";
import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";
import "@/styles/App.css";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
    </Routes>
  );
}
