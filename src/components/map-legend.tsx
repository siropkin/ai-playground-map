"use client";

import React from "react";
import { useTheme } from "next-themes";

export const MapLegend = React.memo(function MapLegend() {
  const { theme } = useTheme();

  const tiers = [
    {
      name: "Star",
      color: "#f59e0b",
      strokeColor: "#fbbf24",
    },
    {
      name: "Gem",
      color: "#a855f7",
      strokeColor: "#c084fc",
    },
    {
      name: "Local",
      color: theme === "light" ? "#6b7280" : "#9ca3af",
      strokeColor: theme === "light" ? "#FFFFFF" : "#374151",
    },
  ];

  return (
    <div className="bg-background/95 absolute right-4 top-2 z-10 rounded-md border shadow-md backdrop-blur-sm md:h-9">
      <div className="flex h-full flex-col items-start gap-1 px-2 py-1.5 md:flex-row md:items-center md:gap-2 md:px-3 md:py-0">
        {tiers.map((tier) => (
          <div key={tier.name} className="flex items-center gap-1">
            <div
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{
                backgroundColor: tier.color,
                border: `1.5px solid ${tier.strokeColor}`,
              }}
            />
            <span className="text-xs font-medium">
              {tier.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});
