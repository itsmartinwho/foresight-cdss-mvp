import ForesightApp from "@/components/ForesightApp";
import React from 'react';

export default function Home() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <ForesightApp />
    </React.Suspense>
  );
}
