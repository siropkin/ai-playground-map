import {
  fetchPerplexityInsightsFromCache,
  savePerplexityInsightsToCache,
  batchFetchPerplexityInsightsFromCache,
} from "@/lib/cache";
import { PerplexityInsights, PerplexityLocation } from "@/types/perplexity";
import { perplexityLimiter } from "@/lib/rate-limiter";
import { deduplicatedFetch } from "@/lib/request-dedup";
import { scoreResult, getScoreSummary } from "@/lib/validators/result-scorer";
import { EnrichmentPriority, getEnrichmentStrategy } from "@/lib/enrichment-priority";

// Cache version - increment this to invalidate all cached data when schema changes
const CACHE_VERSION = "v3"; // v3: Removed name from prompt to accept playgrounds inside recreation centers

// Helper function to remove citation markers from text
function removeCitationMarkers(text: string | null): string | null {
  if (!text) return text;
  // Remove citation markers like [1], [2][3], [1][2][3], etc.
  return text.replace(/\[\d+\](\[\d+\])*/g, "").trim();
}

// Enhanced helper function to filter out low-quality or irrelevant images
function filterImages(images: Array<{
  image_url: string;
  origin_url: string;
  height: number;
  width: number;
}> | null): Array<{
  image_url: string;
  origin_url: string;
  height: number;
  width: number;
}> | null {
  if (!images || images.length === 0) return null;

  const filtered = images.filter(img => {
    const url = img.image_url.toLowerCase();
    const originUrl = img.origin_url.toLowerCase();
    const fullUrl = `${url} ${originUrl}`; // Combined for easier searching

    // 1. Filter out stock photo sites (existing + additions)
    const stockPhotoSites = [
      'shutterstock',
      'istockphoto',
      'gettyimages',
      'depositphotos',
      'dreamstime',
      'stockphoto',
      '123rf',
      'alamy',
      'pexels',
      'unsplash',
      'pixabay'
    ];
    if (stockPhotoSites.some(site => fullUrl.includes(site))) {
      return false;
    }

    // 2. Filter out blog content, tech articles, and documentation sites (existing + additions)
    const blogTechPatterns = [
      '/blog/',
      '/wp-content/',
      '/article/',
      '/post/',
      '/news/',
      'medium.com',
      'blogspot.',
      'wordpress.',
      '/docs/',
      '/documentation/',
      'github.com',
      'stackoverflow.',
      'wiki.',
      'linkedin.com',
      'twitter.com',
      'facebook.com',
      'instagram.com' // Social media often has watermarks/UI
    ];
    if (blogTechPatterns.some(pattern => fullUrl.includes(pattern))) {
      return false;
    }

    // 3. NEW: Filter out real estate and business listing sites (often wrong-location photos)
    const realEstateBusinessSites = [
      'zillow',
      'trulia',
      'realtor.com',
      'redfin',
      'apartments.com',
      'loopnet',
      'yelp',       // Yelp often has business/restaurant photos mixed with playgrounds
      'foursquare',
      'tripadvisor'
    ];
    if (realEstateBusinessSites.some(site => fullUrl.includes(site))) {
      return false;
    }

    // 4. Enhanced: More comprehensive bad keywords (including text-heavy image indicators)
    const badKeywords = [
      'logo',
      'icon',
      'banner',
      'parking',        // Parking lots/signs
      'sign',           // All types of signs
      'signage',
      'street-sign',
      'traffic',
      'advertisement',
      'ad-',
      '/ads/',
      'sponsor',
      'thumbnail',
      'thumb',
      'diagram',
      'chart',
      'graph',
      'infographic',
      'screenshot',
      'screencap',
      'screen-shot',
      'screen_shot',
      'map-',           // Maps/diagrams
      '-map.',
      'spatial',
      'ui-',            // UI elements
      'interface',
      'button',
      'header',
      'footer',
      'watermark',
      'stock-',
      'placeholder',
      'template',
      'clipart',
      'vector',
      'floorplan',
      'floor-plan',
      'blueprint',
      'aerial',         // Aerial/satellite views
      'satellite',
      'overhead',
      'drone',
      'rules',          // Rules/warning signs (text-heavy)
      'warning',
      'caution',
      'notice',
      'regulation',
      'policy',
      'hours',          // Hours of operation signs
      'schedule',
      'calendar',
      'pricing',
      'price',
      'fee',
      'admission',
      'text-',          // Text overlays
      '-text.',
      'overlay',
      'caption',
      'subtitle',
      'quote',
      'meme',           // Memes often have text
      'permit',
      'license',
      'certificate',
      'document',
      'form',
      'application',
      'flyer',
      'poster',
      'brochure',
      'pamphlet'
    ];
    if (badKeywords.some(keyword => fullUrl.includes(keyword))) {
      return false;
    }

    // 4b. Phase 3: Detect text-heavy images by URL patterns suggesting documentation/instructions
    const textHeavyPatterns = [
      '/manual/',
      '/guide/',
      '/instruction/',
      '/tutorial/',
      '/how-to/',
      '/faq/',
      '/help/',
      '/support/',
      '/doc/',
      '/pdf/',
      '/terms/',
      '/privacy/',
      '/policy/'
    ];
    if (textHeavyPatterns.some(pattern => fullUrl.includes(pattern))) {
      return false;
    }

    // 5. NEW: Detect likely stock photo IDs (long numbers in filename)
    const filenameMatch = url.match(/\/([^/]+)$/);
    if (filenameMatch) {
      const filename = filenameMatch[1];
      // Stock photos often have long numeric IDs: 12345678901.jpg
      if (/\d{10,}/.test(filename)) {
        return false;
      }
    }

    // 6. NEW: Prefer playground-related keywords (scoring system)
    const goodKeywords = [
      'playground',
      'park',
      'swing',
      'slide',
      'play',
      'kids',
      'children',
      'playspace',
      'playset',
      'equipment',
      'recreation',
      'outdoor-play'
    ];
    const hasGoodKeyword = goodKeywords.some(keyword => fullUrl.includes(keyword));

    // 7. Filter out images that are too small (likely icons/logos) - INCREASED threshold
    if (img.width < 300 || img.height < 300) {
      return false;
    }

    // 8. Filter out extreme aspect ratios (banners/buttons/panoramas)
    const aspectRatio = img.width / img.height;
    if (aspectRatio > 3 || aspectRatio < 0.33) { // Tightened from 4/0.25
      return false;
    }

    // 9. NEW: Boost images from trusted playground-related domains
    const trustedDomains = [
      '.gov/parks',
      '.gov/recreation',
      'parks.dc.gov',
      'dpr.dc.gov',
      'nycgovparks',
      'parks.nyc.gov',
      'laparks.org',
      'flickr.com',         // Flickr has good community photos
      'googleusercontent', // Google Photos/Maps
      'wikimedia.org',
      'commons.wikimedia'
    ];
    const isTrustedDomain = trustedDomains.some(domain => fullUrl.includes(domain));

    // 10. Scoring: Require either good keyword OR trusted domain
    if (!hasGoodKeyword && !isTrustedDomain) {
      // Image has no playground-related context - likely irrelevant
      return false;
    }

    return true;
  });

  return filtered.length > 0 ? filtered : null;
}

