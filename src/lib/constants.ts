import { AccessType, FeatureType } from "@/types/playground";

export const SITE_NAME = "Good Playground Map";

export const PHOTOS_BUCKET_NAME = "playground-photos";

export const APP_ADMIN_ROLE = "app_admin";

export const AGE_GROUPS = [
  { label: "Toddler (0-2)", min: 0, max: 2, key: "toddler" },
  { label: "Preschool (2-5)", min: 2, max: 5, key: "preschool" },
  { label: "School Age (5-12)", min: 5, max: 12, key: "school" },
  { label: "Teen & Adult (13+)", min: 13, max: 100, key: "adult" },
];

export const ACCESS_TYPES: AccessType[] = [
  "public",
  "school",
  "community_center",
  "park_district",
  "mall_indoor",
];

export const FEATURE_TYPES: FeatureType[] = [
  "swings",
  "slides",
  "climbing_wall",
  "monkey_bars",
  "sandpit",
  "water_play",
  "see_saw",
  "shade_structure",
  "picnic_tables",
  "benches",
  "restrooms",
  "parking_lot",
  "dog_friendly",
  "musical_instruments",
  "wheelchair_accessible",
];
