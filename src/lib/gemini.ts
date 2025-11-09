/**
 * Google Gemini AI Integration for Playground Enrichment
 *
 * Migration from Perplexity AI (Nov 2025):
 * - Switched from Perplexity AI to Google Gemini 2.0 Flash with web search grounding
 * - Added Google Custom Search API for high-quality playground images
 * - Leverages Gemini's googleSearch tool for real-time web data
 * - Removed local image filtering - relying on Google's built-in quality filters
 *
 * Key Features:
 * - Web search grounding: Gemini searches the entire web for playground information
 * - Location validation: Verifies playground proximity (50-200m for high/medium confidence)
 * - Image enrichment: Google Custom Search with SafeSearch, imgType=photo, imgSize=large
 * - Cache-first strategy: Checks cache with osmId only (no geocoding) for instant results
 *
 * Rate Limits:
 * - Gemini: Free tier 15 RPM (gemini-2.0-flash-exp), 10 RPM with grounding
 * - Google Custom Search: Free tier 100 queries/day, then $5 per 1000 queries
 *
 * @see https://ai.google.dev/ - Google Gemini API docs
 * @see https://developers.google.com/custom-search - Google Custom Search docs
 */

import { GoogleGenAI, type GenerateContentResponse, type Tool } from "@google/genai";
import {
  fetchAIInsightsFromCache,
  saveAIInsightsToCache,
  batchFetchAIInsightsFromCache,
} from "@/lib/cache";
import { AIInsights, AILocation } from "@/types/ai-insights";
import { aiLimiter } from "@/lib/rate-limiter";
import { deduplicatedFetch } from "@/lib/request-dedup";
import { scoreResult, getScoreSummary } from "@/lib/validators/result-scorer";

// Cache version - increment this to invalidate all cached data when schema changes
const CACHE_VERSION = "v17-tier-fields-fixed"; // v17: Fixed bug where tier/accessibility fields weren't being saved to cache

// Helper function to remove citation markers from text
function removeCitationMarkers(text: string | null): string | null {
  if (!text) return text;
  // Remove citation markers like [1], [2][3], [1][2][3], etc.
  return text.replace(/\[\d+\](\[\d+\])*/g, "").trim();
}

