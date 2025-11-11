import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { buildImagesCacheKey } from '../src/lib/cache-keys';

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

const osmId = process.argv[2];

if (!osmId) {
  console.error('Usage: npx tsx scripts/check-and-clear-image-cache.ts <osmId>');
  console.error('Example: npx tsx scripts/check-and-clear-image-cache.ts W38026628');
  process.exit(1);
}

async function checkAndClearImageCache() {
  const cacheKey = buildImagesCacheKey({ osmId });
  console.log('🔍 Checking image cache for:', cacheKey);

  const supabase = createScriptClient();

  // Check what's in cache
  const { data, error } = await supabase
    .from('playground_images_cache')
    .select('*')
    .eq('cache_key', cacheKey)
    .single();

  if (error) {
    console.log('❌ No cache found:', error.message);
    return;
  }

  console.log('✅ Found cached images:', data.images?.length || 0);
  console.log('📅 Cached at:', new Date(data.created_at).toLocaleString());

  if (data.images) {
    let validCount = 0;
    let invalidCount = 0;

    data.images.forEach((img: any, i: number) => {
      const isValid = img.image_url.startsWith('http://') || img.image_url.startsWith('https://');
      if (isValid) validCount++;
      else invalidCount++;

      console.log(`  ${i+1}. ${isValid ? '✅' : '❌ x-raw-image'} ${img.image_url.substring(0, 70)}...`);
    });

    console.log(`\nSummary: ${validCount} valid, ${invalidCount} invalid`);

    if (invalidCount > 0) {
      // Delete the cache to force fresh fetch
      console.log('\n🗑️  Cache contains invalid URLs. Deleting to force fresh fetch...');
      const { error: deleteError } = await supabase
        .from('playground_images_cache')
        .delete()
        .eq('cache_key', cacheKey);

      if (deleteError) {
        console.log('❌ Error deleting cache:', deleteError.message);
      } else {
        console.log('✅ Cache deleted successfully');
        console.log('💡 Next API request will fetch fresh images from Google');
      }
    }
  }
}

checkAndClearImageCache();
