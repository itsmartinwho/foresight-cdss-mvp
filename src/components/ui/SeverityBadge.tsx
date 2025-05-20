'use client';
import React from 'react';

export default function SeverityBadge({ severity }: { severity: string }) {
  const color =
    severity === "High"
      ? "bg-red-600"
      : severity === "Medium"
      ? "bg-orange-500"
      : "bg-slate-500";
  return (
    <span className={`${color} text-white text-xs px-2 py-0.5 rounded-full`}>
      {severity}
    </span>
  );
} 