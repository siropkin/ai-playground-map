import { PerplexityInsights } from "@/types/perplexity";

/**
 * Playground Tier System: "Playground Gems"
 * Categorizes playgrounds by quality and experience level
 */

export type PlaygroundTier = "neighborhood" | "gem" | "star";

export interface TierScore {
  tier: PlaygroundTier;
  score: number;
  reasons: string[];
}

/**
 * Calculate playground tier based on features, amenities, and description quality
 */
export function calculatePlaygroundTier(insights: PerplexityInsights | null): TierScore {
  if (!insights) {
    return {
      tier: "neighborhood",
      score: 0,
      reasons: ["Limited information available"],
    };
  }

  let score = 0;
  const reasons: string[] = [];

  // ========================================
  // 1. FEATURE RICHNESS (0-40 points)
  // ========================================
  const featureCount = insights.features?.length || 0;

  if (featureCount >= 8) {
    score += 40;
    reasons.push(`${featureCount} unique features`);
  } else if (featureCount >= 5) {
    score += 25;
    reasons.push(`${featureCount} features`);
  } else if (featureCount >= 3) {
    score += 10;
  }

  // Premium features bonus
  const premiumFeatures = [
    "zip line",
    "zipline",
    "zip-line",
    "water play",
    "splash pad",
    "water feature",
    "climbing wall",
    "rope course",
    "musical instruments",
    "sensory play",
    "adventure playground",
  ];

  const description = insights.description?.toLowerCase() || "";
  const featuresText = insights.features?.join(" ").toLowerCase() || "";
  const combinedText = `${description} ${featuresText}`;

  let premiumCount = 0;
  for (const feature of premiumFeatures) {
    if (combinedText.includes(feature)) {
      score += 15;
      premiumCount++;
    }
  }

  if (premiumCount > 0) {
    reasons.push(`${premiumCount} premium feature${premiumCount > 1 ? "s" : ""}`);
  }

  // ========================================
  // 2. THEMED & UNIQUE (0-25 points)
  // ========================================
  const themedKeywords = [
    "pirate",
    "castle",
    "space",
    "dinosaur",
    "rocket",
    "train",
    "ship",
    "themed",
    "theme park",
    "adventure",
    "fantasy",
    "jungle",
    "safari",
  ];

  let themedScore = 0;
  for (const keyword of themedKeywords) {
    if (combinedText.includes(keyword)) {
      themedScore = 20;
      reasons.push(`Themed playground (${keyword})`);
      break;
    }
  }
  score += themedScore;

  // Named playground (not just "Unnamed Playground")
  if (insights.name && insights.name.length > 3 && !insights.name.toLowerCase().includes("playground")) {
    score += 5;
  }

  // ========================================
  // 3. DESTINATION QUALITY (0-30 points)
  // ========================================
  const destinationKeywords = [
    { word: "destination playground", points: 30 },
    { word: "award-winning", points: 25 },
    { word: "famous", points: 20 },
    { word: "renowned", points: 20 },
    { word: "popular", points: 10 },
    { word: "well-known", points: 10 },
    { word: "unique", points: 15 },
    { word: "elaborate", points: 15 },
    { word: "impressive", points: 15 },
    { word: "spectacular", points: 15 },
    { word: "world-class", points: 25 },
  ];

  let destinationBonus = 0;
  for (const { word, points } of destinationKeywords) {
    if (description.includes(word)) {
      destinationBonus = Math.max(destinationBonus, points);
      if (points >= 20) {
        reasons.push(`Destination-quality (${word})`);
      }
    }
  }
  score += destinationBonus;

  // ========================================
  // 4. AMENITIES & ACCESSIBILITY (0-30 points)
  // ========================================
  const amenityReasons: string[] = [];

  // Parking
  if (insights.parking && insights.parking.toLowerCase() !== "no parking information available") {
    if (insights.parking.toLowerCase().includes("ample") || insights.parking.toLowerCase().includes("large")) {
      score += 10;
      amenityReasons.push("ample parking");
    } else {
      score += 5;
      amenityReasons.push("parking available");
    }
  }

  // Accessibility features (array format)
  const accessibilityCount = insights.accessibility?.length || 0;

  if (accessibilityCount > 0) {
    const accessibilityText = insights.accessibility?.join(" ").toLowerCase() || "";

    // Wheelchair accessible
    if (accessibilityText.includes("wheelchair")) {
      score += 10;
      amenityReasons.push("wheelchair accessible");
    }

    // Shade coverage
    if (accessibilityText.includes("shade")) {
      score += 5;
      amenityReasons.push("shade coverage");
    }

    // Accessible restrooms
    if (accessibilityText.includes("restroom") || accessibilityText.includes("changing_table")) {
      score += 5;
      amenityReasons.push("accessible restrooms");
    }

    // Sensory friendly
    if (accessibilityText.includes("sensory") || accessibilityText.includes("tactile") || accessibilityText.includes("quiet")) {
      score += 5;
      amenityReasons.push("sensory-friendly features");
    }
  }

  // Add amenities to reasons (list them out instead of just a count)
  if (amenityReasons.length > 0) {
    amenityReasons.forEach(amenity => reasons.push(amenity));
  }

  // ========================================
  // 5. IMAGES (0-10 points)
  // ========================================
  const imageCount = insights.images?.length || 0;
  if (imageCount >= 3) {
    score += 10;
  } else if (imageCount >= 1) {
    score += 5;
  }

  // ========================================
  // TIER ASSIGNMENT
  // ========================================
  let tier: PlaygroundTier;

  if (score >= 76) {
    tier = "star";
  } else if (score >= 41) {
    tier = "gem";
  } else {
    tier = "neighborhood";
  }

  // Ensure at least one reason
  if (reasons.length === 0) {
    if (tier === "neighborhood") {
      reasons.push("Standard neighborhood playground");
    }
  }

  return {
    tier,
    score,
    reasons,
  };
}

/**
 * Get display information for a tier
 */
export function getTierDisplayInfo(tier: PlaygroundTier): {
  label: string;
  icon: string;
  color: string;
  description: string;
} {
  switch (tier) {
    case "star":
      return {
        label: "Star",
        icon: "⭐",
        color: "gold",
        description: "Exceptional destination playground worth traveling for",
      };
    case "gem":
      return {
        label: "Gem",
        icon: "💎",
        color: "purple",
        description: "Notable playground with unique features",
      };
    case "neighborhood":
      return {
        label: "Neighborhood",
        icon: "⚪",
        color: "gray",
        description: "Standard local playground",
      };
  }
}
