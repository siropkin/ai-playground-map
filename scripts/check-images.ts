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
  console.error('Usage: npx tsx scripts/check-images.ts <osmId>');
  console.error('Example: npx tsx scripts/check-images.ts W38898763');
  process.exit(1);
}

async function checkImages() {
  const cacheKey = buildImagesCacheKey({ osmId });
  console.log('🔍 Checking images cache for:', cacheKey);

  const supabase = createScriptClient();
  const { data, error } = await supabase
    .from('playground_images_cache')
    .select('*')
    .eq('cache_key', cacheKey)
    .single();

  if (error) {
    console.log('❌ No images in cache:', error.message);
  } else {
    console.log('✅ Images found:', data.images?.length || 0, 'images');
    console.log('📅 Cached at:', new Date(data.created_at).toLocaleString());
    if (data.images) {
      data.images.forEach((img: any, i: number) => {
        console.log(`  ${i+1}. ${img.image_url}`);
      });
    }
  }
}

checkImages();
