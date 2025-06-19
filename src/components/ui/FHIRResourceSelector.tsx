'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FHIRResourceType } from '@/lib/types';

interface FHIRResourceSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  resourceTypes: FHIRResourceType[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function FHIRResourceSelector({
  value,
  onValueChange,
  resourceTypes,
  placeholder = "Select FHIR resource type",
  disabled = false,
  className = ""
}: FHIRResourceSelectorProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-muted-foreground">
        FHIR Resource Type
      </label>
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {resourceTypes.map((resourceType) => (
            <SelectItem 
              key={resourceType.value} 
              value={resourceType.value}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{resourceType.label}</span>
                <span className="text-xs text-muted-foreground">
                  - {resourceType.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 