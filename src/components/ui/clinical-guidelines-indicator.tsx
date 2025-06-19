'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowSquareOut } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface GuidelineReference {
  id: string;
  title: string;
  source: string;
  url?: string;
  level?: 'high' | 'medium' | 'low';
  type?: 'recommendation' | 'evidence' | 'contraindication';
}

interface ClinicalGuidelinesIndicatorProps {
  guidelines: GuidelineReference[];
  className?: string;
  variant?: 'compact' | 'detailed';
  maxDisplay?: number;
}

export const ClinicalGuidelinesIndicator: React.FC<ClinicalGuidelinesIndicatorProps> = ({
  guidelines,
  className,
  variant = 'compact',
  maxDisplay = 3
}) => {
  if (!guidelines || guidelines.length === 0) {
    return null;
  }

  const displayedGuidelines = guidelines.slice(0, maxDisplay);
  const remainingCount = guidelines.length - maxDisplay;

  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'contraindication':
        return '⚠️';
      case 'evidence':
        return '📊';
      case 'recommendation':
      default:
        return '📋';
    }
  };

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <BookOpen className="h-3 w-3 text-blue-600" />
        <Badge variant="outline" className="text-xs">
          {guidelines.length} guideline{guidelines.length !== 1 ? 's' : ''}
        </Badge>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <BookOpen className="h-4 w-4" />
        Clinical Guidelines ({guidelines.length})
      </div>
      
      <div className="space-y-1">
        {displayedGuidelines.map((guideline) => (
          <div
            key={guideline.id}
            className={cn(
              "flex items-center gap-2 p-2 rounded-md border text-xs",
              getLevelColor(guideline.level)
            )}
          >
            <span className="text-sm">{getTypeIcon(guideline.type)}</span>
            
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{guideline.title}</div>
              <div className="text-xs opacity-75">{guideline.source}</div>
            </div>

            {guideline.level && (
              <Badge variant="secondary" className="text-xs">
                {guideline.level}
              </Badge>
            )}

            {guideline.url && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0"
                onClick={() => window.open(guideline.url, '_blank')}
              >
                <ArrowSquareOut className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}

        {remainingCount > 0 && (
          <div className="text-xs text-muted-foreground text-center py-1">
            +{remainingCount} more guideline{remainingCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to extract guidelines from rich content
export const extractGuidelinesFromRichContent = (content: any): GuidelineReference[] => {
  const guidelines: GuidelineReference[] = [];

  if (!content) return guidelines;

  // Extract from rich elements
  if (content.rich_elements) {
    content.rich_elements.forEach((element: any) => {
      if (element.type === 'treatment' && element.data?.guidelines_reference) {
        guidelines.push({
          id: `${element.id}_guideline`,
          title: element.data.guidelines_reference,
          source: 'Clinical Recommendation',
          level: 'high',
          type: 'recommendation'
        });
      }

      if (element.type === 'decision_tree' && element.data?.guidelines_references) {
        element.data.guidelines_references.forEach((ref: string, index: number) => {
          guidelines.push({
            id: `${element.id}_guideline_${index}`,
            title: ref,
            source: 'Decision Tree Reference',
            level: 'medium',
            type: 'evidence'
          });
        });
      }
    });
  }

  // Extract from text content using regex patterns
  if (content.text_content) {
    const text = content.text_content;
    
    // Pattern for clinical guidelines (e.g., "ADA 2024", "ACC/AHA Guidelines")
    const guidelinePatterns = [
      /\b(ADA|ACC\/AHA|ESC|ACP|NICE|WHO)\s+(\d{4}|\w+)\s+[Gg]uidelines?\b/g,
      /\b([A-Z]{2,})\s+(\d{4})\s+recommendations?\b/g,
      /\bAccording to\s+([^,\.]+guidelines?[^,\.]*)/gi
    ];

    guidelinePatterns.forEach((pattern, patternIndex) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        guidelines.push({
          id: `extracted_${patternIndex}_${guidelines.length}`,
          title: match[0],
          source: 'Treatment Plan',
          level: 'medium',
          type: 'recommendation'
        });
      }
    });
  }

  // Remove duplicates
  const uniqueGuidelines = guidelines.filter((guideline, index, self) =>
    index === self.findIndex(g => g.title.toLowerCase() === guideline.title.toLowerCase())
  );

  return uniqueGuidelines;
};

export default ClinicalGuidelinesIndicator; 