'use client';

import React from 'react';
import Navbar from '@/components/Navbar';

interface LayoutProps {
  children: React.ReactNode;
  currentPath: string;
}

export default function Layout({ children, currentPath }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar currentPath={currentPath} />
      <main className="layout-wrapper flex-1 pt-16 pb-16 lg:pt-24 lg:pb-24">
        {children}
      </main>
      <footer className="layout-wrapper mt-auto py-6 text-step--1 text-center border-t border-white/10">
        <p className="text-gray-500">
          Foresight Clinical Decision Support System &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
