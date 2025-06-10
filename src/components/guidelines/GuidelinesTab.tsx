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
import { Badge } from '@/components/ui/badge';
import { GridFour, List, SquaresFour } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export default function GuidelinesTab() {
  const {
    guidelines,
    specialtyCategories,
    sourceThemes,
    availableSources,
    guidelineCountsBySource,
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
            selectedSources={uiState.filter.sources}
            onSourcesChange={(sources) => filterGuidelines({ sources })}
            availableSources={availableSources}
            guidelineCounts={guidelineCountsBySource}
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
            uiState.currentView === 'comparison' && "space-y-6"
          )}>
            {uiState.currentView === 'comparison' && (
              <div className="space-y-6">
                {/* Comparison View Header */}
                <div className="flex items-center justify-between bg-blue-50/50 backdrop-blur-sm border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <SquaresFour className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Compare Guidelines Side-by-Side</h3>
                      <p className="text-sm text-gray-600">
                        Select guidelines from different sources to compare recommendations
                      </p>
                    </div>
                  </div>
                </div>

                {/* Side-by-side comparison grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {guidelines.map((guideline) => (
                    <div key={guideline.id} className="relative">
                      <GuidelineCard
                        guideline={guideline}
                        sourceTheme={getSourceTheme(guideline.source)}
                        isBookmarked={isBookmarked(guideline.id)}
                        viewMode="comparison"
                        onClick={() => handleGuidelineClick(guideline.id)}
                        onBookmarkToggle={() => handleBookmarkToggle(guideline.id)}
                      />
                      
                      {/* Source Badge */}
                      <div className="absolute top-2 right-2 z-10">
                        <Badge 
                          className={cn(
                            "text-white text-xs shadow-lg",
                            guideline.source === 'USPSTF' && "bg-blue-600",
                            guideline.source === 'NICE' && "bg-purple-600", 
                            guideline.source === 'NCI_PDQ' && "bg-green-600",
                            guideline.source === 'RxNorm' && "bg-orange-600"
                          )}
                        >
                          {guideline.source}
                        </Badge>
                      </div>

                      {/* Specialty Badge */}
                      {guideline.specialty && guideline.specialty !== 'All' && (
                        <div className="absolute bottom-2 left-2 z-10">
                          <Badge 
                            variant="outline" 
                            className="bg-white/90 backdrop-blur-sm text-xs border-gray-300"
                          >
                            {guideline.specialty}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uiState.currentView !== 'comparison' && (
              <>
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
              </>
            )}
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