import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { buildAIInsightsCacheKey } from '../src/lib/cache-keys';

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
  console.error('Usage: npx tsx scripts/check-ai-cache.ts <osmId>');
  console.error('Example: npx tsx scripts/check-ai-cache.ts W38026628');
  process.exit(1);
}

async function checkAICache() {
  const cacheKey = buildAIInsightsCacheKey({ osmId });
  console.log('🔍 Checking AI insights cache for:', cacheKey);

  const supabase = createScriptClient();
  const { data, error } = await supabase
    .from('ai_insights_cache')
    .select('*')
    .eq('cache_key', cacheKey)
    .single();

  if (error) {
    console.log('❌ No AI insights in cache:', error.message);
  } else {
    console.log('✅ AI insights cached!');
    console.log('   Name:', data.name);
    console.log('   Tier:', data.tier);
    console.log('   Features:', data.features?.join(', ') || 'none');
    console.log('   Parking:', data.parking || 'not specified');
    console.log('   Images in AI cache:', data.images ? `YES (${data.images.length})` : 'NO');
    console.log('   Created:', new Date(data.created_at).toLocaleString());

    if (data.images && data.images.length > 0) {
      console.log('\n📷 Images in AI cache:');
      data.images.forEach((img: any, i: number) => {
        const url = img.image_url || 'unknown';
        const isValid = url.startsWith('http://') || url.startsWith('https://');
        console.log(`   ${i+1}. ${isValid ? '✅' : '❌'} ${url.substring(0, 60)}...`);
      });
    }
  }
}

checkAICache();
