"use server";

import { cache } from "react";
import { supabase as supabase } from "@/lib/supabase";
import {
  AccessType,
  MapBounds,
  OpenHours,
  Playground,
  PlaygroundPhoto,
  SurfaceType,
} from "@/types/playground";
import { getFeatures } from "@/data/features";

const PLAYGROUNDS_TABLE_NAME = "playgrounds";
const PLAYGROUND_FEATURES_TABLE_NAME = "playground_features";
const PLAYGROUND_PHOTOS_TABLE_NAME = "playground_photos";

export async function getPlaygroundsForBounds(
  bounds: MapBounds,
): Promise<Playground[]> {
  try {
    const { data: playgroundsData, error: playgroundsError } = await supabase
      .from(PLAYGROUNDS_TABLE_NAME)
      .select("*")
      .eq("is_approved", true)
      .gte("latitude", bounds.south)
      .lte("latitude", bounds.north)
      .gte("longitude", bounds.west)
      .lte("longitude", bounds.east);

    if (playgroundsError) {
      throw playgroundsError;
    }

    if (!playgroundsData?.length) {
      return [];
    }

    const playgroundsMap = new Map(
      playgroundsData.map((p) => [
        p.id,
        {
          id: p.id,
          name: p.name,
          description: p.description,
          latitude: p.latitude,
          longitude: p.longitude,
          address: p.address,
          city: p.city,
          state: p.state,
          zipCode: p.zip_code,
          ageMin: p.age_min,
          ageMax: p.age_max,
          openHours: p.open_hours as OpenHours,
          accessType: p.access_type as AccessType,
          surfaceType: p.surface_type as SurfaceType,
          features: [],
          photos: [],
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        } as Playground,
      ]),
    );

    // Get all features
    const features = await getFeatures();

    // Create a map of feature IDs to names
    const featuresMap = new Map(features ? features.map((f) => [f.id, f]) : []);

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
        const feature = featuresMap.get(junction.feature_id);
        if (playground && feature) {
          playground.features.push(feature.name);
        }
      });
    }

    // Get all playground photos
    const { data: photosJunctionData, error: photosJunctionError } =
      await supabase
        .from(PLAYGROUND_PHOTOS_TABLE_NAME)
        .select("playground_id, filename, caption, is_primary, created_at")
        .in(
          "playground_id",
          playgroundsData.map((p) => p.id),
        );

    if (photosJunctionError) {
      throw photosJunctionError;
    }

    // Add photos to their respective playgrounds
    if (photosJunctionData) {
      photosJunctionData.forEach((junction) => {
        const playground = playgroundsMap.get(junction.playground_id);
        if (playground) {
          playground.photos.push({
            filename: junction.filename,
            caption: junction.caption,
            isPrimary: junction.is_primary,
            createdAt: junction.created_at,
          } as PlaygroundPhoto);
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

export const getPlaygroundById = cache(
  async (id: string): Promise<Playground | null> => {
    try {
      const { data: playgroundData, error: playgroundError } = await supabase
        .from(PLAYGROUNDS_TABLE_NAME)
        .select("*")
        .eq("id", id)
        .single();

      if (playgroundError) {
        throw playgroundError;
      }

      if (!playgroundData) {
        return null;
      }

      const playground: Playground = {
        id: playgroundData.id,
        name: playgroundData.name,
        description: playgroundData.description,
        latitude: playgroundData.latitude,
        longitude: playgroundData.longitude,
        address: playgroundData.address,
        city: playgroundData.city,
        state: playgroundData.state,
        zipCode: playgroundData.zip_code,
        ageMin: playgroundData.age_min,
        ageMax: playgroundData.age_max,
        openHours: playgroundData.open_hours as OpenHours,
        accessType: playgroundData.access_type as AccessType,
        surfaceType: playgroundData.surface_type as SurfaceType,
        features: [],
        photos: [],
        createdAt: playgroundData.created_at,
        updatedAt: playgroundData.updated_at,
      };

      // Get all features
      const features = await getFeatures();

      // Create a map of feature IDs to names
      const featuresMap = new Map(
        features ? features.map((f) => [f.id, f]) : [],
      );

      // Get playground features
      const { data: featuresJunctionData, error: featuresJunctionError } =
        await supabase
          .from(PLAYGROUND_FEATURES_TABLE_NAME)
          .select("feature_id")
          .eq("playground_id", id);

      if (featuresJunctionError) {
        throw featuresJunctionError;
      }

      // Add features to their respective playgrounds
      if (featuresJunctionData) {
        featuresJunctionData.forEach((junction) => {
          const feature = featuresMap.get(junction.feature_id);
          if (feature) {
            playground.features.push(feature.name);
          }
        });
      }

      // Get all playground photos
      const { data: photosJunctionData, error: photosJunctionError } =
        await supabase
          .from(PLAYGROUND_PHOTOS_TABLE_NAME)
          .select("filename, caption, is_primary, created_at")
          .eq("playground_id", id);

      if (photosJunctionError) {
        throw photosJunctionError;
      }

      // Add photos to their respective playgrounds
      if (photosJunctionData) {
        photosJunctionData.forEach((junction) => {
          playground.photos.push({
            filename: junction.filename,
            caption: junction.caption,
            isPrimary: junction.is_primary,
            createdAt: junction.created_at,
          } as PlaygroundPhoto);
        });
      }

      return playground;
    } catch (error) {
      console.error("Error fetching playground by ID:", error);
      return null;
    }
  },
);

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
//       .from(PLAYGROUND_PHOTOS_TABLE_NAME)
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
//         .from(PLAYGROUND_PHOTOS_TABLE_NAME)
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
//         .from(PLAYGROUND_PHOTOS_TABLE_NAME)
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
//           .from(PLAYGROUND_PHOTOS_TABLE_NAME)
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
