import pLimit from "p-limit";

/**
 * Rate limiter for AI APIs to prevent 429 errors and ensure
 * smooth operation during peak usage.
 */

// AI API rate limiter (used for both Perplexity and Gemini)
// Limits to 2 concurrent requests to be conservative with Gemini free tier
// Gemini 1.5 Flash free tier: 15 RPM, so 2 concurrent with delays should stay under limit
export const perplexityLimiter = pLimit(2);
