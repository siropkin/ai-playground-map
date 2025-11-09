"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { usePlaygrounds } from "@/contexts/playgrounds-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TierBadge } from "@/components/tier-badge";
import { UNNAMED_PLAYGROUND } from "@/lib/constants";
import { formatEnumString, formatOsmIdentifier } from "@/lib/utils";
import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { useInView } from "react-intersection-observer";
import React, { useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";
import { Playground } from "@/types/playground";

// Context for batching enrichment requests
interface EnrichmentBatchContextType {
  requestEnrichment: (playgroundId: number) => void;
}

const EnrichmentBatchContext = createContext<EnrichmentBatchContextType | undefined>(undefined);

// Provider component that handles batching logic
function EnrichmentBatchProvider({ children }: { children: React.ReactNode }) {
  const { enrichPlaygroundsBatch } = usePlaygrounds();
  const batchQueue = useRef<Set<number>>(new Set());
  const batchTimer = useRef<NodeJS.Timeout | null>(null);

  const processBatch = useCallback(() => {
    if (batchQueue.current.size === 0) return;

    const idsToEnrich = Array.from(batchQueue.current);
    batchQueue.current.clear();

    // Process in batches of 5
    for (let i = 0; i < idsToEnrich.length; i += 5) {
      const batch = idsToEnrich.slice(i, i + 5);
      enrichPlaygroundsBatch(batch);
    }
  }, [enrichPlaygroundsBatch]);

  const requestEnrichment = useCallback((playgroundId: number) => {
    batchQueue.current.add(playgroundId);

    // Clear existing timer
    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
    }

    // If we have 5 items, process immediately
    if (batchQueue.current.size >= 5) {
      processBatch();
    } else {
      // Otherwise, wait 150ms to collect more items
      batchTimer.current = setTimeout(processBatch, 150);
    }
  }, [processBatch]);

  // Cleanup timer on unmount
  useEffect(() => {
    const queue = batchQueue.current;
    const timer = batchTimer.current;

    return () => {
      if (timer) {
        clearTimeout(timer);
        queue.clear(); // Clear any remaining items instead of processing
      }
    };
  }, []);

  return (
    <EnrichmentBatchContext.Provider value={{ requestEnrichment }}>
      {children}
    </EnrichmentBatchContext.Provider>
  );
}

function useEnrichmentBatch() {
  const context = useContext(EnrichmentBatchContext);
  if (!context) {
    throw new Error("useEnrichmentBatch must be used within EnrichmentBatchProvider");
  }
  return context;
}

