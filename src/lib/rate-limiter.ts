import pLimit from "p-limit";

/**
 * Rate limiters for third-party APIs to prevent 429 errors and ensure
 * smooth operation during peak usage.
 */

// Perplexity AI API rate limiter
// Limits to 3 concurrent requests to avoid rate limiting
export const perplexityLimiter = pLimit(3);

// Nominatim API rate limiter
// Nominatim has stricter rate limits (1 req/sec recommended)
// We allow 2 concurrent to balance performance and respect
export const nominatimLimiter = pLimit(2);

// OSM Overpass API rate limiter
// Overpass can handle more concurrent requests, but we limit
// to avoid overwhelming the free public service
export const overpassLimiter = pLimit(5);
