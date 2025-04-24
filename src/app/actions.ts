"use server";

import { createServerClient } from "@/lib/supabase/server";
import type {
  Playground,
  MapBounds,
  FilterState,
  PlaygroundFormData,
} from "@/lib/types";
import { revalidatePath } from "next/cache";

const PLAYGROUNDS_TABLE_NAME = "playgrounds";
const PLAYGROUND_IMAGES_TABLE_NAME = "playground_images";
const PLAYGROUND_FEATURES_TABLE_NAME = "playground_features";
const FEATURES_TABLE_NAME = "features";

export async function checkDatabaseSetup(): Promise<boolean> {
  const supabase = createServerClient();

  try {
    const { error: playgroundsError } = await supabase
      .from(PLAYGROUNDS_TABLE_NAME)
      .select("id")
      .limit(1);
    return !playgroundsError;
  } catch (error) {
    console.error("Error checking database setup:", error);
    return false;
  }
}

export async function getPlaygrounds(): Promise<Playground[]> {
  const supabase = createServerClient();

  try {
    const isDbSetup = await checkDatabaseSetup();
    if (!isDbSetup) {
      return [];
    }

    const { data: playgroundsData, error: playgroundsError } = await supabase
      .from(PLAYGROUNDS_TABLE_NAME)
      .select("*");

    if (playgroundsError) throw playgroundsError;

    const playgroundsMap = new Map(
      playgroundsData.map((p) => [
        p.id,
        {
          id: p.id,
          name: p.name,
          address: p.address,
          description: p.description,
          hours: p.hours,
          ageRange: p.age_range,
          access: p.access,
          rating: p.rating,
          reviews: p.reviews,
          features: [],
          images: [],
          location: {
            lat: p.lat,
            lng: p.lng,
          },
        } as Playground,
      ]),
    );

    // Get all playground images
    const { data: imagesData, error: imagesError } = await supabase
      .from(PLAYGROUND_IMAGES_TABLE_NAME)
      .select("*")
      .in(
        "playground_id",
        playgroundsData.map((p) => p.id),
      );

    if (imagesError) throw imagesError;

    // Add images to their respective playgrounds
    imagesData.forEach((image) => {
      const playground = playgroundsMap.get(image.playground_id);
      if (playground) {
        playground.images.push(image.image_url);
      }
    });

    // Get all playground features
    const { data: featuresJunctionData, error: featuresJunctionError } =
      await supabase
        .from(PLAYGROUND_FEATURES_TABLE_NAME)
        .select("playground_id, feature_id")
        .in(
          "playground_id",
          playgroundsData.map((p) => p.id),
        );

    if (featuresJunctionError) throw featuresJunctionError;

    // Get all features
    const { data: featuresData, error: featuresError } = await supabase
      .from(FEATURES_TABLE_NAME)
      .select("*");

    if (featuresError) throw featuresError;

    // Create a map of feature IDs to names
    const featureMap = new Map(featuresData.map((f) => [f.id, f.name]));

    // Add features to their respective playgrounds
    featuresJunctionData.forEach((junction) => {
      const playground = playgroundsMap.get(junction.playground_id);
      const featureName = featureMap.get(junction.feature_id);
      if (
        playground &&
        featureName &&
        !playground.features.includes(featureName)
      ) {
        playground.features.push(featureName);
      }
    });

    return Array.from(playgroundsMap.values());
  } catch (error) {
    console.error("Error fetching playgrounds:", error);
    return [];
  }
}