// Function to fetch AI insights from Perplexity
export async function fetchPerplexityInsights({
  location,
  name,
  signal,
  priority = 'medium',
}: {
  location: PerplexityLocation;
  name?: string;
  signal?: AbortSignal;
  priority?: EnrichmentPriority;
}): Promise<PerplexityInsights | null> {
  if (signal?.aborted) {
    return null;
  }

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("Perplexity API key is missing");
  }

  // Build explicit location context for prompt (must be before schema definition)
  const cityState = location.city && location.region
    ? `${location.city}, ${location.region}`
    : location.city
      ? `${location.city}, ${location.country}`
      : location.region
        ? `${location.region}, ${location.country}`
        : location.country;

  const locationContext = location.city || location.region
    ? ` in ${cityState}`
    : ` at coordinates ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)} in ${location.country}`;

  // Structured output schema for playground data with confidence tracking
  const playgroundSchema = {
    type: "object",
    properties: {
      location_confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description:
          "High: Sources explicitly mention the target city/state AND coordinates are within 0.1 miles. Medium: Coordinates match but city not explicitly confirmed in sources. Low: Uncertain, ambiguous, or sources mention different locations.",
      },
      location_verification: {
        type: ["string", "null"],
        description:
          `Quote from sources that confirms this playground is in ${cityState}. Must mention the city/state name. Use null if no explicit confirmation found.`,
      },
      name: {
        type: ["string", "null"],
        description:
          "The official name of the playground or the facility containing it (e.g., 'Sunset Park Playground' or 'Hamilton Recreation Center'). Return the name found in sources at the coordinates, even if it differs from any suggested name. Use null if no playground found or confidence is low.",
      },
      description: {
        type: ["string", "null"],
        description:
          "A concise 2-3 sentence description covering equipment types, age suitability, safety features, and atmosphere. Use null if no playground found or confidence is low.",
      },
      features: {
        type: ["array", "null"],
        items: { type: "string" },
        description:
          "List of playground equipment using OpenStreetMap tags: slide, swing, climbing_frame, sandpit, seesaw, etc. See wiki.openstreetmap.org/wiki/Key:playground. Use null if no playground found or confidence is low.",
      },
      parking: {
        type: ["string", "null"],
        description:
          "Brief parking description (e.g., 'Street parking available' or 'Dedicated lot at entrance'). Use null if no playground found, no info available, or confidence is low.",
      },
      accessibility: {
        type: ["object", "null"],
        properties: {
          wheelchair_accessible: {
            type: "boolean",
            description: "True if playground has ramps, accessible routes, or transfer stations to play equipment"
          },
          surface_type: {
            type: ["string", "null"],
            description: "Primary surface type: 'pour-in-place rubber', 'engineered wood fiber', 'rubber tiles', 'loose-fill' (not wheelchair accessible), 'concrete', 'grass', 'mulch'. Null if unknown."
          },
          transfer_stations: {
            type: "boolean",
            description: "Presence of transfer stations/platforms for moving from wheelchair to equipment"
          },
          ground_level_activities: {
            type: ["number", "null"],
            description: "Count of ground-level play activities accessible without transfers (e.g., panels, sandboxes, music stations). Null if unknown."
          },
          sensory_friendly: {
            type: ["object", "null"],
            properties: {
              quiet_zones: { type: "boolean", description: "Quiet zones or calm areas for sensory breaks" },
              tactile_elements: { type: "boolean", description: "Textured surfaces, sensory walls, or tactile play elements" },
              visual_aids: { type: "boolean", description: "Visual aids, clear signage, or wayfinding elements" }
            },
            description: "Sensory-friendly features for children with autism or sensory processing needs. Null if unknown."
          },
          shade_coverage: {
            type: ["string", "null"],
            description: "Shade description: 'full' (80%+), 'partial' (30-80%), 'minimal' (10-30%), or 'none' (<10%). Null if unknown."
          },
          accessible_parking: {
            type: ["object", "null"],
            properties: {
              available: { type: "boolean", description: "Accessible/handicapped parking spaces available" },
              van_accessible: { type: "boolean", description: "Van-accessible spaces (wider) available" },
              distance_to_playground: { type: ["string", "null"], description: "Distance description: 'adjacent', 'within 100 feet', 'within 200 feet', 'over 200 feet'. Null if unknown." }
            },
            description: "Accessible parking information. Null if unknown."
          },
          accessible_restrooms: {
            type: ["object", "null"],
            properties: {
              available: { type: "boolean", description: "Wheelchair-accessible restrooms available" },
              adult_changing_table: { type: "boolean", description: "Adult-sized changing table available (critical for older children with disabilities)" }
            },
            description: "Accessible restroom information. Null if unknown."
          }
        },
        description: "Accessibility features for children with disabilities. Include all available information. Use false for boolean fields if feature is explicitly absent, use null for entire object if no accessibility info found."
      },
    },
    required: ["location_confidence", "location_verification", "name", "description", "features", "parking", "accessibility"],
    additionalProperties: false,
  };

  // Enhanced prompt with explicit geographic constraints
  // NOTE: We intentionally do NOT include the OSM name in the prompt because:
  // 1. OSM names are often generic/unofficial (e.g., "Hamilton Street Playground")
  // 2. Many playgrounds are inside recreation centers or parks with different official names
  // 3. Strict name matching causes AI to reject valid playgrounds at the correct location
  const prompt = `Find detailed information about a children's playground${locationContext}.

CRITICAL GEOGRAPHIC CONSTRAINTS:
- Search ONLY within ${location.city || 'the specified location'}, ${location.region || location.country}
- Location must be at or within 0.1 miles (160 meters) of coordinates: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}
- DO NOT return results from other cities, states, or countries
- Verify ALL sources explicitly mention ${location.city || 'the target city'}, ${location.region || location.country}
- If sources mention any different city/state, return null for all fields
- If uncertain about location match (less than 90% confident), return null rather than potentially wrong results

SEARCH FOCUS:
Search within 0.1-mile radius from ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} for playgrounds in parks, recreation centers, schools, or public facilities located in ${cityState}. The playground may be inside a larger facility (e.g., recreation center, community center, park) - this is acceptable as long as the coordinates match.

DATA REQUIREMENTS:
1. Find the playground's official name or facility name
2. Describe equipment, age range, safety features, and atmosphere (2-3 sentences)
3. List specific equipment using OpenStreetMap playground tags (slide, swing, climbing_frame, sandpit, seesaw, etc.)
4. Describe parking availability
5. ACCESSIBILITY FEATURES (CRITICAL FOR FAMILIES WITH DISABLED CHILDREN):
   - Wheelchair access: ramps, transfer stations, or accessible routes to equipment
   - Surface type: pour-in-place rubber (best), engineered wood fiber, rubber tiles, loose-fill (NOT accessible), concrete, grass
   - Ground-level activities: panels, sandboxes, music stations accessible without transfers
   - Sensory-friendly: quiet zones, tactile elements, visual aids for autism/sensory needs
   - Shade coverage: full/partial/minimal/none (critical for medical conditions)
   - Accessible parking: availability, van-accessible spaces, distance from playground
   - Accessible restrooms: wheelchair-accessible, adult changing tables

IMAGE REQUIREMENTS (STRICT - CRITICAL FOR QUALITY):
ONLY return images that show:
- Actual playground equipment in use (slides, swings, climbing structures, playsets)
- Children actively playing on playground equipment
- Wide shots of playground areas with clearly visible play equipment
- Close-ups of play structures, slides, or swings
- Photos clearly taken at an outdoor children's playground

DO NOT return images of:
- Parking lots, parking signs, street signs, or traffic signs
- Building exteriors without visible playground equipment
- Maps, diagrams, floor plans, or location screenshots
- User interface elements, app screenshots, or website graphics
- Stock photos with watermarks or copyright text
- Informational signs, rules signs, warning signs, or text placards
- Just grass, trees, or open space without equipment visible
- Group photos or events where equipment isn't the focus
- Indoor facilities or gyms (unless specifically indoor playground equipment)

VALIDATION: Before including an image, verify:
1. It shows actual children's recreational equipment
2. The equipment appears to be located at the correct geographic location (${cityState})
3. The image source/URL doesn't contain keywords like: sign, parking, screenshot, logo, icon, map

FORMATTING:
- Do NOT include citation markers, footnotes, or reference numbers (like [1], [2], [3]) in any field
- Provide clean, readable text without source indicators
- Sources will be tracked separately

CONFIDENCE ASSESSMENT:
- Only return results if you are at least 90% confident this playground exists in ${cityState}
- If sources are ambiguous or mention other locations, return all fields as null
- Better to return null than provide incorrect information for a different location`;

  // Phase 4: Apply enrichment strategy based on priority
  const enrichmentStrategy = getEnrichmentStrategy({
    isDetailView: priority === 'high',
    hasName: !!name,
    priority,
  });

  const requestBody: Record<string, unknown> = {
    model: process.env.PERPLEXITY_MODEL ?? "sonar-pro",
    temperature: Number(process.env.PERPLEXITY_TEMPERATURE ?? 0.2),
    return_images: enrichmentStrategy.fetchImages, // Phase 4: Skip images for low priority
    response_format: {
      type: "json_schema",
      json_schema: {
        schema: playgroundSchema,
      },
    },
    web_search_options: {
      search_context_size:
        process.env.PERPLEXITY_SEARCH_CONTEXT_SIZE ?? enrichmentStrategy.searchContextSize,
      user_location: {
        latitude: location.latitude,
        longitude: location.longitude,
        country: location.country,
        ...(location.city && { city: location.city }),
        ...(location.region && { region: location.region }),
      },
      ...(process.env.PERPLEXITY_LATEST_UPDATED
        ? { latest_updated: process.env.PERPLEXITY_LATEST_UPDATED }
        : {}),
    },
    ...(process.env.PERPLEXITY_SEARCH_DOMAIN
      ? { search_domain: process.env.PERPLEXITY_SEARCH_DOMAIN }
      : {}),
    messages: [{ role: "user", content: prompt }],
  };

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    let errorDetail = "";
    try {
      errorDetail = await response.text();
    } catch {}
    throw new Error(
      `Perplexity AI API error: ${response.status} ${response.statusText}${
        errorDetail ? ` - ${errorDetail}` : ""
      }`,
    );
  }

  const data = await response.json();

  const contentBlock = data?.choices?.[0]?.message?.content ?? "";

  // Try direct JSON parse first (JSON mode may return raw JSON string)
  let parsed: unknown = {};
  if (typeof contentBlock === "string") {
    try {
      parsed = JSON.parse(contentBlock);
    } catch {
      // Fallback to regex extraction for providers that wrap JSON in fences
      const jsonMatch =
        contentBlock.match(/```json\s*([\s\S]*?)\s*```/i) ||
        contentBlock.match(/({[\s\S]*})/);
      if (jsonMatch?.[1]) {
        try {
          parsed = JSON.parse(jsonMatch[1]);
        } catch {
          parsed = {};
        }
      }
    }
  } else if (contentBlock && typeof contentBlock === "object") {
    parsed = contentBlock;
  }

  const base =
    parsed && typeof parsed === "object"
      ? (parsed as Partial<PerplexityInsights> & {
          location_confidence?: string;
          location_verification?: string;
        })
      : {};

  // Phase 1 Enhancement: Reject low-confidence results to prevent wrong-location data
  if (base.location_confidence === "low") {
    console.warn(
      `[Perplexity] Low confidence result for ${cityState} - rejecting to avoid wrong-location data`,
      {
        name: base.name,
        verification: base.location_verification,
        location: cityState
      }
    );
    return null;
  }

  // Log medium confidence results for monitoring
  if (base.location_confidence === "medium") {
    console.info(
      `[Perplexity] Medium confidence result for ${cityState} - proceeding with caution`,
      {
        name: base.name,
        verification: base.location_verification
      }
    );
  }

  // Get images from response
  const rawImages = base.images ?? (Array.isArray(data?.images) ? data.images : null);

  // Construct the result object with internal metadata for validation
  const result = {
    name: removeCitationMarkers(base.name ?? null),
    description: removeCitationMarkers(base.description ?? null),
    features: base.features ?? null,
    parking: removeCitationMarkers(base.parking ?? null),
    sources:
      base.sources ?? (Array.isArray(data?.citations) ? (data.citations as string[]) : null),
    images: filterImages(rawImages), // Apply image quality filtering
    accessibility: base.accessibility ?? null,
    // Internal metadata (not part of PerplexityInsights type)
    _locationConfidence: base.location_confidence || 'low',
    _locationVerification: base.location_verification || null,
  };

  return result;
}

