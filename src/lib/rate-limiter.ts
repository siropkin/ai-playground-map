import pLimit from "p-limit";

/**
 * Rate limiter for AI APIs to prevent 429 errors and ensure
 * smooth operation during peak usage.
 */

// AI API rate limiter (used for Gemini and other AI providers)
// Limits to 2 concurrent requests to be conservative
// Gemini 2.0 Flash: 15 RPM free tier, 2,000 RPM paid tier
// With paid tier, we can safely handle multiple concurrent requests
export const aiLimiter = pLimit(2);
