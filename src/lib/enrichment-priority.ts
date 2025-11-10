/**
 * Enrichment Priority Strategy
 * Determines the level of detail needed for AI enrichment
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
