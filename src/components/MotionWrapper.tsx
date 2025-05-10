'use client';

import { AnimatePresence, motion } from 'framer-motion';
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
      <motion.div 
        key={pathname}
        className="pointer-events-none fixed inset-0 z-50 specular-flash" 
        initial={{scale:.8,opacity:.15}} 
        animate={{scale:1.8,opacity:0}} 
        transition={{duration:.18,ease:'easeOut'}}
      />
    </AnimatePresence>
  );
} 