import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import SearchResults, { SearchResultItem, CategorizedResults } from './SearchResults';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { supabaseDataService } from '@/lib/supabaseDataService';

interface EnhancedSearchProps {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  portal?: boolean;
  onClose?: () => void;
}

export default function EnhancedSearch({
  className,
  inputClassName,
  placeholder = "Search patients, guidelines, conditions...",
  portal = false,
  onClose
}: EnhancedSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CategorizedResults>({
    patients: [],
    guidelines: [],
    encounters: []
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults({ patients: [], guidelines: [], encounters: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    try {
      // Search patients
      await supabaseDataService.loadPatientData();
      const allPatients = supabaseDataService.getAllPatients();
      const lowerQuery = searchQuery.toLowerCase();
      
      const patientResults: SearchResultItem[] = allPatients
        .filter(patient => {
          const fullName = (patient.name || '').toLowerCase();
          const firstName = (patient.firstName || '').toLowerCase();
          const lastName = (patient.lastName || '').toLowerCase();
          return fullName.includes(lowerQuery) || 
                 firstName.includes(lowerQuery) || 
                 lastName.includes(lowerQuery);
        })
        .slice(0, 5)
        .map(patient => ({
          id: patient.id,
          title: patient.name || `${patient.firstName} ${patient.lastName}`.trim() || patient.id,
          description: patient.reason || 'No reason listed',
          category: 'patients' as const,
          metadata: {
            photo: patient.photo,
            patientId: patient.id
          },
          url: `/patients/${patient.id}`
        }));

      // Search guidelines using the enhanced search API
      let guidelineResults: SearchResultItem[] = [];
      try {
        const guidelineResponse = await fetch(`/api/search/enhanced?q=${encodeURIComponent(searchQuery)}&categories=guidelines&limit=5`);
        if (guidelineResponse.ok) {
          const guidelineData = await guidelineResponse.json();
          
          guidelineResults = guidelineData.results.guidelines?.map((guideline: any) => ({
            id: guideline.id,
            title: guideline.title,
            description: guideline.description,
            preview: guideline.summary?.substring(0, 100) + (guideline.summary?.length > 100 ? '...' : ''),
            category: 'guidelines' as const,
            metadata: {
              source: guideline.source,
              specialty: guideline.specialty,
              grade: guideline.grade,
              updatedAt: guideline.updated_at ? new Date(guideline.updated_at).toLocaleDateString() : undefined
            },
            url: `/guidelines?id=${guideline.id}`
          })) || [];
        }
      } catch (error) {
        console.error('Error searching guidelines:', error);
      }

      // Search encounters (could be expanded later)
      const encounterResults: SearchResultItem[] = [];

      setResults({
        patients: patientResults,
        guidelines: guidelineResults,
        encounters: encounterResults
      });
    } catch (error) {
      console.error('Error performing search:', error);
      setResults({ patients: [], guidelines: [], encounters: [] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      } else {
        setResults({ patients: [], guidelines: [], encounters: [] });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query, performSearch]);

  // Calculate portal position
  useEffect(() => {
    if (portal && containerRef.current && isOpen) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownWidth = Math.min(600, window.innerWidth - 32); // Max 600px width, with 16px margin on each side
      
      let left = rect.left;
      
      // Center the dropdown relative to the input if it's narrow
      if (rect.width < dropdownWidth) {
        left = rect.left + (rect.width / 2) - (dropdownWidth / 2);
      }
      
      // Ensure it doesn't go off-screen
      const margin = 16;
      left = Math.max(margin, Math.min(left, window.innerWidth - dropdownWidth - margin));
      
      setPortalStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left,
        width: dropdownWidth,
        zIndex: 9999,
      });
    }
  }, [portal, isOpen]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleResultClick = (item: SearchResultItem) => {
    router.push(item.url);
    setIsOpen(false);
    setQuery('');
    onClose?.();
  };

  const handleApplyToPatient = (guideline: SearchResultItem) => {
    // TODO: Implement apply to current patient functionality
    console.log('Apply guideline to patient:', guideline);
  };

  const handleClear = () => {
    setQuery('');
    setResults({ patients: [], guidelines: [], encounters: [] });
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const totalResults = results.patients.length + results.guidelines.length + results.encounters.length;
  const shouldShowDropdown = isOpen && (query.trim().length >= 2 || isLoading);

  const dropdownContent = shouldShowDropdown ? (
    <div
      ref={dropdownRef}
      className={cn(
        "bg-white rounded-lg border border-gray-200 shadow-lg max-h-96 overflow-y-auto",
        portal ? "" : "absolute top-full left-0 right-0 mt-2 z-50"
      )}
      style={portal ? portalStyle || {} : {}}
    >
      <SearchResults
        results={results}
        query={query}
        onResultClick={handleResultClick}
        onApplyToPatient={handleApplyToPatient}
        isLoading={isLoading}
      />
    </div>
  ) : null;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          className={cn(
            "pl-10 pr-10",
            inputClassName
          )}
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {isLoading && (
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        )}
      </div>

      {portal ? (
        dropdownContent && createPortal(dropdownContent, document.body)
      ) : (
        dropdownContent
      )}
    </div>
  );
} 