// Function to fetch AI insights from Perplexity with caching and request deduplication
export async function fetchPerplexityInsightsWithCache({
  location,
  name,
  osmId,
  signal,
  priority = 'medium',
}: {
  location?: PerplexityLocation;
  name?: string;
  osmId?: string;
  signal?: AbortSignal;
  priority?: EnrichmentPriority;
}): Promise<PerplexityInsights | null> {
  if (signal?.aborted) {
    return null;
  }

  // Create cache key from OSM ID (preferred) or location coordinates (fallback)
  // Using OSM ID ensures each playground has unique cached data
  // Include CACHE_VERSION to invalidate old caches when schema changes
  const baseCacheKey = osmId || (location ? `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}` : null);
  const cacheKey = baseCacheKey ? `${CACHE_VERSION}:${baseCacheKey}` : null;

  if (!cacheKey) {
    console.warn('[Perplexity] No cache key available (missing both osmId and location)');
    return null;
  }

  // Wrap entire cache check + API call in request deduplication
  // This prevents multiple concurrent users from triggering the same API call
  return deduplicatedFetch(
    `perplexity:${cacheKey}`,
    async () => {
      // Check cache first
      const cachedInsights = await fetchPerplexityInsightsFromCache({
        cacheKey,
      });
      if (cachedInsights) {
        return cachedInsights;
      }

      // Cache miss - need location to fetch from API
      if (!location) {
        console.log('[Perplexity] Cache miss and no location provided, cannot fetch from API');
        return null;
      }

      // Cache miss - fetch from API
      const freshInsights = await fetchPerplexityInsights({
        location,
        name,
        signal,
        priority, // Phase 4: Pass priority for enrichment strategy
      }) as PerplexityInsights & {
        _locationConfidence?: string;
        _locationVerification?: string | null;
      } | null;

      if (signal?.aborted || !freshInsights) {
        return null;
      }

      // Phase 2 Enhancement: Comprehensive result validation and scoring
      const cityState = location.city && location.region
        ? `${location.city}, ${location.region}`
        : location.city || location.region || location.country;

      const resultScore = scoreResult(
        freshInsights,
        freshInsights._locationConfidence || 'low',
        freshInsights._locationVerification || null,
        location.city,
        location.region
      );

      // Log scoring details for monitoring and debugging
      console.info(
        `[Perplexity] Result score for ${cityState}: ${getScoreSummary(resultScore)}`,
        {
          shouldAccept: resultScore.shouldAccept,
          shouldCache: resultScore.shouldCache,
          confidence: resultScore.confidence,
        }
      );

      // Reject results that don't meet quality standards
      if (!resultScore.shouldAccept) {
        console.warn(
          `[Perplexity] Rejecting low-quality result for ${cityState}`,
          {
            score: resultScore.overallScore,
            flags: resultScore.flags,
            name: freshInsights.name
          }
        );
        return null;
      }

      // Remove internal metadata before returning/caching
      const cleanResult: PerplexityInsights = {
        name: freshInsights.name,
        description: freshInsights.description,
        features: freshInsights.features,
        parking: freshInsights.parking,
        sources: freshInsights.sources,
        images: freshInsights.images,
        accessibility: freshInsights.accessibility,
      };

      // Save to cache only if quality is high enough
      if (resultScore.shouldCache) {
        await savePerplexityInsightsToCache({ cacheKey, insights: cleanResult });
      } else {
        console.warn(
          `[Perplexity] NOT caching result for ${cityState} due to quality concerns`,
          {
            score: resultScore.overallScore,
            flags: resultScore.flags
          }
        );
      }

      return cleanResult;
    }
  );
}

