/**
 * Script to invalidate AI insights and images cache for specific playgrounds
 *
 * Usage:
 *   npx tsx scripts/invalidate-playground-cache.ts W969448818 W1255936512
 *   npx tsx scripts/invalidate-playground-cache.ts 969448818 1255936512
 *
 * This script will:
 * 1. Clear AI insights cache entries for the specified playgrounds
 * 2. Clear images cache entries for the specified playgrounds
 * 3. Show what was deleted
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { buildAIInsightsCacheKey, buildImagesCacheKey } from '@/lib/cache-keys';

// Load environment variables from .env.local manually
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  });
} catch (error) {
  console.warn('⚠️  Could not load .env.local file. Make sure it exists.');
}

const AI_INSIGHTS_CACHE_TABLE = process.env.AI_INSIGHTS_CACHE_TABLE_NAME || 'ai_insights_cache';
const IMAGES_CACHE_TABLE = process.env.IMAGES_CACHE_TABLE_NAME || 'images_cache';

// Create a standalone Supabase client for scripts (not dependent on Next.js cookies)
function createScriptClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Try service role key first, fall back to anon key for cache operations
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Parse OSM identifier to ensure it has the correct format (N/W/R prefix)
 */
function parseOsmId(id: string): string {
  // If already has prefix, return as-is
  if (/^[NWR]\d+$/.test(id)) {
    return id;
  }

  // If just a number, we need to determine the type
  // For now, try all three types (most common is Way for playgrounds)
  if (/^\d+$/.test(id)) {
    console.warn(`⚠️  OSM ID "${id}" has no type prefix. Will try W${id} (Way).`);
    return `W${id}`;
  }

  throw new Error(`Invalid OSM ID format: ${id}. Expected format: N123456, W123456, or R123456`);
}

/**
 * Invalidate cache for a single playground
 */
async function invalidatePlayground(osmId: string): Promise<{
  osmId: string;
  aiInsightsDeleted: number;
  imagesDeleted: number;
}> {
  const supabase = createScriptClient();

  console.log(`\n🔍 Processing playground: ${osmId}`);

  // Generate cache keys
  const aiInsightsKey = buildAIInsightsCacheKey({ osmId });
  const imagesKey = buildImagesCacheKey({ osmId });

  console.log(`   AI Insights key: ${aiInsightsKey}`);
  console.log(`   Images key: ${imagesKey}`);

  // Delete AI insights cache
  const { data: aiData, error: aiError } = await supabase
    .from(AI_INSIGHTS_CACHE_TABLE)
    .delete()
    .eq('cache_key', aiInsightsKey)
    .select();

  if (aiError) {
    console.error(`   ❌ Error deleting AI insights cache:`, aiError);
  }

  const aiDeleted = aiData?.length || 0;
  if (aiDeleted > 0) {
    console.log(`   ✅ Deleted ${aiDeleted} AI insights cache entry`);
  } else {
    console.log(`   ℹ️  No AI insights cache found`);
  }

  // Delete images cache
  const { data: imgData, error: imgError } = await supabase
    .from(IMAGES_CACHE_TABLE)
    .delete()
    .eq('cache_key', imagesKey)
    .select();

  if (imgError) {
    console.error(`   ❌ Error deleting images cache:`, imgError);
  }

  const imgDeleted = imgData?.length || 0;
  if (imgDeleted > 0) {
    console.log(`   ✅ Deleted ${imgDeleted} images cache entry`);
  } else {
    console.log(`   ℹ️  No images cache found`);
  }

  return {
    osmId,
    aiInsightsDeleted: aiDeleted,
    imagesDeleted: imgDeleted,
  };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Error: No playground IDs provided');
    console.log('\nUsage:');
    console.log('  npx tsx scripts/invalidate-playground-cache.ts W969448818 W1255936512');
    console.log('  npx tsx scripts/invalidate-playground-cache.ts 969448818 1255936512');
    process.exit(1);
  }

  console.log('🚀 Starting cache invalidation...');
  console.log(`📋 Playgrounds to process: ${args.length}`);

  const results = [];

  for (const arg of args) {
    try {
      const osmId = parseOsmId(arg);
      const result = await invalidatePlayground(osmId);
      results.push(result);
    } catch (error) {
      console.error(`\n❌ Error processing "${arg}":`, error);
      results.push({
        osmId: arg,
        aiInsightsDeleted: 0,
        imagesDeleted: 0,
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary');
  console.log('='.repeat(60));

  const totalAI = results.reduce((sum, r) => sum + r.aiInsightsDeleted, 0);
  const totalImages = results.reduce((sum, r) => sum + r.imagesDeleted, 0);

  console.log(`Total AI insights cache entries deleted: ${totalAI}`);
  console.log(`Total images cache entries deleted: ${totalImages}`);
  console.log(`Total playgrounds processed: ${results.length}`);

  console.log('\n✅ Cache invalidation complete!');
  console.log('\n💡 Next steps:');
  console.log('   1. Reload your app at http://localhost:3000');
  console.log('   2. The playgrounds will be re-enriched with fresh AI insights');
  console.log('   3. Check that the names are now correct (or null if OSM has no name)');
}

// Run the script
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
