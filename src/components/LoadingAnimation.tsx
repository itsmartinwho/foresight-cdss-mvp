import React from 'react';
import Image from 'next/image';

interface LoadingAnimationProps {
  customText?: string;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ customText }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Image src="/slower-load-animation.gif" alt="Loading..." width={100} height={100} priority
        style={{ width: 'auto', height: 'auto' }}
      />
      {customText && <p className="mt-4 text-lg">{customText}</p>}
    </div>
  );
};

export default LoadingAnimation; 