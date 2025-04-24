"use server";

import { supabaseClient as supabase } from "@/lib/supabaseClient";
import type { MapBounds, Playground } from "@/types/types";
import { getFeatures } from "@/data/features";
import { getAgeRanges } from "@/data/ageRanges";

const PLAYGROUNDS_TABLE_NAME = "playgrounds";
const PLAYGROUND_FEATURES_TABLE_NAME = "playground_features";
const PLAYGROUND_AGE_RANGES_TABLE_NAME = "playground_age_ranges";
const PLAYGROUND_IMAGES_TABLE_NAME = "playground_images";

export async function getPlaygroundsForBounds(
  bounds: MapBounds,
): Promise<Playground[]> {
  try {
    const { data: playgroundsData, error: playgroundsError } = await supabase
      .from(PLAYGROUNDS_TABLE_NAME)
      .select("*")
      .gte("lat", bounds.south)
      .lte("lat", bounds.north)
      .gte("lng", bounds.west)
      .lte("lng", bounds.east);

    if (playgroundsError) {
      throw playgroundsError;
    }

    if (!playgroundsData?.length) {
      return [];
    }
    // Create a map to store the complete playground objects
    const playgroundsMap = new Map(
      playgroundsData.map((p) => [
        p.id,
        {
          id: p.id,
          name: p.name,
          address: p.address,
          description: p.description,
          hours: p.hours,
          ageRanges: [],
          features: [],
          access: p.access,
          images: [],
          rating: p.rating,
          reviews: p.reviews,
          location: {
            lat: p.lat,
            lng: p.lng,
          },
        } as Playground,
      ]),
    );

    // Get all features
    const ageRanges = await getAgeRanges();
    console.log("ageRanges", ageRanges);
    // Create a map of feature IDs to names
    const ageRangesMap = new Map(
      ageRanges ? ageRanges.map((ar) => [ar.id, ar.name]) : [],
    );

    // Get all playground age ranges
    const { data: ageRangesJunctionData, error: ageRangesJunctionError } =
      await supabase
        .from(PLAYGROUND_AGE_RANGES_TABLE_NAME)
        .select("playground_id, age_range_id")
        .in(
          "playground_id",
          playgroundsData.map((p) => p.id),
        );

    if (ageRangesJunctionError) {
      throw ageRangesJunctionError;
    }

    // Add age ranges to their respective playgrounds
    if (ageRangesJunctionData) {
      ageRangesJunctionData.forEach((ageRange) => {
        const playground = playgroundsMap.get(ageRange.playground_id);
        const ageRangeName = ageRangesMap.get(ageRange.age_range_id);
        if (playground && ageRangeName) {
          playground.ageRanges.push(ageRangeName);
        }
      });
    }

    // Get all features
    const features = await getFeatures();

    // Create a map of feature IDs to names
    const featuresMap = new Map(
      features ? features.map((f) => [f.id, f.name]) : [],
    );

    // Get all playground features
    const { data: featuresJunctionData, error: featuresJunctionError } =
      await supabase
        .from(PLAYGROUND_FEATURES_TABLE_NAME)
        .select("playground_id, feature_id")
        .in(
          "playground_id",
          playgroundsData.map((p) => p.id),
        );

    if (featuresJunctionError) {
      throw featuresJunctionError;
    }

    // Add features to their respective playgrounds
    if (featuresJunctionData) {
      featuresJunctionData.forEach((junction) => {
        const playground = playgroundsMap.get(junction.playground_id);
        const featureName = featuresMap.get(junction.feature_id);
        if (playground && featureName) {
          playground.features.push(featureName);
        }
      });
    }

    // Get all playground images
    const { data: imagesData, error: imagesError } = await supabase
      .from(PLAYGROUND_IMAGES_TABLE_NAME)
      .select("*")
      .in(
        "playground_id",
        playgroundsData.map((p) => p.id),
      );

    if (imagesError) {
      throw imagesError;
    }

    // Add images to their respective playgrounds
    if (imagesData) {
      imagesData.forEach((image) => {
        const playground = playgroundsMap.get(image.playground_id);
        if (playground) {
          playground.images.push(image.image_url);
        }
      });
    }

    // Convert map to array
    return Array.from(playgroundsMap.values());
  } catch (error) {
    console.error("Error filtering playgrounds:", error);
    // Return empty array on error instead of throwing
    return [];
  }
}

