import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { buildAIInsightsCacheKey, buildImagesCacheKey } from '../src/lib/cache-keys';

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
  console.error('Usage: npx tsx scripts/invalidate-cache.ts <osmId>');
  console.error('Example: npx tsx scripts/invalidate-cache.ts W38026628');
  process.exit(1);
}

async function invalidateCache() {
  const supabase = createScriptClient();

  console.log('🗑️  Invalidating all cache for:', osmId);
  console.log('');

  // Invalidate AI insights cache
  const aiCacheKey = buildAIInsightsCacheKey({ osmId });
  console.log('1. AI Insights Cache:', aiCacheKey);

  const { error: aiError } = await supabase
    .from('ai_insights_cache')
    .delete()
    .eq('cache_key', aiCacheKey);

  if (aiError) {
    if (aiError.code === 'PGRST116') {
      console.log('   ℹ️  No AI insights cache found');
    } else {
      console.log('   ❌ Error:', aiError.message);
    }
  } else {
    console.log('   ✅ Deleted AI insights cache');
  }

  // Invalidate images cache
  const imagesCacheKey = buildImagesCacheKey({ osmId });
  console.log('');
  console.log('2. Images Cache:', imagesCacheKey);

  const { error: imagesError } = await supabase
    .from('playground_images_cache')
    .delete()
    .eq('cache_key', imagesCacheKey);

  if (imagesError) {
    if (imagesError.code === 'PGRST116') {
      console.log('   ℹ️  No images cache found');
    } else {
      console.log('   ❌ Error:', imagesError.message);
    }
  } else {
    console.log('   ✅ Deleted images cache');
  }

  console.log('');
  console.log('✅ Cache invalidation complete!');
  console.log('💡 Next API request will fetch fresh data');
}

invalidateCache();
