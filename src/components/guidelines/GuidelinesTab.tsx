'use client';

import React from 'react';
import { useGuidelines } from '@/hooks/useGuidelines';
import { useBookmarks } from '@/hooks/useBookmarks';
import SpecialtyFilter from './SpecialtyFilter';
import SourceFilter from './SourceFilter';
import GuidelineSearch from './GuidelineSearch';
import GuidelineCard from './GuidelineCard';
import GuidelineModal from './GuidelineModal';
import { Button } from '@/components/ui/button';
import { GridFour, List, SquaresFour } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export default function GuidelinesTab() {
  const {
    guidelines,
    specialtyCategories,
    sourceThemes,
    uiState,
    isLoading,
    error,
    searchGuidelines,
    filterGuidelines,
    setCurrentView,
    openGuidelineModal,
    closeGuidelineModal,
    getSourceTheme
  } = useGuidelines({ autoLoad: true });

  const {
    isBookmarked,
    toggleBookmark,
    addRecentView
  } = useBookmarks();

  const handleGuidelineClick = async (guidelineId: number) => {
    await openGuidelineModal(guidelineId);
    await addRecentView(guidelineId);
  };

  const handleBookmarkToggle = async (guidelineId: number) => {
    await toggleBookmark(guidelineId);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Guidelines</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clinical Guidelines</h1>
          <p className="text-gray-600 mt-1">
            Evidence-based recommendations from authoritative medical sources
          </p>
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-lg p-1 border border-white/20">
          <Button
            variant={uiState.currentView === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('grid')}
            className="h-8 w-8 p-0"
          >
            <GridFour className="h-4 w-4" />
          </Button>
          <Button
            variant={uiState.currentView === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('list')}
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={uiState.currentView === 'comparison' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('comparison')}
            className="h-8 w-8 p-0"
          >
            <SquaresFour className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <SpecialtyFilter
            categories={specialtyCategories}
            selectedSpecialties={uiState.filter.specialties}
            onSpecialtyChange={(specialties) => filterGuidelines({ specialties })}
            isLoading={isLoading}
          />
        </div>
        
        <div className="lg:col-span-1">
          <SourceFilter
            sourceThemes={sourceThemes}
            selectedSources={uiState.filter.sources}
            onSourceChange={(sources) => filterGuidelines({ sources })}
          />
        </div>
        
        <div className="lg:col-span-1">
          <GuidelineSearch
            searchQuery={uiState.filter.searchQuery}
            onSearch={searchGuidelines}
            sortBy={uiState.filter.sortBy}
            onSortChange={(sortBy) => filterGuidelines({ sortBy })}
            showBookmarksOnly={uiState.filter.showBookmarksOnly}
            onBookmarksOnlyChange={(showBookmarksOnly) => filterGuidelines({ showBookmarksOnly })}
          />
        </div>
      </div>

      {/* Guidelines Grid/List */}
      <div className="min-h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : guidelines.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Guidelines Found</h3>
              <p className="text-gray-500">
                Try adjusting your filters or search terms
              </p>
            </div>
          </div>
        ) : (
          <div className={cn(
            "transition-all duration-300",
            uiState.currentView === 'grid' && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
            uiState.currentView === 'list' && "space-y-4",
            uiState.currentView === 'comparison' && "grid grid-cols-1 lg:grid-cols-2 gap-6"
          )}>
            {guidelines.map((guideline) => (
              <GuidelineCard
                key={guideline.id}
                guideline={guideline}
                sourceTheme={getSourceTheme(guideline.source)}
                isBookmarked={isBookmarked(guideline.id)}
                viewMode={uiState.currentView}
                onClick={() => handleGuidelineClick(guideline.id)}
                onBookmarkToggle={() => handleBookmarkToggle(guideline.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {uiState.activeModal && (
        <GuidelineModal
          modalData={uiState.activeModal}
          isOpen={!!uiState.activeModal}
          onClose={closeGuidelineModal}
          sourceTheme={getSourceTheme(uiState.activeModal.source)}
          isBookmarked={isBookmarked(uiState.activeModal.id)}
          onBookmarkToggle={() => handleBookmarkToggle(uiState.activeModal!.id)}
        />
      )}
    </div>
  );
} 