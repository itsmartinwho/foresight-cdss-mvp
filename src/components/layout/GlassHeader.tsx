'use client';

import Link from "next/link";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import QuickSearch from "@/components/ui/QuickSearch";

export default function GlassHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 h-16 flex items-center justify-between px-[clamp(1rem,3vw,2.5rem)] backdrop-blur-sm border-b border-[rgba(255,255,255,0.084)] bg-transparent">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-0">
          <img
            src="/images/word-logo.png"
            alt="Foresight Logo"
            className="h-8 py-0.5 translate-y-[2px]"
          />
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl">
          <QuickSearch
            portal
            inputClassName="h-8 bg-[rgba(255,255,255,0.06)] backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-[rgba(95,243,255,0.4)] focus:outline-none rounded-full px-3 unified-search-input placeholder:text-[#F0F0F0] placeholder:opacity-75 w-full"
          />
        </div>
      </div>
      <div className="flex items-center">
        <Popover>
          <PopoverTrigger asChild>
            <img
              src="https://i.pravatar.cc/32?u=clinician"
              alt="avatar"
              className="rounded-full h-8 w-8 cursor-pointer"
            />
          </PopoverTrigger>
          <PopoverContent className="bg-glass backdrop-blur-sm border border-[rgba(255,255,255,0.084)] rounded-md p-2 flex flex-col">
            <Link href="/analytics" className="px-4 py-2 rounded hover:bg-white/10">
              Analytics
            </Link>
            <Link href="/settings" className="px-4 py-2 rounded hover:bg-white/10">
              Settings
            </Link>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
} 