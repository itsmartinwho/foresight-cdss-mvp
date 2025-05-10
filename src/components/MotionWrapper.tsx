'use client';

import { AnimatePresence } from 'framer-motion';
import React from 'react';

interface MotionWrapperProps {
  children: React.ReactNode;
}

export default function MotionWrapper({ children }: MotionWrapperProps) {
  return <AnimatePresence mode="wait">{children}</AnimatePresence>;
} 