export async function getPlaygroundById(
  id: string,
): Promise<Playground | null> {
  const supabase = createServerClient();

  try {
    // Get the playground
    const { data: playground, error: playgroundError } = await supabase
      .from(PLAYGROUNDS_TABLE_NAME)
      .select("*")
      .eq("id", id)
      .single();

    if (playgroundError) throw playgroundError;

    // Get the playground images
    const { data: imagesData, error: imagesError } = await supabase
      .from(PLAYGROUND_IMAGES_TABLE_NAME)
      .select("*")
      .eq("playground_id", id);

    if (imagesError) throw imagesError;

    // Get the playground features
    const { data: featuresJunctionData, error: featuresJunctionError } =
      await supabase
        .from(PLAYGROUND_FEATURES_TABLE_NAME)
        .select("feature_id")
        .eq("playground_id", id);

    if (featuresJunctionError) throw featuresJunctionError;

    // Get all features
    const { data: featuresData, error: featuresError } = await supabase
      .from(FEATURES_TABLE_NAME)
      .select("*")
      .in(
        "id",
        featuresJunctionData.map((f) => f.feature_id),
      );

    if (featuresError) throw featuresError;

    // Construct the playground object
    return {
      id: playground.id,
      name: playground.name,
      address: playground.address,
      description: playground.description,
      hours: playground.hours,
      ageRange: playground.age_range,
      access: playground.access,
      rating: playground.rating,
      reviews: playground.reviews,
      features: featuresData.map((f) => f.name),
      images: imagesData.map((img) => img.image_url),
      location: {
        lat: playground.lat,
        lng: playground.lng,
      },
    };
  } catch (error) {
    console.error("Error fetching playground:", error);
    return null;
  }
}

// Update the filterPlaygroundsByBounds function to handle non-JSON responses

export async function filterPlaygroundsByBounds(
  bounds: MapBounds,
  filters: FilterState,
): Promise<Playground[]> {
  const supabase = createServerClient();

  try {
    // Start with a base query for playgrounds within bounds
    let query = supabase.from(PLAYGROUNDS_TABLE_NAME).select("*");

    // Filter by map bounds
    if (bounds) {
      query = query
        .gte("lat", bounds.south)
        .lte("lat", bounds.north)
        .gte("lng", bounds.west)
        .lte("lng", bounds.east);
    }

    // Filter by access type
    if (filters.access && filters.access.length > 0) {
      query = query.in("access", filters.access);
    }

    // Execute the query
    const { data: playgroundsData, error: playgroundsError } = await query;

    if (playgroundsError) throw playgroundsError;

    // If no playgrounds match, return empty array
    if (!playgroundsData || playgroundsData.length === 0) {
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
          ageRange: p.age_range,
          access: p.access,
          rating: p.rating,
          reviews: p.reviews,
          features: [],
          images: [],
          location: {
            lat: p.lat,
            lng: p.lng,
          },
        } as Playground,
      ]),
    );

    // Get all playground images
    const { data: imagesData, error: imagesError } = await supabase
      .from(PLAYGROUND_IMAGES_TABLE_NAME)
      .select("*")
      .in(
        "playground_id",
        playgroundsData.map((p) => p.id),
      );

    if (imagesError) throw imagesError;

    // Add images to their respective playgrounds
    if (imagesData) {
      imagesData.forEach((image) => {
        const playground = playgroundsMap.get(image.playground_id);
        if (playground) {
          playground.images.push(image.image_url);
        }
      });
    }

    // Get all playground features
    const { data: featuresJunctionData, error: featuresJunctionError } =
      await supabase
        .from(PLAYGROUND_FEATURES_TABLE_NAME)
        .select("playground_id, feature_id")
        .in(
          "playground_id",
          playgroundsData.map((p) => p.id),
        );

    if (featuresJunctionError) throw featuresJunctionError;

    // Get all features
    const { data: featuresData, error: featuresError } = await supabase
      .from(FEATURES_TABLE_NAME)
      .select("*");

    if (featuresError) throw featuresError;

    // Create a map of feature IDs to names
    const featureMap = new Map(
      featuresData ? featuresData.map((f) => [f.id, f.name]) : [],
    );

    // Add features to their respective playgrounds
    if (featuresJunctionData) {
      featuresJunctionData.forEach((junction) => {
        const playground = playgroundsMap.get(junction.playground_id);
        const featureName = featureMap.get(junction.feature_id);
        if (
          playground &&
          featureName &&
          !playground.features.includes(featureName)
        ) {
          playground.features.push(featureName);
        }
      });
    }

    // Convert map to array
    const playgrounds = Array.from(playgroundsMap.values());

    // Apply client-side filtering for age ranges and features
    return playgrounds.filter((playground) => {
      // Filter by age range
      if (filters.ageRanges && filters.ageRanges.length > 0) {
        const playgroundMinAge = Number.parseInt(
          playground.ageRange.split("-")[0],
        );
        const playgroundMaxAge = Number.parseInt(
          playground.ageRange.split("-")[1],
        );

        const matchesAgeRange = filters.ageRanges.some((ageRange) => {
          if (ageRange === "0-3") return playgroundMinAge <= 3;
          if (ageRange === "4-7")
            return playgroundMinAge <= 7 && playgroundMaxAge >= 4;
          if (ageRange === "8+") return playgroundMaxAge >= 8;
          return false;
        });

        if (!matchesAgeRange) return false;
      }

      // Filter by features
      if (filters.features && filters.features.length > 0) {
        const hasAllFeatures = filters.features.every((feature) =>
          playground.features.includes(feature),
        );
        if (!hasAllFeatures) return false;
      }

      return true;
    });
  } catch (error) {
    console.error("Error filtering playgrounds:", error);
    // Return empty array on error instead of throwing
    return [];
  }
}

