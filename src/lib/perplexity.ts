import {
  fetchPerplexityInsightsFromCache,
  savePerplexityInsightsToCache,
} from "@/lib/cache";
import { PerplexityInsights, PerplexityLocation } from "@/types/perplexity";

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

  return {
    name: base.name ?? null,
    description: base.description ?? null,
    features: base.features ?? null,
    parking: base.parking ?? null,
    sources:
      base.sources ?? (Array.isArray(data?.citations) ? (data.citations as string[]) : null),
    images: base.images ?? (Array.isArray(data?.images) ? data.images : null),
  };
}

// Function to fetch AI insights from Perplexity with caching
export async function fetchPerplexityInsightsWithCache({
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

  // Create cache key from location coordinates
  const cacheKey = `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;

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
