# 🛝 Good Playground Map

![Good Playground Map](public/thumbnail.jpg)

A modern web app to discover and share the best playgrounds for kids near you.

> **Note:** Data is still uploading, and not all areas are filled yet. You can check the DMV area as an example: [Good Playground Map - DMV Area](https://www.goodplaygroundmap.com/?south=38.8539&north=39.3606&west=-77.1673&east=-76.199)

## Features

- Interactive map to find playgrounds near you (Mapbox)
- OpenStreetMap (OSM) integration for playground discovery
- Google Maps Geocoding to convert coordinates to addresses
- Perplexity AI integration to gather playground information based on addresses
- Playground list and details with photo upload, access types, and features
- Add new playgrounds with a simple dialog
- User authentication with Supabase Auth
- Personal profile and "My Playgrounds" page for authenticated users
- Mobile-friendly and responsive design
- Playground data stored in Supabase (DB & Storage)
- Deployed on Vercel

## Tech Stack

- [Next.js](https://nextjs.org/) (React framework)
- [shadcn/ui](https://ui.shadcn.com/) (UI components)
- [Mapbox](https://www.mapbox.com/) (interactive maps)
- [OpenStreetMap](https://www.openstreetmap.org/) (playground data)
- [Google Maps Geocoding API](https://developers.google.com/maps/documentation/geocoding) (address lookup)
- [Perplexity AI](https://www.perplexity.ai/) (playground information)
- [Supabase](https://supabase.com/) (database, storage & authentication)
- [Vercel](https://vercel.com/) (deployment)
- [pnpm](https://pnpm.io/) (package manager)

## Getting Started

1. Clone the repo
2. Install dependencies with `pnpm install`
3. Set up environment variables for Supabase, Mapbox, Google Maps, and Perplexity AI (contact me for access)
    - Create a `.env.local` file in the root directory and add the following variables:
      ```bash
      NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token
      NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
      NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
      GOOGLE_MAPS_API_KEY=your_google_maps_api_key
      PERPLEXITY_API_KEY=your_perplexity_api_key
      ```
4. Run the app locally with `pnpm dev`

## Contributing

Feel free to reach out if you want to contribute or have ideas:  
**ivan.seredkin@gmail.com**
