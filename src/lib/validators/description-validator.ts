/**
 * NLP Description Validator
 * Validates that descriptions contain playground-related content and
 * don't mention conflicting locations.
 */

export interface DescriptionValidationResult {
  isValid: boolean;
  score: number; // 0-100
  flags: string[];
  playgroundKeywordCount: number;
  locationConflicts: string[];
  hasMinimumContent: boolean;
}

// Core playground-related keywords (high confidence)
const CORE_PLAYGROUND_KEYWORDS = [
  'playground',
  'play area',
  'play space',
  'play structure',
  'playset',
  'swing',
  'swings',
  'slide',
  'slides',
  'climbing',
  'climber',
  'jungle gym',
  'monkey bars',
  'seesaw',
  'teeter-totter',
  'merry-go-round',
  'sandbox',
  'sandpit',
  'play equipment',
];

// Secondary playground keywords (supporting context)
const SECONDARY_KEYWORDS = [
  'children',
  'kids',
  'toddler',
  'ages',
  'age range',
  'family',
  'park',
  'recreation',
  'outdoor',
  'shaded',
  'fenced',
  'safety',
  'accessible',
  'equipment',
];

// Keywords that indicate non-playground content
const NEGATIVE_KEYWORDS = [
  'restaurant',
  'shopping',
  'hotel',
  'apartment',
  'condo',
  'real estate',
  'for sale',
  'for rent',
  'zillow',
  'listing',
  'business',
];

// Common US states (abbreviated and full names) for location conflict detection
const US_STATES = [
  'alabama', 'al', 'alaska', 'ak', 'arizona', 'az', 'arkansas', 'ar',
  'california', 'ca', 'colorado', 'co', 'connecticut', 'ct',
  'delaware', 'de', 'florida', 'fl', 'georgia', 'ga',
  'hawaii', 'hi', 'idaho', 'id', 'illinois', 'il', 'indiana', 'in',
  'iowa', 'ia', 'kansas', 'ks', 'kentucky', 'ky', 'louisiana', 'la',
  'maine', 'me', 'maryland', 'md', 'massachusetts', 'ma', 'michigan', 'mi',
  'minnesota', 'mn', 'mississippi', 'ms', 'missouri', 'mo', 'montana', 'mt',
  'nebraska', 'ne', 'nevada', 'nv', 'new hampshire', 'nh', 'new jersey', 'nj',
  'new mexico', 'nm', 'new york', 'ny', 'north carolina', 'nc', 'north dakota', 'nd',
  'ohio', 'oh', 'oklahoma', 'ok', 'oregon', 'or', 'pennsylvania', 'pa',
  'rhode island', 'ri', 'south carolina', 'sc', 'south dakota', 'sd',
  'tennessee', 'tn', 'texas', 'tx', 'utah', 'ut', 'vermont', 'vt',
  'virginia', 'va', 'washington', 'wa', 'west virginia', 'wv',
  'wisconsin', 'wi', 'wyoming', 'wy',
];

// Major US cities for location conflict detection
const MAJOR_CITIES = [
  'new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia',
  'san antonio', 'san diego', 'dallas', 'san jose', 'austin', 'jacksonville',
  'fort worth', 'columbus', 'charlotte', 'san francisco', 'indianapolis',
  'seattle', 'denver', 'washington', 'boston', 'nashville', 'detroit',
  'portland', 'memphis', 'oklahoma city', 'las vegas', 'baltimore', 'milwaukee',
  'albuquerque', 'tucson', 'fresno', 'sacramento', 'atlanta', 'miami',
];

/**
 * Validates a description for playground relevance and location accuracy
 */
