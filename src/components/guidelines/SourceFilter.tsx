'use client';

import React from 'react';
import { SourceTheme, GuidelineSource } from '@/types/guidelines';

interface SourceFilterProps {
  sourceThemes: SourceTheme[];
  selectedSources: GuidelineSource[];
  onSourceChange: (sources: GuidelineSource[]) => void;
}

export default function SourceFilter({
  sourceThemes,
  selectedSources,
  onSourceChange
}: SourceFilterProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Sources</h3>
      <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/20 p-4">
        <p className="text-sm text-gray-600">Source filtering component - to be implemented</p>
      </div>
    </div>
  );
} 