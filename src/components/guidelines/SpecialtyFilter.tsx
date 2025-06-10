'use client';

import React from 'react';
import { SpecialtyCategory, Specialty } from '@/types/guidelines';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SpecialtyFilterProps {
  categories: SpecialtyCategory[];
  selectedSpecialties: Specialty[];
  onSpecialtyChange: (specialties: Specialty[]) => void;
  isLoading?: boolean;
}

export default function SpecialtyFilter({
  categories,
  selectedSpecialties,
  onSpecialtyChange,
  isLoading = false
}: SpecialtyFilterProps) {
  
  const handleSpecialtyToggle = (specialty: Specialty) => {
    if (selectedSpecialties.includes(specialty)) {
      onSpecialtyChange(selectedSpecialties.filter(s => s !== specialty));
    } else {
      onSpecialtyChange([...selectedSpecialties, specialty]);
    }
  };

  const handleSelectAll = () => {
    if (selectedSpecialties.length === categories.length) {
      onSpecialtyChange([]);
    } else {
      onSpecialtyChange(categories.map(cat => cat.id));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Medical Specialties</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-white/40 backdrop-blur-sm rounded-xl border border-white/20 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Medical Specialties</h3>
        <button
          onClick={handleSelectAll}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {selectedSpecialties.length === categories.length ? 'Clear All' : 'Select All'}
        </button>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {categories.map((category) => {
          const isSelected = selectedSpecialties.includes(category.id);
          
          return (
            <div
              key={category.id}
              onClick={() => handleSpecialtyToggle(category.id)}
              className={cn(
                "group relative cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                "bg-white/60 backdrop-blur-sm rounded-xl border border-white/20",
                "hover:bg-white/80 hover:shadow-lg hover:border-white/40",
                isSelected && "bg-white/90 border-blue-200 shadow-md ring-2 ring-blue-100"
              )}
            >
              <div className="p-4 flex items-center space-x-4">
                {/* Large Icon */}
                <div 
                  className={cn(
                    "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-2xl",
                    "transition-colors duration-200",
                    isSelected 
                      ? "bg-blue-100 text-blue-600" 
                      : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                  )}
                  style={{ 
                    backgroundColor: isSelected ? `${category.color}20` : undefined,
                    color: isSelected ? category.color : undefined
                  }}
                >
                  {category.icon}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={cn(
                      "font-semibold text-sm truncate",
                      isSelected ? "text-gray-900" : "text-gray-700"
                    )}>
                      {category.displayName}
                    </h4>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "ml-2 text-xs",
                        isSelected && "bg-blue-100 text-blue-700"
                      )}
                    >
                      {category.guidelineCount}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {category.description}
                  </p>
                </div>
                
                {/* Selection Indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Glassmorphic Overlay Effect */}
              <div className={cn(
                "absolute inset-0 rounded-xl transition-opacity duration-200",
                "bg-gradient-to-br from-white/10 to-transparent",
                "opacity-0 group-hover:opacity-100"
              )} />
            </div>
          );
        })}
      </div>
      
      {/* Selected Count */}
      {selectedSpecialties.length > 0 && (
        <div className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3 border border-blue-100">
          <span className="font-medium">{selectedSpecialties.length}</span> 
          {selectedSpecialties.length === 1 ? ' specialty' : ' specialties'} selected
        </div>
      )}
    </div>
  );
} 