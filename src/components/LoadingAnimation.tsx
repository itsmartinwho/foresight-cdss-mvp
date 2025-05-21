import React from 'react';

const LoadingAnimation = () => {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] w-full">
      <img src="/slower-load-animation.gif" alt="Loading..." />
    </div>
  );
};

export default LoadingAnimation; 