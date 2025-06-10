'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MagnifyingGlass, 
  SortAscending, 
  Star, 
  X,
  CaretDown,
  Clock,
  BookOpen,
  Funnel
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { GuidelineFilter } from '@/types/guidelines';

interface GuidelineSearchProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  sortBy: GuidelineFilter['sortBy'];
  onSortChange: (sortBy: GuidelineFilter['sortBy']) => void;
  showBookmarksOnly: boolean;
  onBookmarksOnlyChange: (showBookmarksOnly: boolean) => void;
}

const searchSuggestions = [
  'depression screening',
  'hypertension management',
  'diabetes type 2',
  'cancer screening',
  'cardiovascular risk',
  'mental health',
  'preventive care',
  'drug interactions',
  'breast cancer treatment',
  'colorectal cancer',
  'prostate cancer',
  'atrial fibrillation',
  'blood pressure',
  'cholesterol',
  'obesity management'
];

const recentSearches = [
  'depression',
  'hypertension',
  'cancer screening'
];

export default function GuidelineSearch({
  searchQuery,
  onSearch,
  sortBy,
  onSortChange,
  showBookmarksOnly,
  onBookmarksOnlyChange
}: GuidelineSearchProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [tempSearchQuery, setTempSearchQuery] = useState(searchQuery);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on current input
  useEffect(() => {
    if (tempSearchQuery.length > 0) {
      const filtered = searchSuggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(tempSearchQuery.toLowerCase())
      ).slice(0, 6);
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions([]);
    }
  }, [tempSearchQuery]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (query: string) => {
    onSearch(query);
    setIsSearchFocused(false);
    setTempSearchQuery(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit(tempSearchQuery);
    } else if (e.key === 'Escape') {
      setIsSearchFocused(false);
      inputRef.current?.blur();
    }
  };

  const clearSearch = () => {
    setTempSearchQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  const sortOptions = [
    { value: 'relevance' as const, label: 'Most Relevant', icon: MagnifyingGlass },
    { value: 'recency' as const, label: 'Most Recent', icon: Clock },
    { value: 'authority' as const, label: 'Authority Source', icon: BookOpen },
    { value: 'alphabetical' as const, label: 'Alphabetical', icon: SortAscending }
  ];

  const currentSortOption = sortOptions.find(option => option.value === sortBy) || sortOptions[0];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <MagnifyingGlass className="h-5 w-5 text-blue-600" />
        Search & Sort
      </h3>
      
      <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/20 p-4 space-y-4">
        {/* Search Input with Autocomplete */}
        <div className="relative" ref={searchRef}>
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search guidelines, conditions, treatments..."
              value={tempSearchQuery}
              onChange={(e) => setTempSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleKeyDown}
              className={cn(
                "w-full pl-10 pr-10 py-3 rounded-lg border border-gray-200",
                "focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none",
                "bg-white/80 backdrop-blur-sm placeholder-gray-500 text-gray-900",
                "transition-all duration-200"
              )}
            />
            {tempSearchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Search Suggestions Dropdown */}
          {isSearchFocused && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg border border-gray-200 shadow-lg z-20 max-h-80 overflow-y-auto">
              {/* Recent Searches */}
              {tempSearchQuery === '' && recentSearches.length > 0 && (
                <div className="p-3 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Recent Searches
                  </p>
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearchSubmit(search)}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              )}

              {/* Filtered Suggestions */}
              {filteredSuggestions.length > 0 && (
                <div className="p-3">
                  <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-2">
                    <MagnifyingGlass className="h-3 w-3" />
                    Suggestions
                  </p>
                  {filteredSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearchSubmit(suggestion)}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                    >
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-3 w-3 text-gray-400" />
                        {suggestion}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* No Results */}
              {tempSearchQuery && filteredSuggestions.length === 0 && (
                <div className="p-3 text-center">
                  <p className="text-sm text-gray-500">No suggestions found</p>
                  <button
                    onClick={() => handleSearchSubmit(tempSearchQuery)}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                  >
                    Search for "{tempSearchQuery}"
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Current Search Query Display */}
        {searchQuery && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Searching: {searchQuery}
            </Badge>
            <button
              onClick={() => onSearch('')}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
        )}

        {/* Controls Row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Sort Dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200",
                "bg-white/80 hover:bg-white text-sm text-gray-700",
                "transition-all duration-200",
                isSortDropdownOpen && "ring-2 ring-blue-500 border-blue-500"
              )}
            >
              <currentSortOption.icon className="h-4 w-4" />
              {currentSortOption.label}
              <CaretDown className={cn(
                "h-4 w-4 transition-transform duration-200",
                isSortDropdownOpen && "rotate-180"
              )} />
            </button>

            {isSortDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 bg-white rounded-lg border border-gray-200 shadow-lg z-10 min-w-48">
                <div className="p-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onSortChange(option.value);
                        setIsSortDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm",
                        "hover:bg-gray-50 transition-colors duration-150",
                        sortBy === option.value 
                          ? "bg-blue-50 text-blue-700" 
                          : "text-gray-700"
                      )}
                    >
                      <option.icon className="h-4 w-4" />
                      {option.label}
                      {sortBy === option.value && (
                        <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bookmarks Filter */}
          <Button
            variant={showBookmarksOnly ? "default" : "outline"}
            size="sm"
            onClick={() => onBookmarksOnlyChange(!showBookmarksOnly)}
            className={cn(
              "gap-2 transition-all duration-200",
              showBookmarksOnly 
                ? "bg-yellow-500 hover:bg-yellow-600 text-white" 
                : "border-gray-200 bg-white/80 hover:bg-white text-gray-700"
            )}
          >
            <Star className={cn(
              "h-4 w-4",
              showBookmarksOnly ? "fill-current" : ""
            )} />
            {showBookmarksOnly ? "Bookmarked" : "All"}
          </Button>

          {/* Advanced Filters (Future Enhancement) */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-gray-200 bg-white/80 hover:bg-white text-gray-700"
            disabled
          >
            <Funnel className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Search Tips */}
        {isSearchFocused && !tempSearchQuery && (
          <div className="text-xs text-gray-500 space-y-1">
            <p className="font-medium">Search Tips:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Try searching for conditions like "depression" or "diabetes"</li>
              <li>Search for procedures like "screening" or "treatment"</li>
              <li>Use source names like "USPSTF" or "NICE" to filter by organization</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
} 