export function validateDescription(
  description: string | null,
  name: string | null,
  targetCity?: string,
  targetRegion?: string
): DescriptionValidationResult {
  const result: DescriptionValidationResult = {
    isValid: true,
    score: 50, // Start at neutral
    flags: [],
    playgroundKeywordCount: 0,
    locationConflicts: [],
    hasMinimumContent: false,
  };

  // Check if description exists and has minimum length
  if (!description || description.trim().length < 20) {
    result.isValid = false;
    result.score = 0;
    result.flags.push('no_description_or_too_short');
    return result;
  }

  result.hasMinimumContent = description.trim().length >= 50;
  if (result.hasMinimumContent) {
    result.score += 10;
  }

  const lowerDesc = description.toLowerCase();
  const lowerName = name?.toLowerCase() || '';
  const combinedText = `${lowerDesc} ${lowerName}`;

  // Count core playground keywords
  for (const keyword of CORE_PLAYGROUND_KEYWORDS) {
    if (combinedText.includes(keyword)) {
      result.playgroundKeywordCount++;
      result.score += 5;
    }
  }

  // Count secondary keywords (lower weight)
  for (const keyword of SECONDARY_KEYWORDS) {
    if (combinedText.includes(keyword)) {
      result.score += 2;
    }
  }

  // Require at least 1 core playground keyword
  if (result.playgroundKeywordCount === 0) {
    result.isValid = false;
    result.flags.push('no_playground_keywords');
    result.score = Math.min(result.score, 20);
  }

  // Check for negative keywords (non-playground content)
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (combinedText.includes(keyword)) {
      result.score -= 10;
      result.flags.push(`negative_keyword: ${keyword}`);
    }
  }

  // Check for location conflicts
  if (targetCity && targetRegion) {
    const targetCityLower = targetCity.toLowerCase();
    const targetRegionLower = targetRegion.toLowerCase();

    // Check if description mentions different cities
    for (const city of MAJOR_CITIES) {
      if (city === targetCityLower) continue; // Skip target city

      // Look for city mentions
      if (combinedText.includes(city)) {
        // Make sure it's not in context of "near" or "similar to"
        const cityIndex = combinedText.indexOf(city);
        const beforeContext = combinedText.substring(Math.max(0, cityIndex - 20), cityIndex);
        const afterContext = combinedText.substring(cityIndex, Math.min(combinedText.length, cityIndex + city.length + 20));
        const context = beforeContext + afterContext;

        // If it mentions the city without "near", "like", "similar" context, it's a conflict
        if (!context.includes('near') && !context.includes('like') && !context.includes('similar')) {
          result.locationConflicts.push(city);
          result.score -= 20;
          result.flags.push(`location_conflict: ${city}`);
        }
      }
    }

    // Check if description mentions different states
    for (const state of US_STATES) {
      if (state === targetRegionLower || state.length <= 2) continue; // Skip target state and abbreviations

      if (combinedText.includes(state)) {
        const stateIndex = combinedText.indexOf(state);
        const beforeContext = combinedText.substring(Math.max(0, stateIndex - 20), stateIndex);
        const afterContext = combinedText.substring(stateIndex, Math.min(combinedText.length, stateIndex + state.length + 20));
        const context = beforeContext + afterContext;

        if (!context.includes('near') && !context.includes('like') && !context.includes('similar')) {
          result.locationConflicts.push(state);
          result.score -= 20;
          result.flags.push(`location_conflict: ${state}`);
        }
      }
    }
  }

  // Location conflicts are serious - fail validation
  if (result.locationConflicts.length > 0) {
    result.isValid = false;
  }

  // Cap score at 0-100
  result.score = Math.max(0, Math.min(100, result.score));

  // Final validation check
  if (result.score < 30) {
    result.isValid = false;
    result.flags.push('low_description_quality');
  }

  return result;
}

/**
 * Quick check if description has minimum playground relevance
 */
export function hasPlaygroundContent(description: string | null): boolean {
  if (!description) return false;

  const lowerDesc = description.toLowerCase();
  return CORE_PLAYGROUND_KEYWORDS.some(keyword => lowerDesc.includes(keyword));
}

/**
 * Extract mentioned locations from text (for debugging/monitoring)
 */
export function extractMentionedLocations(text: string): string[] {
  const mentioned: string[] = [];
  const lowerText = text.toLowerCase();

  // Check cities
  for (const city of MAJOR_CITIES) {
    if (lowerText.includes(city)) {
      mentioned.push(city);
    }
  }

  // Check states (only full names, not abbreviations)
  for (const state of US_STATES) {
    if (state.length > 2 && lowerText.includes(state)) {
      mentioned.push(state);
    }
  }

  return mentioned;
}
