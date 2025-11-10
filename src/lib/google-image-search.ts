/**
 * Google Custom Search API for Image Search
 *
 * Provides high-quality playground image search using Google's Custom Search JSON API.
 * Integrated as part of the Gemini AI implementation (Nov 2025).
 *
 * Quality Improvements (v2):
 * - SafeSearch enabled (filters inappropriate content)
 * - imgType=photo (excludes clipart, line drawings)
 * - imgSize=xlarge (prefers extra-large, higher quality images)
 * - dateRestrict=y3 (prefers images from last 3 years for current playground state)
 * - Duplicate filtering enabled
 * - Domain filtering (excludes map tiles, real estate, generic CDNs, Yelp)
 * - Improved search queries with exact phrase matching
 * - Additional relevance keywords (equipment, slide, swing, park)
 * - Returns up to 10 images per playground
 *
 * Rate Limits:
 * - Free tier: 100 queries/day
 * - Paid: $5 per 1000 queries after free tier
 *
 * Setup:
 * 1. Create Programmable Search Engine: https://programmablesearchengine.google.com/
 * 2. Enable "Search the entire web" and "Image search"
 * 3. Get your CX (Search Engine ID)
 * 4. Create a dedicated API key or use existing Gemini key
 *
 * @see https://developers.google.com/custom-search/v1/overview
 */

export interface GoogleImageResult {
  image_url: string;
  origin_url: string;
  height: number;
  width: number;
  title?: string;
  thumbnail_url?: string;
}

interface CustomSearchImageItem {
  link: string;
  image: {
    contextLink: string;
    height: number;
    width: number;
    byteSize?: number;
    thumbnailLink?: string;
    thumbnailHeight?: number;
    thumbnailWidth?: number;
  };
  title?: string;
}

interface CustomSearchResponse {
  items?: CustomSearchImageItem[];
  error?: {
    code: number;
    message: string;
    errors: Array<{ reason: string; message: string }>;
  };
}

/**
 * Search for images using Google Custom Search API
 *
 * @param query - Search query (e.g., "Central Park Playground New York")
 * @param options - Search options
 * @returns Array of image results
 */
export async function searchImages(
  query: string,
  options: {
    maxResults?: number;
    signal?: AbortSignal;
  } = {}
): Promise<GoogleImageResult[]> {
  const { maxResults = 10, signal } = options;

  const apiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GEMINI_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  if (!apiKey) {
    console.warn('[Google Images] ⚠️ Missing GOOGLE_SEARCH_API_KEY or GEMINI_API_KEY');
    return [];
  }

  if (!cx) {
    console.warn('[Google Images] ⚠️ Missing GOOGLE_SEARCH_CX (Search Engine ID)');
    return [];
  }

  try {
    // Google Custom Search API endpoint
    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', cx);
    url.searchParams.set('q', query);
    url.searchParams.set('searchType', 'image');
    url.searchParams.set('num', Math.min(maxResults, 10).toString()); // Max 10 per request
    url.searchParams.set('safe', 'active'); // SafeSearch
    url.searchParams.set('imgSize', 'xlarge'); // Prefer extra-large images for better quality
    url.searchParams.set('imgType', 'photo'); // Photos only, no clipart
    url.searchParams.set('filter', '1'); // Enable duplicate filtering
    url.searchParams.set('dateRestrict', 'y3'); // Prefer images from last 3 years (playground equipment changes)

    const response = await fetch(url.toString(), {
      signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json() as CustomSearchResponse;
      console.error('[Google Images] ❌ API error:', errorData.error);

      if (response.status === 429) {
        console.warn('[Google Images] ⚠️ Rate limit exceeded (100 queries/day on free tier)');
      }

      return [];
    }

    const data = await response.json() as CustomSearchResponse;

    if (!data.items || data.items.length === 0) {
      return [];
    }

    // Transform to our format and filter out irrelevant sources
    const results: GoogleImageResult[] = data.items
      .filter(item => {
        const url = item.image.contextLink.toLowerCase();

        // Exclude irrelevant domains that often appear but aren't playground-specific
        const excludedDomains = [
          'waze.com',           // Map tiles, not photos
          'homes.com',          // Real estate listings
          'apartmentlist.com',  // Apartment listings
          'rentcafe.com',       // Apartment listings
          'smugmug.com',        // Generic photo hosting (often unrelated)
          'ctfassets.net',      // CDN with generic content
          'mapq.st',            // Map service images
          'lookandlearn.com',   // Stock/historical photos
          'brownstoner.com',    // Real estate/development
          'oldnycphotos.com',   // Historical photos (too old)
          'yelpcdn.com',        // Yelp often shows unrelated business photos
        ];

        // Check if URL contains any excluded domain
        const isExcluded = excludedDomains.some(domain => url.includes(domain));

        if (isExcluded) {
          console.log(`[Google Images] 🚫 Filtered out: ${item.image.contextLink}`);
          return false;
        }

        return true;
      })
      .map(item => ({
        image_url: item.link,
        origin_url: item.image.contextLink,
        height: item.image.height,
        width: item.image.width,
        title: item.title,
        thumbnail_url: item.image.thumbnailLink,
      }));

    console.log(`[Google Images] ✅ Returned ${results.length} images after filtering`);
    return results;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return [];
    }

    console.error('[Google Images] ❌ Error:', error);
    return [];
  }
}

/**
 * Build a search query for a playground
 *
 * @param params - Playground details
 * @returns Optimized search query
 */
export function buildPlaygroundImageQuery(params: {
  name?: string | null;
  city?: string;
  region?: string;
  country?: string;
}): string {
  const { name, city, region } = params;

  const parts: string[] = [];

  // Add playground name if available
  if (name) {
    parts.push(`"${name}"`); // Use quotes for exact phrase matching
  }

  // Add "playground" keyword if not in name
  if (!name || !name.toLowerCase().includes('playground')) {
    parts.push('playground');
  }

  // Add location (city and/or region) for better specificity
  if (city && region) {
    parts.push(`"${city}, ${region}"`); // Use quotes for exact location
  } else if (city) {
    parts.push(`"${city}"`);
  } else if (region) {
    parts.push(region);
  }

  // Build the query
  const baseQuery = parts.join(' ');

  // Add additional keywords to improve relevance (using OR so at least one must match)
  // These help Google understand we want actual playground equipment photos
  // Note: Using parentheses to group OR terms so they don't override the main query
  return `${baseQuery} (equipment OR slide OR swing OR kids)`;
}
