'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useDemoOrchestrator, UseDemoOrchestratorReturn } from '@/hooks/demo/useDemoOrchestrator';

const DemoContext = createContext<UseDemoOrchestratorReturn | undefined>(undefined);

interface DemoProviderProps {
  children: ReactNode;
}

export const DemoProvider = ({ children }: DemoProviderProps) => {
  const demoOrchestrator = useDemoOrchestrator();

  return (
    <DemoContext.Provider value={demoOrchestrator}>
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = (): UseDemoOrchestratorReturn => {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}; 