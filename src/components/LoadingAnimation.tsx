import React from 'react';
import Image from 'next/image';

const LoadingAnimation = () => {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] w-full">
      <Image src="/slower-load-animation.gif" alt="Loading..." width={100} height={100} />
    </div>
  );
};

export default LoadingAnimation; 