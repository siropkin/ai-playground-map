import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

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
  console.error('Usage: npx tsx scripts/find-image-cache.ts <osmId>');
  console.error('Example: npx tsx scripts/find-image-cache.ts N563141627');
  process.exit(1);
}

async function findImageCache() {
  console.log('🔍 Searching for image cache entries containing:', osmId);

  const supabase = createScriptClient();

  // Search for any cache key containing the OSM ID
  const { data, error } = await supabase
    .from('playground_images_cache')
    .select('cache_key, images, created_at')
    .ilike('cache_key', `%${osmId}%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.log('❌ Error searching cache:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ No cache entries found for', osmId);
    return;
  }

  console.log(`✅ Found ${data.length} cache entry(ies):\n`);

  data.forEach((entry, idx) => {
    console.log(`Entry ${idx + 1}:`);
    console.log(`  Cache Key: ${entry.cache_key}`);
    console.log(`  Created: ${new Date(entry.created_at).toLocaleString()}`);
    console.log(`  Images: ${entry.images?.length || 0}`);

    if (entry.images && entry.images.length > 0) {
      let validCount = 0;
      let invalidCount = 0;

      entry.images.forEach((img: any, i: number) => {
        const isValid = img.image_url.startsWith('http://') || img.image_url.startsWith('https://');
        if (isValid) validCount++;
        else invalidCount++;

        if (i < 3) {
          console.log(`    ${i+1}. ${isValid ? '✅' : '❌ x-raw-image'} ${img.image_url.substring(0, 60)}...`);
        }
      });

      if (entry.images.length > 3) {
        console.log(`    ... and ${entry.images.length - 3} more`);
      }

      console.log(`  Summary: ${validCount} valid, ${invalidCount} invalid\n`);
    }
  });
}

findImageCache();
