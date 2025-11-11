import { readFileSync } from 'fs';
import { resolve } from 'path';
import { searchImages, buildPlaygroundImageQuery } from '../src/lib/google-image-search';

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

async function testImageSearchScoring() {
  const query = buildPlaygroundImageQuery({
    name: 'Beresford Park Playground',
    city: 'San Mateo',
    region: 'CA',
    country: 'US'
  });

  console.log('Query:', query);
  console.log('');

  const results = await searchImages(query, {
    maxResults: 10,
    city: 'San Mateo'
  });

  console.log(`Found ${results.length} images:\n`);
  results.forEach((img, i) => {
    console.log(`${i+1}. Score: ${img.score} - ${img.title?.substring(0, 60)}`);
    console.log(`   Page: ${img.origin_url.substring(0, 80)}`);
    console.log(`   Image: ${img.image_url.substring(0, 80)}`);
    console.log('');
  });
}

testImageSearchScoring();
