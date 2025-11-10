"use client";

import { useEffect, useState } from "react";
import { List } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PlaygroundList } from "@/components/playground-list";
import { usePlaygrounds } from "@/contexts/playgrounds-context";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export function PlaygroundListSheet() {
  const { loading, flyToCoords } = usePlaygrounds();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [loading, flyToCoords]);

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
      >
        {/* Visually hidden for accessibility, with drag handle */}
        <SheetHeader className="relative flex h-12 flex-shrink-0 items-center justify-center border-b pr-12">
          <VisuallyHidden>
            <SheetTitle>Playgrounds</SheetTitle>
            <SheetDescription>Click a playground to view its details</SheetDescription>
          </VisuallyHidden>
          <div className="bg-muted absolute left-1/2 top-2 h-1 w-12 -translate-x-1/2 rounded-full" />
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2">
          <PlaygroundList displayEmptyState />
        </div>
      </SheetContent>
    </Sheet>
  );
}
