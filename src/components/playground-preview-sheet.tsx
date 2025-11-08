"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PlaygroundPreview } from "@/components/playground-preview";
import { usePlaygrounds } from "@/contexts/playgrounds-context";
import { UNNAMED_PLAYGROUND } from "@/lib/constants";
import { useMediaQuery } from "@/lib/hooks";

export function PlaygroundPreviewSheet() {
  const {
    selectedPlayground,
    clearSelectedPlayground,
    requestFlyTo,
    playgrounds,
  } = usePlaygrounds();

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isOpen = selectedPlayground !== null;

  // Get the latest playground data from the array (in case it was enriched)
  const currentPlayground = selectedPlayground
    ? playgrounds.find(p => p.osmId === selectedPlayground.osmId) || selectedPlayground
    : null;

  const name = currentPlayground?.name || UNNAMED_PLAYGROUND;

  const previewContent = currentPlayground ? (
    <PlaygroundPreview
      playground={currentPlayground}
      onViewDetails={clearSelectedPlayground}
      onFlyTo={(coords) => {
        requestFlyTo(coords);
        clearSelectedPlayground();
      }}
      hideTitle
    />
  ) : null;

  // Desktop: Map handles popup (don't render anything here)
  if (isDesktop) {
    return null;
  }

  // Mobile: Use Sheet (bottom drawer)
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && clearSelectedPlayground()}>
      <SheetContent
        side="bottom"
        className="flex max-h-[65vh] flex-col rounded-t-2xl p-4"
      >
        <SheetHeader className="mb-4">
          <SheetTitle>{name}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-1 flex-col overflow-y-auto">
          {previewContent}
        </div>
      </SheetContent>
    </Sheet>
  );
}
