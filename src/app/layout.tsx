'use client';

import React from 'react';
import './globals.css';
import dynamic from 'next/dynamic';
import Script from 'next/script';

import PlasmaBackground from '../components/PlasmaBackground';
import GlassHeader from '@/components/layout/GlassHeader';
import GlassSidebar from '@/components/layout/GlassSidebar';
import MotionWrapper from '../components/MotionWrapper';
import { ModalManagerProvider } from '@/components/ui/modal-manager';
import { MinimizedModalBar } from '@/components/ui/minimized-modal-bar';

const DynamicDemoProvider = dynamic(() => 
  import('@/contexts/DemoContext').then((mod) => mod.DemoProvider),
  { ssr: false }
);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Favicons and PWA manifest */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Foresight</title>
        <meta name="description" content="Clinical Decision Support System for healthcare providers" />
        
        {/* Pyodide for Python execution in browser */}
        <Script 
          src="https://cdn.jsdelivr.net/pyodide/v0.27.6/full/pyodide.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>
        <DynamicDemoProvider>
          <ModalManagerProvider>
            <PlasmaBackground />
            <GlassHeader />
            <div className="flex flex-1 overflow-hidden pt-12 h-[calc(100svh-4rem)] min-h-0">
              <GlassSidebar />
              <main className="flex flex-col flex-1 overflow-hidden relative bg-transparent p-2">
                <React.Suspense fallback={<div>Loading page...</div>}>
                  <MotionWrapper>{children}</MotionWrapper>
                </React.Suspense>
              </main>
            </div>
            <MinimizedModalBar />
          </ModalManagerProvider>
        </DynamicDemoProvider>
      </body>
    </html>
  );
}
