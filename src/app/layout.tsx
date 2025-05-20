// Removed 'use client';

import React from 'react';
import './globals.css';
import { Metadata } from 'next';
import MotionWrapper from '../components/MotionWrapper';
import GlassHeader from '@/components/layout/GlassHeader';
import GlassSidebar from '@/components/layout/GlassSidebar';
import dynamic from 'next/dynamic';
import PlasmaBackground from '../components/PlasmaBackground';

export const metadata: Metadata = {
  title: 'Foresight',
  description: 'Clinical Decision Support System for healthcare providers',
  icons: {
    icon: '/favicon.ico',
    apple: '/images/foresight-icon.png',
  },
};

const IridescentBg = dynamic(() => import('../components/IridescentCanvas'));

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload the loading animation GIF so it appears instantly on subsequent route changes */}
        <link rel="preload" as="image" href="/load-animation-small-quick.gif" />
      </head>
      <body>
        <PlasmaBackground />
        <GlassHeader />
        <div className="flex flex-1 overflow-hidden pt-16 h-[calc(100svh-4rem)] min-h-0"> {/* content area below header */}
          <GlassSidebar />
          <main className="flex flex-col flex-1 overflow-hidden relative">
            <MotionWrapper>{children}</MotionWrapper>
          </main>
        </div>
        {process.env.NEXT_PUBLIC_ENABLE_NEW_UI !== 'false' && <IridescentBg />}
      </body>
    </html>
  );
}
