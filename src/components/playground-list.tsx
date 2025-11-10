"use client";

import { Card, CardContent } from "@/components/ui/card";
import { usePlaygrounds } from "@/contexts/playgrounds-context";
import { PlaygroundCard } from "@/components/playground-card";
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
  const { requestFlyTo, loadImagesForPlayground, selectPlayground } = usePlaygrounds();
  const { requestEnrichment } = useEnrichmentBatch();
  const hasTriggeredEnrichment = useRef(false);
  const hasTriggeredImageLoad = useRef(false);

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

  const handleViewDetails = () => {
    selectPlayground(playground);
  };

  const handleFlyTo = () => {
    requestFlyTo([playground.lon, playground.lat]);
  };

  return (
    <div ref={ref} onClick={handleFlyTo}>
      <PlaygroundCard
        playground={playground}
        variant="compact"
        onViewDetails={handleViewDetails}
      />
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
