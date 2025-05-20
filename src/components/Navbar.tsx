'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';

interface NavbarProps {
  currentPath: string;
}

export default function Navbar({ currentPath }: NavbarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  const isActive = (path: string) => currentPath === path;

  return (
    <nav className="fixed inset-x-0 top-0 z-30 h-16 backdrop-blur-md bg-[rgba(255,255,255,0.06)] border-b border-[rgba(255,255,255,0.12)]">
      <div className="layout-wrapper h-full flex items-center justify-between">
        <div className="flex">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center">
              <img src="/images/foresight-icon.png" alt="Foresight Icon" className="h-8 w-8 mr-2" />
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
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-4">
          {/* Search – collapses into sheet on small screens */}
          {/* <div className="hidden md:block">
            <Input
              type="text"
              placeholder="Search…"
              className="unified-search-input placeholder:text-[#F0F0F0] placeholder:opacity-75 h-8 w-64 bg-[rgba(255,255,255,0.06)] backdrop-blur-sm text-step-0 focus-visible:ring-2 focus-visible:ring-[rgba(95,243,255,0.4)] focus:outline-none rounded-full px-3"
            />
          </div>
          <button
            aria-label="Open search"
            className="md:hidden p-2 rounded-full hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-neon"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-[1em] w-[1em] text-white" />
          </button> */}
          <div className="ml-3 relative">
            <button
              type="button"
              className="bg-white/0 flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-neon"
            >
              <span className="sr-only">Open user menu</span>
              <div className="h-8 w-8 rounded-full bg-neon/20 flex items-center justify-center">
                <span className="text-neon font-medium">DR</span>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Search Sheet */}
        {/* <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
          <SheetContent side="top" className="pt-8 pb-4 backdrop-blur-lg bg-[rgba(255,255,255,0.1)] border-b border-[rgba(255,255,255,0.12)]">
            <Input
              autoFocus
              type="text"
              placeholder="Search…"
              className="unified-search-input placeholder:text-[#F0F0F0] placeholder:opacity-75 h-9 w-full bg-[rgba(255,255,255,0.06)] backdrop-blur-sm text-step-0 focus-visible:ring-2 focus-visible:ring-[rgba(95,243,255,0.4)] focus:outline-none rounded-full px-4"
            />
          </SheetContent>
        </Sheet> */}
      </div>
    </nav>
  );
}
