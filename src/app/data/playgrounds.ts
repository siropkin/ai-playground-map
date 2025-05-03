"use server";

import { cache } from "react";
import { v4 as uuidv4 } from "uuid";

import { supabase as supabase } from "@/lib/supabase";
import {
  AccessType,
  MapBounds,
  OpenHours,
  Playground,
  PlaygroundPhoto,
  SurfaceType,
  PlaygroundSubmitData,
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

export async function createPlayground(
  playground: PlaygroundSubmitData,
): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    // 1. Insert playground
    console.debug(">>>> createPlayground", "insert playground", playground);
    const { data: inserted, error: insertError } = await supabase
      .from(PLAYGROUNDS_TABLE_NAME)
      .insert({
        name: playground.name,
        description: playground.description,
        latitude: playground.latitude,
        longitude: playground.longitude,
        address: playground.address,
        city: playground.city,
        state: playground.state,
        zip_code: playground.zipCode,
        age_min: playground.ageMin,
        age_max: playground.ageMax,
        open_hours: playground.openHours,
        access_type: playground.accessType,
        surface_type: playground.surfaceType,
        is_approved: false,
      })
      .select("id")
      .single();

    if (insertError) {
      console.debug(
        ">>>> createPlayground",
        "insert playground error",
        insertError,
      );
      throw insertError;
    }

    const playgroundId = inserted.id;

    // 2. Insert features
    console.debug(
      ">>>> createPlayground",
      "insert features",
      playground.features,
    );
    if (playground.features && playground.features.length > 0) {
      // Get feature IDs from names
      const { data: featureRows, error: featuresError } = await supabase
        .from("features")
        .select("id, name")
        .in("name", playground.features);

      if (featuresError) {
        console.debug(
          ">>>> createPlayground",
          "insert features error",
          featuresError,
        );
        throw featuresError;
      }

      const featureMap = new Map(featureRows.map((f) => [f.name, f.id]));
      const featureInserts = playground.features
        .filter((name) => featureMap.has(name))
        .map((name) => ({
          playground_id: playgroundId,
          feature_id: featureMap.get(name),
        }));

      if (featureInserts.length > 0) {
        console.debug(
          ">>>> createPlayground",
          "insert playground features",
          featureInserts,
        );
        const { error: pfError } = await supabase
          .from(PLAYGROUND_FEATURES_TABLE_NAME)
          .insert(featureInserts);
        if (pfError) {
          console.debug(
            ">>>> createPlayground",
            "insert playground features error",
            pfError,
          );
          throw pfError;
        }
      }
    }

    // 3. Upload photos and insert metadata
    console.debug(">>>> createPlayground", "upload photos", playground.photos);
    for (const photo of playground.photos) {
      const uuid = uuidv4();

      // Get file extension safely
      let ext = "jpg"; // Default extension
      if (photo.file && typeof photo.file === "object") {
        const fileName = (photo.file as File).name;
        if (fileName && typeof fileName === "string") {
          const parts = fileName.split(".");
          if (parts.length > 1) {
            ext = parts.pop() || ext;
          }
        }
      }

      const filename = `playground-photos/${playgroundId}/${uuid}.${ext}`;

      // Upload to Supabase Storage
      console.debug(">>>> createPlayground", "upload photo", filename);
      const { error: uploadError } = await supabase.storage
        .from("playground-photos")
        .upload(`${playgroundId}/${uuid}.${ext}`, photo.file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.debug(
          ">>>> createPlayground",
          "upload photo error",
          uploadError,
        );
        throw uploadError;
      }

      // Insert photo metadata
      console.debug(">>>> createPlayground", "insert photo metadata", filename);
      const { error: photoInsertError } = await supabase
        .from(PLAYGROUND_PHOTOS_TABLE_NAME)
        .insert({
          playground_id: playgroundId,
          filename,
          caption: photo.caption,
          is_primary: photo.isPrimary,
        });

      if (photoInsertError) {
        console.debug(
          ">>>> createPlayground",
          "insert photo metadata error",
          photoInsertError,
        );
        throw photoInsertError;
      }
    }

    return { success: true, id: playgroundId };
  } catch (error: unknown) {
    console.error("Error submitting playground:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
