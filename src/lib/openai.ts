import {
  getDescriptionFromCache,
  saveDescriptionToCache,
} from "./supabase/cache";

export async function fetchPlaygroundDescription(
  address: string,
  signal?: AbortSignal,
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

    // Try to get from Supabase cache first
    const cachedDescription = await getDescriptionFromCache(address);
    if (cachedDescription) {
      return cachedDescription;
    }

    const input = `
      Using the most relevant and up-to-date search results, return a short 2-sentence description of the playground located at ${address}.
      Highlight specific features (like slides, swings, splash pads, etc), age suitability, and overall atmosphere.
      Mention if it's shaded, fenced, busy, or family-friendly.
      If no reliable information is found, return an empty string.
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

    // Save to Supabase cache
    if (description) {
      await saveDescriptionToCache(address, description);
    }
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
