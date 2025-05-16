import ForesightApp from "@/components/ForesightApp";
import React from 'react';

export default function Home() {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <img src="/load-animation-small-quick.gif" alt="Loading..." />
      </div>
    }>
      <ForesightApp />
    </React.Suspense>
  );
}
