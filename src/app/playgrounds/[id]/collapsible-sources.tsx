"use client";

import { useState } from "react";
import SourceCard from "@/components/source-card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function CollapsibleSources({ sources }: { sources: string[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayCount = 3;
  const hasMore = sources.length > displayCount;
  const displayedSources = isExpanded ? sources : sources.slice(0, displayCount);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {displayedSources.map((source, index) => (
          <SourceCard key={index} url={source} />
        ))}
      </div>
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-fit"
        >
          {isExpanded ? (
            <>
              Show less <ChevronUp className="ml-1 h-4 w-4" />
            </>
          ) : (
            <>
              Show {sources.length - displayCount} more sources{" "}
              <ChevronDown className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
