/**
 * Enrichment Priority Strategy
 * Determines the level of detail needed for Perplexity enrichment
 * to optimize cost and performance.
 */

export type EnrichmentPriority = 'high' | 'medium' | 'low';

export interface EnrichmentStrategy {
  priority: EnrichmentPriority;
  fetchImages: boolean;
  searchContextSize: 'low' | 'medium' | 'high';
  shouldEnrich: boolean;
}

/**
 * Determine enrichment strategy based on context
 */
export function getEnrichmentStrategy(options: {
  isDetailView?: boolean;          // User viewing playground detail page
  isInViewport?: boolean;           // Playground is visible in list
  hasName?: boolean;                // OSM data includes name
  distanceFromCenter?: number;      // Distance from viewport center (0-1, 0 = center)
  priority?: EnrichmentPriority;    // Explicit priority override
}): EnrichmentStrategy {
  const {
    isDetailView = false,
    isInViewport = true,
    hasName = false,
    distanceFromCenter = 0.5,
    priority: explicitPriority,
  } = options;

  // Explicit priority override
  if (explicitPriority) {
    return createStrategy(explicitPriority);
  }

  // HIGH PRIORITY: User is viewing detail page (full enrichment)
  if (isDetailView) {
    return createStrategy('high');
  }

  // MEDIUM PRIORITY: Visible in viewport, has name, near center
  if (isInViewport && hasName && distanceFromCenter < 0.3) {
    return createStrategy('medium');
  }

  // MEDIUM PRIORITY: No name but very prominent (center of viewport)
  if (isInViewport && distanceFromCenter < 0.2) {
    return createStrategy('medium');
  }

  // LOW PRIORITY: Far from center or no name
  if (!hasName || distanceFromCenter > 0.5) {
    return createStrategy('low');
  }

  // DEFAULT: Medium priority
  return createStrategy('medium');
}

/**
 * Create enrichment strategy based on priority level
 */
function createStrategy(priority: EnrichmentPriority): EnrichmentStrategy {
  switch (priority) {
    case 'high':
      return {
        priority: 'high',
        fetchImages: true,
        searchContextSize: 'high',
        shouldEnrich: true,
      };

    case 'medium':
      return {
        priority: 'medium',
        fetchImages: true,
        searchContextSize: 'medium',
        shouldEnrich: true,
      };

    case 'low':
      return {
        priority: 'low',
        fetchImages: false,      // Skip images to save cost/time
        searchContextSize: 'low',
        shouldEnrich: true,       // Still enrich, but minimal
      };

    default:
      return createStrategy('medium');
  }
}

/**
 * Determine if a playground should be enriched at all
 * (Some edge cases might not need enrichment)
 */
export function shouldEnrichPlayground(options: {
  hasBasicData?: boolean;
  isInViewport?: boolean;
  cacheHit?: boolean;
}): boolean {
  const { hasBasicData = true, isInViewport = false, cacheHit = false } = options;

  // Already cached - no need to re-enrich
  if (cacheHit) {
    return false;
  }

  // Not in viewport and no basic data - defer enrichment
  if (!isInViewport && !hasBasicData) {
    return false;
  }

  // Default: yes, enrich
  return true;
}

/**
 * Calculate distance from viewport center (0 = center, 1 = edge)
 * This would be called from the frontend based on scroll position
 */
export function calculateDistanceFromCenter(options: {
  itemIndex: number;
  totalItems: number;
  viewportStart: number;
  viewportEnd: number;
}): number {
  const { itemIndex, viewportStart, viewportEnd } = options;

  // Check if item is in viewport
  if (itemIndex < viewportStart || itemIndex > viewportEnd) {
    return 1; // Outside viewport
  }

  // Calculate center of viewport
  const viewportCenter = (viewportStart + viewportEnd) / 2;

  // Calculate distance from center (normalized to 0-1)
  const distance = Math.abs(itemIndex - viewportCenter);
  const maxDistance = (viewportEnd - viewportStart) / 2;

  return distance / maxDistance;
}
