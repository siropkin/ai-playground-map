import pLimit from "p-limit";

/**
 * Rate limiter for AI APIs to prevent 429 errors and ensure
 * smooth operation during peak usage.
 */

// AI API rate limiter (used for Gemini and other AI providers)
// Limits to 2 concurrent requests to be conservative with Gemini free tier
// Gemini 2.0 Flash: 10 RPM free tier, so 2 concurrent with delays should stay under limit
export const aiLimiter = pLimit(2);
