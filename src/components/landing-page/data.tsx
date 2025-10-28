import {
  Award,
  QrCode,
  Sparkles,
  Ticket,
  Star,
  Trophy,
  Medal,
} from "lucide-react";

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
      "Mint verifiable standard to premium NFTs as proof of attendance and achievements",
  },
  {
    icon: <Sparkles className="w-8 h-8" />,
    title: "Portable Credentials",
    description:
      "NFT certificates are portable across platforms and wallets—your proof, forever",
  },
];

export const tiers = [
  {
    icon: Ticket,
    title: "PopPass",
    description: "Proof of Attendance",
    tier: "Basic",
    iconColor: "text-purple-500",
  },
  {
    icon: Star,
    title: "PopBadge",
    description: "Activity / Side Quest",
    tier: "Standard",
    iconColor: "text-blue-500",
  },
  {
    icon: Medal,
    title: "PopMedal",
    description: "Distinction / Speaker",
    tier: "Premium",
    iconColor: "text-yellow-500",
  },
  {
    icon: Trophy,
    title: "PopTrophy",
    description: "VIP / Sponsor",
    tier: "Exclusive",
    iconColor: "text-pink-500",
  },
];

export const howItWorks = [
  {
    step: "1",
    title: "Organizer Creates Event",
    desc: "Set up your event and configure NFT rewards and upload whitelisted attendees",
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
    desc: "Instant NFT minting at event conclusion",
  },
];
