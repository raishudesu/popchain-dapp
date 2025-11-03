import { useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import PopLoader from "@/components/pop-loader";
import { setUnclaimedCertificateId } from "@/utils/unclaimed-certificate";

const ScanQrPage = () => {
  const { certId } = useParams<{ certId: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!certId) {
      // Invalid URL, redirect to home
      navigate("/");
      return;
    }

    if (!user) {
      // User not logged in, store certificate ID and redirect to login
      setUnclaimedCertificateId(certId);
      navigate("/login", { replace: true });
    } else {
      // User is logged in, store certificate ID and redirect to dashboard
      // The claim dialog will be shown from the dashboard/auth context
      setUnclaimedCertificateId(certId);

      // Redirect based on user role
      navigate("/attendee/dashboard", { replace: true });
    }
  }, [certId, user, loading, navigate]);

  return <PopLoader />;
};

export default ScanQrPage;
