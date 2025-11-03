import { UnclaimedCertificateChecker } from "@/components/unclaimed-certificate-checker";
import { MyCertificates } from "@/components/my-certificates";

const AttendeeDashboard = () => {
  return (
    <div className="space-y-6">
      <UnclaimedCertificateChecker />
      <MyCertificates />
    </div>
  );
};

export default AttendeeDashboard;
