import { getDescriptionFromCache, saveDescriptionToCache } from "@/lib/cache";
import { PerplexityAIQueryData } from "@/types/perplexityai";

async function fetchPlaygroundInfo(
  address: string,
  signal?: AbortSignal,
): Promise<PerplexityAIQueryData | null> {
  try {
    // Check if request was aborted
    if (signal?.aborted) {
      return null;
    }

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error("Perplexity API key is missing");
    }

    // Check cache first
    const cachedInfo = await getDescriptionFromCache(address);
    if (cachedInfo) {
      return JSON.parse(cachedInfo);
    }

    const prompt = `
You are tasked with finding information about a children's playground at the following address: "${address}".

Respond with a JSON object containing the following fields:
{
  "name": "string", // The name of the playground
  "description": "string", // A short 2-sentence description highlighting features like equipment, age range, safety, shade, or atmosphere
  "features": ["string"], // A list of features present at the playground, aligned with OpenStreetMap playground features (https://wiki.openstreetmap.org/wiki/Key:playground)
  "parking": "string", // A short information about nearby parking options
  "sources": ["string"] // A list of source links where the data was found
}

If no playground is found at the address, return:
{
  "name": null,
  "description": null,
  "features": [],
  "parking": null,
  "sources": []
}

Only respond with the JSON object. Do not include any additional text or formatting.
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
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Perplexity AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content;

    if (typeof content === "string") {
      content = content.trim();
      if (content.startsWith("```json") && content.endsWith("```")) {
        content = content.replace(/^```json\s*|```$/g, "");
      }
    }

    try {
      const parsedContent = JSON.parse(content);

      await saveDescriptionToCache(address, JSON.stringify(parsedContent));

      return parsedContent;
    } catch {
      throw new Error("Failed to parse API response as JSON");
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.log("OpenAI description fetch was aborted");
      return null;
    }

    console.error("Error calling Perplexity API:", error);
    return null;
  }
}

export { fetchPlaygroundInfo };
