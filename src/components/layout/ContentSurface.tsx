import React from 'react';
import { cn } from '@/lib/utils';
import { useGlassClass } from '@/lib/uiVariant';

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
  const glassClass = useGlassClass('soft');
  
  if (fullBleed) {
    return (
      <div
        className={cn(
          'flex flex-col flex-1 min-h-0 h-full overflow-x-hidden',
          className
        )}
        {...rest}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        glassClass,
        'rounded-2xl p-4 mx-auto max-w-7xl w-full',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
} 