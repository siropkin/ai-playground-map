"use client";

import { useEffect, useState } from "react";
import { List, X } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlaygroundList } from "@/components/playground-list";
import { usePlaygrounds } from "@/contexts/playgrounds-context";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export function PlaygroundListSheet() {
  const { flyToCoords } = usePlaygrounds();

  const [open, setOpen] = useState(false);

  // Close sheet when user explicitly flies to a location
  useEffect(() => {
    if (flyToCoords) {
      setOpen(false);
    }
  }, [flyToCoords]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          onClick={() => setOpen(true)}
        >
          <List className="h-4 w-4" />
          Playgrounds
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="flex max-h-[85vh] flex-col rounded-t-2xl md:hidden"
        hideCloseButton
      >
        {/* Hidden description for accessibility */}
        <VisuallyHidden>
          <SheetDescription>Browse all playgrounds in the area</SheetDescription>
        </VisuallyHidden>

        {/* Header with title and close button */}
        <div className="border-b flex-shrink-0 px-4 py-3">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg font-semibold flex-1">Playgrounds</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="h-10 w-10"
              aria-label="Close"
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2">
          <PlaygroundList displayEmptyState />
        </div>
      </SheetContent>
    </Sheet>
  );
}
