'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CaretUp as ChevronUp } from '@phosphor-icons/react';

interface SectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  headerClassName?: string;
  contentClassName?: string;
  collapsedSummary?: string;
}

export default function Section({
  title,
  children,
  className,
  collapsible = false,
  defaultOpen = true,
  headerClassName,
  contentClassName,
  collapsedSummary,
}: SectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  if (!collapsible) {
    return (
      <section className={cn("mb-8 last:mb-0", className)}>
        <h2 className={cn("text-step-1 font-bold mb-6 text-foreground", headerClassName)}>
          {title}
        </h2>
        <div className={cn("space-y-4", contentClassName)}>
          {children}
        </div>
      </section>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("mb-8 last:mb-0", className)}>
      <CollapsibleTrigger className={cn(
        "flex items-center justify-between w-full text-left group hover:text-neon transition-all duration-200 p-3 rounded-lg hover:bg-foreground/5 cursor-pointer",
        headerClassName
      )}>
        <div className="flex items-center gap-3">
          <h2 className="text-step-1 font-bold text-foreground group-hover:text-neon transition-colors">
            {title}
          </h2>
          {!isOpen && collapsedSummary && (
            <span className="text-sm text-muted-foreground font-normal">
              - {collapsedSummary}
            </span>
          )}
        </div>
        <ChevronUp 
          className={cn(
            "h-5 w-5 text-muted-foreground group-hover:text-neon transition-all duration-300 ease-in-out",
            isOpen ? "rotate-0" : "rotate-180"
          )} 
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
        <div className={cn("pt-6 space-y-4 transition-all duration-300 ease-in-out", contentClassName)}>
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
} 