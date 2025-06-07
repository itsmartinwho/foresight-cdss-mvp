'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { DifferentialDiagnosis } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Info, TrendUp, BookOpen, TestTube } from '@phosphor-icons/react';

interface DifferentialDiagnosisCardProps {
  diagnosis: DifferentialDiagnosis;
  rank: number;
  isEditable?: boolean;
  onEdit?: (diagnosis: DifferentialDiagnosis) => void;
}

export default function DifferentialDiagnosisCard({
  diagnosis,
  rank,
  isEditable = false,
  onEdit,
}: DifferentialDiagnosisCardProps) {
  const getLikelihoodColor = (likelihood: string, percentage?: number) => {
    const likelihoodLower = likelihood.toLowerCase();
    if (likelihoodLower === 'high' || (percentage && percentage >= 70)) {
      return 'bg-red-500';
    } else if (likelihoodLower === 'medium' || (percentage && percentage >= 40)) {
      return 'bg-yellow-500';
    } else {
      return 'bg-green-500';
    }
  };

  const getLikelihoodBadgeVariant = (likelihood: string) => {
    const likelihoodLower = likelihood.toLowerCase();
    if (likelihoodLower === 'high') {
      return 'destructive';
    } else if (likelihoodLower === 'medium') {
      return 'default';
    } else {
      return 'secondary';
    }
  };

  return (
    <Card 
      className={cn(
        "w-full transition-all duration-200",
        isEditable && "hover:shadow-md cursor-pointer",
        rank === 1 && "ring-2 ring-primary/50"
      )}
      onClick={isEditable ? () => onEdit?.(diagnosis) : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold text-foreground">
              #{rank} {diagnosis.name}
            </CardTitle>
            {diagnosis.icdCodes && diagnosis.icdCodes.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {diagnosis.icdCodes.map((icd, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {icd.code}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <Badge 
            variant={getLikelihoodBadgeVariant(diagnosis.likelihood)}
            className="shrink-0"
          >
            {diagnosis.likelihood}
          </Badge>
        </div>
        
        {/* Likelihood Progress Bar */}
        {diagnosis.likelihoodPercentage !== undefined && (
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-muted-foreground">Likelihood</span>
              <span className="text-xs font-medium">{diagnosis.likelihoodPercentage}%</span>
            </div>
            <div className="relative w-full h-2 rounded-full bg-primary/20 overflow-hidden">
              <div 
                className={cn("h-full transition-all rounded-full", getLikelihoodColor(diagnosis.likelihood, diagnosis.likelihoodPercentage))}
                style={{ width: `${diagnosis.likelihoodPercentage}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Key Factors */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Key Factors</span>
          </div>
          <p className="text-sm text-foreground pl-6">{diagnosis.keyFactors}</p>
        </div>

        {/* Clinical Explanation */}
        {diagnosis.explanation && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Clinical Explanation</span>
            </div>
            <p className="text-sm text-foreground pl-6">{diagnosis.explanation}</p>
          </div>
        )}

        {/* Supporting Evidence */}
        {diagnosis.supportingEvidence && diagnosis.supportingEvidence.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TestTube className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Supporting Evidence</span>
            </div>
            <ul className="text-sm text-foreground pl-6 space-y-1">
              {diagnosis.supportingEvidence.map((evidence, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 shrink-0" />
                  <span>{evidence}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ICD Codes with Descriptions */}
        {diagnosis.icdCodes && diagnosis.icdCodes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">ICD-10 Codes</span>
            </div>
            <div className="pl-6 space-y-1">
              {diagnosis.icdCodes.map((icd, index) => (
                <div key={index} className="text-sm">
                  <span className="font-mono font-medium">{icd.code}</span>
                  <span className="text-muted-foreground ml-2">{icd.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 