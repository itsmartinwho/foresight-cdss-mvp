'use client';
import React from "react";
import ContentSurface from '@/components/layout/ContentSurface';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { useUISettings } from '@/contexts/UISettingsContext';
import { Button } from '@/components/ui/button';

// SettingsView function from ForesightApp.tsx (approx. lines 1013-1032)
export default function SettingsScreenView() {
  const { uiVariant, setUIVariant, isLiquidGlass } = useUISettings();

  return (
    <ContentSurface fullBleed className="p-6 flex flex-col">
      <div className="mb-6">
        <h1 className="text-step-1 font-semibold">Settings</h1>
      </div>
      
      <div className="space-y-6 flex-1 overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Interface Design</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Glass Design Style</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose between the original glass design or the enhanced liquid glass effect with stronger blur and contrast.
              </p>
              <div className="flex gap-3">
                <Button
                  variant={uiVariant === 'legacy' ? 'secondary' : 'ghost'}
                  onClick={() => setUIVariant('legacy')}
                  className="flex-1"
                >
                  Legacy Glass
                  {uiVariant === 'legacy' && <span className="ml-2 text-xs">(Current)</span>}
                </Button>
                <Button
                  variant={uiVariant === 'liquid' ? 'secondary' : 'ghost'}
                  onClick={() => setUIVariant('liquid')}
                  className="flex-1"
                >
                  Liquid Glass
                  {uiVariant === 'liquid' && <span className="ml-2 text-xs">(Current)</span>}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {isLiquidGlass 
                  ? "Using enhanced blur and contrast for better readability" 
                  : "Using original subtle glass effect"
                }
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-sm text-muted-foreground">
          <p>
            Additional user profile, integrations & alert threshold configuration panels
            will appear here.
          </p>
        </div>
      </div>
    </ContentSurface>
  );
} 