// Individual playground item with intersection observer
// Memoized with custom comparison to prevent unnecessary re-renders during batch enrichment
const PlaygroundItem = React.memo(function PlaygroundItem({ playground }: { playground: Playground }) {
  const { requestFlyTo, loadImagesForPlayground } = usePlaygrounds();
  const { requestEnrichment } = useEnrichmentBatch();
  const hasTriggeredEnrichment = useRef(false);
  const hasTriggeredImageLoad = useRef(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = React.useState(false);

  const { ref, inView } = useInView({
    threshold: 0.1,
    rootMargin: "75px", // Reduced from 200px to minimize wasted API calls
    triggerOnce: true, // Only trigger once per item
  });

  // Trigger AI enrichment (without images) when card enters viewport
  useEffect(() => {
    if (inView && !playground.enriched && !hasTriggeredEnrichment.current) {
      hasTriggeredEnrichment.current = true;
      requestEnrichment(playground.osmId);
    }
  }, [inView, playground.enriched, playground.osmId, requestEnrichment]);

  // Trigger image loading when card is visible and enriched (lazy loading)
  useEffect(() => {
    if (inView && playground.enriched && !playground.images && !hasTriggeredImageLoad.current) {
      hasTriggeredImageLoad.current = true;
      loadImagesForPlayground(playground.osmId);
    }
  }, [inView, playground.enriched, playground.images, playground.osmId, loadImagesForPlayground]);

  const name = playground.name || UNNAMED_PLAYGROUND;
  const displayImage = playground.images?.[0];

  // Check if description is long enough to need expansion
  const isDescriptionLong = playground.description && playground.description.length > 150;

  return (
    <div ref={ref}>
      <Card
        key={playground.id}
        className="bg-background/95 flex min-h-[260px] cursor-pointer flex-row gap-0 overflow-hidden py-0 shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl"
        onClick={() => requestFlyTo([playground.lon, playground.lat])}
      >
        <CardHeader className="relative flex w-1/3 gap-0 p-0">
          <div className="h-full w-full flex-1 items-center justify-center">
            {!playground.enriched ? (
              <div className="relative h-full w-full bg-zinc-200 dark:bg-zinc-700">
                <Skeleton className="h-full w-full rounded-r-none" />
                <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
                  Thinking...
                </div>
              </div>
            ) : displayImage ? (
              <Image
                className="h-full w-full object-cover"
                src={displayImage.image_url}
                alt={`Photo of ${name}`}
                width={displayImage.width}
                height={displayImage.height}
                unoptimized={true}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-100 to-emerald-100 text-sm text-emerald-700/80 dark:from-sky-950/50 dark:to-emerald-950/50 dark:text-emerald-200/70">
                No image
              </div>
            )}
          </div>

          {/* Tier Badge - Top Right */}
          {playground.enriched && playground.tier && (
            <div className="absolute right-2 top-2">
              <TierBadge tier={playground.tier} variant="compact" />
            </div>
          )}
        </CardHeader>

        <CardContent className="flex w-2/3 flex-col gap-2 p-4">
          {/* Content Area - grows to push button to bottom */}
          <div className="flex flex-1 flex-col gap-2">
            {/* Title Section */}
            {!playground.enriched ? (
              <Skeleton className="h-4 w-full" />
            ) : name ? (
              <h3 className="font-semibold truncate">{name}</h3>
            ) : null}

            {/* Description Section */}
            {!playground.enriched ? (
              <Skeleton className="h-16 w-full" />
            ) : playground.description ? (
              <div className="text-muted-foreground text-xs">
                <p className={!isDescriptionExpanded && isDescriptionLong ? "line-clamp-3" : ""}>
                  {playground.description}
                </p>
                {isDescriptionLong && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDescriptionExpanded(!isDescriptionExpanded);
                    }}
                    className="text-foreground mt-1 cursor-pointer text-xs underline hover:no-underline"
                  >
                    {isDescriptionExpanded ? "Show less" : "Show more"}
                  </button>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground text-xs italic">
                <p>This playground&apos;s keeping its secrets (even from AI) 🤷</p>
              </div>
            )}

            {/* Features Section */}
            {!playground.enriched ? (
              <Skeleton className="h-4 w-full" />
            ) : playground.features?.length ? (
              <div className="flex flex-wrap gap-1">
                {playground.features.slice(0, 5).map((value, i) => (
                  <Badge
                    className="max-w-[calc(100%-0.25rem)] truncate sm:max-w-full"
                    variant="outline"
                    key={i}
                  >
                    <span className="truncate">
                      {formatEnumString(value)}
                    </span>
                  </Badge>
                ))}
                {playground.features.length > 5 && (
                  <Badge variant="outline">+{playground.features.length - 5}</Badge>
                )}
              </div>
            ) : null}

            {/* Address Section */}
            {!playground.enriched ? (
              <Skeleton className="h-4 w-full" />
            ) : playground.address ? (
              <div className="text-muted-foreground mr-1 flex items-center text-xs">
                <span>{playground.address}</span>
                <MapPin className="ml-2 h-4 w-4 shrink-0" />
              </div>
            ) : null}
          </div>

          {/* View Details Button - stays at bottom */}
          {playground.enriched && (
            <Link
              href="/playgrounds/[id]"
              as={`/playgrounds/${formatOsmIdentifier(playground.osmId, playground.osmType)}`}
              className="mt-auto pt-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="outline" size="sm" className="w-full">
                View Details
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to optimize re-renders
  // Only re-render if relevant playground data actually changed
  const prev = prevProps.playground;
  const next = nextProps.playground;

  return (
    prev.osmId === next.osmId &&
    prev.enriched === next.enriched &&
    prev.name === next.name &&
    prev.description === next.description &&
    prev.tier === next.tier &&
    prev.images === next.images && // Reference comparison is fine for images array
    prev.features === next.features && // Reference comparison is fine for features array
    prev.address === next.address
  );
});

function PlaygroundListContent({
  displayEmptyState,
}: {
  displayEmptyState?: boolean;
}) {
  const { playgrounds, loading } = usePlaygrounds();
  const containerRef = useRef<HTMLDivElement>(null);
  const prevPlaygroundIdsRef = useRef<string>("");

  // Memoize the sorted ID string to avoid recalculating on every render
  const currentIds = useMemo(
    () => playgrounds.map(p => p.osmId).sort((a, b) => a - b).join(","),
    [playgrounds]
  );

  // Scroll to top when playground list changes (not just enrichment)
  useEffect(() => {
    // Only scroll if the list of playgrounds actually changed
    if (currentIds !== prevPlaygroundIdsRef.current && prevPlaygroundIdsRef.current !== "") {
      // Find the scrollable parent (either the sidebar div or sheet content)
      const scrollableParent = containerRef.current?.closest('[class*="overflow-y-auto"]');
      if (scrollableParent) {
        scrollableParent.scrollTo({ top: 0, behavior: "smooth" });
      }
    }

    prevPlaygroundIdsRef.current = currentIds;
  }, [currentIds]);

  if (!playgrounds?.length) {
    // Don't show empty state while loading
    if (loading) {
      return null;
    }

    return displayEmptyState ? (
      <Card className="bg-background/95 flex w-[100%] flex-col items-center justify-center gap-0 overflow-hidden p-8 shadow-lg backdrop-blur-sm transition-shadow">
        <CardContent className="flex flex-col items-center p-0">
          <div className="text-muted-foreground mb-2 text-5xl">🔍</div>
          <h3 className="mb-1 font-semibold">No playgrounds found</h3>
          <p className="text-muted-foreground text-center text-sm">
            Try zooming out or moving the map to discover more playgrounds.
          </p>
        </CardContent>
      </Card>
    ) : null;
  }

  return (
    <div ref={containerRef} className="flex flex-col space-y-2">
      {playgrounds.map((playground) => (
        <PlaygroundItem key={playground.id} playground={playground} />
      ))}
    </div>
  );
}

export function PlaygroundList({
  displayEmptyState,
}: {
  displayEmptyState?: boolean;
}) {
  return (
    <EnrichmentBatchProvider>
      <PlaygroundListContent displayEmptyState={displayEmptyState} />
    </EnrichmentBatchProvider>
  );
}
