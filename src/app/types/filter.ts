import type { AccessType, FeatureType } from "@/types/playground";

export interface FilterCriteria {
  approved: boolean[];
  accesses: AccessType[];
  ages: string[];
  features: FeatureType[];
}
