/**
 * Debug script to test AI enrichment for a specific playground
 *
 * Usage:
 *   npx tsx scripts/debug-ai-enrichment.ts 37.5305535 -122.2862704
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fetchGeminiInsights } from '@/lib/gemini';
import { AILocation } from '@/types/ai-insights';

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

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('❌ Error: Missing coordinates');
    console.log('\nUsage:');
    console.log('  npx tsx scripts/debug-ai-enrichment.ts <latitude> <longitude> [name]');
    console.log('\nExample:');
    console.log('  npx tsx scripts/debug-ai-enrichment.ts 37.5305535 -122.2862704');
    console.log('  npx tsx scripts/debug-ai-enrichment.ts 37.5379872 -122.3149726 "Beresford Park Playground"');
    process.exit(1);
  }

  const latitude = parseFloat(args[0]);
  const longitude = parseFloat(args[1]);
  const name = args[2];

  if (isNaN(latitude) || isNaN(longitude)) {
    console.error('❌ Error: Invalid coordinates');
    process.exit(1);
  }

  console.log('🚀 Testing AI enrichment...');
  console.log(`📍 Coordinates: ${latitude}, ${longitude}`);
  if (name) {
    console.log(`🏷️  OSM Name: "${name}"`);
  } else {
    console.log(`🏷️  OSM Name: (none)`);
  }
  console.log('');

  const location: AILocation = {
    latitude,
    longitude,
    city: 'San Mateo',
    region: 'CA',
    country: 'US',
  };

  try {
    const result = await fetchGeminiInsights({
      location,
      name,
    });

    if (!result) {
      console.log('❌ AI returned null (low confidence or error)');
      return;
    }

    console.log('✅ AI Enrichment Result:');
    console.log('');
    console.log('📊 Internal Metadata:');
    console.log(`   Confidence: ${(result as any)._locationConfidence}`);
    console.log(`   Verification: ${(result as any)._locationVerification}`);
    console.log('');
    console.log('📝 Returned Data:');
    console.log(`   Name: ${result.name || '(null)'}`);
    console.log(`   Description: ${result.description || '(null)'}`);
    console.log(`   Features: ${result.features?.join(', ') || '(null)'}`);
    console.log(`   Parking: ${result.parking || '(null)'}`);
    console.log(`   Accessibility: ${result.accessibility?.join(', ') || '(null)'}`);
    console.log(`   Tier: ${result.tier || '(null)'}`);
    console.log(`   Tier Reasoning: ${result.tier_reasoning || '(null)'}`);
    console.log(`   Sources: ${result.sources?.length || 0} URLs`);
    if (result.sources && result.sources.length > 0) {
      result.sources.forEach((source, i) => {
        console.log(`      ${i + 1}. ${source}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
