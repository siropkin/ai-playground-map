/**
 * Result Scoring System
 * Combines all validation layers into a comprehensive quality score
 * for Perplexity AI results.
 */

import { validateSources, SourceValidationResult } from './source-validator';
import { validateDescription, DescriptionValidationResult } from './description-validator';
import { PerplexityInsights } from '@/types/perplexity';

export interface ResultScore {
  overallScore: number; // 0-100
  confidence: 'high' | 'medium' | 'low';
  shouldAccept: boolean;
  shouldCache: boolean;
  breakdown: {
    sourceScore: number;
    descriptionScore: number;
    dataCompletenessScore: number;
    locationConfidenceScore: number;
  };
  validationResults: {
    sources: SourceValidationResult;
    description: DescriptionValidationResult;
  };
  flags: string[];
}

/**
 * Weights for different scoring components (sum to 100)
 */
const SCORING_WEIGHTS = {
  sources: 30,           // 30% - Source quality is very important
  description: 25,       // 25% - Description quality matters
  dataCompleteness: 20,  // 20% - Having all fields matters
  locationConfidence: 25 // 25% - Location accuracy is critical
};

/**
 * Thresholds for acceptance and caching decisions
 */
const THRESHOLDS = {
  minAcceptScore: 50,      // Minimum score to accept result (lowered to be more lenient)
  minCacheScore: 65,       // Minimum score to cache (higher bar)
  highConfidence: 75,      // Score for "high" confidence
  mediumConfidence: 50,    // Score for "medium" confidence
};

/**
 * Score a Perplexity result comprehensively
 */
export function scoreResult(
  result: PerplexityInsights | null,
  locationConfidence: string,
  locationVerification: string | null,
  targetCity?: string,
  targetRegion?: string
): ResultScore {
  const score: ResultScore = {
    overallScore: 0,
    confidence: 'low',
    shouldAccept: false,
    shouldCache: false,
    breakdown: {
      sourceScore: 0,
      descriptionScore: 0,
      dataCompletenessScore: 0,
      locationConfidenceScore: 0,
    },
    validationResults: {
      sources: {
        isValid: false,
        score: 0,
        flags: [],
        trustedDomains: 0,
        suspiciousDomains: 0,
      },
      description: {
        isValid: false,
        score: 0,
        flags: [],
        playgroundKeywordCount: 0,
        locationConflicts: [],
        hasMinimumContent: false,
      },
    },
    flags: [],
  };

  // If result is null, return zero score
  if (!result) {
    score.flags.push('null_result');
    return score;
  }

  // 1. Validate sources (30%)
  const sourceValidation = validateSources(
    result.sources,
    targetCity,
    targetRegion
  );
  score.validationResults.sources = sourceValidation;
  score.breakdown.sourceScore = sourceValidation.score * (SCORING_WEIGHTS.sources / 100);

  if (!sourceValidation.isValid) {
    score.flags.push('invalid_sources');
  }
  score.flags.push(...sourceValidation.flags.map(f => `source: ${f}`));

  // 2. Validate description (25%)
  const descriptionValidation = validateDescription(
    result.description,
    result.name,
    targetCity,
    targetRegion
  );
  score.validationResults.description = descriptionValidation;
  score.breakdown.descriptionScore = descriptionValidation.score * (SCORING_WEIGHTS.description / 100);

  if (!descriptionValidation.isValid) {
    score.flags.push('invalid_description');
  }
  score.flags.push(...descriptionValidation.flags.map(f => `description: ${f}`));

  // 3. Check data completeness (20%)
  let completenessScore = 0;
  let fieldsPresent = 0;
  const totalFields = 6; // name, description, features, parking, images, accessibility

  if (result.name) {
    fieldsPresent++;
    completenessScore += 20;
  }
  if (result.description && result.description.length >= 50) {
    fieldsPresent++;
    completenessScore += 30; // Description is more important
  }
  if (result.features && result.features.length > 0) {
    fieldsPresent++;
    completenessScore += 15;
  }
  if (result.parking) {
    fieldsPresent++;
    completenessScore += 10;
  }
  if (result.images && result.images.length > 0) {
    fieldsPresent++;
    completenessScore += 15;
  }
  if (result.accessibility) {
    fieldsPresent++;
    completenessScore += 10;
  }

  score.breakdown.dataCompletenessScore = completenessScore * (SCORING_WEIGHTS.dataCompleteness / 100);

  // Only flag as incomplete if we have fewer than 3 of the 6 fields
  // This is lenient - allows missing parking, images, or accessibility
  if (fieldsPresent < 3) {
    score.flags.push(`incomplete_data: ${fieldsPresent}/${totalFields} fields`);
  }

  // 4. Location confidence score (25%)
  let locationScore = 0;
  if (locationConfidence === 'high') {
    locationScore = 100;
  } else if (locationConfidence === 'medium') {
    locationScore = 70; // Increased from 60 to be more lenient with medium confidence
  } else {
    locationScore = 20;
    score.flags.push('low_location_confidence');
  }

  // Boost if we have verification text
  if (locationVerification && locationVerification.length > 10) {
    locationScore = Math.min(100, locationScore + 10);
  }

  score.breakdown.locationConfidenceScore = locationScore * (SCORING_WEIGHTS.locationConfidence / 100);

  // Calculate overall score
  score.overallScore = Math.round(
    score.breakdown.sourceScore +
    score.breakdown.descriptionScore +
    score.breakdown.dataCompletenessScore +
    score.breakdown.locationConfidenceScore
  );

  // Determine confidence level
  if (score.overallScore >= THRESHOLDS.highConfidence) {
    score.confidence = 'high';
  } else if (score.overallScore >= THRESHOLDS.mediumConfidence) {
    score.confidence = 'medium';
  } else {
    score.confidence = 'low';
  }

  // Acceptance decision
  score.shouldAccept = score.overallScore >= THRESHOLDS.minAcceptScore;

  // Caching decision (higher bar - only cache high-quality results)
  score.shouldCache = score.overallScore >= THRESHOLDS.minCacheScore;

  // Additional rejection criteria (overrides)
  if (descriptionValidation.locationConflicts.length > 0) {
    score.shouldAccept = false;
    score.shouldCache = false;
    score.flags.push('location_conflict_detected');
  }

  // Only reject if suspicious sources overwhelmingly dominate (3x or more)
  // AND there are no trusted sources at all
  if (sourceValidation.suspiciousDomains >= 3 &&
      sourceValidation.trustedDomains === 0 &&
      sourceValidation.suspiciousDomains > sourceValidation.trustedDomains * 3) {
    score.shouldAccept = false;
    score.shouldCache = false;
    score.flags.push('too_many_suspicious_sources');
  }

  return score;
}

/**
 * Get a human-readable summary of the score
 */
export function getScoreSummary(score: ResultScore): string {
  const parts: string[] = [];

  parts.push(`Overall: ${score.overallScore}/100 (${score.confidence} confidence)`);
  parts.push(`Sources: ${Math.round(score.breakdown.sourceScore)}/${SCORING_WEIGHTS.sources}`);
  parts.push(`Description: ${Math.round(score.breakdown.descriptionScore)}/${SCORING_WEIGHTS.description}`);
  parts.push(`Completeness: ${Math.round(score.breakdown.dataCompletenessScore)}/${SCORING_WEIGHTS.dataCompleteness}`);
  parts.push(`Location: ${Math.round(score.breakdown.locationConfidenceScore)}/${SCORING_WEIGHTS.locationConfidence}`);

  if (score.flags.length > 0) {
    parts.push(`Flags: ${score.flags.join(', ')}`);
  }

  return parts.join(' | ');
}
