'use client';

import React from 'react';
import { GuidelineCard as GuidelineCardType, SourceTheme, GuidelineUIState } from '@/types/guidelines';

interface GuidelineCardProps {
  guideline: GuidelineCardType;
  sourceTheme?: SourceTheme;
  isBookmarked: boolean;
  viewMode: GuidelineUIState['currentView'];
  onClick: () => void;
  onBookmarkToggle: () => void;
}

export default function GuidelineCard({
  guideline,
  sourceTheme,
  isBookmarked,
  viewMode,
  onClick,
  onBookmarkToggle
}: GuidelineCardProps) {
  return (
    <div 
      className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/20 p-4 cursor-pointer hover:bg-white/80 transition-colors"
      onClick={onClick}
    >
      <h4 className="font-semibold text-gray-900 mb-2">{guideline.title}</h4>
      <p className="text-sm text-gray-600 mb-2">{guideline.preview}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{guideline.source}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBookmarkToggle();
          }}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {isBookmarked ? '★' : '☆'}
        </button>
      </div>
    </div>
  );
} 