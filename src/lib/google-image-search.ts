/**
 * Google Custom Search API for Image Search
 *
 * Provides high-quality playground image search using Google's Custom Search JSON API.
 * Integrated as part of the Gemini AI implementation (Nov 2025).
 *
 * Quality Improvements (v4 - Keyword Filtering):
 * - **Pagination**: Fetches up to 30 images (3 pages) then filters/ranks
 * - **Relevance Scoring**: 6-factor scoring system (0-100 points):
 *   • Domain quality (40pts): Prioritizes .gov, parks, playground-specific sites
 *   • Image size (25pts): Prefers high-resolution images (2MP+)
 *   • Recency (15pts): URL pattern analysis for recent dates
 *   • Title relevance (15pts): Matches query terms and playground keywords
 *   • File format (5pts): Prefers JPG/PNG over WebP
 *   • Keyword filtering (penalty-based): Ensures playground relevance
 *     - Primary keywords (park, playground, school): No penalty
 *     - Secondary keywords (rec center, splash pad): -5pts
 *     - Tertiary keywords (mall, apartment): -10pts
 *     - No keywords: -25pts | Excluded keywords (fair, storage): -30pts
 * - **Dimension Filtering**: Minimum 400x300px (configurable)
 * - **Domain Prioritization**: 3-tier whitelist system + exclusion list
 * - **Sort by date**: Prefers most recent images first
 * - **imgSize=xxlarge**: Maximum quality setting
 * - **imgType=photo**: Photos only (no clipart/lineart)
 * - **dateRestrict=y3**: Last 3 years only
 * - **SafeSearch + Duplicate filtering**: Enabled
 * - **Smart query building**: Exact phrase matching + relevance keywords
 * - **Quality threshold**: Minimum score of 30/100 (configurable)
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
  score?: number; // Quality score (0-100)
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
 * Playground-related keywords for relevance filtering
 * Based on research: 46% playgrounds in schools, 31% in parks, 10% in childcare
 */
const PLAYGROUND_KEYWORDS = {
  // Tier 1: Strong match - Primary playground locations (no penalty)
  primary: [
    'playground',
    'play ground',
    'park',
    'school',
    'elementary',
    'preschool',
    'pre-school',
    'childcare',
    'child care',
    'daycare',
    'day care',
  ],

  // Tier 2: Good match - Secondary playground locations (small penalty: -5pts)
  secondary: [
    'recreation center',
    'rec center',
    'community center',
    'regional park',
    'neighborhood park',
    'splash pad',
    'spray park',
    'tot lot',
    'play area',
    'play structure',
  ],

  // Tier 3: Acceptable - Tertiary locations (moderate penalty: -10pts)
  tertiary: [
    'mall',
    'shopping center',
    'shopping centre',
    'apartment',
    'residential',
    'restaurant',
  ],

  // Excluded: Content that's definitely not playground-related (heavy penalty: -30pts)
  excluded: [
    'storage',
    'moving',
    'relocation',
    'real estate',
    'fair',
    'festival',
    'amusement park',
    'theme park',
    'water park', // Unless it has playground
    'zoo',
    'museum',
    'concert',
    'event',
    'beer',
    'brewery',
    'bar',
    'pub',
    'wine',
    'winery',
    'alcohol',
    'cocktail',
    'liquor',
    'nightlife',
  ],
};

/**
 * Domain priority tiers for scoring
 * Higher tier = more trustworthy/relevant source
 */
const DOMAIN_TIERS = {
  // Tier 1: Government, official park sites, playground-specific (score: 40)
  tier1: [
    '.gov',
    'parks.ca.gov',
    'sfrecpark.org',
    'nycgovparks.org',
    'goparkplay.com',
    'playgroundprofessionals.com',
  ],
  // Tier 2: Social media, local news, community sites (score: 30)
  tier2: [
    'instagram.com',
    'facebook.com',
    'patch.com',
    'yelp.com/biz/', // Yelp business pages (not CDN or search)
    'tripadvisor.com',
    'reddit.com',
  ],
  // Tier 3: General websites, blogs (score: 20)
  tier3: [
    'wordpress.com',
    'blogspot.com',
    'medium.com',
  ],
  // Tier 0: Excluded/low quality (score: 0)
  excluded: [
    'waze.com',
    'homes.com',
    'apartmentlist.com',
    'rentcafe.com',
    'smugmug.com',
    'ctfassets.net',
    'mapq.st',
    'lookandlearn.com',
    'brownstoner.com',
    'oldnycphotos.com',
    'yelpcdn.com', // Yelp CDN (not business pages)
    'yelp.com/search', // Yelp search results (not relevant)
    's3-media0.fl.yelpcdn', // Yelp CDN images
    'discoversantaclara.org', // Tourism site with mixed/irrelevant content
  ],
};

