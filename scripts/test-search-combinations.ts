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

const playgroundName = 'Beresford Park Playground';
const city = 'San Mateo';
const region = 'CA';

interface SearchCombination {
  name: string;
  query: string;
  params: Record<string, string>;
}

const combinations: SearchCombination[] = [
  {
    name: '1. Full name + city + state in quotes',
    query: `"${playgroundName}" "${city}, ${region}"`,
    params: {
      imgSize: 'large',
      imgType: 'photo',
      dateRestrict: 'y3',
    }
  },
  {
    name: '2. Full name + city (no state)',
    query: `"${playgroundName}" "${city}"`,
    params: {
      imgSize: 'large',
      imgType: 'photo',
      dateRestrict: 'y3',
    }
  },
  {
    name: '3. Short name + city',
    query: `"Beresford Park" "${city}"`,
    params: {
      imgSize: 'large',
      imgType: 'photo',
      dateRestrict: 'y3',
    }
  },
  {
    name: '4. Name + city + playground keyword',
    query: `"Beresford Park" "${city}" playground`,
    params: {
      imgSize: 'large',
      imgType: 'photo',
      dateRestrict: 'y3',
    }
  },
  {
    name: '5. Name + city + equipment keywords',
    query: `"Beresford Park" "${city}" (slide OR swing OR climbing)`,
    params: {
      imgSize: 'large',
      imgType: 'photo',
      dateRestrict: 'y3',
    }
  },
  {
    name: '6. Current approach (name + location + equipment)',
    query: `"${playgroundName}" "${city}, ${region}" ${city} (equipment OR slide OR swing OR kids)`,
    params: {
      imgSize: 'large',
      imgType: 'photo',
      dateRestrict: 'y3',
    }
  },
  {
    name: '7. Any size + recent (y1)',
    query: `"${playgroundName}" "${city}"`,
    params: {
      imgSize: 'medium',
      imgType: 'photo',
      dateRestrict: 'y1',
    }
  },
  {
    name: '8. No date restriction',
    query: `"${playgroundName}" "${city}"`,
    params: {
      imgSize: 'large',
      imgType: 'photo',
    }
  },
  {
    name: '9. Simple: just name + city',
    query: `Beresford Park Playground San Mateo`,
    params: {
      imgSize: 'large',
      imgType: 'photo',
    }
  },
  {
    name: '10. Address-based search',
    query: `"2720 Alameda de las Pulgas" playground`,
    params: {
      imgSize: 'large',
      imgType: 'photo',
      dateRestrict: 'y3',
    }
  },
];

async function testCombination(combo: SearchCombination, index: number) {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY || process.env.GEMINI_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  if (!apiKey || !cx) {
    console.error('❌ Missing API credentials');
    return;
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`${combo.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Query: ${combo.query}`);
  console.log(`Params: ${JSON.stringify(combo.params)}\n`);

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', cx);
  url.searchParams.set('q', combo.query);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('num', '5');
  url.searchParams.set('safe', 'active');

  Object.entries(combo.params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.error) {
      console.error('❌ API Error:', data.error.message);
      return;
    }

    if (!data.items || data.items.length === 0) {
      console.log('❌ No results found\n');
      return;
    }

    console.log(`✅ Found ${data.items.length} results:\n`);

    data.items.forEach((item: any, i: number) => {
      const title = item.title || 'No title';
      const contextUrl = item.image.contextLink;
      const imageUrl = item.link;
      const width = item.image.width;
      const height = item.image.height;

      console.log(`${i + 1}. ${title.substring(0, 70)}`);
      console.log(`   Page:  ${contextUrl}`);
      console.log(`   Image: ${imageUrl}`);
      console.log(`   Size:  ${width}x${height}px`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Small delay to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 500));
}

async function runAllTests() {
  console.log('\n🔍 TESTING DIFFERENT SEARCH COMBINATIONS FOR BERESFORD PARK PLAYGROUND\n');
  console.log('Testing playground: Beresford Park Playground');
  console.log('Location: San Mateo, CA');
  console.log('Address: 2720 Alameda de las Pulgas\n');

  for (let i = 0; i < combinations.length; i++) {
    await testCombination(combinations[i], i);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ All tests complete!');
  console.log(`${'='.repeat(80)}\n`);
  console.log('Please review the results above and let me know which combination');
  console.log('produced the best/most relevant images for the playground.\n');
}

runAllTests();
