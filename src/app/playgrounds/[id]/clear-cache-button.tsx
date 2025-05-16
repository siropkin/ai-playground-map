"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { clearAiInsightsCacheAction } from "./actions";

export default function ClearCacheButton({
  address,
  playgroundId,
}: {
  address: string;
  playgroundId: string;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClearCache = async () => {
    const confirmed = confirm(
      "Are you sure you want to clear the AI insights cache for this playground?",
    );

    if (!confirmed) {
      return;
    }

    if (!address) {
      alert("Error: No address available to clear cache");
      return;
    }

    setIsLoading(true);
    try {
      const result = await clearAiInsightsCacheAction(address, playgroundId);

      if (result.success) {
        alert(`Success: ${result.message}`);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch {
      alert("Error: Failed to clear AI insights cache");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="destructive"
      className="border-orange-500 bg-orange-500 text-white hover:bg-orange-600"
      onClick={handleClearCache}
      disabled={isLoading || !address}
    >
      {isLoading ? "Clearing..." : "Clear AI cache"}
    </Button>
  );
}