/**
 * Score an image based on quality indicators
 * Returns score from 0-100 (higher is better)
 */
function scoreImage(
  image: CustomSearchImageItem,
  queryTerms?: string[]
): number {
  let score = 0;
  const url = image.image.contextLink.toLowerCase();
  const imageUrl = image.link.toLowerCase();
  const title = (image.title || '').toLowerCase();

  // 1. Domain Quality (40 points max)
  if (DOMAIN_TIERS.excluded.some(domain => url.includes(domain))) {
    return 0; // Excluded domains get 0 score
  } else if (DOMAIN_TIERS.tier1.some(domain => url.includes(domain))) {
    score += 40;
  } else if (DOMAIN_TIERS.tier2.some(domain => url.includes(domain))) {
    score += 30;
  } else if (DOMAIN_TIERS.tier3.some(domain => url.includes(domain))) {
    score += 20;
  } else {
    score += 15; // Unknown domains get base score
  }

  // 2. Image Size (25 points max)
  const pixels = image.image.width * image.image.height;
  if (pixels >= 2000000) score += 25; // 2MP+
  else if (pixels >= 1000000) score += 20; // 1MP+
  else if (pixels >= 500000) score += 15; // 0.5MP+
  else if (pixels >= 200000) score += 10; // 0.2MP+
  else score += 5; // Below 0.2MP

  // 3. Recency Indicators in URL (15 points max)
  const currentYear = new Date().getFullYear();
  const recentYears = [currentYear, currentYear - 1, currentYear - 2];
  const hasRecentYear = recentYears.some(year =>
    url.includes(`/${year}/`) || url.includes(`-${year}-`) || imageUrl.includes(`${year}`)
  );
  if (hasRecentYear) score += 15;
  else if (url.includes('/202') || imageUrl.includes('/202')) score += 10; // Any 2020s
  else score += 5;

  // 4. Title Relevance (15 points max)
  if (queryTerms && queryTerms.length > 0) {
    const matchCount = queryTerms.filter(term =>
      title.includes(term.toLowerCase())
    ).length;
    score += Math.min(matchCount * 5, 15);
  } else {
    // If no query terms, check for playground-related words
    const playgroundWords = ['playground', 'park', 'slide', 'swing', 'play'];
    const matches = playgroundWords.filter(word => title.includes(word)).length;
    score += Math.min(matches * 3, 15);
  }

  // 5. File Format (5 points max)
  if (imageUrl.endsWith('.jpg') || imageUrl.endsWith('.jpeg')) score += 5;
  else if (imageUrl.endsWith('.png')) score += 4;
  else if (imageUrl.endsWith('.webp')) score += 3;
  else score += 2;

  // 6. Playground Keyword Relevance (penalty-based system)
  // Check title and URL for playground-related keywords
  const textToCheck = `${title} ${url}`;

  // Check for excluded keywords first (auto-disqualify)
  const hasExcluded = PLAYGROUND_KEYWORDS.excluded.some(keyword =>
    textToCheck.includes(keyword)
  );
  if (hasExcluded) {
    score -= 30; // Heavy penalty for excluded content
  }

  // Check for playground keywords
  const hasPrimary = PLAYGROUND_KEYWORDS.primary.some(keyword =>
    textToCheck.includes(keyword)
  );
  const hasSecondary = PLAYGROUND_KEYWORDS.secondary.some(keyword =>
    textToCheck.includes(keyword)
  );
  const hasTertiary = PLAYGROUND_KEYWORDS.tertiary.some(keyword =>
    textToCheck.includes(keyword)
  );

  // Apply penalties based on keyword tier
  if (hasPrimary) {
    // Primary keywords: no penalty (best case)
  } else if (hasSecondary) {
    score -= 5; // Small penalty for secondary locations
  } else if (hasTertiary) {
    score -= 10; // Moderate penalty for tertiary locations
  } else {
    // No playground keywords at all
    score -= 25; // Heavy penalty for missing keywords
  }

  return Math.min(Math.max(score, 0), 100); // Clamp to 0-100
}

