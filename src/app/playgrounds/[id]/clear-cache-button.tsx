"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { clearPlaygroundCacheAction } from "./actions";

export default function ClearCacheButton({
  playgroundId,
  lat,
  lon,
}: {
  lat: number;
  lon: number;
  playgroundId: string;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClearCache = async () => {
    const confirmed = confirm(
      "Are you sure you want to clear the cache for this playground?",
    );

    if (!confirmed) {
      return;
    }

    if (!playgroundId || lat == null || lon == null) {
      alert("Error: No playground ID or coordinates provided");
      return;
    }

    setIsLoading(true);
    try {
      const result = await clearPlaygroundCacheAction({
        playgroundId,
        lat,
        lon,
      });

      if (result.success) {
        alert(`Success: ${result.message}`);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch {
      alert("Error: Failed to clear cache");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="destructive"
      className="border-orange-500 bg-orange-500 text-white hover:bg-orange-600"
      onClick={handleClearCache}
      disabled={isLoading}
    >
      {isLoading ? "Clearing..." : "Clear cache"}
    </Button>
  );
}
