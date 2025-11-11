import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { generateOSMCacheKey } from '../src/lib/osm-cache';

// Load environment variables
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
  console.warn('⚠️  Could not load .env.local file.');
}

function createScriptClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
}

// Parse bounds from command line
const boundsArg = process.argv[2];

if (!boundsArg) {
  console.error('Usage: npx tsx scripts/clear-area-cache.ts "south=37.74&north=37.78&west=-122.47&east=-122.41&zoom=13.5"');
  process.exit(1);
}

const params = new URLSearchParams(boundsArg);
const bounds: Bounds = {
  south: parseFloat(params.get('south') || '0'),
  north: parseFloat(params.get('north') || '0'),
  east: parseFloat(params.get('east') || '0'),
  west: parseFloat(params.get('west') || '0'),
  zoom: parseFloat(params.get('zoom') || '0'),
};

if (!bounds.south || !bounds.north || !bounds.east || !bounds.west || !bounds.zoom) {
  console.error('❌ Invalid bounds. All parameters required: south, north, east, west, zoom');
  process.exit(1);
}

async function clearAreaCache() {
  const supabase = createScriptClient();

  console.log('🗑️  Clearing all cache for area:');
  console.log(`   South: ${bounds.south}`);
  console.log(`   North: ${bounds.north}`);
  console.log(`   West: ${bounds.west}`);
  console.log(`   East: ${bounds.east}`);
  console.log(`   Zoom: ${bounds.zoom}`);
  console.log('');

  // 1. Clear OSM cache for this exact area
  const osmCacheKey = generateOSMCacheKey(bounds, bounds.zoom);
  console.log('1. OSM Cache:', osmCacheKey);

  const { error: osmError } = await supabase
    .from('osm_cache')
    .delete()
    .eq('cache_key', osmCacheKey);

  if (osmError) {
    if (osmError.code === 'PGRST116') {
      console.log('   ℹ️  No OSM cache found for this exact area');
    } else {
      console.log('   ❌ Error:', osmError.message);
    }
  } else {
    console.log('   ✅ Deleted OSM cache for area');
  }

  // 2. Get all AI insights cache entries (to find OSM IDs in the area)
  console.log('');
  console.log('2. AI Insights Cache (all versions)');

  const { data: aiData, error: aiListError } = await supabase
    .from('ai_insights_cache')
    .select('cache_key');

  if (aiListError) {
    console.log('   ❌ Error listing AI cache:', aiListError.message);
  } else if (aiData && aiData.length > 0) {
    console.log(`   Found ${aiData.length} AI cache entries total`);

    // Delete all AI insights cache (all versions, all playgrounds)
    const { error: aiDeleteError, count } = await supabase
      .from('ai_insights_cache')
      .delete({ count: 'exact' })
      .neq('cache_key', ''); // Delete all non-empty keys (i.e., all rows)

    if (aiDeleteError) {
      console.log('   ❌ Error deleting AI cache:', aiDeleteError.message);
    } else {
      console.log(`   ✅ Deleted ${count || 0} AI insights cache entries`);
    }
  } else {
    console.log('   ℹ️  No AI insights cache found');
  }

  // 3. Clear all images cache
  console.log('');
  console.log('3. Images Cache (all versions)');

  const { data: imagesData, error: imagesListError } = await supabase
    .from('playground_images_cache')
    .select('cache_key');

  if (imagesListError) {
    console.log('   ❌ Error listing images cache:', imagesListError.message);
  } else if (imagesData && imagesData.length > 0) {
    console.log(`   Found ${imagesData.length} images cache entries total`);

    // Delete all images cache
    const { error: imagesDeleteError, count } = await supabase
      .from('playground_images_cache')
      .delete({ count: 'exact' })
      .neq('cache_key', ''); // Delete all non-empty keys (i.e., all rows)

    if (imagesDeleteError) {
      console.log('   ❌ Error deleting images cache:', imagesDeleteError.message);
    } else {
      console.log(`   ✅ Deleted ${count || 0} images cache entries`);
    }
  } else {
    console.log('   ℹ️  No images cache found');
  }

  console.log('');
  console.log('✅ Cache clearing complete!');
  console.log('💡 Next requests will fetch fresh data with updated filters');
  console.log('   - No x-raw-image URLs');
  console.log('   - No Instagram/Facebook/TikTok images');
}

clearAreaCache();
