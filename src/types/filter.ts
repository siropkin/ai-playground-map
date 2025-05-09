import type { AccessType, FeatureType } from "./playground";

export interface FilterCriteria {
  approved: boolean[];
  accesses: AccessType[];
  ages: string[];
  features: FeatureType[];
}
