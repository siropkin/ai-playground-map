import { supabaseClient as supabase } from "@/lib/supabaseClient";
import { AgeRange } from "@/types/types";

const AGE_RANGES_TABLE_NAME = "age_ranges";

// Cache for age ranges
let cachedAgeRanges: AgeRange[] | null = null;

// Get all age ranges
export async function getAgeRanges(): Promise<AgeRange[]> {
  if (!!cachedAgeRanges?.length) {
    return cachedAgeRanges;
  }

  const { data: ageRangesData, error: ageRangesError } = await supabase
    .from(AGE_RANGES_TABLE_NAME)
    .select("id, name")
    .order("name");

  if (ageRangesError) {
    console.error("Error fetching features:", ageRangesError);
    return [];
  }

  cachedAgeRanges = ageRangesData;
  return ageRangesData;
}
