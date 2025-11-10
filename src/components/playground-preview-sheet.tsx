"use client";

import { useEffect } from "react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { PlaygroundCard } from "@/components/playground-card";
import { usePlaygrounds } from "@/contexts/playgrounds-context";
import { useMediaQuery } from "@/lib/hooks";
import { UNNAMED_PLAYGROUND } from "@/lib/constants";
import { X, Share2, Navigation, ParkingCircle, Accessibility } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

// Filter out "Unknown" values (case insensitive) from an array
const filterUnknown = (items: string[] | null | undefined): string[] => {
  if (!items) return [];
  return items.filter(item => item.toLowerCase() !== "unknown");
};

export function PlaygroundPreviewSheet() {
  const {
    selectedPlayground,
    clearSelectedPlayground,
    requestFlyTo,
    playgrounds,
    loadImagesForPlayground,
  } = usePlaygrounds();

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isOpen = selectedPlayground !== null;

  // Get the latest playground data from the array (in case it was enriched)
  const currentPlayground = selectedPlayground
    ? playgrounds.find(p => p.osmId === selectedPlayground.osmId) || selectedPlayground
    : null;

  // Load images when a playground is selected (popup/sheet opened)
  useEffect(() => {
    if (currentPlayground && currentPlayground.enriched && !currentPlayground.images) {
      loadImagesForPlayground(currentPlayground.osmId);
    }
  }, [currentPlayground, loadImagesForPlayground]);

  const name = currentPlayground?.name || UNNAMED_PLAYGROUND;
  const filteredAccessibility = filterUnknown(currentPlayground?.accessibility);

  // Share functionality
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentPlayground) return;

    // Create URL with playground centered in view
    const url = new URL(window.location.origin);
    url.searchParams.set("playground", currentPlayground.osmId.toString());

    // Add map bounds centered on the playground (zoom level 15 for detail)
    const zoom = 15;
    const latOffset = 0.01;
    const lonOffset = 0.01;

    url.searchParams.set("south", (currentPlayground.lat - latOffset).toString());
    url.searchParams.set("north", (currentPlayground.lat + latOffset).toString());
    url.searchParams.set("west", (currentPlayground.lon - lonOffset).toString());
    url.searchParams.set("east", (currentPlayground.lon + lonOffset).toString());
    url.searchParams.set("zoom", zoom.toString());

    try {
      await navigator.clipboard.writeText(url.toString());

      const isMobile = navigator.share && /mobile/i.test(navigator.userAgent);

      // Only show toast on desktop - mobile will show native share sheet
      if (!isMobile) {
        toast.success("Link copied to clipboard!");
      }

      if (isMobile) {
        const shareData = {
          title: name,
          text: `Check out ${name}`,
          url: url.toString(),
        };
        navigator.share(shareData).catch(() => {});
      }
    } catch (error) {
      console.error("Copy failed:", error);
      toast.error("Failed to copy link");
    }
  };

  // Directions functionality
  const handleDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentPlayground) return;

    const { lat, lon } = currentPlayground;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const directionsUrl = isIOS
      ? `maps://maps.google.com/maps?daddr=${lat},${lon}&amp;ll=`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

    window.open(directionsUrl, "_blank");
  };

  // Desktop: Handled by PlaygroundDetailSidebar
  if (isDesktop) {
    return null;
  }

  // Mobile: Use Sheet (bottom drawer) - always show detailed view like desktop
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && clearSelectedPlayground()}>
      <SheetContent
        side="bottom"
        className="flex max-h-[85vh] flex-col rounded-t-2xl"
        hideCloseButton
      >
        {/* Hidden description for accessibility */}
        <VisuallyHidden>
          <SheetDescription>Playground details and information</SheetDescription>
        </VisuallyHidden>

        {/* Header with title and actions */}
        <div className="border-b flex-shrink-0 px-4 py-3">
          {/* Title row */}
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg font-semibold flex-1 truncate">{name}</SheetTitle>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                aria-label="Share"
                className="h-10 w-10"
              >
                <Share2 className="size-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDirections}
                aria-label="Get Directions"
                className="h-10 w-10"
              >
                <Navigation className="size-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => clearSelectedPlayground()}
                className="h-10 w-10"
                aria-label="Close"
              >
                <X className="size-5" />
              </Button>
            </div>
          </div>

          {/* Subheader with indicators */}
          {currentPlayground?.enriched && (currentPlayground?.tier || currentPlayground?.parking || filteredAccessibility.length > 0) && (
            <div className="flex gap-3 text-muted-foreground text-sm">
              {currentPlayground.tier && currentPlayground.tier !== "neighborhood" && (
                <div className="flex items-center gap-1">
                  <span>{currentPlayground.tier === "star" ? "⭐" : "💎"}</span>
                  <span>{currentPlayground.tier === "star" ? "Star" : "Gem"}</span>
                </div>
              )}
              {currentPlayground.parking && (
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
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {currentPlayground && (
            <PlaygroundCard
              playground={currentPlayground}
              variant="detailed"
              onFlyTo={(coords) => {
                requestFlyTo(coords);
              }}
              hideTitle
              hideTierBadge
              hideInfoIndicators
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
