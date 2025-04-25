import { supabase as supabase } from "@/lib/supabase";
import { PlaygroundAge } from "@/types/types";

const AGES_TABLE_NAME = "ages";

// Cache for ages
let cachedAges: PlaygroundAge[] | null = null;

// Get all age ranges
export async function getAges(): Promise<PlaygroundAge[]> {
  if (!!cachedAges?.length) {
    return cachedAges;
  }

  const { data: agesData, error: agesError } = await supabase
    .from(AGES_TABLE_NAME)
    .select("id, name")
    .order("name");

  if (agesError) {
    console.error("Error fetching ages:", agesError);
    return [];
  }

  cachedAges = agesData;
  return agesData;
}