// Function to fetch AI insights from Google Gemini with web search
// NOTE: This function does NOT fetch images - use src/lib/images.ts instead
export async function fetchGeminiInsights({
  location,
  name,
  signal,
}: {
  location: AILocation;
  name?: string;
  signal?: AbortSignal;
}): Promise<AIInsights | null> {
  if (signal?.aborted) {
    return null;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is missing");
  }

  // Build explicit location context for prompt
  const cityState = location.city && location.region
    ? `${location.city}, ${location.region}`
    : location.city
      ? `${location.city}, ${location.country}`
      : location.region
        ? `${location.region}, ${location.country}`
        : location.country;

  // Balanced prompt using OSM hints and reasonable proximity
  const osmNameHint = name ? ` OpenStreetMap data indicates this is "${name}".` : '';
  const prompt = `Search for information about the playground at GPS coordinates ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} in ${cityState}, USA.${osmNameHint}

Find details about THIS SPECIFIC playground:
1. Official playground name
2. Play equipment (swings, slides, climbing structures, etc.)
3. Brief description
4. Parking availability
5. Accessibility features
6. Rate the playground quality

ALWAYS return JSON (no plain text explanations):
{
  "location_confidence": "high or medium or low",
  "location_verification": "Which playground did you find and how close is it to ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}?",
  "name": "Playground name (if OpenStreetMap name is provided, verify it matches)",
  "description": "2-3 sentence description",
  "features": ["slide", "swing", "climbing_frame"],
  "parking": "Parking information",
  "accessibility": ["wheelchair_accessible", "accessible_surface"],
  "tier": "star or gem or neighborhood",
  "tier_reasoning": "Why this tier? (1-2 sentences)"
}

Tier definitions:
- "star" ⭐: Exceptional destination playground worth traveling for (e.g., 8+ features, unique/themed, award-winning, water play, climbing walls, famous)
- "gem" 💎: Notable playground with standout features (e.g., 5+ features, themed elements, good amenities, wheelchair accessible)
- "neighborhood" ⚪: Standard local playground (basic equipment, 2-4 features, serves local community)

Confidence guidelines:
- "high": Found playground within 50 meters of coordinates${name ? ' AND name matches OpenStreetMap' : ''}
- "medium": Found playground within 100-200 meters${name ? ' OR name partially matches' : ''}
- "low": Can't find playground near these coordinates${name ? ' OR name completely different' : ''} (set all fields to null, tier=neighborhood)

CRITICAL: Always return valid JSON, even if confidence is low. Never return plain text.`;

  // Initialize Google Gemini client
  // Note: Don't specify apiVersion - SDK will use the correct default for google_search
  const genai = new GoogleGenAI({ apiKey });

  // Configure grounding with Google Search
  const groundingTool: Tool = {
    googleSearch: {}
  };

  try {
    // Generate content with web search grounding
    const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash-exp";
    const temperature = Number(process.env.GEMINI_TEMPERATURE ?? 0.2);

    const response: GenerateContentResponse = await genai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature,
        tools: [groundingTool],
        // Try without responseMimeType first to see if that's causing issues
        // responseMimeType: 'application/json',
      },
    });

    if (signal?.aborted) {
      return null;
    }

    // Check for blocked content or other issues
    const candidate = response.candidates?.[0];
    if (!candidate) {
      console.error('[Gemini] ❌ No candidates in response');
      return null;
    }

    // Check finish reason
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      if (candidate.finishReason === 'SAFETY') {
        console.warn('[Gemini] ⚠️ Content blocked by safety filters');
      } else {
        console.warn('[Gemini] ⚠️ Unexpected finish reason:', candidate.finishReason);
      }
    }

    // Extract the text response
    const contentText = candidate.content?.parts?.[0]?.text;
    if (!contentText) {
      console.warn('[Gemini] ⚠️ No content in response');
      return null;
    }

    // Parse the JSON response
    // Gemini might wrap JSON in markdown code blocks despite responseMimeType setting
    let parsed: unknown = {};
    try {
      // Try direct parse first
      parsed = JSON.parse(contentText);
    } catch {
      // Fallback: extract JSON from markdown code blocks
      const jsonMatch = contentText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch?.[1]) {
        try {
          parsed = JSON.parse(jsonMatch[1]);
        } catch (error) {
          console.error('[Gemini] ❌ Failed to parse JSON from markdown:', error);
          return null;
        }
      } else {
        console.error('[Gemini] ❌ Could not extract JSON from response');
        return null;
      }
    }

    const base =
      parsed && typeof parsed === "object"
        ? (parsed as Partial<AIInsights> & {
            location_confidence?: string;
            location_verification?: string;
          })
        : {};

    // Phase 1 Enhancement: Reject low-confidence results to prevent wrong-location data
    if (base.location_confidence === "low") {
      console.warn(`[Gemini] ⚠️ Low confidence result for ${cityState} - rejecting`);
      return null;
    }

    // Log medium confidence results for monitoring
    if (base.location_confidence === "medium") {
      console.info(`[Gemini] ℹ️ Medium confidence result for ${cityState} - "${base.name}"`);
    }

    // Extract sources from grounding metadata
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources: string[] = [];

    if (groundingMetadata?.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.web?.uri) {
          sources.push(chunk.web.uri);
        }
      }
    }

    // NOTE: Images are NOT fetched here
    // Use src/lib/images.ts -> fetchPlaygroundImages() for image loading

    // Construct the result object with internal metadata for validation
    const result = {
      name: removeCitationMarkers(base.name ?? null),
      description: removeCitationMarkers(base.description ?? null),
      features: base.features ?? null,
      parking: removeCitationMarkers(base.parking ?? null),
      sources: sources.length > 0 ? sources : null,
      images: null, // Images loaded separately via src/lib/images.ts
      accessibility: base.accessibility ?? null,
      // Tier rating from Gemini AI
      tier: base.tier ?? null,
      tier_reasoning: base.tier_reasoning ?? null,
      // Internal metadata (not part of AIInsights type)
      _locationConfidence: base.location_confidence || 'low',
      _locationVerification: base.location_verification || null,
    };

    return result;
  } catch (error) {
    // Check if it's a rate limit error
    if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
      console.warn('[Gemini] ⚠️ Rate limit exceeded - consider upgrading to paid tier');
    } else {
      console.error('[Gemini] ❌ API error:', error);
    }
    throw error;
  }
}

