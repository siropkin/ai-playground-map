type CacheEntry = {
  value: string;
  timestamp: number; // milliseconds since epoch
};
type Cache = Map<string, CacheEntry>;
const cache: Cache = new Map();

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

export async function fetchPlaygroundDescription(
  address: string,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    // Check if request was aborted
    if (signal?.aborted) {
      return null;
    }
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key is missing");
    }

    const cached = cache.get(address);
    if (cached) {
      const now = Date.now();
      if (now - cached.timestamp < CACHE_TTL_MS) {
        return cached.value;
      } else {
        cache.delete(address); // Remove expired entry
      }
    }

    const input = `
      Using the most relevant and up-to-date search results, return a short 2-sentence description of the playground located at ${address}.
      Highlight specific features (like slides, swings, splash pads, etc), age suitability, and overall atmosphere.
      Mention if it's shaded, fenced, busy, or family-friendly.
      If no reliable information is found, return an empty string.
      Do not repeating the name or address.
      Do not include apologies.
    `;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        tools: [{ type: "web_search_preview" }],
        input,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    const description =
      data.output
        ?.find(
          (item: any) =>
            item.type === "message" &&
            item.content?.[0]?.type === "output_text" &&
            typeof item.content?.[0]?.text === "string",
        )
        ?.content?.[0]?.text.trim() || null;

    cache.set(address, { value: description, timestamp: Date.now() });
    return description;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.log("OpenAI description fetch was aborted");
      return null;
    }
    
    console.error("Error fetching playground description:", error);
    return null;
  }
}
