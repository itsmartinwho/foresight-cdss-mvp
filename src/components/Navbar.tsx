'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MagnifyingGlass as Search, UserCircle as UserIcon } from '@phosphor-icons/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from "@/components/ui/button";

interface NavbarProps {
  currentPath: string;
}

export default function Navbar({ currentPath }: NavbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  const isActive = (path: string) => currentPath === path;

  return (
    <nav className="fixed inset-x-0 top-0 z-30 h-16 backdrop-blur-md bg-[rgba(255,255,255,0.06)] border-b border-[rgba(255,255,255,0.12)]">
      <div className="layout-wrapper h-full flex items-center justify-between">
        {/* Left cluster: Logo and navigation links */}
        <div className="flex items-center">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center">
              <Image src="/images/foresight-icon.png" alt="Foresight Icon" width={32} height={32} className="mr-2" />
              <span className="text-neon font-bold text-step-1">Foresight</span>
            </Link>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
            <Link 
              href="/"
              className={`${
                isActive('/') 
                  ? 'border-blue-500 text-gray-900' 
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
            >
              Dashboard
            </Link>
            <Link 
              href="/patients"
              className={`${
                isActive('/patients') 
                  ? 'border-blue-500 text-gray-900' 
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
            >
              Patients
            </Link>
            <Link 
              href="/advisor"
              className={`${
                isActive('/advisor') 
                  ? 'border-blue-500 text-gray-900' 
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
            >
              Diagnostic Advisor
            </Link>
            <Link
              href="/copilot"
              className={`${
                isActive('/copilot')
                  ? 'border-blue-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
            >
              Co-pilot
            </Link>
          </div>
        </div>

        {/* Center cluster (Search Bar): Takes up remaining space and centers its content */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-5xl">
            {/* Desktop Search Input - hidden on small screens */} 
            <div className="hidden md:block w-full">
              <Input
                id="navbar-desktop-search"
                type="text"
                placeholder="Search…"
                className="unified-search-input h-8 w-full bg-[rgba(255,255,255,0.06)] backdrop-blur-sm text-step-0 focus-visible:ring-2 focus-visible:ring-[rgba(95,243,255,0.4)] focus:outline-none rounded-full px-3"
              />
            </div>
            {/* Mobile Search Button - visible only on small screens, positioned within the search area */}
            {/* This button now primarily serves to open the Sheet, as the input itself is part of the Sheet on mobile. */}
            {/* For consistency, we ensure this button is part of the central cluster, but it's hidden when desktop search is visible. */}
            <div className="md:hidden flex justify-end w-full">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open search"
                onClick={() => setSearchOpen(true)}
                className="text-white hover:bg-white/10 focus-visible:ring-neon"
              >
                <Search className="h-[1em] w-[1em] text-white" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right cluster (User Avatar): Kept to the right */}
        <div className="flex items-center">
          <div className="ml-3 relative"> 
            <Button 
              variant="ghost"
              size="icon" 
              className="focus:ring-2 focus:ring-neon rounded-full h-8 w-8 p-0"
            >
              <span className="sr-only">Open user menu</span>
              <div className="h-full w-full rounded-full bg-neon/20 flex items-center justify-center">
                <span className="text-neon font-medium text-xs">DR</span>
              </div>
            </Button>
          </div>
        </div>

        {/* Mobile Search Sheet - Full width for mobile */}
        <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
          <SheetContent side="top" className="pt-8 pb-4 backdrop-blur-lg bg-[rgba(255,255,255,0.1)] border-b border-[rgba(255,255,255,0.12)]">
            <Input
              id="navbar-mobile-search"
              autoFocus
              type="text"
              placeholder="Search…"
              className="unified-search-input h-9 w-full bg-[rgba(255,255,255,0.06)] backdrop-blur-sm text-step-0 focus-visible:ring-2 focus-visible:ring-[rgba(95,243,255,0.4)] focus:outline-none rounded-full px-4"
            />
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
