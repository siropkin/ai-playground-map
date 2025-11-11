/**
 * Google Custom Search API for Image Search
 *
 * Provides high-quality playground image search using Google's Custom Search JSON API.
 * Integrated with Gemini AI for optimized search queries.
 *
 * Strategy (v6 - Pure Google Ranking):
 * - **Trust Gemini queries**: Gemini generates optimized search queries with context
 * - **Trust Google ranking**: Use Google's result order as-is, no re-sorting
 * - **Minimal filtering**: Only exclude inaccessible domains and invalid URLs
 * - **No custom scoring**: Let Google's algorithm determine the best results
 *
 * API Settings:
 * - Minimal restrictions: Let Google's algorithm work naturally
 * - SafeSearch disabled: Playground photos aren't explicit content
 * - No size/type/date filters: Match browser search behavior
 * - Duplicate filtering: Enabled
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

import { isValidImageUrl, extractDomain } from "@/lib/utils";

export interface GoogleImageResult {
  image_url: string;
  origin_url: string;
  height: number;
  width: number;
  title?: string;
  thumbnail_url?: string;
  // No score - we trust Google's ranking order
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
 * Domains to exclude (inaccessible or restricted image URLs)
 * These domains host images that require authentication or are not directly accessible
 */
const EXCLUDED_DOMAINS = [
  // Social media platforms with inaccessible/restricted image URLs
  'instagram.com', // Instagram images not directly accessible (lookaside URLs)
  'lookaside.instagram.com', // Instagram proxy URLs not accessible
  'facebook.com', // Facebook images require authentication
  'fbcdn.net', // Facebook CDN images require authentication
  'tiktok.com', // TikTok images require app/authentication
  'tiktokcdn.com', // TikTok CDN images not accessible
  // Other inaccessible sources
  'waze.com',
  'ctfassets.net',
  'mapq.st',
];

// No custom scoring function - trust Google's ranking completely

/**
 * Search for images using Google Custom Search API
 *
 * Pure strategy (v6 - Trust Google):
 * 1. Trust Gemini's optimized query
 * 2. Fetch images from Google with minimal API restrictions
 * 3. Filter out only inaccessible domains and invalid URLs
 * 4. Return results in Google's natural ranking order
 *
 * @param query - Search query from Gemini (already optimized)
 * @param options - Search options
 * @returns Array of image results in Google's ranking order
 */
export async function searchImages(
  query: string,
  options: {
    maxResults?: number;
    signal?: AbortSignal;
    minWidth?: number;
    minHeight?: number;
  } = {}
): Promise<GoogleImageResult[]> {
  const {
    maxResults = 10,
    signal,
    minWidth = 300,
    minHeight = 200,
  } = options;

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
    // Fetch one page at a time (10 images per request)
    const pagesToFetch = Math.ceil(maxResults / 10);
    const allItems: CustomSearchImageItem[] = [];

    for (let page = 0; page < pagesToFetch; page++) {
      if (signal?.aborted) break;

      const startIndex = page * 10 + 1; // Google uses 1-based indexing

      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.set('key', apiKey);
      url.searchParams.set('cx', cx);
      url.searchParams.set('q', query);
      url.searchParams.set('searchType', 'image');
      url.searchParams.set('num', '10');
      url.searchParams.set('start', startIndex.toString());
      url.searchParams.set('safe', 'off'); // Disable SafeSearch - playground photos aren't explicit
      url.searchParams.set('filter', '1'); // Duplicate filtering
      // Removed imgSize, imgType, dateRestrict, and sort to match browser behavior
      // Let Google's natural relevance algorithm work without restrictions

      const response = await fetch(url.toString(), {
        signal,
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('[Google Images] ⚠️ Rate limit exceeded');
        }
        break;
      }

      const data = await response.json() as CustomSearchResponse;
      if (data.items && data.items.length > 0) {
        allItems.push(...data.items);
      } else {
        break;
      }
    }

    if (allItems.length === 0) {
      return [];
    }


    // Filter and preserve Google's ranking order (no re-sorting)
    const filteredImages = allItems
      .map(item => ({
        image_url: item.link,
        origin_url: item.image.contextLink,
        height: item.image.height,
        width: item.image.width,
        title: item.title,
        thumbnail_url: item.image.thumbnailLink,
      }))
      .filter(img => {
        // Filter out invalid/inaccessible image URLs
        if (!isValidImageUrl(img.image_url)) {
          return false;
        }

        // Filter out images hosted on excluded domains
        const imageUrlLower = img.image_url.toLowerCase();
        const imageHost = extractDomain(img.image_url).toLowerCase();
        if (EXCLUDED_DOMAINS.some(domain => imageUrlLower.includes(domain) || imageHost.includes(domain))) {
          return false;
        }

        // Filter by minimum dimensions
        if (img.width < minWidth || img.height < minHeight) {
          return false;
        }

        return true;
      })
      .slice(0, maxResults); // Just take first N results in Google's order

    return filteredImages;
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
  const { name, city } = params;

  const parts: string[] = [];

  // Add playground name with quotes for exact matching
  // Testing showed this format works best for finding actual playground photos
  if (name) {
    parts.push(`"${name}"`);
  }

  // Add city in quotes
  // Simple quoted city works better than complex location strings
  if (city) {
    parts.push(`"${city}"`);
  }

  // Simple query works best - testing showed complex queries with equipment keywords
  // and extra location terms don't improve results and can dilute the search
  return parts.join(' ');
}
