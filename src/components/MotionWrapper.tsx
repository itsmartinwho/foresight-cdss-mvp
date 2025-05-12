'use client';

import { AnimatePresence } from 'framer-motion';
import React from 'react';
import { usePathname } from 'next/navigation';

interface MotionWrapperProps {
  children: React.ReactNode;
}

export default function MotionWrapper({ children }: MotionWrapperProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      {children}
    </AnimatePresence>
  );
} 