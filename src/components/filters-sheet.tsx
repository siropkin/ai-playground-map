"use client";

import { useState } from "react";
import { Filter } from "lucide-react";

import type { AccessType, FeatureType } from "@/types/playground";
import {
  ACCESS_TYPES,
  AGE_GROUPS,
  APP_ADMIN_ROLE,
  FEATURE_TYPES,
} from "@/lib/constants";
import { useFilters } from "@/contexts/filters-context";
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
import { useAuth } from "@/contexts/auth-context";

const sortedAccessTypes = [...ACCESS_TYPES].sort();
const sortedFeatureTypes = [...FEATURE_TYPES].sort();

export function FiltersSheet() {
  const {
    approvals,
    setApprovals,
    accesses,
    setAccesses,
    ages,
    setAges,
    features,
    setFeatures,
  } = useFilters();

  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // Local state for staged changes (optional: can use context directly for instant apply)
  const [localApprovals, setLocalApprovals] = useState<boolean[]>(
    approvals || [],
  );
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
      setLocalApprovals(approvals || []);
      setLocalAccesses(accesses || []);
      setLocalAges(ages || []);
      setLocalFeatures(features || []);
    }
  }

  function handleApply() {
    setApprovals(localApprovals.length ? localApprovals : null);
    setAccesses(localAccesses.length ? localAccesses : null);
    setAges(localAges.length ? localAges : null);
    setFeatures(localFeatures.length ? localFeatures : null);
    setOpen(false);
  }

  function handleClear() {
    setLocalApprovals([]);
    setLocalAccesses([]);
    setLocalAges([]);
    setLocalFeatures([]);
    setApprovals(null);
    setAccesses(null);
    setAges(null);
    setFeatures(null);
    setOpen(false);
  }

  // Determine if any filter is set
  const filtersSet =
    (approvals && approvals.length > 0) ||
    (accesses && accesses.length > 0) ||
    (ages && ages.length > 0) ||
    (features && features.length > 0);

  const isAdmin = user?.role === APP_ADMIN_ROLE;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:block">Filters</span>
          {filtersSet && (
            <span
              className="bg-primary absolute top-1.5 right-1.5 block h-2 w-2 rounded-full"
              aria-label="Filters set"
            />
          )}
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
          {/* Approval (for admin only) */}
          {isAdmin && (
            <div>
              <Label className="mb-2 block">Approved</Label>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={
                    localApprovals.includes(true) ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() =>
                    setLocalApprovals((prev) =>
                      prev.includes(true)
                        ? prev.filter((a) => !a)
                        : [...prev, true],
                    )
                  }
                >
                  Yes
                </Badge>
                <Badge
                  variant={
                    localApprovals.includes(false) ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() =>
                    setLocalApprovals((prev) =>
                      prev.includes(false)
                        ? prev.filter((a) => a)
                        : [...prev, false],
                    )
                  }
                >
                  No
                </Badge>
              </div>
            </div>
          )}
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
              Clear all filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
