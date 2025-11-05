# 🛝 Good Playground Map

![Good Playground Map](public/thumbnail_home.png)

**Discover the perfect playground near you with an AI-powered map that transforms basic pins into rich, detailed profiles.**

Good Playground Map isn't just another map app. It's a comprehensive discovery tool that leverages a revolutionary data pipeline:

✨ **OpenStreetMap's global playground data** → **Perplexity AI location-based research** → **Detailed, actionable playground profiles**

This intelligent combination of open data and AI automatically researches and presents detailed information about each playground using geographically-aware AI search, making your search for the perfect play spot easier and more informed.

## 🤔 Why Good Playground Map?

Finding a great playground can be time-consuming. Standard maps might show a pin, but they often lack crucial details: What equipment is there? Is it suitable for toddlers? Is parking available?

Good Playground Map solves this by:

- **Automating Research:** No more manual searching across multiple websites.
- **Providing Rich Details:** Get AI-generated summaries, features, and potentially even user-uploaded photos.
- **Centralizing Information:** Everything you need to know in one place.

## 💡 The Magic Behind It: Intelligent Data Enrichment

What makes this app unique is its **intelligent data enrichment pipeline**:

1.  **Discovery**: Pulls playground locations from OpenStreetMap's vast global database, including coordinates and structured address data.
2.  **Geographic AI Search**: Leverages Perplexity AI's native location-based search capabilities, passing precise coordinates and regional context directly to the AI search engine.
3.  **Rich Information**: Automatically generates comprehensive playground profiles with descriptions, features, parking information, and images based on real web data from the playground's geographic area.

This streamlined process transforms simple map markers into comprehensive resources with minimal API overhead, offering a superior user experience at lower cost.

## ✨ Features

- **Intelligent Data Pipeline**:
- OpenStreetMap integration for global playground discovery with built-in address data.
- Perplexity AI with native geolocation support for automated, location-aware playground research.
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
- [Perplexity AI](https://www.perplexity.ai/) (Location-aware information enhancement)
- **Backend & Auth**: [Supabase](https://supabase.com/) (Database, Storage, Authentication)
- **Deployment**: [Vercel](https://vercel.com/)
- **Package Manager**: [pnpm](https://pnpm.io/)

## 🚀 Getting Started

Follow these steps to set up the project locally:

1. Clone the repository.
2. Install dependencies:
   ```bash
    pnpm install
   ```
3. Set up environment variables:

   - Create a `.env.local` file in the root directory and add the following variables:

     ```bash
     # Secrets
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
     NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
     PERPLEXITY_API_KEY=your_perplexity_api_key

     # OSM Config
     OSM_QUERY_TIMEOUT=25
     OSM_QUERY_LIMIT=100

     # Perplexity Config
     PERPLEXITY_MODEL=sonar-pro
     PERPLEXITY_TEMPERATURE=0.2
     PERPLEXITY_SEARCH_CONTEXT_SIZE=medium
     # Optional Perplexity filters
     # Use for domain-specific search (e.g., "sec" for SEC filings)
     PERPLEXITY_SEARCH_DOMAIN=
     # ISO date to filter by latest page update timestamp
     PERPLEXITY_LATEST_UPDATED=

     # Cache Config
     PERPLEXITY_CACHE_TTL_MS=31536000000
     PERPLEXITY_INSIGHTS_CACHE_TABLE_NAME=perplexity_insights_cache
     ```

4. Run the app locally:
   ```bash
    pnpm dev
   ```

## Contributing

Feel free to reach out if you want to contribute or have ideas:
**ivan.seredkin@gmail.com**

## 💰 Project Costs & Support

To run this project, I use the Perplexity AI API which costs approximately $0.01-0.015 per playground enrichment. All costs are paid out of my own pocket to keep this resource free for everyone.

The project leverages free and open-source data from OpenStreetMap and Nominatim, keeping infrastructure costs minimal while maintaining high-quality results.

If you like the project and want it to keep running and improving, please consider supporting me with a coffee!

## ☕ Buy Me A Coffee

<a href="https://buymeacoffee.com/ivan.seredkin" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a>

Your support helps cover API costs and enables continued development of this free resource. Thank you!
