'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { DifferentialDiagnosis } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Info, TrendUp, BookOpen, TestTube } from '@phosphor-icons/react';
import LikelihoodIndicator from './LikelihoodIndicator';

interface DifferentialDiagnosisCardProps {
  diagnosis: DifferentialDiagnosis;
  isEditable?: boolean;
  onEdit?: (diagnosis: DifferentialDiagnosis) => void;
}

export default function DifferentialDiagnosisCard({
  diagnosis,
  isEditable = false,
  onEdit,
}: DifferentialDiagnosisCardProps) {

  return (
    <Card 
      className={cn(
        "w-full transition-all duration-200",
        isEditable && "hover:shadow-md cursor-pointer",
        diagnosis.rank === 1 && "ring-2 ring-primary/50"
      )}
      onClick={isEditable ? () => onEdit?.(diagnosis) : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold text-foreground">
              #{diagnosis.rank} {diagnosis.name}
            </CardTitle>
            {Array.isArray(diagnosis.icdCodes) && diagnosis.icdCodes.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {(diagnosis.icdCodes || []).map((icd, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {icd.code}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <LikelihoodIndicator 
          probabilityDecimal={diagnosis.probabilityDecimal}
          showPercentage={true}
          showProgressBar={true}
          size="md"
        />

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
        {Array.isArray(diagnosis.supportingEvidence) && diagnosis.supportingEvidence.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TestTube className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Supporting Evidence</span>
            </div>
            <ul className="text-sm text-foreground pl-6 space-y-1">
              {(diagnosis.supportingEvidence || []).map((evidence, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 shrink-0" />
                  <span>{evidence}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ICD Codes with Descriptions */}
        {Array.isArray(diagnosis.icdCodes) && diagnosis.icdCodes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">ICD-10 Codes</span>
            </div>
            <div className="pl-6 space-y-1">
              {(diagnosis.icdCodes || []).map((icd, index) => (
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