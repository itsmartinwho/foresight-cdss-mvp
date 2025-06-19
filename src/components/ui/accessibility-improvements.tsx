// Accessibility improvements for rich content components
import React from 'react';

// Screen reader announcement component
export const ScreenReaderAnnouncement: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div 
      role="status" 
      aria-live="polite" 
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
};

// Accessible button with proper ARIA attributes
export const AccessibleButton: React.FC<{
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  disabled?: boolean;
  className?: string;
}> = ({ onClick, children, ariaLabel, ariaDescribedBy, disabled = false, className = "" }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={`focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
      type="button"
    >
      {children}
    </button>
  );
};

// Accessible expandable section
export const AccessibleExpandableSection: React.FC<{
  title: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}> = ({ title, children, isExpanded, onToggle, level = 3 }) => {
  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
  const contentId = `expandable-content-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const buttonId = `expandable-button-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="border border-gray-200 rounded-md">
      <HeadingTag className="m-0">
        <button
          id={buttonId}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          onClick={onToggle}
          className="w-full flex items-center justify-between p-3 text-left bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
        >
          <span className="font-medium text-gray-900">{title}</span>
          <span aria-hidden="true" className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
      </HeadingTag>
      
      <div
        id={contentId}
        role="region"
        aria-labelledby={buttonId}
        className={`${isExpanded ? 'block' : 'hidden'} p-3 border-t border-gray-200`}
      >
        {children}
      </div>
    </div>
  );
};

// Skip link for keyboard navigation
export const SkipLink: React.FC<{ targetId: string; text: string }> = ({ targetId, text }) => {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:text-sm"
    >
      {text}
    </a>
  );
};

// Accessible loading state
export const AccessibleLoadingState: React.FC<{ message?: string }> = ({ 
  message = "Loading content, please wait..." 
}) => {
  return (
    <div 
      role="status" 
      aria-live="polite"
      className="flex items-center justify-center p-4"
    >
      <div 
        className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"
        aria-hidden="true"
      />
      <span className="ml-3 text-sm text-gray-600">{message}</span>
    </div>
  );
};

// Accessible error state
export const AccessibleErrorState: React.FC<{ 
  error: string; 
  onRetry?: () => void; 
  retryLabel?: string 
}> = ({ error, onRetry, retryLabel = "Try again" }) => {
  return (
    <div 
      role="alert" 
      aria-live="assertive"
      className="p-4 bg-red-50 border border-red-200 rounded-md"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-red-400" aria-hidden="true">⚠️</span>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <p className="mt-1 text-sm text-red-700">{error}</p>
          {onRetry && (
            <div className="mt-3">
              <button
                onClick={onRetry}
                className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                {retryLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Accessible form field wrapper
export const AccessibleFormField: React.FC<{
  label: string;
  children: React.ReactNode;
  error?: string;
  helpText?: string;
  required?: boolean;
  fieldId: string;
}> = ({ label, children, error, helpText, required = false, fieldId }) => {
  const errorId = error ? `${fieldId}-error` : undefined;
  const helpId = helpText ? `${fieldId}-help` : undefined;

  return (
    <div className="space-y-1">
      <label 
        htmlFor={fieldId}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>
      
      <div className="relative">
        {React.cloneElement(children as React.ReactElement, {
          id: fieldId,
          'aria-describedby': [helpId, errorId].filter(Boolean).join(' ') || undefined,
          'aria-invalid': error ? 'true' : undefined,
          'aria-required': required
        })}
      </div>
      
      {helpText && (
        <p id={helpId} className="text-sm text-gray-500">
          {helpText}
        </p>
      )}
      
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

// High contrast mode detection hook
export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return isHighContrast;
};

// Reduced motion detection hook
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return prefersReducedMotion;
};

// Focus management utilities
export const focusUtils = {
  // Trap focus within an element
  trapFocus: (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  },

  // Save and restore focus
  saveFocus: () => {
    const activeElement = document.activeElement as HTMLElement;
    return () => {
      if (activeElement && activeElement.focus) {
        activeElement.focus();
      }
    };
  }
};

export default {
  ScreenReaderAnnouncement,
  AccessibleButton,
  AccessibleExpandableSection,
  SkipLink,
  AccessibleLoadingState,
  AccessibleErrorState,
  AccessibleFormField,
  useHighContrastMode,
  useReducedMotion,
  focusUtils
}; 