import { readFileSync } from 'fs';
import { resolve } from 'path';

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

const playgroundName = process.argv[2];

if (!playgroundName) {
  console.error('Usage: npx tsx scripts/test-google-search.ts "Playground Name"');
  console.error('Example: npx tsx scripts/test-google-search.ts "Peixotto Playground at Corona Heights Park"');
  process.exit(1);
}

async function testGoogleSearch() {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  if (!apiKey || !cx) {
    console.error('❌ Missing GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_CX');
    process.exit(1);
  }

  console.log('🔍 Testing Google Custom Search for:', playgroundName);
  console.log('');

  // Build query similar to our production code
  const query = `"${playgroundName}" (equipment OR slide OR swing OR kids)`;
  console.log('Query:', query);
  console.log('');

  // Fetch from Google Custom Search API
  const params = new URLSearchParams({
    key: apiKey,
    cx: cx,
    q: query,
    searchType: 'image',
    num: '10',
    safe: 'active',
    imgSize: 'xxlarge',
    imgType: 'photo',
    dateRestrict: 'y3',
    sort: 'date',
  });

  const url = `https://www.googleapis.com/customsearch/v1?${params}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('❌ API Error:', data.error.message);
      return;
    }

    if (!data.items || data.items.length === 0) {
      console.log('❌ No results found');
      return;
    }

    console.log(`✅ Found ${data.items.length} results:\n`);

    data.items.forEach((item: any, i: number) => {
      const imageUrl = item.link;
      const contextUrl = item.image.contextLink;
      const title = item.title || 'No title';
      const width = item.image.width;
      const height = item.image.height;

      console.log(`${i + 1}. ${title}`);
      console.log(`   Image: ${imageUrl.substring(0, 80)}${imageUrl.length > 80 ? '...' : ''}`);
      console.log(`   Page:  ${contextUrl.substring(0, 80)}${contextUrl.length > 80 ? '...' : ''}`);
      console.log(`   Size:  ${width}x${height}px`);

      // Check if this would be filtered
      const contextLower = contextUrl.toLowerCase();
      const imageLower = imageUrl.toLowerCase();

      let wouldFilter = false;
      let reason = '';

      // Check if it starts with valid protocol
      if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
        wouldFilter = true;
        reason = 'Invalid URL format (not http/https)';
      }
      // Check excluded domains
      else if (contextLower.includes('instagram.com') || contextLower.includes('lookaside.instagram.com')) {
        wouldFilter = true;
        reason = 'Instagram (excluded domain)';
      }
      else if (contextLower.includes('facebook.com') || contextLower.includes('fbcdn.net')) {
        wouldFilter = true;
        reason = 'Facebook (excluded domain)';
      }
      else if (contextLower.includes('tiktok.com') || contextLower.includes('tiktokcdn.com')) {
        wouldFilter = true;
        reason = 'TikTok (excluded domain)';
      }
      else if (contextLower.includes('waze.com') || contextLower.includes('homes.com') ||
               contextLower.includes('apartmentlist.com') || contextLower.includes('rentcafe.com')) {
        wouldFilter = true;
        reason = 'Real estate/navigation site (excluded)';
      }

      if (wouldFilter) {
        console.log(`   🚫 FILTERED: ${reason}`);
      } else {
        console.log(`   ✅ PASSED filters`);
      }

      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testGoogleSearch();
