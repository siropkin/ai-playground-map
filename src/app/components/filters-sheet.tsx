"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatEnumString } from "@/lib/utils";
import { useFilters } from "@/contexts/filters-context";
import { ACCESS_TYPES, AGE_GROUPS, FEATURE_TYPES } from "@/lib/constants";
import type { AccessType, FeatureType } from "@/types/playground";

const sortedAccessTypes = [...ACCESS_TYPES].sort();
const sortedFeatureTypes = [...FEATURE_TYPES].sort();

export function FiltersSheet() {
  const { accesses, setAccesses, ages, setAges, features, setFeatures } =
    useFilters();

  const [open, setOpen] = useState(false);

  // Local state for staged changes (optional: can use context directly for instant apply)
  const [localAccesses, setLocalAccesses] = useState<AccessType[]>(
    accesses || [],
  );
  const [localAges, setLocalAges] = useState<string[]>(ages || []);
  const [localFeatures, setLocalFeatures] = useState<FeatureType[]>(
    features || [],
  );

  // Sync local state with context when opening
  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (val) {
      setLocalAccesses(accesses || []);
      setLocalAges(ages || []);
      setLocalFeatures(features || []);
    }
  }

  function handleApply() {
    setAccesses(localAccesses.length ? localAccesses : null);
    setAges(localAges.length ? localAges : null);
    setFeatures(localFeatures.length ? localFeatures : null);
    setOpen(false);
  }

  function handleClear() {
    setLocalAccesses([]);
    setLocalAges([]);
    setLocalFeatures([]);
    setAccesses(null);
    setAges(null);
    setFeatures(null);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:block">Filters</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full max-w-full">
        <SheetHeader>
          <SheetTitle>Filter playgrounds</SheetTitle>
          <SheetDescription>
            Choose filters to narrow down the list of playgrounds.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4">
          {/* Access Types */}
          <div>
            <Label className="mb-2 block">Access</Label>
            <div className="flex flex-wrap gap-2">
              {sortedAccessTypes.map((type) => (
                <Badge
                  key={type}
                  variant={localAccesses.includes(type) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() =>
                    setLocalAccesses((prev) =>
                      prev.includes(type)
                        ? prev.filter((t) => t !== type)
                        : [...prev, type],
                    )
                  }
                >
                  {formatEnumString(type)}
                </Badge>
              ))}
            </div>
          </div>
          {/* Ages */}
          <div>
            <Label className="mb-2 block">Ages</Label>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map((group) => (
                <Badge
                  key={group.key}
                  variant={
                    localAges.includes(group.key) ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() =>
                    setLocalAges((prev) =>
                      prev.includes(group.key)
                        ? prev.filter((k) => k !== group.key)
                        : [...prev, group.key],
                    )
                  }
                >
                  {group.label}
                </Badge>
              ))}
            </div>
          </div>
          {/* Features */}
          <div>
            <Label className="mb-2 block">Features</Label>
            <div className="flex flex-wrap gap-2">
              {sortedFeatureTypes.map((type) => (
                <Badge
                  key={type}
                  variant={localFeatures.includes(type) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() =>
                    setLocalFeatures((prev) =>
                      prev.includes(type)
                        ? prev.filter((f) => f !== type)
                        : [...prev, type],
                    )
                  }
                >
                  {formatEnumString(type)}
                </Badge>
              ))}
            </div>
          </div>
          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <Button onClick={handleApply} className="flex-1">
              Apply
            </Button>
            <Button variant="outline" onClick={handleClear} className="flex-1">
              Clear All Filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
