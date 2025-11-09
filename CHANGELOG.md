# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0] - 2025-01-09

### Added - Major Features

#### Playground Tier System (Michelin-Star Style Rating)
- Implemented 3-tier rating system: Neighborhood, Gem 💎, and Star ⭐
- Automatic tier calculation based on features, amenities, accessibility, and unique characteristics
- Tier badges displayed on cards, maps, and detail pages
- Color-coded map markers by tier (amber for Star, purple for Gem, default for Neighborhood)
- "Why This Is Special" section on detail pages explaining tier reasoning

#### Enhanced Accessibility Features
- Comprehensive accessibility data collection including:
  - Wheelchair access details
  - Surface types (rubber, wood fiber, etc.)
  - Transfer stations and ground-level activities
  - Sensory-friendly features (quiet zones, tactile elements, visual aids)
  - Shade coverage information
  - Accessible parking and restrooms with adult changing tables
- Visual accessibility indicators on playground cards
- Detailed accessibility section on playground detail pages

#### Nearby Playgrounds (Airbnb-Style)
- Added nearby playgrounds visualization on detail page maps
- Interactive markers with hover tooltips
- Click to navigate to nearby playground details
- 2km radius search with smart filtering

### Improved - User Experience

#### Map Interactions
- Smart popup positioning to avoid sidebar overlap
- Popup header with title, tier badge, and close button
- Max height constraint with scrolling for long content
- Reduced marker sizes for cleaner map appearance (Star: 8px, Gem: 7px, Neighborhood: 6px)
- Consistent marker styling across main and detail view maps
- Desktop popups show full playground preview on marker click
- Faster map fly animations when centering on playgrounds

#### Mobile Experience
- Optimized popup spacing between title and image
- Better mobile sheet height for improved map visibility
- Swipe gesture support for image carousel
- Fixed badge overflow on mobile screens
- Improved touch interactions for playground cards

#### Playground Cards & Lists
- Enhanced card layout with better visual hierarchy
- Accessibility and parking indicators with icons
- "View Details" button with arrow icon for clarity
- Better spacing and alignment across all screen sizes
- Improved "No image" state with nature-inspired gradient
- Fixed "Thinking..." loading state styling

#### Detail Pages
- Redesigned playground detail page for visual consistency
- Integrated tier badges inline with titles
- Enhanced "Why This Is Special" section with proper icon alignment
- Better button positioning and alignment
- AI disclaimer moved to bottom for better content flow
- Comprehensive accessibility and parking information sections

### Improved - Performance & Data Quality

#### AI Enrichment Optimization
- Detail pages now request high-priority enrichment with images
- Cache-first strategy for faster loading of previously viewed playgrounds
- Batch enrichment with intelligent prioritization
- Geographic constraint validation (0.1-mile radius) for accuracy
- Location confidence scoring to prevent wrong-location data
- Comprehensive result validation and quality scoring
- Smart image filtering to remove low-quality photos:
  - Filters out stock photos, signs, parking lots, maps
  - Removes text-heavy images and UI screenshots
  - Size and aspect ratio validation
  - Trusted domain boosting for quality sources

#### Caching & Database
- OSM cache with deduplication and TTL management
- Perplexity insights cache with schema versioning
- Support for both OSM ID and coordinate-based cache keys
- Fixed cache clearing for Way/Relation playgrounds
- Batch geocoding optimization for cache misses
- Comprehensive RLS policies for Supabase

#### API & Data Handling
- Optimized OSM API usage with smart caching
- Batch reverse geocoding for multiple playgrounds
- Request deduplication to prevent duplicate API calls
- Rate limiting for Perplexity API
- Abort controller logic to prevent race conditions
- Better error handling and null checks throughout

### Improved - SEO & Metadata

- Comprehensive SEO optimizations
- Dynamic sitemap generation for all playgrounds
- Structured data (JSON-LD) for rich search results
- Open Graph tags for social media sharing
- Twitter Card support
- Proper meta descriptions and titles
- PWA manifest with all required icon sizes

### Fixed - Bugs

#### Data & State Management
- Fixed OSM cache double-stringification causing map errors
- Fixed enrichment state when Perplexity returns null insights
- Fixed flash of "No playgrounds found" on initial load
- Fixed popup not updating when playground enrichment completes
- Prevented state updates on unmounted components
- Fixed playground detail page 404 for Way and Relation OSM types
- Fixed image loading for Way/Relation playgrounds using correct cache key

#### UI & Styling
- Fixed View Details button positioning in cards and popups
- Fixed close button visibility and positioning in map popups
- Fixed disclaimer vertical alignment on detail pages
- Fixed navbar button styling consistency
- Fixed accessibility warnings in mobile playground sheet
- Fixed badge positioning and alignment issues
- Fixed PostgreSQL policy syntax errors

### Changed - Breaking Changes

- Default playground name changed from "Unnamed Playground" to "Local Playground"
- Removed AI badge from cards for cleaner UI
- Hidden login/logout buttons (admin login route only)
- Renamed "Buy me a coffee" to "Support" button
- Site description updated to be more user-focused
- Removed Google Maps API in favor of Mapbox

### Changed - Internal

- Added comprehensive project documentation (PROJECT.md)
- Enforced pnpm package manager usage
- Cleaned up unused code and consolidated duplicate logic
- Refactored magic numbers to named constants
- Improved code organization and structure
- Enhanced logging for debugging
- Added Claude Code settings configuration
- Removed Claude Code local settings from git tracking

### Security

- Updated Next.js and dependencies to fix security vulnerabilities
- Implemented proper RLS policies for database tables
- Added security headers and CORS protection

---

## [3.2.1] - 2024-12-XX

### Fixed
- Security vulnerabilities by updating Next.js and dependencies
- Cache clearing for Way/Relation playgrounds
- Image loading for Way/Relation playgrounds
- Playground detail page 404 errors for Way and Relation OSM types

---

_For versions prior to 3.2.1, please refer to git commit history._
