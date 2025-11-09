import pLimit from "p-limit";

/**
 * Rate limiter for Perplexity AI API to prevent 429 errors and ensure
 * smooth operation during peak usage.
 */

// Perplexity AI API rate limiter
// Limits to 3 concurrent requests to avoid rate limiting
export const perplexityLimiter = pLimit(3);
