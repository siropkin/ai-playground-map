"use client";

import { useState } from "react";

export default function ExpandableDescription({
  description,
}: {
  description: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = description.length > 300;

  return (
    <div className="text-sm leading-relaxed">
      <p className={!isExpanded && isLong ? "line-clamp-4" : ""}>
        {description}
      </p>
      {isLong && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-foreground mt-1 cursor-pointer text-sm underline hover:no-underline"
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
