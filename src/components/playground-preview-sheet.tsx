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

export function PlaygroundPreviewSheet() {
  const {
    selectedPlayground,
    clearSelectedPlayground,
    requestFlyTo,
  } = usePlaygrounds();

  const isOpen = selectedPlayground !== null;
  const name = selectedPlayground?.name || UNNAMED_PLAYGROUND;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && clearSelectedPlayground()}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-2xl p-4"
      >
        <SheetHeader className="mb-4">
          <SheetTitle>{name}</SheetTitle>
        </SheetHeader>
        {selectedPlayground && (
          <PlaygroundPreview
            playground={selectedPlayground}
            onViewDetails={clearSelectedPlayground}
            onFlyTo={(coords) => {
              requestFlyTo(coords);
              clearSelectedPlayground();
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
