import { GuidelineModalData, GuidelineSection, GuidelineSource, Specialty } from '@/types/guidelines';

interface GuidelineReference {
  id: string;
  title: string;
  source: 'USPSTF' | 'NICE' | 'NCI_PDQ' | 'RxNorm';
  url?: string;
  summary?: string;
  grade?: string;
  specialty?: string;
}

/**
 * Converts a guideline reference to modal data for display
 * This is a mock implementation that would normally fetch from the database
 */
export async function convertReferenceToModalData(reference: GuidelineReference): Promise<GuidelineModalData> {
  // In a real implementation, this would fetch from the database using the reference.id
  // For now, we'll create mock data based on the reference
  
  const mockSections: GuidelineSection[] = [
    {
      id: 'key_recommendations',
      title: 'Key Recommendations',
      content: `<p><strong>Primary recommendation:</strong> ${reference.summary}</p>
        <p>This guideline provides evidence-based recommendations for clinical practice.</p>
        <ul>
          <li>Follow established protocols for screening and diagnosis</li>
          <li>Consider patient-specific risk factors and contraindications</li>
          <li>Monitor for adverse effects and therapeutic response</li>
        </ul>`,
      type: 'key_recommendations',
      isExpanded: false
    },
    {
      id: 'implementation',
      title: 'Implementation Guidance',
      content: `<p>This section provides practical guidance for implementing the recommendations in clinical practice.</p>
        <ol>
          <li><strong>Patient Selection:</strong> Identify appropriate candidates based on age, risk factors, and clinical presentation</li>
          <li><strong>Timing:</strong> Follow recommended intervals for screening and follow-up</li>
          <li><strong>Documentation:</strong> Maintain detailed records of assessments and interventions</li>
        </ol>`,
      type: 'implementation',
      isExpanded: false
    },
    {
      id: 'rationale',
      title: 'Rationale and Evidence',
      content: `<p>The recommendations in this guideline are based on a systematic review of the available evidence.</p>
        <p><strong>Evidence Quality:</strong> ${reference.grade ? `Grade ${reference.grade}` : 'Moderate to High quality evidence'}</p>
        <p>Key studies and systematic reviews support the effectiveness of these interventions in improving patient outcomes.</p>`,
      type: 'rationale',
      isExpanded: false
    },
    {
      id: 'population_criteria',
      title: 'Target Population',
      content: `<p>This guideline applies to the following population:</p>
        <ul>
          <li><strong>Specialty:</strong> ${reference.specialty || 'General Practice'}</li>
          <li><strong>Age Range:</strong> As specified in individual recommendations</li>
          <li><strong>Risk Factors:</strong> Consider individual patient risk profile</li>
          <li><strong>Contraindications:</strong> Review before implementation</li>
        </ul>`,
      type: 'population_criteria',
      isExpanded: false
    }
  ];

  const modalData: GuidelineModalData = {
    id: parseInt(reference.id),
    title: reference.title,
    source: reference.source,
    specialty: (reference.specialty as any) || 'General Medicine',
    metadata: {
      grade: reference.grade,
      publication_date: '2023-01-01', // Mock date
      last_reviewed: '2024-01-01', // Mock date
      organization: getOrganizationName(reference.source),
      guideline_id: reference.id
    },
    sections: mockSections,
    breadcrumbs: [
      'Guidelines',
      reference.specialty || 'General Medicine',
      reference.source,
      reference.title
    ],
    fullContent: `<h1>${reference.title}</h1><p>${reference.summary}</p><p>This is the full content of the guideline. In a real implementation, this would be fetched from the database.</p>`
  };

  return modalData;
}

/**
 * Fetches full guideline content from the database
 * This is a placeholder for the actual API call
 */
export async function fetchGuidelineModalData(guidelineId: string): Promise<GuidelineModalData | null> {
  try {
    // In a real implementation, this would make an API call to fetch the guideline
    // For now, return null to indicate the guideline wasn't found
    console.log('Fetching guideline modal data for ID:', guidelineId);
    return null;
  } catch (error) {
    console.error('Error fetching guideline modal data:', error);
    return null;
  }
}

/**
 * Helper function to get organization name from source
 */
function getOrganizationName(source: string): string {
  switch (source) {
    case 'USPSTF':
      return 'U.S. Preventive Services Task Force';
    case 'NICE':
      return 'National Institute for Health and Care Excellence';
    case 'NCI_PDQ':
      return 'National Cancer Institute';
    case 'RxNorm':
      return 'National Library of Medicine';
    default:
      return 'Unknown Organization';
  }
}

/**
 * Checks if a guideline is bookmarked by the current user
 * This would normally check against the user's bookmarks in the database
 */
export async function isGuidelineBookmarked(guidelineId: string): Promise<boolean> {
  // Mock implementation - in practice this would check the database
  return false;
}

/**
 * Toggles bookmark status for a guideline
 * This would normally update the database
 */
export async function toggleGuidelineBookmark(guidelineId: string): Promise<boolean> {
  // Mock implementation - in practice this would update the database
  console.log('Toggling bookmark for guideline:', guidelineId);
  return true; // Return new bookmark status
} 