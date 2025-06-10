'use client';

import React, { useState } from 'react';
import GuidelineReferences from './GuidelineReferences';
import GuidelineModal from '@/components/guidelines/GuidelineModal';
import { GuidelineModalData } from '@/types/guidelines';
import { GuidelineReference } from './chat-types';
import { convertReferenceToModalData, isGuidelineBookmarked, toggleGuidelineBookmark } from '@/services/guidelines/guidelineModalService';

// Demo data for testing guideline references
const mockGuidelineReferences: GuidelineReference[] = [
  {
    id: '1',
    title: 'Breast Cancer Screening: Women Ages 50-74',
    source: 'USPSTF' as const,
    url: 'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/breast-cancer-screening',
    summary: 'The USPSTF recommends biennial screening mammography for women aged 50 to 74 years.',
    grade: 'B',
    specialty: 'Primary Care'
  },
  {
    id: '2', 
    title: 'Hypertension in Adults: Screening',
    source: 'NICE' as const,
    url: 'https://www.nice.org.uk/guidance/ng136',
    summary: 'NICE guidelines recommend annual blood pressure checks for adults to detect hypertension early.',
    grade: 'Strong',
    specialty: 'Cardiology'
  },
  {
    id: '3',
    title: 'Colorectal Cancer Screening Guidelines',
    source: 'NCI_PDQ' as const,
    url: 'https://www.cancer.gov/types/colorectal/screening-guidelines',
    summary: 'NCI recommends regular screening for colorectal cancer starting at age 45 for average-risk adults.',
    specialty: 'Oncology'
  },
  {
    id: '4',
    title: 'Metformin Drug Information',
    source: 'RxNorm' as const,
    url: 'https://www.nlm.nih.gov/research/umls/rxnorm/',
    summary: 'Metformin hydrochloride - oral antidiabetic drug for type 2 diabetes management.',
    specialty: 'Endocrinology'
  }
];

export default function GuidelineReferencesDemo() {
  const [guidelineModalData, setGuidelineModalData] = useState<GuidelineModalData | null>(null);
  const [isGuidelineModalOpen, setIsGuidelineModalOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleGuidelineReferenceClick = async (reference: GuidelineReference) => {
    try {
      const modalData = await convertReferenceToModalData(reference);
      const bookmarkStatus = await isGuidelineBookmarked(reference.id);
      
      setGuidelineModalData(modalData);
      setIsBookmarked(bookmarkStatus);
      setIsGuidelineModalOpen(true);
    } catch (error) {
      console.error('Error opening guideline modal:', error);
    }
  };

  const handleCloseGuidelineModal = () => {
    setIsGuidelineModalOpen(false);
    setGuidelineModalData(null);
  };

  const handleBookmarkToggle = async () => {
    if (!guidelineModalData) return;
    
    try {
      const newBookmarkStatus = await toggleGuidelineBookmark(guidelineModalData.id.toString());
      setIsBookmarked(newBookmarkStatus);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Guideline References Demo</h2>
      <p className="text-gray-600 mb-8">
        This demonstrates how clinical guideline references appear in advisor responses with source badges and modal functionality.
        Click on any guideline to view the full content.
      </p>
      
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Sample Advisor Response</h3>
        <div className="prose prose-sm max-w-none mb-4">
          <p>
            Based on the patient's age and risk factors, I recommend following established clinical guidelines for preventive care. 
            The evidence-based recommendations below should guide your clinical decision-making:
          </p>
        </div>
        
        <GuidelineReferences 
          references={mockGuidelineReferences}
          onReferenceClick={handleGuidelineReferenceClick}
        />
      </div>

      {/* Modal */}
      {guidelineModalData && (
        <GuidelineModal
          modalData={guidelineModalData}
          isOpen={isGuidelineModalOpen}
          onClose={handleCloseGuidelineModal}
          isBookmarked={isBookmarked}
          onBookmarkToggle={handleBookmarkToggle}
        />
      )}
    </div>
  );
} 