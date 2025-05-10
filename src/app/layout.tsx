'use client';

import { Metadata } from 'next';
import './globals.css';
import { AnimatePresence, motion } from 'framer-motion';

export const metadata: Metadata = {
  title: 'Foresight',
  description: 'Clinical Decision Support System for healthcare providers',
  icons: {
    icon: '/favicon.ico',
    apple: '/images/foresight-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </body>
    </html>
  );
}
