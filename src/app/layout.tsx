// Removed 'use client';

import { Metadata } from 'next';
import './globals.css';
// Removed AnimatePresence and motion imports from here
import MotionWrapper from '../components/MotionWrapper'; // Import the new MotionWrapper

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
        <MotionWrapper>{children}</MotionWrapper> {/* Use MotionWrapper here */}
      </body>
    </html>
  );
}
