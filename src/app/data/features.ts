import { supabase as supabase } from "@/lib/supabase";
import { Feature } from "@/lib/types";

const FEATURES_TABLE_NAME = "features";

// Cache for features
let cachedFeatures: Feature[] | null = null;

// Get all features
export async function getFeatures(): Promise<Feature[]> {
  if (!!cachedFeatures?.length) {
    return cachedFeatures;
  }

  const { data: featuresData, error: featuresError } = await supabase
    .from(FEATURES_TABLE_NAME)
    .select("*")
    .order("name");

  if (featuresError) {
    console.error("Error fetching features:", featuresError);
    return [];
  }

  cachedFeatures = featuresData.map(
    (f) =>
      ({
        id: f.id,
        name: f.name,
        description: f.description,
        createdAt: f.created_at,
      }) as Feature,
  );
  return cachedFeatures;
}

// export async function createFeature(name: string) {
//   try {
//     const { error } = await supabase.from(FEATURES_TABLE_NAME).insert({ name });
//
//     if (error) throw error;
//
//     revalidatePath("/admin/features");
//
//     return { success: true };
//   } catch (error) {
//     console.error("Error creating feature:", error);
//     return { success: false, error: error.message };
//   }
// }
//
// export async function updateFeature(id: number, name: string) {
//   try {
//     const { error } = await supabase
//       .from(FEATURES_TABLE_NAME)
//       .update({ name })
//       .eq("id", id);
//
//     if (error) throw error;
//
//     revalidatePath("/admin/features");
//
//     return { success: true };
//   } catch (error) {
//     console.error("Error updating feature:", error);
//     return { success: false, error: error.message };
//   }
// }
//
// export async function deleteFeature(id: number) {
//   try {
//     const { error } = await supabase
//       .from(FEATURES_TABLE_NAME)
//       .delete()
//       .eq("id", id);
//
//     if (error) throw error;
//
//     revalidatePath("/admin/features");
//
//     return { success: true };
//   } catch (error) {
//     console.error("Error deleting feature:", error);
//     return { success: false, error: error.message };
//   }
// }