// CRUD Operations for Playgrounds

export async function createPlayground(formData: PlaygroundFormData) {
  const supabase = createServerClient();

  try {
    // Insert the playground
    const { data: playground, error: playgroundError } = await supabase
      .from(PLAYGROUNDS_TABLE_NAME)
      .insert({
        name: formData.name,
        address: formData.address,
        description: formData.description,
        hours: formData.hours,
        age_range: formData.ageRange,
        access: formData.access,
        rating: formData.rating || 0,
        reviews: 0,
        lat: formData.lat,
        lng: formData.lng,
      })
      .select("id")
      .single();

    if (playgroundError) throw playgroundError;

    const playgroundId = playground.id;

    // Insert images if provided
    if (formData.images && formData.images.length > 0) {
      const imageInserts = formData.images.map((imageUrl, index) => ({
        playground_id: playgroundId,
        image_url: imageUrl,
        is_primary: index === 0, // First image is primary
      }));

      const { error: imagesError } = await supabase
        .from(PLAYGROUND_IMAGES_TABLE_NAME)
        .insert(imageInserts);

      if (imagesError) throw imagesError;
    }

    // Insert features if provided
    if (formData.features && formData.features.length > 0) {
      // Get feature IDs from names
      const { data: featureData, error: featuresQueryError } = await supabase
        .from(FEATURES_TABLE_NAME)
        .select("id, name")
        .in("name", formData.features);

      if (featuresQueryError) throw featuresQueryError;

      // Map feature names to IDs
      const featureMap = new Map(featureData.map((f) => [f.name, f.id]));

      // Create feature connections
      const featureInserts = formData.features
        .filter((name) => featureMap.has(name))
        .map((name) => ({
          playground_id: playgroundId,
          feature_id: featureMap.get(name),
        }));

      if (featureInserts.length > 0) {
        const { error: featureJunctionError } = await supabase
          .from(PLAYGROUND_FEATURES_TABLE_NAME)
          .insert(featureInserts);

        if (featureJunctionError) throw featureJunctionError;
      }
    }

    revalidatePath("/");
    revalidatePath("/admin/playgrounds");

    return { success: true, id: playgroundId };
  } catch (error) {
    console.error("Error creating playground:", error);
    return { success: false, error: error.message };
  }
}

