'use client';

import React from 'react';
import { GuidelineModalData, SourceTheme } from '@/types/guidelines';

interface GuidelineModalProps {
  modalData: GuidelineModalData;
  isOpen: boolean;
  onClose: () => void;
  sourceTheme?: SourceTheme;
  isBookmarked: boolean;
  onBookmarkToggle: () => void;
}

export default function GuidelineModal({
  modalData,
  isOpen,
  onClose,
  sourceTheme,
  isBookmarked,
  onBookmarkToggle
}: GuidelineModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{modalData.title}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600">Modal content - to be implemented</p>
        </div>
      </div>
    </div>
  );
} 