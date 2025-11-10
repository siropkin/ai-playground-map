# 🛝 Good Playground Map

![Good Playground Map](public/thumbnail_home.png)

**Discover the perfect playground near you with an AI-powered map that transforms basic pins into rich, detailed profiles.**

Good Playground Map isn't just another map app. It's a comprehensive discovery tool that leverages a revolutionary data pipeline:

✨ **OpenStreetMap's global playground data** → **Google Gemini AI with web search grounding** → **Google Custom Search for images** → **Detailed, actionable playground profiles**

This intelligent combination of open data and AI automatically researches and presents detailed information about each playground using geographically-aware AI search with real-time web data and relevant images, making your search for the perfect play spot easier and more informed.

## 🤔 Why Good Playground Map?

Finding a great playground can be time-consuming. Standard maps might show a pin, but they often lack crucial details: What equipment is there? Is it suitable for toddlers? Is parking available?

Good Playground Map solves this by:

- **Automating Research:** No more manual searching across multiple websites.
- **Providing Rich Details:** Get AI-generated summaries, features, and potentially even user-uploaded photos.
- **Centralizing Information:** Everything you need to know in one place.

## 💡 The Magic Behind It: Intelligent Data Enrichment

What makes this app unique is its **intelligent data enrichment pipeline**:

1.  **Discovery**: Pulls playground locations from OpenStreetMap's vast global database, including coordinates and structured address data.
2.  **Geographic AI Search**: Leverages Google Gemini 2.0 Flash with web search grounding, passing precise coordinates and regional context to search the entire web for real-time playground information.
3.  **Visual Context**: Uses Google Custom Search API to automatically find relevant playground images with built-in quality and safety filters.
4.  **Rich Information**: Automatically generates comprehensive playground profiles with AI-verified descriptions, features, parking information, and curated images based on real web data from the playground's geographic area.

This streamlined process transforms simple map markers into comprehensive resources with minimal API overhead, leveraging Google's powerful search infrastructure for superior accuracy and freshness.

## ✨ Features

- **Intelligent Data Pipeline**:
- OpenStreetMap integration for global playground discovery with built-in address data.
- Google Gemini 2.0 Flash with web search grounding for automated, location-aware playground research.
- Google Custom Search API for high-quality, relevant playground images.
- **Interactive Exploration**:
- Responsive Mapbox-powered map interface.
- Searchable playground listings with filtering capabilities.
- Detailed playground profiles with AI-generated info, (and eventually) photos and features.
- **[In The Future] Community Tools**:
- Easily add missing playgrounds via a simple dialog.
- Upload photos of playgrounds you visit.
- Personal profile with "My Playgrounds" for saving favorites.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **UI**: [shadcn/ui](https://ui.shadcn.com/)
- **Maps**: [Mapbox](https://www.mapbox.com/)
- **Data Sources**:
- [OpenStreetMap](https://www.openstreetmap.org/) (Playground locations and address data via Nominatim)
- [Google Gemini](https://ai.google.dev/) (AI-powered location-aware information with web search grounding)
- [Google Custom Search](https://developers.google.com/custom-search) (High-quality playground images)
- **Backend & Auth**: [Supabase](https://supabase.com/) (Database, Storage, Authentication)
- **Deployment**: [Vercel](https://vercel.com/)
- **Package Manager**: [pnpm](https://pnpm.io/)

## 🚀 Getting Started

Follow these steps to set up the project locally:

1. Clone the repository.
2. Install dependencies using **pnpm** (required):
   ```bash
   pnpm install
   ```
   > ⚠️ **Important**: This project uses pnpm as its package manager. Using npm or yarn may cause issues. The package manager is enforced via `packageManager` field in package.json.
3. Set up environment variables:

   - Create a `.env.local` file in the root directory and add the following variables:

     ```bash
     # Secrets
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
     NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token

     # Google Gemini Config (AI text enrichment with web search)
     GEMINI_API_KEY=your_gemini_api_key
     # Using gemini-2.0-flash - stable model with high rate limits (2,000 RPM on paid tier)
     # Alternative models: gemini-1.5-flash-latest, gemini-1.5-pro-latest
     GEMINI_MODEL=gemini-2.0-flash
     GEMINI_TEMPERATURE=0.2

     # Google Custom Search API for Images
     # Free tier: 100 queries/day, then $5 per 1000 queries
     # Get CX ID from: https://programmablesearchengine.google.com/
     GOOGLE_SEARCH_CX=your_search_engine_id
     GOOGLE_SEARCH_API_KEY=your_custom_search_api_key

     # OSM Config
     OSM_QUERY_TIMEOUT=25
     OSM_QUERY_LIMIT=100

     # Cache Config
     AI_INSIGHTS_CACHE_TTL_MS=31536000000
     AI_INSIGHTS_CACHE_TABLE_NAME=ai_insights_cache
     ```

4. Run the app locally:
   ```bash
    pnpm dev
   ```

## Contributing

Feel free to reach out if you want to contribute or have ideas:
**ivan.seredkin@gmail.com**

## 💰 Project Costs & Support

To run this project, I use:
- **Google Gemini API** for AI-powered playground research (paid tier: 2,000 RPM with gemini-2.0-flash)
- **Google Custom Search API** for high-quality images (free tier: 100 queries/day, then $5 per 1000 queries)

All costs are paid out of my own pocket to keep this resource free for everyone.

The project leverages free and open-source data from OpenStreetMap and Nominatim, keeping infrastructure costs minimal while maintaining high-quality, real-time results.

If you like the project and want it to keep running and improving, please consider supporting me with a coffee!

## ☕ Buy Me A Coffee

<a href="https://buymeacoffee.com/ivan.seredkin" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

Your support helps cover API costs and enables continued development of this free resource. Thank you!
