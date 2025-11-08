"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  } = usePlaygrounds();

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isOpen = selectedPlayground !== null;
  const name = selectedPlayground?.name || UNNAMED_PLAYGROUND;

  const hasNoEnrichmentData =
    selectedPlayground?.enriched === true &&
    !selectedPlayground?.description &&
    !selectedPlayground?.features?.length &&
    !selectedPlayground?.images?.length &&
    (!selectedPlayground?.name || selectedPlayground?.name === UNNAMED_PLAYGROUND);

  const showAiBadge = selectedPlayground?.enriched && !hasNoEnrichmentData;

  const titleWithBadge = (
    <div className="flex items-center gap-2">
      <span>{name}</span>
      {showAiBadge && (
        <span
          className="rounded-sm border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-600 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-400"
          title="AI-generated content may contain errors"
        >
          AI
        </span>
      )}
    </div>
  );

  const previewContent = selectedPlayground ? (
    <PlaygroundPreview
      playground={selectedPlayground}
      onViewDetails={clearSelectedPlayground}
      onFlyTo={(coords) => {
        requestFlyTo(coords);
        clearSelectedPlayground();
      }}
      hideTitle
    />
  ) : null;

  // Desktop: Use Dialog (centered modal)
  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && clearSelectedPlayground()}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{titleWithBadge}</DialogTitle>
          </DialogHeader>
          {previewContent}
        </DialogContent>
      </Dialog>
    );
  }

  // Mobile: Use Sheet (bottom drawer)
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && clearSelectedPlayground()}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-2xl p-4"
      >
        <SheetHeader className="mb-4">
          <SheetTitle>{titleWithBadge}</SheetTitle>
        </SheetHeader>
        {previewContent}
      </SheetContent>
    </Sheet>
  );
}
