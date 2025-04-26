'use client';

import React from 'react';
import Navbar from '@/components/Navbar';

interface LayoutProps {
  children: React.ReactNode;
  currentPath: string;
}

export default function Layout({ children, currentPath }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar currentPath={currentPath} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
      <footer className="bg-white shadow mt-auto py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            Foresight Clinical Decision Support System &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
