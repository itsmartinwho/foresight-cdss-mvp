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
  } = useGuidelines({ 
    autoLoad: true,
    initialFilter: {
      // Load saved sources from localStorage
      sources: (() => {
        if (typeof window !== 'undefined') {
          try {
            const saved = localStorage.getItem('foresight-selected-sources');
            return saved ? JSON.parse(saved) : [];
          } catch {
            return [];
          }
        }
        return [];
      })()
    }
  });

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

      {/* Top Row - Source and Search/Sort */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 mb-6">
        <div className="flex-1">
          <SourceFilter
            selectedSources={uiState.filter.sources}
            onSourcesChange={(sources) => {
              // Save to localStorage
              localStorage.setItem('foresight-selected-sources', JSON.stringify(sources));
              filterGuidelines({ sources });
            }}
            availableSources={availableSources}
            guidelineCounts={guidelineCountsBySource}
          />
        </div>
        
        <div className="flex-1">
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

      {/* Medical Specialties - Full Width */}
      <div className="mb-6">
        <SpecialtyFilter
          categories={specialtyCategories}
          selectedSpecialties={uiState.filter.specialties}
          onSpecialtyChange={(specialties) => filterGuidelines({ specialties })}
          isLoading={isLoading}
        />
      </div>

      {/* Guidelines Grid/List */}
      <div className="min-h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : guidelines.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-md">
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Guidelines Found</h3>
              <p className="text-gray-500 mb-4">
                {uiState.filter.searchQuery ? 
                  `No guidelines match your search for "${uiState.filter.searchQuery}"` :
                  'No guidelines available with current filters'
                }
              </p>
              {!uiState.filter.searchQuery && uiState.filter.sources.length === 0 && uiState.filter.specialties.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                  <p className="mb-2">📚 <strong>No clinical guidelines loaded yet</strong></p>
                  <p>Clinical guidelines need to be ingested into the database first. Contact your system administrator to load guidelines from sources like USPSTF, NICE, NCI PDQ, or RxNorm.</p>
                </div>
              )}
              {(uiState.filter.sources.length > 0 || uiState.filter.specialties.length > 0) && (
                <p className="text-sm text-gray-500">
                  Try clearing some filters or search for specific topics
                </p>
              )}
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
                <div className="flex items-center justify-between bg-gradient-to-r from-blue-50/80 to-purple-50/80 backdrop-blur-sm border border-blue-200/50 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <SquaresFour className="h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Source Comparison Panels</h3>
                      <p className="text-sm text-gray-600">
                        Guidelines organized by source for side-by-side comparison
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-white/70 text-gray-800">
                    {guidelines.length} guidelines
                  </Badge>
                </div>

                {/* Source-based Comparison Panels */}
                {(() => {
                  const groupedGuidelines = guidelines.reduce((acc, guideline) => {
                    const source = guideline.source;
                    if (!acc[source]) acc[source] = [];
                    acc[source].push(guideline);
                    return acc;
                  }, {} as Record<string, typeof guidelines>);

                  const getSourceDisplayName = (source: string) => {
                    switch (source) {
                      case 'USPSTF': return 'US Preventive Services Task Force';
                      case 'NICE': return 'National Institute for Health and Care Excellence';
                      case 'NCI_PDQ': return 'National Cancer Institute PDQ';
                      case 'RxNorm': return 'RxNorm Drug Database';
                      default: return source;
                    }
                  };

                  const getSourceIcon = (source: string) => {
                    switch (source) {
                      case 'USPSTF': return '🇺🇸';
                      case 'NICE': return '🇬🇧';
                      case 'NCI_PDQ': return '🎗️';
                      case 'RxNorm': return '💊';
                      default: return '📋';
                    }
                  };

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {Object.entries(groupedGuidelines).map(([source, sourceGuidelines]) => (
                        <div key={source} className="space-y-4">
                          {/* Source Panel Header */}
                          <div className={cn(
                            "flex items-center justify-between p-4 rounded-lg border-2 shadow-sm backdrop-blur-sm",
                            source === 'USPSTF' && "bg-blue-50/80 border-blue-200",
                            source === 'NICE' && "bg-purple-50/80 border-purple-200",
                            source === 'NCI_PDQ' && "bg-green-50/80 border-green-200",
                            source === 'RxNorm' && "bg-orange-50/80 border-orange-200"
                          )}>
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{getSourceIcon(source)}</span>
                              <div>
                                <h4 className={cn(
                                  "font-semibold text-lg",
                                  source === 'USPSTF' && "text-blue-800",
                                  source === 'NICE' && "text-purple-800",
                                  source === 'NCI_PDQ' && "text-green-800",
                                  source === 'RxNorm' && "text-orange-800"
                                )}>
                                  {source}
                                </h4>
                                <p className="text-xs text-gray-600 max-w-[180px] truncate">
                                  {getSourceDisplayName(source)}
                                </p>
                              </div>
                            </div>
                            <Badge className={cn(
                              "font-medium text-xs",
                              source === 'USPSTF' && "bg-blue-100 text-blue-700 border-blue-300",
                              source === 'NICE' && "bg-purple-100 text-purple-700 border-purple-300",
                              source === 'NCI_PDQ' && "bg-green-100 text-green-700 border-green-300",
                              source === 'RxNorm' && "bg-orange-100 text-orange-700 border-orange-300"
                            )}>
                              {sourceGuidelines.length} guidelines
                            </Badge>
                          </div>

                          {/* Guidelines for this source */}
                          <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {sourceGuidelines.map((guideline) => (
                              <GuidelineCard
                                key={guideline.id}
                                guideline={guideline}
                                sourceTheme={getSourceTheme(guideline.source)}
                                isBookmarked={isBookmarked(guideline.id)}
                                viewMode="list"
                                onClick={() => handleGuidelineClick(guideline.id)}
                                onBookmarkToggle={() => handleBookmarkToggle(guideline.id)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
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