/**
 * Search for images using Google Custom Search API with pagination and scoring
 *
 * Strategy:
 * 1. Fetch up to 30 images (3 pages of 10)
 * 2. Score each image based on quality indicators
 * 3. Filter out low-quality images (dimensions, excluded domains)
 * 4. Sort by score and return top results
 *
 * @param query - Search query (e.g., "Central Park Playground New York")
 * @param options - Search options
 * @returns Array of high-quality image results, sorted by relevance
 */
export async function searchImages(
  query: string,
  options: {
    maxResults?: number;
    signal?: AbortSignal;
    minScore?: number;
    minWidth?: number;
    minHeight?: number;
  } = {}
): Promise<GoogleImageResult[]> {
  const {
    maxResults = 10,
    signal,
    minScore = 30, // Minimum quality score (0-100)
    minWidth = 400, // Minimum image width
    minHeight = 300, // Minimum image height
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
    // Extract query terms for scoring
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

    // Phase 1: Fetch multiple pages (up to 30 images = 3 pages)
    const pagesToFetch = Math.min(Math.ceil(maxResults / 10) + 2, 3); // Extra pages for filtering
    const allItems: CustomSearchImageItem[] = [];

    for (let page = 0; page < pagesToFetch; page++) {
      if (signal?.aborted) break;

      const startIndex = page * 10 + 1; // Google uses 1-based indexing

      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.set('key', apiKey);
      url.searchParams.set('cx', cx);
      url.searchParams.set('q', query);
      url.searchParams.set('searchType', 'image');
      url.searchParams.set('num', '10'); // Always fetch 10 per page
      url.searchParams.set('start', startIndex.toString());
      url.searchParams.set('safe', 'active'); // SafeSearch
      url.searchParams.set('imgSize', 'xxlarge'); // Maximum quality
      url.searchParams.set('imgType', 'photo'); // Photos only
      url.searchParams.set('filter', '1'); // Duplicate filtering
      url.searchParams.set('dateRestrict', 'y3'); // Last 3 years
      url.searchParams.set('sort', 'date'); // Prefer recent images

      const response = await fetch(url.toString(), {
        signal,
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('[Google Images] ⚠️ Rate limit exceeded');
        }
        // Continue with what we have so far
        break;
      }

      const data = await response.json() as CustomSearchResponse;
      if (data.items && data.items.length > 0) {
        allItems.push(...data.items);
      } else {
        // No more results available
        break;
      }
    }

    if (allItems.length === 0) {
      console.log(`[Google Images] ℹ️ No images found for query: ${query}`);
      return [];
    }

    console.log(`[Google Images] 📥 Fetched ${allItems.length} raw images`);

    // Phase 2: Score and filter all images
    const scoredImages = allItems
      .map(item => {
        const score = scoreImage(item, queryTerms);
        return {
          item,
          score,
          image_url: item.link,
          origin_url: item.image.contextLink,
          height: item.image.height,
          width: item.image.width,
          title: item.title,
          thumbnail_url: item.image.thumbnailLink,
        };
      })
      .filter(img => {
        // Filter out invalid/inaccessible image URLs (x-raw-image:// format from Google)
        if (!img.image_url.startsWith('http://') && !img.image_url.startsWith('https://')) {
          console.log(`[Google Images] 🚫 Invalid URL format: ${img.image_url.substring(0, 50)}...`);
          return false;
        }

        // Filter by minimum score
        if (img.score < minScore) {
          console.log(`[Google Images] 🚫 Low score (${img.score}): ${img.origin_url}`);
          return false;
        }

        // Filter by minimum dimensions
        if (img.width < minWidth || img.height < minHeight) {
          console.log(`[Google Images] 🚫 Too small (${img.width}x${img.height}): ${img.origin_url}`);
          return false;
        }

        return true;
      });

    // Phase 3: Sort by score and return top results
    const sortedImages = scoredImages
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(img => ({
        image_url: img.image_url,
        origin_url: img.origin_url,
        height: img.height,
        width: img.width,
        title: img.title,
        thumbnail_url: img.thumbnail_url,
        score: img.score,
      }));

    console.log(`[Google Images] ✅ Returning ${sortedImages.length} images (scores: ${sortedImages.map(i => i.score).join(', ')})`);
    return sortedImages;
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
