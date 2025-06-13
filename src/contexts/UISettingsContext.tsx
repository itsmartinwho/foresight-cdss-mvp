'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UIVariant = 'legacy' | 'liquid';

interface UISettingsContextType {
  uiVariant: UIVariant;
  setUIVariant: (variant: UIVariant) => void;
  isLiquidGlass: boolean;
}

const UISettingsContext = createContext<UISettingsContextType | undefined>(undefined);

export function UISettingsProvider({ children }: { children: React.ReactNode }) {
  const [uiVariant, setUIVariantState] = useState<UIVariant>('liquid');

  // Load saved preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ui-variant');
    if (saved === 'liquid' || saved === 'legacy') {
      setUIVariantState(saved);
    } else {
      // No saved preference – default to liquid glass unless environment forces legacy
      const envForceLegacy = process.env.NEXT_PUBLIC_LIQUID_GLASS === "0";
      setUIVariantState(envForceLegacy ? 'legacy' : 'liquid');
    }
  }, []);

  const setUIVariant = (variant: UIVariant) => {
    setUIVariantState(variant);
    localStorage.setItem('ui-variant', variant);
  };

  const isLiquidGlass = uiVariant === 'liquid';

  return (
    <UISettingsContext.Provider value={{ uiVariant, setUIVariant, isLiquidGlass }}>
      {children}
    </UISettingsContext.Provider>
  );
}

export function useUISettings() {
  const context = useContext(UISettingsContext);
  if (context === undefined) {
    throw new Error('useUISettings must be used within a UISettingsProvider');
  }
  return context;
} 