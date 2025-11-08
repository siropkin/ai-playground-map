/**
 * Source Domain Validation Utility
 * Validates that Perplexity sources are from trusted domains and contain
 * appropriate geographic context to prevent wrong-location data.
 */

export interface SourceValidationResult {
  isValid: boolean;
  score: number; // 0-100
  flags: string[];
  trustedDomains: number;
  suspiciousDomains: number;
}

// Highly trusted domains for playground information
const TRUSTED_DOMAINS = [
  // Government parks departments
  '.gov',
  'parks.dc.gov',
  'dpr.dc.gov',
  'nycgovparks',
  'parks.nyc.gov',
  'laparks.org',
  'sfrecpark.org',
  'chicagoparkdistrict.com',

  // Community wikis and collaborative sources
  'wikipedia.org',
  'wikimedia.org',
  'wikidata.org',
  'openstreetmap.org',

  // Reputable community photo sites
  'flickr.com',
  'googleusercontent.com', // Google Photos/Maps

  // Local news and community sites
  '.edu', // Schools/universities often have good playground info

  // Reputable review and attraction sites
  'tripadvisor.com', // Accurate location data, reviews, photos for attractions
  'yelp.com', // Local business reviews with accurate location data
  'google.com/maps', // Google Maps reviews and info
  'alltrails.com', // Trail and recreation area information
];

// Domains to avoid (often have wrong-location or low-quality data)
const SUSPICIOUS_DOMAINS = [
  // Real estate (often mix locations with property listings)
  'zillow.com',
  'trulia.com',
  'realtor.com',
  'redfin.com',
  'apartments.com',

  // Stock photos and generic content (not location-specific)
  'shutterstock.com',
  'istockphoto.com',
  'gettyimages.com',
  'pexels.com',
  'unsplash.com',

  // Social media personal posts (variable quality, but note: official pages can be good)
  'facebook.com/profile',
  'facebook.com/photo',
  'twitter.com/status',
  'instagram.com/p/',
  'linkedin.com/in/',

  // Blog platforms - only mark personal blogs as suspicious
  // Note: Many parks depts use these, so we're lenient
  'blogspot.com',

  // Deprecated/inactive services
  'foursquare.com', // Less actively maintained
];

// Geographic keywords that should appear in sources for the target location
const GEO_KEYWORDS = [
  'playground',
  'park',
  'recreation',
  'facility',
  'community',
  'neighborhood',
  'district',
];

/**
 * Validates an array of source URLs for trustworthiness and geographic relevance
 */
export function validateSources(
  sources: string[] | null,
  targetCity?: string,
  targetRegion?: string
): SourceValidationResult {
  const result: SourceValidationResult = {
    isValid: true,
    score: 50, // Start at neutral
    flags: [],
    trustedDomains: 0,
    suspiciousDomains: 0,
  };

  if (!sources || sources.length === 0) {
    result.isValid = false;
    result.score = 0;
    result.flags.push('no_sources');
    return result;
  }

  // Analyze each source
  for (const source of sources) {
    const lowerSource = source.toLowerCase();

    // Check for trusted domains
    if (TRUSTED_DOMAINS.some(domain => lowerSource.includes(domain))) {
      result.trustedDomains++;
      result.score += 10;
    }

    // Check for suspicious domains
    if (SUSPICIOUS_DOMAINS.some(domain => lowerSource.includes(domain))) {
      result.suspiciousDomains++;
      result.score -= 15;
      result.flags.push(`suspicious_domain: ${source}`);
    }

    // Check for geographic context in URL
    const hasGeoContext = GEO_KEYWORDS.some(keyword => lowerSource.includes(keyword));
    if (hasGeoContext) {
      result.score += 5;
    }

    // Check if target city/region appears in source URL
    if (targetCity && lowerSource.includes(targetCity.toLowerCase())) {
      result.score += 10;
    }
    if (targetRegion && lowerSource.includes(targetRegion.toLowerCase())) {
      result.score += 5;
    }
  }

  // Cap score at 0-100
  result.score = Math.max(0, Math.min(100, result.score));

  // Determine validity based on score and flags
  if (result.score < 30) {
    result.isValid = false;
    result.flags.push('low_source_quality');
  }

  // Only fail if suspicious sources dominate by 2x or more AND we have trusted sources
  // OR if we have 3+ suspicious and no trusted sources at all
  if (result.trustedDomains > 0) {
    // We have some trusted sources - only fail if suspicious dominates heavily
    if (result.suspiciousDomains >= result.trustedDomains * 2) {
      result.flags.push('more_suspicious_than_trusted');
      result.score -= 10; // Penalty but don't auto-fail
    }
  } else if (sources.length > 0) {
    // No trusted sources at all
    result.flags.push('no_trusted_domains');
    result.score = Math.min(result.score, 40);

    // Only fail if we have multiple suspicious sources with no trusted ones
    if (result.suspiciousDomains >= 3) {
      result.isValid = false;
    }
  }

  return result;
}

/**
 * Quick check if sources contain any trusted domains
 */
export function hasTrustedSources(sources: string[] | null): boolean {
  if (!sources || sources.length === 0) return false;

  return sources.some(source =>
    TRUSTED_DOMAINS.some(domain =>
      source.toLowerCase().includes(domain)
    )
  );
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}