// Function to fetch AI insights from Gemini with caching and request deduplication
// NOTE: This function does NOT fetch images - use src/lib/images.ts instead
export async function fetchGeminiInsightsWithCache({
  location,
  name,
  osmId,
  signal,
}: {
  location?: AILocation;
  name?: string;
  osmId?: string;
  signal?: AbortSignal;
}): Promise<AIInsights | null> {
  if (signal?.aborted) {
    return null;
  }

  // Create cache key from OSM ID (preferred) or location coordinates (fallback)
  // Using OSM ID ensures each playground has unique cached data
  // Include CACHE_VERSION to invalidate old caches when schema changes
  const baseCacheKey = osmId || (location ? `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}` : null);
  const cacheKey = baseCacheKey ? `${CACHE_VERSION}:${baseCacheKey}` : null;

  if (!cacheKey) {
    console.warn('[Gemini] ⚠️ No cache key available (missing both osmId and location)');
    return null;
  }

  // Wrap entire cache check + API call in request deduplication
  // This prevents multiple concurrent users from triggering the same API call
  return deduplicatedFetch(
    `gemini:${cacheKey}`,
    async () => {
      // Check cache first
      const cachedInsights = await fetchAIInsightsFromCache({
        cacheKey,
      });
      if (cachedInsights) {
        return cachedInsights;
      }

      // Cache miss - need location to fetch from API
      if (!location) {
        console.log('[Gemini] ℹ️ Cache miss and no location provided, cannot fetch from API');
        return null;
      }

      // Cache miss - fetch from API
      const freshInsights = await fetchGeminiInsights({
        location,
        name,
        signal,
      }) as AIInsights & {
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

      // Reject results that don't meet quality standards
      if (!resultScore.shouldAccept) {
        console.warn(`[Gemini] ⚠️ Rejecting low-quality result for ${cityState}: ${getScoreSummary(resultScore)}`);
        return null;
      }

      // Remove internal metadata before returning/caching
      const cleanResult: AIInsights = {
        name: freshInsights.name,
        description: freshInsights.description,
        features: freshInsights.features,
        parking: freshInsights.parking,
        sources: freshInsights.sources,
        images: freshInsights.images,
        accessibility: freshInsights.accessibility,
        tier: freshInsights.tier,
        tier_reasoning: freshInsights.tier_reasoning,
      };

      // Save to cache only if quality is high enough
      if (resultScore.shouldCache) {
        await saveAIInsightsToCache({ cacheKey, insights: cleanResult });
      } else {
        console.warn(`[Gemini] ⚠️ NOT caching result for ${cityState} due to quality concerns`);
      }

      return cleanResult;
    }
  );
}

// Batch function to fetch insights for multiple playgrounds efficiently
// NOTE: This function does NOT fetch images - use src/lib/images.ts instead
export async function fetchGeminiInsightsBatch({
  requests,
  signal,
  cacheOnly = false,
}: {
  requests: Array<{
    playgroundId: number;
    location?: AILocation;
    name?: string;
    osmId?: string;
  }>;
  signal?: AbortSignal;
  cacheOnly?: boolean;
}): Promise<
  Array<{
    playgroundId: number;
    insights: AIInsights | null;
  }>
> {
  if (signal?.aborted) {
    return [];
  }

  // Limit batch size to 5 for optimal performance
  const batchSize = Math.min(requests.length, 5);
  const batch = requests.slice(0, batchSize);

  // PHASE 1: Generate cache keys and batch fetch from cache
  const cacheKeyMap = new Map<number, string>();
  const cacheKeys: string[] = [];

  for (const req of batch) {
    const baseCacheKey = req.osmId ||
      (req.location ? `${req.location.latitude.toFixed(6)},${req.location.longitude.toFixed(6)}` : null);
    const cacheKey = baseCacheKey ? `${CACHE_VERSION}:${baseCacheKey}` : null;

    if (cacheKey) {
      cacheKeyMap.set(req.playgroundId, cacheKey);
      cacheKeys.push(cacheKey);
    }
  }

  // Batch fetch all cache entries at once
  const cachedResults = await batchFetchAIInsightsFromCache({
    cacheKeys,
  });

  console.log(`[Gemini] 📦 Batch cache hit: ${cachedResults.size}/${batch.length}`);

  // PHASE 2: Build results array and identify cache misses
  const results: Array<{ playgroundId: number; insights: AIInsights | null }> = [];
  const misses: typeof batch = [];

  for (const req of batch) {
    const cacheKey = cacheKeyMap.get(req.playgroundId);
    const cachedInsight = cacheKey ? cachedResults.get(cacheKey) : null;

    if (cachedInsight) {
      results.push({
        playgroundId: req.playgroundId,
        insights: cachedInsight,
      });
    } else {
      misses.push(req);
    }
  }

  // PHASE 3: Fetch cache misses from Gemini API
  if (misses.length > 0 && !cacheOnly) {
    console.log(`[Gemini] 🚀 Fetching ${misses.length} from API`);

    const apiResults = await Promise.all(
      misses.map((req) =>
        aiLimiter(async () => {
          try {
            const insights = await fetchGeminiInsightsWithCache({
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
            console.error(`[Gemini] ❌ Error fetching insights for playground ${req.playgroundId}:`, error);
            return {
              playgroundId: req.playgroundId,
              insights: null,
            };
          }
        })
      ),
    );

    results.push(...apiResults);
  } else if (misses.length > 0 && cacheOnly) {
    results.push(...misses.map((req) => ({
      playgroundId: req.playgroundId,
      insights: null,
    })));
  }

  return results;
}