export async function updatePlayground(
  id: string,
  formData: PlaygroundFormData,
) {
  const supabase = createServerClient();

  try {
    // Update the playground
    const { error: playgroundError } = await supabase
      .from(PLAYGROUNDS_TABLE_NAME)
      .update({
        name: formData.name,
        address: formData.address,
        description: formData.description,
        hours: formData.hours,
        age_range: formData.ageRange,
        access: formData.access,
        rating: formData.rating,
        lat: formData.lat,
        lng: formData.lng,
      })
      .eq("id", id);

    if (playgroundError) throw playgroundError;

    // Handle images if provided
    if (formData.images) {
      // Delete existing images
      const { error: deleteImagesError } = await supabase
        .from(PLAYGROUND_IMAGES_TABLE_NAME)
        .delete()
        .eq("playground_id", id);

      if (deleteImagesError) throw deleteImagesError;

      // Insert new images
      if (formData.images.length > 0) {
        const imageInserts = formData.images.map((imageUrl, index) => ({
          playground_id: id,
          image_url: imageUrl,
          is_primary: index === 0, // First image is primary
        }));

        const { error: imagesError } = await supabase
          .from(PLAYGROUND_IMAGES_TABLE_NAME)
          .insert(imageInserts);

        if (imagesError) throw imagesError;
      }
    }

    // Handle features if provided
    if (formData.features) {
      // Delete existing feature connections
      const { error: deleteFeaturesError } = await supabase
        .from(PLAYGROUND_FEATURES_TABLE_NAME)
        .delete()
        .eq("playground_id", id);

      if (deleteFeaturesError) throw deleteFeaturesError;

      // Insert new feature connections
      if (formData.features.length > 0) {
        // Get feature IDs from names
        const { data: featureData, error: featuresQueryError } = await supabase
          .from(FEATURES_TABLE_NAME)
          .select("id, name")
          .in("name", formData.features);

        if (featuresQueryError) throw featuresQueryError;

        // Map feature names to IDs
        const featureMap = new Map(featureData.map((f) => [f.name, f.id]));

        // Create feature connections
        const featureInserts = formData.features
          .filter((name) => featureMap.has(name))
          .map((name) => ({
            playground_id: id,
            feature_id: featureMap.get(name),
          }));

        if (featureInserts.length > 0) {
          const { error: featureJunctionError } = await supabase
            .from(PLAYGROUND_FEATURES_TABLE_NAME)
            .insert(featureInserts);

          if (featureJunctionError) throw featureJunctionError;
        }
      }
    }

    revalidatePath("/");
    revalidatePath(`/playground/${id}`);
    revalidatePath("/admin/playgrounds");

    return { success: true };
  } catch (error) {
    console.error("Error updating playground:", error);
    return { success: false, error: error.message };
  }
}

export async function deletePlayground(id: string) {
  const supabase = createServerClient();

  try {
    // Delete the playground (cascade will handle related records)
    const { error } = await supabase
      .from(PLAYGROUNDS_TABLE_NAME)
      .delete()
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/");
    revalidatePath("/admin/playgrounds");

    return { success: true };
  } catch (error) {
    console.error("Error deleting playground:", error);
    return { success: false, error: error.message };
  }
}

// Feature Management

export async function getFeatures() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from(FEATURES_TABLE_NAME)
    .select("id, name")
    .order("name");

  if (error) {
    console.error("Error fetching features:", error);
    return [];
  }

  return data;
}

export async function createFeature(name: string) {
  const supabase = createServerClient();

  try {
    const { error } = await supabase.from(FEATURES_TABLE_NAME).insert({ name });

    if (error) throw error;

    revalidatePath("/admin/features");

    return { success: true };
  } catch (error) {
    console.error("Error creating feature:", error);
    return { success: false, error: error.message };
  }
}

export async function updateFeature(id: number, name: string) {
  const supabase = createServerClient();

  try {
    const { error } = await supabase
      .from(FEATURES_TABLE_NAME)
      .update({ name })
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/admin/features");

    return { success: true };
  } catch (error) {
    console.error("Error updating feature:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteFeature(id: number) {
  const supabase = createServerClient();

  try {
    const { error } = await supabase
      .from(FEATURES_TABLE_NAME)
      .delete()
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/admin/features");

    return { success: true };
  } catch (error) {
    console.error("Error deleting feature:", error);
    return { success: false, error: error.message };
  }
}
