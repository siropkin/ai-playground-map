import {
  fetchPerplexityInsightsFromCache,
  savePerplexityInsightsToCache,
} from "@/lib/cache";
import { PerplexityInsights } from "@/types/perplexity";

// Function to fetch AI insights from Perplexity
export async function fetchPerplexityInsights(
  address: string,
  signal?: AbortSignal,
): Promise<PerplexityInsights | null> {
  if (signal?.aborted) {
    return null;
  }

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("Perplexity API key is missing");
  }

  const prompt = `
Task: Find information about a children's playground.

Location: The playground must be located at one of the following:
- Directly at the following address: ${address}
- Within a park, recreation center, community center, school grounds, or other public space located precisely at this address
- Part of a sports complex or facility at this address

Strictness: Focus strictly on finding a playground that meets the location criteria. If you cannot confidently find a playground meeting this criteria, return the 'not found' structure described below.

Desired Output Format: Respond with a JSON object containing the following fields:
{
  "name": "string", // The name of the playground or facility containing the playground
  "description": "string", // A short 2-sentence description highlighting features like equipment, age range, safety, shade, or atmosphere
  "features": ["string"], // A list of features present at the playground, aligned with OpenStreetMap playground features (https://wiki.openstreetmap.org/wiki/Key:playground)
  "parking": "string" // A short information about nearby parking options
}

If no playground is found at the specified location with high confidence, return:
{
  "name": null,
  "description": null,
  "features": null,
  "parking": null
}

Return only the valid JSON object without any other text.
`;

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [{ role: "user", content: prompt }],
      return_images: true,
      temperature: 0.17,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Perplexity AI API error: ${response.statusText}`);
  }

  const data = await response.json();

  const content = data.choices[0].message.content
    .replace("```json", "")
    .replace("```", "");

  return {
    ...JSON.parse(content),
    sources: data.citations,
    images: data.images,
  };
}

// Function to fetch AI insights from Perplexity with caching
export async function fetchPerplexityInsightsWithCache(
  address: string,
  signal?: AbortSignal,
): Promise<PerplexityInsights | null> {
  if (signal?.aborted) {
    return null;
  }

  const cachedInsights = await fetchPerplexityInsightsFromCache(address);
  if (cachedInsights) {
    return cachedInsights;
  }

  const freshInsights = await fetchPerplexityInsights(address, signal);

  if (signal?.aborted || !freshInsights) {
    return null;
  }

  await savePerplexityInsightsToCache(address, freshInsights);

  return freshInsights;
}
