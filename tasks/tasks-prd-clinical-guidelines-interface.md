# Task List: Clinical Guidelines Interface Implementation

Based on PRD: `prd-clinical-guidelines-interface.md`

## Relevant Files
- `src/components/layout/GlassSidebar.tsx` - Main sidebar navigation component that needs Guidelines tab (✓ Added Guidelines item)
- `src/app/guidelines/page.tsx` - New Guidelines page component (✓ Created)
- `src/components/guidelines/GuidelinesTab.tsx` - Main guidelines interface component
- `src/components/guidelines/SpecialtyFilter.tsx` - Specialty organization and filtering component (✓ Created with glassmorphic panels)
- `src/components/guidelines/SourceFilter.tsx` - Multi-select source filtering dropdown
- `src/components/guidelines/GuidelineCard.tsx` - Individual guideline display card
- `src/components/guidelines/GuidelineModal.tsx` - Modal for viewing full guideline content
- `src/components/guidelines/GuidelineSearch.tsx` - Search functionality within guidelines
- `src/components/advisor/SpecialtyDropdown.tsx` - Medical advisor specialty filter
- `src/components/advisor/GuidelineReferences.tsx` - Display referenced guidelines in advisor responses
- `src/components/ui/SearchResults.tsx` - Enhanced search results with categorization
- `src/hooks/useGuidelines.tsx` - Custom hook for guidelines data management (✓ Created)
- `src/hooks/useBookmarks.tsx` - Custom hook for bookmark/favorites functionality (✓ Created)
- `src/services/guidelines/guidelineUIService.ts` - Service for UI-specific guideline operations (✓ Created)
- `src/types/guidelines.ts` - TypeScript types for guidelines interface (✓ Enhanced with UI types)
- `src/styles/guidelines.css` - Guidelines-specific styling and themes
- `src/app/api/guidelines/bookmarks/route.ts` - API route for bookmark management (✓ Created)
- `src/app/api/search/enhanced/route.ts` - Enhanced search API with categorization (✓ Created)

## Tasks

- [x] 1.0 Core Infrastructure & Backend Integration
  - [x] 1.1 Create TypeScript types for guidelines UI components and state management
  - [x] 1.2 Implement guideline UI service layer for frontend operations
  - [x] 1.3 Create custom hooks for guidelines data management and state
  - [x] 1.4 Set up bookmarks/favorites backend API endpoints
  - [x] 1.5 Implement enhanced search API with categorization support

- [ ] 2.0 Guidelines Tab Implementation  
  - [x] 2.1 Add Guidelines navigation item to sidebar with medical icon
  - [x] 2.2 Create main Guidelines page route and layout
  - [x] 2.3 Implement specialty organization with glassmorphic panels and large icons
  - [ ] 2.4 Build multi-select source filtering dropdown with tickbox functionality
  - [ ] 2.5 Create side-by-side panels for multiple source comparison
  - [ ] 2.6 Implement guidelines-specific search with fuzzy matching and autocomplete
  - [ ] 2.7 Add source-specific visual indicators and themes (USPSTF blue, NICE purple, NCI green, RxNorm orange)

- [ ] 3.0 Medical Advisor Enhancement
  - [ ] 3.1 Add specialty filter dropdown to medical advisor interface
  - [ ] 3.2 Implement guideline references display in advisor responses with source badges
  - [ ] 3.3 Create linking functionality from advisor references to full guideline view
  - [ ] 3.4 Integrate patient context for automatic specialty suggestion
  - [ ] 3.5 Update advisor API to filter guidelines by selected specialty

- [ ] 4.0 Enhanced Search Functionality
  - [ ] 4.1 Modify top navbar search to support categorized results
  - [ ] 4.2 Implement GUIDELINES section in search results with source badges and specialty tags
  - [ ] 4.3 Add ranking options (relevance, recency, authority, alphabetical)
  - [ ] 4.4 Create "Apply to Current Patient" quick action for guideline results
  - [ ] 4.5 Implement preview text display (first ~100 characters) for guideline results

- [ ] 5.0 Guideline Viewing & Personalization
  - [ ] 5.1 Create modal component for full guideline display with navigation breadcrumbs
  - [ ] 5.2 Implement expandable sections (Key Recommendations, Implementation, Rationale, Population Criteria)
  - [ ] 5.3 Add "Expand All" toggle functionality for guideline sections
  - [ ] 5.4 Display comprehensive metadata (source, dates, grade/evidence level, specialty)
  - [ ] 5.5 Implement bookmarks/favorites system with star icons and persistence
  - [ ] 5.6 Add recent access tracking for quick guideline retrieval
  - [ ] 5.7 Create status indicators for recently updated guidelines and bookmark status 