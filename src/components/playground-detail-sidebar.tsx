"use client";

import { PlaygroundCard } from "@/components/playground-card";
import { Playground } from "@/types/playground";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlaygroundDetailSidebarProps {
  playground: Playground;
  onClose: () => void;
  onFlyTo?: (coords: [number, number]) => void;
}

/**
 * Desktop right sidebar for displaying full playground details
 * Slides in from right with semi-transparent overlay
 */
export function PlaygroundDetailSidebar({
  playground,
  onClose,
  onFlyTo,
}: PlaygroundDetailSidebarProps) {
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close sidebar"
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header with close button */}
        <div className="relative flex h-12 flex-shrink-0 items-center justify-end px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-background/90"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <PlaygroundCard
            playground={playground}
            variant="detailed"
            onFlyTo={onFlyTo}
          />
        </div>
      </div>
    </>
  );
}
