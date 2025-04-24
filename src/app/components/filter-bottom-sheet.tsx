"use client";

import { useState } from "react";
import { Sliders } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FilterButton } from "@/types/types";

export function FilterBottomSheet({ filters }: { filters: FilterButton[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Filters">
          <Sliders className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-xl">
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="grid max-h-[calc(80vh-120px)] grid-cols-2 gap-2 overflow-y-auto py-4">
          {filters.map((filter, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              aria-label={filter.ariaLabel}
            >
              {filter.label}
            </Button>
          ))}
        </div>
        <div className="mt-4 px-4 pb-4">
          <Button className="w-full">Apply Filters</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
