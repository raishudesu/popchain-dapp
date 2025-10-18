import { Award, QrCode, Sparkles } from "lucide-react";

export const features = [
  {
    icon: <QrCode className="w-8 h-8" />,
    title: "QR Code Verification",
    description:
      "Attendees scan QR codes at event end to instantly receive their NFT certificates",
  },
  {
    icon: <Award className="w-8 h-8" />,
    title: "NFT Certificates & Badges",
    description:
      "Mint verifiable NFTs as proof of attendance plus special badges for side quests and rewards",
  },
  {
    icon: <Sparkles className="w-8 h-8" />,
    title: "Portable Credentials",
    description:
      "NFT certificates are portable across platforms and wallets—your proof, forever",
  },
];

export const howItWorks = [
  {
    step: "1",
    title: "Organizer Creates Event",
    desc: "Set up your event and configure NFT rewards",
  },
  {
    step: "2",
    title: "Attendees Register",
    desc: "Students and participants join the event",
  },
  {
    step: "3",
    title: "Scan QR Code",
    desc: "At event end, attendees scan to verify presence",
  },
  {
    step: "4",
    title: "Mint NFT Certificate",
    desc: "Instant NFT minting + badges for achievements",
  },
];
