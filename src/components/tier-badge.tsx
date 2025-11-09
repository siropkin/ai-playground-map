import { PlaygroundTier } from "@/lib/tier-calculator";
import { cn } from "@/lib/utils";

interface TierBadgeProps {
  tier: PlaygroundTier | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TierBadge({ tier, size = "md", className }: TierBadgeProps) {
  if (!tier || tier === "neighborhood") {
    return null; // Don't show badge for neighborhood tier
  }

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const tierConfig = {
    "star": {
      icon: "⭐",
      label: "Star",
      bgColor: "bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-950/40 dark:to-amber-950/40",
      textColor: "text-amber-800 dark:text-amber-200",
      borderColor: "border-amber-300 dark:border-amber-700",
    },
    gem: {
      icon: "💎",
      label: "Gem",
      bgColor: "bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-950/40 dark:to-pink-950/40",
      textColor: "text-purple-800 dark:text-purple-200",
      borderColor: "border-purple-300 dark:border-purple-700",
    },
  };

  const config = tierConfig[tier];
  if (!config) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeClasses[size],
        className,
      )}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </div>
  );
}
