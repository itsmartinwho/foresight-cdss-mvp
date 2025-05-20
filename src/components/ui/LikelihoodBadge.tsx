'use client';
import React from 'react';

export default function LikelihoodBadge({ likelihood }: { likelihood?: number }) {
  const level = likelihood !== undefined ? likelihood : 0;
  const color =
    level >= 5 ? "bg-red-600 text-white" :
    level >= 4 ? "bg-red-400 text-white" :
    level >= 3 ? "bg-orange-400 text-white" :
    level >= 2 ? "bg-yellow-400 text-black" :
    level >= 1 ? "bg-green-300 text-black" :
    "bg-green-100 text-black";
  return (
    <span className={`${color} text-xs px-2 py-0.5 rounded-full`}>
      {level}
    </span>
  );
} 