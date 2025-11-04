import { CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDefaultCertificateOptions } from "@/services/certificates";
import type { DefaultCertificateOption } from "@/services/certificates";

const Benefits = () => {
  const { data: certificates = [] } = useQuery<DefaultCertificateOption[]>({
    queryKey: ["defaultCertificateOptions"],
    queryFn: getDefaultCertificateOptions,
  });

  return (
    <section id="benefits" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Why PopChain?
            </h2>
            <ul className="space-y-4">
              {[
                "Verifiable proof of attendance on blockchain",
                "Instant free Certificate minting at event end",
                "Collectible tiered NFT certificates for achievements & recognition",
                "Powered by SUI Blockchain",
                "Fraud-proof and tamper-resistant",
                "Perfect for conferences, seminars & educational events",
              ].map((benefit, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-3 text-lg text-muted-foreground"
                >
                  <CheckCircle2 className="w-6 h-6 text-purple-400 flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-center">
            <div className="grid grid-cols-2 gap-4 place-items-center">
              {certificates.map((cert) => (
                <img
                  key={cert.index}
                  src={cert.url}
                  alt={`Certificate layout ${cert.index}`}
                  className="rounded-xl shadow-2xl w-full max-w-48 h-auto"
                />
              ))}
            </div>
            <small className="text-muted-foreground text-center mt-2">
              Here are some of our default certificate layouts. The organizer
              can choose to use any of these layouts or upload their own.
            </small>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Benefits;
