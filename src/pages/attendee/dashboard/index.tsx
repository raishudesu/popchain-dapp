import { UnclaimedCertificateChecker } from "@/components/unclaimed-certificate-checker";
import { MyCertificates } from "@/pages/attendee/components/my-certificates";
import { useAuth } from "@/contexts/auth-context";

const AttendeeDashboard = () => {
  const { profile } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-background w-full p-8">
      <h1 className="text-2xl font-bold text-accent-foreground">
        Welcome back, {profile?.first_name}! 🎉
      </h1>
      <p className="leading-7 [&:not(:first-child)]:mt-6">
        Here are your latest certificates.
      </p>
      <div className="mt-4 flex-1">
        <UnclaimedCertificateChecker />
        <MyCertificates />
      </div>
    </div>
  );
};

export default AttendeeDashboard;
