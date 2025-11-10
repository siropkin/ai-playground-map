"use client";

import { PlaygroundList } from "@/components/playground-list";
import { PlaygroundListSheet } from "@/components/playground-list-sheet";
import { PlaygroundPreviewSheet } from "@/components/playground-preview-sheet";
import { PlaygroundDetailSidebar } from "@/components/playground-detail-sidebar";
import { MapView } from "@/components/map-view";
import StructuredDataHome from "@/components/structured-data-home";
import { usePlaygrounds } from "@/contexts/playgrounds-context";
import { useMediaQuery } from "@/lib/hooks";

export default function Home() {
  const { selectedPlayground, clearSelectedPlayground, requestFlyTo, playgrounds } = usePlaygrounds();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Get the latest playground data from the array (in case it was enriched)
  const currentPlayground = selectedPlayground
    ? playgrounds.find(p => p.osmId === selectedPlayground.osmId) || selectedPlayground
    : null;

  return (
    <>
      <StructuredDataHome />
      <div className="relative flex flex-1">
        {/* Desktop sidebar */}
        <div className="absolute top-0 left-0 z-1 hidden max-h-[calc(100vh-80px)] max-w-sm min-w-sm overflow-y-auto md:block">
          <div className="py-2 pr-2 pl-4">
            <PlaygroundList displayEmptyState />
          </div>
        </div>

        {/* Mobile bottom sheet */}
        <div className="absolute bottom-10 left-1/2 z-1 -translate-x-1/2 md:hidden">
          <PlaygroundListSheet />
        </div>

        {/* Playground preview sheet (mobile only) */}
        <PlaygroundPreviewSheet />

        {/* Desktop detail sidebar (right side) */}
        {isDesktop && currentPlayground && (
          <PlaygroundDetailSidebar
            playground={currentPlayground}
            onClose={clearSelectedPlayground}
            onFlyTo={(coords) => requestFlyTo(coords)}
          />
        )}

        {/* Map */}
        <div className="absolute inset-0">
          <MapView />
        </div>
      </div>
    </>
  );
}
