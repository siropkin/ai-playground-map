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
        className="max-h-[70vh] overflow-y-auto rounded-t-2xl p-4 md:hidden"
      >
        <SheetHeader>
          <SheetTitle>Playgrounds</SheetTitle>
          <SheetDescription>
            Click a playground to view its details.
          </SheetDescription>
        </SheetHeader>
        <PlaygroundList displayEmptyState />
      </SheetContent>
    </Sheet>
  );
}
