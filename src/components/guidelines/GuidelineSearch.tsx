'use client';

import React from 'react';
import { GuidelineFilter } from '@/types/guidelines';

interface GuidelineSearchProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  sortBy: GuidelineFilter['sortBy'];
  onSortChange: (sortBy: GuidelineFilter['sortBy']) => void;
  showBookmarksOnly: boolean;
  onBookmarksOnlyChange: (showBookmarksOnly: boolean) => void;
}

export default function GuidelineSearch({
  searchQuery,
  onSearch,
  sortBy,
  onSortChange,
  showBookmarksOnly,
  onBookmarksOnlyChange
}: GuidelineSearchProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Search & Sort</h3>
      <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/20 p-4">
        <p className="text-sm text-gray-600">Search component - to be implemented</p>
      </div>
    </div>
  );
} 