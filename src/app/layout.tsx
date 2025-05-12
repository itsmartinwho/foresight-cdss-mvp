// Removed 'use client';

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
      <body>
        <PlasmaBackground />
        <GlassHeader />
        <div className="flex flex-1 overflow-hidden pt-16"> {/* content area below header */}
          <GlassSidebar />
          <main className="flex-1 overflow-y-auto bg-background/60 backdrop-blur-md relative">
            <MotionWrapper>{children}</MotionWrapper>
          </main>
        </div>
        {process.env.NEXT_PUBLIC_ENABLE_NEW_UI !== 'false' && <IridescentBg />}
      </body>
    </html>
  );
}