// Batch function to fetch insights for multiple playgrounds efficiently
// Optimized with cache-first approach: fetches all cache entries at once,
// then only queries AI for cache misses
export async function fetchPerplexityInsightsBatch({
  requests,
  signal,
}: {
  requests: Array<{
    playgroundId: number;
    location?: PerplexityLocation;
    name?: string;
    osmId?: string;
  }>;
  signal?: AbortSignal;
}): Promise<
  Array<{
    playgroundId: number;
    insights: PerplexityInsights | null;
  }>
> {
  if (signal?.aborted) {
    return [];
  }

  // Limit batch size to 5 for optimal performance
  const batchSize = Math.min(requests.length, 5);
  const batch = requests.slice(0, batchSize);

  // PHASE 1: Generate cache keys and batch fetch from cache
  const cacheKeyMap = new Map<number, string>(); // playgroundId -> cacheKey
  const cacheKeys: string[] = [];

  for (const req of batch) {
    // Create cache key from OSM ID (preferred) or location coordinates (fallback)
    // Include CACHE_VERSION to invalidate old caches when schema changes
    const baseCacheKey = req.osmId ||
      (req.location ? `${req.location.latitude.toFixed(6)},${req.location.longitude.toFixed(6)}` : null);
    const cacheKey = baseCacheKey ? `${CACHE_VERSION}:${baseCacheKey}` : null;

    if (cacheKey) {
      cacheKeyMap.set(req.playgroundId, cacheKey);
      cacheKeys.push(cacheKey);
    }
  }

  // Batch fetch all cache entries at once (single query)
  const cachedResults = await batchFetchPerplexityInsightsFromCache({
    cacheKeys,
  });

  console.log(`[Batch Enrichment] Cache hit: ${cachedResults.size}/${batch.length}`);

  // PHASE 2: Build results array and identify cache misses
  const results: Array<{ playgroundId: number; insights: PerplexityInsights | null }> = [];
  const misses: typeof batch = [];

  for (const req of batch) {
    const cacheKey = cacheKeyMap.get(req.playgroundId);
    const cachedInsight = cacheKey ? cachedResults.get(cacheKey) : null;

    if (cachedInsight) {
      // Cache hit - use cached data
      results.push({
        playgroundId: req.playgroundId,
        insights: cachedInsight,
      });
    } else {
      // Cache miss - need to fetch from API
      misses.push(req);
    }
  }

  // PHASE 3: Fetch cache misses from Perplexity API
  if (misses.length > 0) {
    console.log(`[Batch Enrichment] Fetching ${misses.length} from AI`);

    const apiResults = await Promise.all(
      misses.map((req) =>
        perplexityLimiter(async () => {
          try {
            const insights = await fetchPerplexityInsightsWithCache({
              location: req.location,
              name: req.name,
              osmId: req.osmId,
              signal,
            });
            return {
              playgroundId: req.playgroundId,
              insights,
            };
          } catch (error) {
            console.error(`Error fetching insights for playground ${req.playgroundId}:`, error);
            return {
              playgroundId: req.playgroundId,
              insights: null,
            };
          }
        })
      ),
    );

    results.push(...apiResults);
  }

  return results;
}
