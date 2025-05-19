import React from 'react';
import { cn } from '@/lib/utils';

interface ContentSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * If true the surface will span edge-to-edge without background / blur.
   * Useful for full-bleed visualisations or pages that handle their own layout.
   */
  fullBleed?: boolean;
}

/**
 * Single reusable frosted-glass surface that should wrap all route level
 * content.  It owns padding and max-width so views don't add another layer
 * of nested containers.
 */
export default function ContentSurface({
  children,
  className,
  fullBleed = false,
  ...rest
}: ContentSurfaceProps) {
  if (fullBleed) {
    return (
      <div className={cn('flex flex-col flex-1', className)} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'glass-soft rounded-2xl p-6 mx-auto my-6 max-w-7xl w-full',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
} 