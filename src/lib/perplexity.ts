import {
  fetchPerplexityInsightsFromCache,
  savePerplexityInsightsToCache,
} from "@/lib/cache";
import { PerplexityInsights } from "@/types/perplexity";

// Function to fetch AI insights from Perplexity
export async function fetchPerplexityInsights({
  address,
  name,
  signal,
}: {
  address: string;
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

  const prompt = `
Task: Find information about a children's playground at or near the specified ${name ? `location known as "${name}"` : "address"}.

Location Criteria:
- The playground must be located at one of the following:
  - Precisely at the address: ${address}${name ? ` (known as "${name}")` : ""}
  - Within a park, recreation center, community center, school grounds, or public space at this exact address
  - Part of a sports complex or facility at this address
- If no playground is found at the exact address, check for playgrounds within a 0.1-mile radius, but only include them if they are clearly associated with a named park or facility.

Strictness:
- Focus strictly on playgrounds meeting the location criteria.
- If no playground is found with high confidence, return the 'not found' structure.
- Do not include information about playgrounds at different addresses unless they are within the 0.1-mile radius and clearly relevant.

Image Requirements:
- Return images only if they depict the actual playground, its equipment (e.g., slides, swings, climbing structures), or the immediate playground setting.
- Exclude irrelevant images such as generic parks, landscapes, or unrelated facilities.
- If no relevant images are available, return an empty image array.

Desired Output Format:
Return a JSON object with the following fields:
{
  "name": "string", // The name of the playground or the facility/park containing it (e.g., "Sunset Park Playground")
  "description": "string", // A concise 2-sentence description of the playground, focusing on key features (e.g., types of equipment, age suitability, safety features, shade availability, or atmosphere)
  "features": ["string"], // A list of specific playground features, using OpenStreetMap playground tags (e.g., "slide", "swing", "climbing_frame", "sandpit", "seesaw"). Refer to https://wiki.openstreetmap.org/wiki/Key:playground for valid tags
  "parking": "string" // A brief description of nearby parking options (e.g., "Street parking available nearby" or "Dedicated lot at park entrance")
}

If no playground is found with high confidence, return:
{
  "name": null,
  "description": null,
  "features": null,
  "parking": null
}

Return only the valid JSON object without any additional text or markdown.
`;

  const requestBody: Record<string, unknown> = {
    model: process.env.PERPLEXITY_MODEL ?? "sonar-pro",
    temperature: Number(process.env.PERPLEXITY_TEMPERATURE ?? 0.17),
    return_images: true,
    web_search_options: {
      search_context_size:
        process.env.PERPLEXITY_SEARCH_CONTEXT_SIZE ?? "low",
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
  address,
  name,
  signal,
}: {
  address: string;
  name?: string;
  signal?: AbortSignal;
}): Promise<PerplexityInsights | null> {
  if (signal?.aborted) {
    return null;
  }

  const cachedInsights = await fetchPerplexityInsightsFromCache({
    address,
  });
  if (cachedInsights) {
    return cachedInsights;
  }

  const freshInsights = await fetchPerplexityInsights({
    address,
    name,
    signal,
  });

  if (signal?.aborted || !freshInsights) {
    return null;
  }

  await savePerplexityInsightsToCache({ address, insights: freshInsights });

  return freshInsights;
}