// export async function checkPlaygroundsDbSetup(): Promise<boolean> {
//   try {
//     const { error } = await supabase
//       .from(PLAYGROUNDS_TABLE_NAME)
//       .select("id")
//       .limit(1);
//     if (error) {
//       throw error;
//     }
//     return true;
//   } catch (error) {
//     console.error("Error checking database setup:", error);
//     return false;
//   }
// }

// export async function getPlaygrounds(): Promise<Playground[]> {
//   try {
//     const isDbSetup = await checkPlaygroundsDbSetup();
//     if (!isDbSetup) {
//       return [];
//     }
//
//     const { data: playgroundsData, error: playgroundsError } = await supabase
//       .from(PLAYGROUNDS_TABLE_NAME)
//       .select("*");
//
//     if (playgroundsError) {
//       throw playgroundsError;
//     }
//
//     const playgroundsMap = new Map(
//       playgroundsData.map((p) => [
//         p.id,
//         {
//           id: p.id,
//           name: p.name,
//           address: p.address,
//           description: p.description,
//           hours: p.hours,
//           ageRange: p.age_range,
//           access: p.access,
//           rating: p.rating,
//           reviews: p.reviews,
//           features: [],
//           images: [],
//           location: {
//             lat: p.lat,
//             lng: p.lng,
//           },
//         } as Playground,
//       ]),
//     );
//
//     // Get all playground images
//     const { data: imagesData, error: imagesError } = await supabase
//       .from(PLAYGROUND_IMAGES_TABLE_NAME)
//       .select("*")
//       .in(
//         "playground_id",
//         playgroundsData.map((p) => p.id),
//       );
//
//     if (imagesError) {
//       throw imagesError;
//     }
//
//     // Add images to their respective playgrounds
//     imagesData.forEach((image) => {
//       const playground = playgroundsMap.get(image.playground_id);
//       if (playground) {
//         playground.images.push(image.image_url);
//       }
//     });
//
//     // Get all playground features
//     const { data: featuresJunctionData, error: featuresJunctionError } =
//       await supabase
//         .from(PLAYGROUND_FEATURES_TABLE_NAME)
//         .select("playground_id, feature_id")
//         .in(
//           "playground_id",
//           playgroundsData.map((p) => p.id),
//         );
//
//     if (featuresJunctionError) throw featuresJunctionError;
//
//     // Get all features
//     const { data: featuresData, error: featuresError } = await supabase
//       .from(FEATURES_TABLE_NAME)
//       .select("*");
//
//     if (featuresError) {
//       throw featuresError;
//     }
//
//     // Create a map of feature IDs to names
//     const featureMap = new Map(featuresData.map((f) => [f.id, f.name]));
//
//     // Add features to their respective playgrounds
//     featuresJunctionData.forEach((junction) => {
//       const playground = playgroundsMap.get(junction.playground_id);
//       const featureName = featureMap.get(junction.feature_id);
//       if (
//         playground &&
//         featureName &&
//         !playground.features.includes(featureName)
//       ) {
//         playground.features.push(featureName);
//       }
//     });
//
//     return Array.from(playgroundsMap.values());
//   } catch (error) {
//     console.error("Error fetching playgrounds:", error);
//     return [];
//   }
// }
//
// export async function getPlaygroundById(
//   id: string,
// ): Promise<Playground | null> {
//   try {
//     // Get the playground
//     const { data: playground, error: playgroundError } = await supabase
//       .from(PLAYGROUNDS_TABLE_NAME)
//       .select("*")
//       .eq("id", id)
//       .single();
//
//     if (playgroundError) throw playgroundError;
//
//     // Get the playground images
//     const { data: imagesData, error: imagesError } = await supabase
//       .from(PLAYGROUND_IMAGES_TABLE_NAME)
//       .select("*")
//       .eq("playground_id", id);
//
//     if (imagesError) throw imagesError;
//
//     // Get the playground features
//     const { data: featuresJunctionData, error: featuresJunctionError } =
//       await supabase
//         .from(PLAYGROUND_FEATURES_TABLE_NAME)
//         .select("feature_id")
//         .eq("playground_id", id);
//
//     if (featuresJunctionError) throw featuresJunctionError;
//
//     // Get all features
//     const { data: featuresData, error: featuresError } = await supabase
//       .from(FEATURES_TABLE_NAME)
//       .select("*")
//       .in(
//         "id",
//         featuresJunctionData.map((f) => f.feature_id),
//       );
//
//     if (featuresError) throw featuresError;
//
//     // Construct the playground object
//     return {
//       id: playground.id,
//       name: playground.name,
//       address: playground.address,
//       description: playground.description,
//       hours: playground.hours,
//       ageRange: playground.age_range,
//       access: playground.access,
//       rating: playground.rating,
//       reviews: playground.reviews,
//       features: featuresData.map((f) => f.name),
//       images: imagesData.map((img) => img.image_url),
//       location: {
//         lat: playground.lat,
//         lng: playground.lng,
//       },
//     };
//   } catch (error) {
//     console.error("Error fetching playground:", error);
//     return null;
//   }
// }
//
// // Update the filterPlaygroundsByBounds function to handle non-JSON responses
//
// // CRUD Operations for Playgrounds
//
// export async function createPlayground(formData: PlaygroundFormData) {
//   try {
//     // Insert the playground
//     const { data: playground, error: playgroundError } = await supabase
//       .from(PLAYGROUNDS_TABLE_NAME)
//       .insert({
//         name: formData.name,
//         address: formData.address,
//         description: formData.description,
//         hours: formData.hours,
//         age_range: formData.ageRange,
//         access: formData.access,
//         rating: formData.rating || 0,
//         reviews: 0,
//         lat: formData.lat,
//         lng: formData.lng,
//       })
//       .select("id")
//       .single();
//
//     if (playgroundError) throw playgroundError;
//
//     const playgroundId = playground.id;
//
//     // Insert images if provided
//     if (formData.images && formData.images.length > 0) {
//       const imageInserts = formData.images.map((imageUrl, index) => ({
//         playground_id: playgroundId,
//         image_url: imageUrl,
//         is_primary: index === 0, // First image is primary
//       }));
//
//       const { error: imagesError } = await supabase
//         .from(PLAYGROUND_IMAGES_TABLE_NAME)
//         .insert(imageInserts);
//
//       if (imagesError) throw imagesError;
//     }
//
//     // Insert features if provided
//     if (formData.features && formData.features.length > 0) {
//       // Get feature IDs from names
//       const { data: featureData, error: featuresQueryError } = await supabase
//         .from(FEATURES_TABLE_NAME)
//         .select("id, name")
//         .in("name", formData.features);
//
//       if (featuresQueryError) throw featuresQueryError;
//
//       // Map feature names to IDs
//       const featureMap = new Map(featureData.map((f) => [f.name, f.id]));
//
//       // Create feature connections
//       const featureInserts = formData.features
//         .filter((name) => featureMap.has(name))
//         .map((name) => ({
//           playground_id: playgroundId,
//           feature_id: featureMap.get(name),
//         }));
//
//       if (featureInserts.length > 0) {
//         const { error: featureJunctionError } = await supabase
//           .from(PLAYGROUND_FEATURES_TABLE_NAME)
//           .insert(featureInserts);
//
//         if (featureJunctionError) throw featureJunctionError;
//       }
//     }
//
//     revalidatePath("/");
//     revalidatePath("/admin/playgrounds");
//
//     return { success: true, id: playgroundId };
//   } catch (error) {
//     console.error("Error creating playground:", error);
//     return { success: false, error: error.message };
//   }
// }
//
// export async function updatePlayground(
//   id: string,
//   formData: PlaygroundFormData,
// ) {
//   try {
//     // Update the playground
//     const { error: playgroundError } = await supabase
//       .from(PLAYGROUNDS_TABLE_NAME)
//       .update({
//         name: formData.name,
//         address: formData.address,
//         description: formData.description,
//         hours: formData.hours,
//         age_range: formData.ageRange,
//         access: formData.access,
//         rating: formData.rating,
//         lat: formData.lat,
//         lng: formData.lng,
//       })
//       .eq("id", id);
//
//     if (playgroundError) throw playgroundError;
//
//     // Handle images if provided
//     if (formData.images) {
//       // Delete existing images
//       const { error: deleteImagesError } = await supabase
//         .from(PLAYGROUND_IMAGES_TABLE_NAME)
//         .delete()
//         .eq("playground_id", id);
//
//       if (deleteImagesError) throw deleteImagesError;
//
//       // Insert new images
//       if (formData.images.length > 0) {
//         const imageInserts = formData.images.map((imageUrl, index) => ({
//           playground_id: id,
//           image_url: imageUrl,
//           is_primary: index === 0, // First image is primary
//         }));
//
//         const { error: imagesError } = await supabase
//           .from(PLAYGROUND_IMAGES_TABLE_NAME)
//           .insert(imageInserts);
//
//         if (imagesError) throw imagesError;
//       }
//     }
//
//     // Handle features if provided
//     if (formData.features) {
//       // Delete existing feature connections
//       const { error: deleteFeaturesError } = await supabase
//         .from(PLAYGROUND_FEATURES_TABLE_NAME)
//         .delete()
//         .eq("playground_id", id);
//
//       if (deleteFeaturesError) throw deleteFeaturesError;
//
//       // Insert new feature connections
//       if (formData.features.length > 0) {
//         // Get feature IDs from names
//         const { data: featureData, error: featuresQueryError } = await supabase
//           .from(FEATURES_TABLE_NAME)
//           .select("id, name")
//           .in("name", formData.features);
//
//         if (featuresQueryError) throw featuresQueryError;
//
//         // Map feature names to IDs
//         const featureMap = new Map(featureData.map((f) => [f.name, f.id]));
//
//         // Create feature connections
//         const featureInserts = formData.features
//           .filter((name) => featureMap.has(name))
//           .map((name) => ({
//             playground_id: id,
//             feature_id: featureMap.get(name),
//           }));
//
//         if (featureInserts.length > 0) {
//           const { error: featureJunctionError } = await supabase
//             .from(PLAYGROUND_FEATURES_TABLE_NAME)
//             .insert(featureInserts);
//
//           if (featureJunctionError) throw featureJunctionError;
//         }
//       }
//     }
//
//     revalidatePath("/");
//     revalidatePath(`/playground/${id}`);
//     revalidatePath("/admin/playgrounds");
//
//     return { success: true };
//   } catch (error) {
//     console.error("Error updating playground:", error);
//     return { success: false, error: error.message };
//   }
// }
//
// export async function deletePlayground(id: string) {
//   try {
//     // Delete the playground (cascade will handle related records)
//     const { error } = await supabase
//       .from(PLAYGROUNDS_TABLE_NAME)
//       .delete()
//       .eq("id", id);
//
//     if (error) throw error;
//
//     revalidatePath("/");
//     revalidatePath("/admin/playgrounds");
//
//     return { success: true };
//   } catch (error) {
//     console.error("Error deleting playground:", error);
//     return { success: false, error: error.message };
//   }
// }
