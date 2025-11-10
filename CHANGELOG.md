# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.0.0] - 2025-11-09

### Added - Major Features

#### Gemini 2.0 Flash AI Integration
- **Migrated from Perplexity to Google Gemini AI with tier ratings and image search**
- Upgraded to stable Gemini 2.0 Flash model with paid tier support
- Implemented robust JSON parsing for malformed Gemini API responses
- Separated image service from Gemini AI for proper architecture
- AI-powered playground information enrichment with enhanced accuracy

#### User Location & Auto-Centering
- **Implemented auto-centering geolocation with user location marker**
- User's current location displayed on map with distinct marker
- Automatically centers map on user's location on first visit
- Smart behavior: prevents auto-centering when URL parameters are present

#### Enhanced Map Features
- **Unified tier marker sizes for consistent visual appearance**
- Added playground tier legend with color scheme
- Darkened local tier color for better visibility
- Sort playground list by distance from map center for easier discovery
- Improved marker visibility and touch targets

### Improved - User Experience

#### Complete UX/UI Overhaul
- **Completely redesigned user interface with unified component architecture**
- Consistent design language across all pages and components
- Better visual hierarchy and information presentation
- Enhanced mobile responsiveness and touch interactions

#### Data Flow Optimization
- **Comprehensive data flow optimization and cache management overhaul**
- Lazy image loading with center-to-edge prioritization
- Optimized data fetching and caching strategies
- Better performance with reduced unnecessary API calls
- Implemented comprehensive cache management system

#### Console Logging
- Standardized console logging format across entire codebase
- Better debugging experience with consistent log messages
- Improved error tracking and monitoring

### Improved - Data Quality

#### Enhanced Filtering & Validation
- Filter out "Unknown" values from features and accessibility data
- Add distance validation to prevent AI from assigning incorrect playground names
- Better geographic accuracy with validation checks
- Improved data consistency and reliability

### Fixed - Bugs

#### Popup Close Button Fix
- Fixed popup close button becoming unresponsive during data enrichment
- Better state management during asynchronous operations
- Improved user interaction reliability

#### Image Display
- Removed image counter from carousel display for cleaner UI
- Optimized image loading and display
- Better handling of missing or failed images

#### Mobile Improvements
- Increased map marker sizes for better mobile touch targets
- Improved touch interaction reliability
- Better responsive behavior on small screens

### Changed - Breaking Changes

#### AI Provider Migration
- **Complete migration from Perplexity to Gemini AI**
- Removed all Perplexity references from codebase
- Updated AI prompts based on 2025 best practices
- New AI model provides better accuracy and performance

### Technical Improvements

#### Cache Management
- Added SQL scripts to clear all cache tables
- Implemented cache versioning and validation
- Better cache hit rates and performance
- Comprehensive cache clearing utilities

#### Development & Debugging
- Added comprehensive debugging scripts
- Created troubleshooting documentation
- Better developer experience with improved tooling
- Enhanced error messages and logging

#### Code Quality
- Fixed TypeScript and ESLint errors across codebase
- Better type safety and code reliability
- Improved code organization and maintainability

---

## [4.1.0] - 2025-01-09

### Changed - Accessibility Schema Simplification

#### Data Structure
- **Simplified accessibility schema from complex nested object to simple array of strings** (similar to features)
- Changed from nested structure with multiple levels (wheelchair_accessible, surface_type, sensory_friendly, etc.) to flat array of accessibility features
- Updated cache version to v7 to clear old nested object data
- Added validation to reject old v5/v6 accessibility object format

#### AI Prompt Optimization
- Updated Perplexity AI schema to accept array of accessibility feature strings
- Simplified prompt to list accessibility features found in sources instead of filling complex nested structure
- Examples: `wheelchair_accessible`, `accessible_surface`, `ramps`, `transfer_stations`, `sensory_play`, `shade_structures`, etc.
- Results in better AI response rates - consistently achieving 20/20 completeness scores (all 6 fields populated)

#### UI Updates
- Updated playground detail page to display accessibility as badges (like features) instead of complex nested display
- Updated playground preview component to show first 3 accessibility badges + count
- Simplified accessibility indicators on map cards to check array length
- More consistent UI across all playground information sections

#### Tier Calculator
- Updated to work with new array format by searching for keywords in accessibility strings
- Searches for: "wheelchair", "shade", "restroom", "sensory", "tactile", "quiet" in array items
- Maintains same scoring logic while working with simpler data structure

### Fixed - Desktop Map Popup Issues

#### Popup Race Condition
- **Fixed issue where clicking a new playground marker while popup is open would close the new popup immediately**
- Added manual popup cleanup in click handlers before state update to prevent race condition
- Prevents timing issues between React state updates and Mapbox popup behavior
- Added `preventDefault()` to click handlers to stop interfering behaviors

#### Toggle Behavior
- **Fixed issue where clicking same marker 3+ times would stop working**
- Implemented proper toggle behavior: clicking same playground marker now toggles popup on/off
- First click opens popup, second click closes it, third click opens again, etc.
- Added early return when clicking already-selected playground to properly toggle state

### Improved - Data Quality

- Accessibility data now consistently returned by AI (20/20 completeness instead of 15-17/20)
- Simpler schema is easier for AI to understand and populate
- Better validation catches geographic conflicts (e.g., "New York Avenue" in DC vs actual New York)
- Source quality tracking continues to flag suspicious domains while accepting high-quality results

---

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
