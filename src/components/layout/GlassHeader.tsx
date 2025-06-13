'use client';

import Link from "next/link";
import Image from "next/image";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import EnhancedSearch from "@/components/ui/EnhancedSearch";
import { useDemo } from "@/contexts/DemoContext";
import { ArrowClockwise } from '@phosphor-icons/react';
import { useGlassClass } from "@/lib/uiVariant";
import { useUISettings } from "@/contexts/UISettingsContext";
import { cn } from "@/lib/utils";

export default function GlassHeader() {
  const { hasDemoRun, demoStage } = useDemo();
  const { isLiquidGlass } = useUISettings();
  const glassClass = useGlassClass();
  
  const handleResetDemo = () => {
    console.log('Demo reset from header menu');
    localStorage.removeItem('hasDemoRun_v3');
    window.location.reload();
  };

  const headerBase = "fixed inset-x-0 top-0 z-40 h-12 flex items-center justify-between px-[clamp(1rem,3vw,2.5rem)]";
  const legacyNavClasses = "backdrop-blur-xl bg-transparent border-b border-[rgba(255,255,255,0.084)]";
  const liquidNavClasses = "backdrop-blur-2xl bg-white/10 border-b border-white/20";

  return (
    <header className={cn(headerBase, isLiquidGlass ? liquidNavClasses : legacyNavClasses)}>
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-0">
          <Image
            src="/images/word-logo.png"
            alt="Foresight Logo"
            width={90}
            height={24}
            className="h-6 w-auto"
          />
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl">
          <EnhancedSearch
            portal
            inputClassName="h-8 bg-[rgba(255,255,255,0.06)] backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-[rgba(95,243,255,0.4)] focus:outline-none rounded-full px-3 unified-search-input placeholder:text-[#F0F0F0] placeholder:opacity-75 w-full"
            placeholder="Search patients, guidelines, conditions..."
          />
        </div>
      </div>
      <div className="flex items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Image
              src="https://i.pravatar.cc/32?u=clinician"
              alt="avatar"
              width={32}
              height={32}
              className="rounded-full cursor-pointer"
            />
          </PopoverTrigger>
          <PopoverContent className={cn(glassClass, "rounded-md p-2 flex flex-col")}>
            <Link href="/analytics" className="px-4 py-2 rounded hover:bg-white/10">
              Analytics
            </Link>
            <Link href="/settings" className="px-4 py-2 rounded hover:bg-white/10">
              Settings
            </Link>
            {(hasDemoRun || demoStage === 'finished') && (
              <button
                onClick={handleResetDemo}
                className="px-4 py-2 rounded hover:bg-white/10 text-left flex items-center gap-2"
              >
                <ArrowClockwise className="h-4 w-4" />
                Reset Demo
              </button>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
} 