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
  console.error('Usage: npx tsx scripts/find-ai-cache.ts <osmId>');
  console.error('Example: npx tsx scripts/find-ai-cache.ts W968649121');
  process.exit(1);
}

async function findAICache() {
  console.log('🔍 Searching for AI cache entries containing:', osmId);

  const supabase = createScriptClient();

  const { data, error } = await supabase
    .from('ai_insights_cache')
    .select('cache_key, name, tier, tier_reasoning, created_at')
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
    console.log(`  Name: ${entry.name || 'null'}`);
    console.log(`  Tier: ${entry.tier || 'null'}`);
    console.log(`  Tier Reasoning: ${entry.tier_reasoning || 'null'}`);
    console.log('');
  });
}

findAICache();
