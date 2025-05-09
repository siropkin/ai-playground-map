import type { AccessType, FeatureType } from "./playground";

export interface FilterCriteria {
  approvals: boolean[] | null;
  accesses: AccessType[] | null;
  ages: string[] | null;
  features: FeatureType[] | null;
}
