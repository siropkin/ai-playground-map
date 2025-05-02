import type { AccessType, FeatureType } from "@/types/playground";

export interface FilterCriteria {
  accesses: AccessType[];
  ages: string[];
  features: FeatureType[];
}
