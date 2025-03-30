import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = {
  default:
    "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
  secondary:
    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive:
    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
  outline: "text-foreground",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof badgeVariants;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantClass = badgeVariants[variant];
  return (
    <div
      className={cn(
        "focus:ring-ring inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none",
        variantClass,
        className,
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
