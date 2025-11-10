"use client";

import { PlaygroundCard } from "@/components/playground-card";
import { Playground } from "@/types/playground";
import { X, Share2, Navigation, ParkingCircle, Accessibility } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UNNAMED_PLAYGROUND } from "@/lib/constants";
import { toast } from "sonner";

interface PlaygroundDetailSidebarProps {
  playground: Playground;
  onClose: () => void;
  onFlyTo?: (coords: [number, number]) => void;
}

// Filter out "Unknown" values (case insensitive) from an array
const filterUnknown = (items: string[] | null | undefined): string[] => {
  if (!items) return [];
  return items.filter(item => item.toLowerCase() !== "unknown");
};

/**
 * Desktop right sidebar for displaying full playground details
 * Slides in from right with semi-transparent overlay
 */
export function PlaygroundDetailSidebar({
  playground,
  onClose,
  onFlyTo,
}: PlaygroundDetailSidebarProps) {
  const name = playground.name || UNNAMED_PLAYGROUND;
  const filteredAccessibility = filterUnknown(playground.accessibility);

  // Share functionality
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Create URL with playground centered in view
    const url = new URL(window.location.origin);
    url.searchParams.set("playground", playground.osmId.toString());

    // Add map bounds centered on the playground (zoom level 15 for detail)
    const zoom = 15;
    const latOffset = 0.01; // Approximate bounds for zoom 15
    const lonOffset = 0.01;

    url.searchParams.set("south", (playground.lat - latOffset).toString());
    url.searchParams.set("north", (playground.lat + latOffset).toString());
    url.searchParams.set("west", (playground.lon - lonOffset).toString());
    url.searchParams.set("east", (playground.lon + lonOffset).toString());
    url.searchParams.set("zoom", zoom.toString());

    try {
      // Always copy to clipboard first
      await navigator.clipboard.writeText(url.toString());

      const isMobile = navigator.share && /mobile/i.test(navigator.userAgent);

      // Only show toast on desktop - mobile will show native share sheet
      if (!isMobile) {
        toast.success("Link copied to clipboard!");
      }

      // Additionally trigger native share on mobile if available
      if (isMobile) {
        const shareData = {
          title: name,
          text: `Check out ${name}`,
          url: url.toString(),
        };
        // Don't await - let it open asynchronously
        navigator.share(shareData).catch(() => {
          // User cancelled share dialog, but link is already copied
        });
      }
    } catch (error) {
      // Clipboard write failed
      console.error("Copy failed:", error);
      toast.error("Failed to copy link");
    }
  };

  // Directions functionality
  const handleDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { lat, lon } = playground;

    // Detect platform and use appropriate maps URL
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const directionsUrl = isIOS
      ? `maps://maps.google.com/maps?daddr=${lat},${lon}&amp;ll=`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

    window.open(directionsUrl, "_blank");
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close sidebar"
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header with title and actions */}
        <div className="border-b flex-shrink-0 px-4 py-3">
          {/* Title row */}
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold flex-1 truncate">{name}</h2>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                aria-label="Share"
                className="h-8 w-8"
              >
                <Share2 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDirections}
                aria-label="Get Directions"
                className="h-8 w-8"
              >
                <Navigation className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Subheader with indicators */}
          {playground.enriched && (playground.tier || playground.parking || filteredAccessibility.length > 0) && (
            <div className="flex gap-3 text-muted-foreground text-sm">
              {playground.tier && playground.tier !== "neighborhood" && (
                <div className="flex items-center gap-1">
                  <span>{playground.tier === "star" ? "⭐" : "💎"}</span>
                  <span>{playground.tier === "star" ? "Star" : "Gem"}</span>
                </div>
              )}
              {playground.parking && (
                <div className="flex items-center gap-1">
                  <ParkingCircle className="h-4 w-4" />
                  <span>Parking</span>
                </div>
              )}
              {filteredAccessibility.length > 0 && (
                <div className="flex items-center gap-1">
                  <Accessibility className="h-4 w-4" />
                  <span>Accessible</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4">
          <PlaygroundCard
            playground={playground}
            variant="detailed"
            onFlyTo={onFlyTo}
            hideTitle
            hideTierBadge
            hideInfoIndicators
          />
        </div>
      </div>
    </>
  );
}
