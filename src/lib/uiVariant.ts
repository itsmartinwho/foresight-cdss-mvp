// UI Variant control for Liquid Glass vs Legacy Glass
export const useLiquidGlass = process.env.NEXT_PUBLIC_LIQUID_GLASS === "1";

// Settings-based toggle (will be implemented with context)
export type UIVariant = "legacy" | "liquid";

export const getUIVariant = (): UIVariant => {
  // Check localStorage first, then fall back to environment variable
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('ui-variant');
    if (saved === 'liquid' || saved === 'legacy') {
      return saved;
    }
  }
  // Default to liquid glass unless NEXT_PUBLIC_LIQUID_GLASS explicitly set to "0"
  return process.env.NEXT_PUBLIC_LIQUID_GLASS === "0" ? "legacy" : "liquid";
};

// Helper function to get appropriate glass class based on current UI variant
export const getGlassClass = (variant: "default" | "soft" | "dense" | "backdrop" = "default"): string => {
  const uiVariant = getUIVariant();
  
  if (uiVariant === "liquid") {
    switch (variant) {
      case "soft":
        return "liquid-glass-soft";
      case "dense":
        return "liquid-glass-dense";
      case "backdrop":
        return "liquid-glass-backdrop";
      default:
        return "liquid-glass";
    }
  } else {
    switch (variant) {
      case "soft":
        return "glass-soft";
      case "dense":
        return "glass-dense";
      case "backdrop":
        return "glass-backdrop";
      default:
        return "glass";
    }
  }
};

import { useContext } from 'react';
import { UISettingsContext } from '@/contexts/UISettingsContext';

// React hook: returns correct class based on context (always safe to call in components)
export const useGlassClass = (
  variant: "default" | "soft" | "dense" | "backdrop" = "default"
): string => {
  const context = useContext(UISettingsContext);
  const uiVariant: UIVariant = (context?.uiVariant as UIVariant) ?? getUIVariant();
  return getGlassClassByVariant(uiVariant, variant);
};

function getGlassClassByVariant(uiVariant: UIVariant, variant: string) {
  if (uiVariant === "liquid") {
    switch (variant) {
      case "soft":
        return "liquid-glass-soft";
      case "dense":
        return "liquid-glass-dense";
      case "backdrop":
        return "liquid-glass-backdrop";
      default:
        return "liquid-glass";
    }
  } else {
    switch (variant) {
      case "soft":
        return "glass-soft";
      case "dense":
        return "glass-dense";
      case "backdrop":
        return "glass-backdrop";
      default:
        return "glass";
    }
  }
} 