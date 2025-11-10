"use client";

import { useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { PlaygroundCard } from "@/components/playground-card";
import { usePlaygrounds } from "@/contexts/playgrounds-context";
import { useMediaQuery } from "@/lib/hooks";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { UNNAMED_PLAYGROUND } from "@/lib/constants";

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
      >
        {/* Visually hidden for accessibility, with drag handle */}
        <SheetHeader className="relative flex h-12 flex-shrink-0 items-center justify-center border-b pr-12">
          <VisuallyHidden>
            <SheetTitle>{name}</SheetTitle>
            <SheetDescription>Playground details</SheetDescription>
          </VisuallyHidden>
          <div className="bg-muted absolute left-1/2 top-2 h-1 w-12 -translate-x-1/2 rounded-full" />
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {currentPlayground && (
            <PlaygroundCard
              playground={currentPlayground}
              variant="detailed"
              onFlyTo={(coords) => {
                requestFlyTo(coords);
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
