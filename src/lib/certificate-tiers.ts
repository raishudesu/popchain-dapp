// Certificate tier definitions matching smart contract tiers

export type TierName = "PopPass" | "PopBadge" | "PopMedal" | "PopTrophy";

export interface CertificateTier {
  name: TierName;
  level: "Basic" | "Standard" | "Premium" | "Exclusive";
  description: string;
  imageFileName: string;
  color: "purple" | "blue" | "red" | "yellow";
}

export const CERTIFICATE_TIERS: CertificateTier[] = [
  {
    name: "PopPass",
    level: "Basic",
    description: "Proof of Attendance",
    imageFileName: "pop_pass.png",
    color: "purple",
  },
  {
    name: "PopBadge",
    level: "Standard",
    description: "Activity / Side Quest",
    imageFileName: "pop_badge.png",
    color: "blue",
  },
  {
    name: "PopMedal",
    level: "Premium",
    description: "Distinction / Speaker",
    imageFileName: "pop_medal.png",
    color: "red",
  },
  {
    name: "PopTrophy",
    level: "Exclusive",
    description: "VIP / Sponsor",
    imageFileName: "pop_trophy.png",
    color: "yellow",
  },
];

/**
 * Get tier by name
 */
export function getTierByName(name: TierName): CertificateTier | undefined {
  return CERTIFICATE_TIERS.find((tier) => tier.name === name);
}

/**
 * Get tier index (0-3) for a tier name
 * 0 = PopPass, 1 = PopBadge, 2 = PopMedal, 3 = PopTrophy
 */
export function getTierIndex(tierName: TierName): number {
  return CERTIFICATE_TIERS.findIndex((tier) => tier.name === tierName);
}

/**
 * Get tier image URL from Supabase storage
 */
export function getTierImageUrl(tier: CertificateTier): string {
  // Use dynamic import to avoid circular dependencies
  // This will be called from services that have access to supabase client
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const bucketName = "tiers";
  const filePath = `${tier.imageFileName}`;
  // Construct public URL - Supabase public storage URLs follow this pattern
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`;
}

/**
 * Get all tier image URLs
 */
export function getAllTierImageUrls(): Record<TierName, string> {
  const urls: Partial<Record<TierName, string>> = {};
  for (const tier of CERTIFICATE_TIERS) {
    urls[tier.name] = getTierImageUrl(tier);
  }
  return urls as Record<TierName, string>;
}

/**
 * Get badge color classes for a tier
 */
export function getTierBadgeColor(tier: CertificateTier): string {
  const colorMap = {
    purple:
      "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    blue: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    red: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
    yellow:
      "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  };
  return colorMap[tier.color];
}
