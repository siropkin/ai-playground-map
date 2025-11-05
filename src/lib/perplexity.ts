import {
  fetchPerplexityInsightsFromCache,
  savePerplexityInsightsToCache,
} from "@/lib/cache";
import { PerplexityInsights, PerplexityLocation } from "@/types/perplexity";

// Helper function to remove citation markers from text
function removeCitationMarkers(text: string | null): string | null {
  if (!text) return text;
  // Remove citation markers like [1], [2][3], [1][2][3], etc.
  return text.replace(/\[\d+\](\[\d+\])*/g, "").trim();
}

// Helper function to filter out low-quality or irrelevant images
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

    // Filter out stock photo sites
    const stockPhotoSites = [
      'shutterstock',
      'istockphoto',
      'gettyimages',
      'depositphotos',
      'dreamstime',
      'stockphoto',
      '123rf',
      'alamy'
    ];
    if (stockPhotoSites.some(site => url.includes(site) || originUrl.includes(site))) {
      return false;
    }

    // Filter out blog content, tech articles, and documentation sites
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
      'wiki.'
    ];
    if (blogTechPatterns.some(pattern => url.includes(pattern) || originUrl.includes(pattern))) {
      return false;
    }

    // Filter out obvious non-playground keywords in URLs
    const badKeywords = [
      'logo',
      'icon',
      'banner',
      'parking',
      'sign',
      'advertisement',
      'ad-',
      '/ads/',
      'sponsor',
      'thumbnail',
      'diagram',
      'chart',
      'graph',
      'infographic',
      'screenshot',
      'map-',
      '-map.',
      'spatial'
    ];
    if (badKeywords.some(keyword => url.includes(keyword) || originUrl.includes(keyword))) {
      return false;
    }

    // Filter out images that are too small (likely icons/logos)
    if (img.width < 200 || img.height < 200) {
      return false;
    }

    // Filter out extreme aspect ratios (banners/buttons)
    const aspectRatio = img.width / img.height;
    if (aspectRatio > 4 || aspectRatio < 0.25) {
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
}: {
  location: PerplexityLocation;
  name?: string;
  signal?: AbortSignal;
}): Promise<PerplexityInsights | null> {
  if (signal?.aborted) {
    return null;
  }

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("Perplexity API key is missing");
  }

  // Structured output schema for playground data
  const playgroundSchema = {
    type: "object",
    properties: {
      name: {
        type: ["string", "null"],
        description:
          "The official name of the playground or facility containing it (e.g., 'Sunset Park Playground'). Use null if no playground found.",
      },
      description: {
        type: ["string", "null"],
        description:
          "A concise 2-3 sentence description covering equipment types, age suitability, safety features, and atmosphere. Use null if no playground found.",
      },
      features: {
        type: ["array", "null"],
        items: { type: "string" },
        description:
          "List of playground equipment using OpenStreetMap tags: slide, swing, climbing_frame, sandpit, seesaw, etc. See wiki.openstreetmap.org/wiki/Key:playground. Use null if no playground found.",
      },
      parking: {
        type: ["string", "null"],
        description:
          "Brief parking description (e.g., 'Street parking available' or 'Dedicated lot at entrance'). Use null if no playground found or no info available.",
      },
    },
    required: ["name", "description", "features", "parking"],
    additionalProperties: false,
  };

  // Optimized prompt following Perplexity best practices
  const prompt = `Find detailed information about a children's playground${name ? ` named "${name}"` : ""} in this geographic area.

SEARCH FOCUS:
Search within 0.1-mile radius for playgrounds in parks, recreation centers, schools, or public facilities${name ? ` matching the name "${name}"` : ""}.

REQUIREMENTS:
1. Find the playground's official name or facility name
2. Describe equipment, age range, safety features, and atmosphere (2-3 sentences)
3. List specific equipment using OpenStreetMap playground tags (slide, swing, climbing_frame, sandpit, seesaw, etc.)
4. Describe parking availability

IMAGE REQUIREMENTS:
- ONLY return photos showing actual playground equipment, children playing, or playground structures
- DO NOT return: stock photos, logos, signs, parking areas, maps, or unrelated images
- Prefer photos showing slides, swings, play structures, or children using playground equipment
- Images should clearly show outdoor recreational equipment for children

FORMATTING:
- Do NOT include citation markers, footnotes, or reference numbers (like [1], [2], [3]) in any field
- Provide clean, readable text without source indicators
- Sources will be tracked separately

If no playground is found with confidence, return all fields as null.`;

  const requestBody: Record<string, unknown> = {
    model: process.env.PERPLEXITY_MODEL ?? "sonar-pro",
    temperature: Number(process.env.PERPLEXITY_TEMPERATURE ?? 0.2),
    return_images: true,
    response_format: {
      type: "json_schema",
      json_schema: {
        schema: playgroundSchema,
      },
    },
    web_search_options: {
      search_context_size:
        process.env.PERPLEXITY_SEARCH_CONTEXT_SIZE ?? "medium",
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
      ? (parsed as Partial<PerplexityInsights>)
      : {};

  // Get images from response
  const rawImages = base.images ?? (Array.isArray(data?.images) ? data.images : null);

  return {
    name: removeCitationMarkers(base.name ?? null),
    description: removeCitationMarkers(base.description ?? null),
    features: base.features ?? null,
    parking: removeCitationMarkers(base.parking ?? null),
    sources:
      base.sources ?? (Array.isArray(data?.citations) ? (data.citations as string[]) : null),
    images: filterImages(rawImages), // Apply image quality filtering
  };
}

// Function to fetch AI insights from Perplexity with caching
export async function fetchPerplexityInsightsWithCache({
  location,
  name,
  osmId,
  signal,
}: {
  location: PerplexityLocation;
  name?: string;
  osmId?: string;
  signal?: AbortSignal;
}): Promise<PerplexityInsights | null> {
  if (signal?.aborted) {
    return null;
  }

  // Create cache key from OSM ID (preferred) or location coordinates (fallback)
  // Using OSM ID ensures each playground has unique cached data
  const cacheKey = osmId || `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;

  const cachedInsights = await fetchPerplexityInsightsFromCache({
    address: cacheKey,
  });
  if (cachedInsights) {
    return cachedInsights;
  }

  const freshInsights = await fetchPerplexityInsights({
    location,
    name,
    signal,
  });

  if (signal?.aborted || !freshInsights) {
    return null;
  }

  await savePerplexityInsightsToCache({ address: cacheKey, insights: freshInsights });

  return freshInsights;
}

// Batch function to fetch insights for multiple playgrounds efficiently
export async function fetchPerplexityInsightsBatch({
  requests,
  signal,
}: {
  requests: Array<{
    playgroundId: number;
    location: PerplexityLocation;
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

  // Process all requests in parallel with caching
  const results = await Promise.all(
    batch.map(async (req) => {
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
    }),
  );

  return results;
}
