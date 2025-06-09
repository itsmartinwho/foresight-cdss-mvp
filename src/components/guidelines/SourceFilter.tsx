'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CaretDown, Check, X } from '@phosphor-icons/react';
import { GuidelineSource } from '@/types/guidelines';

interface SourceFilterProps {
  selectedSources: GuidelineSource[];
  onSourcesChange: (sources: GuidelineSource[]) => void;
  availableSources: GuidelineSource[];
  guidelineCounts: Record<GuidelineSource, number>;
}

const sourceConfig: Record<GuidelineSource, {
  name: string;
  shortName: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  'USPSTF': {
    name: 'US Preventive Services Task Force',
    shortName: 'USPSTF',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: '🇺🇸'
  },
  'NICE': {
    name: 'National Institute for Health and Care Excellence',
    shortName: 'NICE',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    icon: '🇬🇧'
  },
  'NCI_PDQ': {
    name: 'National Cancer Institute PDQ',
    shortName: 'NCI PDQ',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    icon: '🎗️'
  },
  'RxNorm': {
    name: 'RxNorm Drug Information',
    shortName: 'RxNorm',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    icon: '💊'
  },
  'MANUAL': {
    name: 'Manual Guidelines',
    shortName: 'Manual',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    icon: '📝'
  }
};

export default function SourceFilter({ 
  selectedSources, 
  onSourcesChange, 
  availableSources,
  guidelineCounts 
}: SourceFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSourceToggle = (source: GuidelineSource) => {
    const updatedSources = selectedSources.includes(source)
      ? selectedSources.filter(s => s !== source)
      : [...selectedSources, source];
    
    onSourcesChange(updatedSources);
  };

  const handleSelectAll = () => {
    onSourcesChange(availableSources);
  };

  const handleClearAll = () => {
    onSourcesChange([]);
  };

  const getSelectedText = () => {
    if (selectedSources.length === 0) return 'Select Sources';
    if (selectedSources.length === availableSources.length) return 'All Sources';
    if (selectedSources.length === 1) {
      return sourceConfig[selectedSources[0]]?.shortName || selectedSources[0];
    }
    return `${selectedSources.length} sources selected`;
  };

  const getTotalCount = () => {
    return selectedSources.reduce((total, source) => total + (guidelineCounts[source] || 0), 0);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-w-[200px] px-4 py-3 bg-white/20 backdrop-blur-md border border-white/30 
                   rounded-xl text-left flex items-center justify-between
                   hover:bg-white/30 hover:border-white/40 transition-all duration-200
                   focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            {getSelectedText()}
          </span>
          {selectedSources.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {getTotalCount()} guidelines
            </span>
          )}
        </div>
        <CaretDown 
          size={16} 
          className={`text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-lg border border-white/30 
                        rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
          
          {/* Header with Select All/Clear All */}
          <div className="p-3 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Clinical Sources</h3>
              <div className="flex space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  disabled={selectedSources.length === availableSources.length}
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                  disabled={selectedSources.length === 0}
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Source Options */}
          <div className="p-2">
            {availableSources.map((source) => {
              const config = sourceConfig[source];
              const isSelected = selectedSources.includes(source);
              const count = guidelineCounts[source] || 0;

              return (
                <label
                  key={source}
                  className="flex items-center p-3 rounded-lg hover:bg-white/50 cursor-pointer 
                           transition-all duration-150 group"
                >
                  {/* Custom Checkbox */}
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSourceToggle(source)}
                      className="sr-only"
                    />
                    <div className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center
                      transition-all duration-200
                      ${isSelected 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'bg-white border-gray-300 group-hover:border-gray-400'
                      }
                    `}>
                      {isSelected && (
                        <Check size={12} className="text-white" weight="bold" />
                      )}
                    </div>
                  </div>

                  {/* Source Info */}
                  <div className="ml-3 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{config?.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-800">
                            {config?.shortName || source}
                          </span>
                          <span className={`
                            text-xs px-2 py-1 rounded-full font-medium
                            ${config?.bgColor} ${config?.color}
                          `}>
                            {count} guideline{count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {config?.name || source}
                        </p>
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Footer */}
          {selectedSources.length > 0 && (
            <div className="p-3 border-t border-gray-200/50 bg-gray-50/50">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>{selectedSources.length} source{selectedSources.length !== 1 ? 's' : ''} selected</span>
                <span>{getTotalCount()} total guidelines</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Sources Pills (when dropdown is closed) */}
      {!isOpen && selectedSources.length > 0 && selectedSources.length <= 3 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedSources.map((source) => {
            const config = sourceConfig[source];
            return (
              <div
                key={source}
                className={`
                  inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs
                  ${config?.bgColor} ${config?.color} border border-current/20
                `}
              >
                <span>{config?.icon}</span>
                <span className="font-medium">{config?.shortName}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSourceToggle(source);
                  }}
                  className="hover:bg-current/10 rounded-full p-0.5"
                >
                  <X size={10} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 