'use client';

import React, { useState, useEffect, useRef } from 'react';
import { UnifiedAlert, AlertSeverity } from '@/types/alerts';
import { AlertTriangle, Info, AlertCircle, X, Clock } from 'lucide-react';

interface AlertToastProps {
  alert: UnifiedAlert;
  duration?: number; // in milliseconds, default 8000 (8 seconds)
  onExpire?: () => void;
  onHover?: () => void;
  onLeave?: () => void;
  onDismiss?: (alertId: string) => void;
  onAccept?: (alertId: string) => void;
}

export const AlertToast: React.FC<AlertToastProps> = ({
  alert,
  duration = 8000,
  onExpire,
  onHover,
  onLeave,
  onDismiss,
  onAccept
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Get icon and styles based on severity
  const getSeverityConfig = () => {
    switch (alert.severity) {
      case AlertSeverity.CRITICAL:
        return {
          icon: AlertTriangle,
          bgColor: 'bg-red-50 border-red-200',
          iconColor: 'text-red-600',
          titleColor: 'text-red-900',
          messageColor: 'text-red-800',
          progressColor: 'bg-red-500'
        };
      case AlertSeverity.WARNING:
        return {
          icon: AlertCircle,
          bgColor: 'bg-amber-50 border-amber-200',
          iconColor: 'text-amber-600',
          titleColor: 'text-amber-900',
          messageColor: 'text-amber-800',
          progressColor: 'bg-amber-500'
        };
      case AlertSeverity.INFO:
      default:
        return {
          icon: Info,
          bgColor: 'bg-blue-50 border-blue-200',
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-900',
          messageColor: 'text-blue-800',
          progressColor: 'bg-blue-500'
        };
    }
  };

  const config = getSeverityConfig();
  const IconComponent = config.icon;

  useEffect(() => {
    if (!isHovered && isVisible) {
      const remaining = timeRemaining;
      
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
        onExpire?.();
      }, remaining);

      // Update time remaining every 100ms for smooth progress bar
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const newTimeRemaining = Math.max(0, duration - elapsed);
        setTimeRemaining(newTimeRemaining);
        
        if (newTimeRemaining <= 0) {
          clearInterval(progressInterval);
        }
      }, 100);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        clearInterval(progressInterval);
      };
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isHovered, timeRemaining, duration, isVisible, onExpire]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onHover?.();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    startTimeRef.current = Date.now(); // Reset timer from current time
    setTimeRemaining(duration); // Reset to full duration
    onLeave?.();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.(alert.id);
  };

  const handleAccept = () => {
    setIsVisible(false);
    onAccept?.(alert.id);
  };

  const progressPercentage = ((duration - timeRemaining) / duration) * 100;

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-4 right-4 max-w-md w-full z-50 transform transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`rounded-lg border shadow-lg ${config.bgColor} overflow-hidden`}>
        {/* Progress bar */}
        {!isHovered && (
          <div className="w-full h-1 bg-gray-200">
            <div 
              className={`h-full transition-all duration-100 ease-linear ${config.progressColor}`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}
        
        <div className="p-4">
          <div className="flex items-start space-x-3">
            {/* Alert Icon */}
            <div className="flex-shrink-0">
              <IconComponent className={`h-6 w-6 ${config.iconColor}`} />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className={`text-sm font-semibold ${config.titleColor}`}>
                    {alert.title}
                  </h4>
                  <p className={`mt-1 text-sm ${config.messageColor}`}>
                    {alert.message}
                  </p>
                  
                  {alert.suggestion && (
                    <div className="mt-2">
                      <p className={`text-xs font-medium ${config.titleColor}`}>
                        Suggested Action:
                      </p>
                      <p className={`text-xs ${config.messageColor}`}>
                        {alert.suggestion}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Close button */}
                <button
                  onClick={handleDismiss}
                  className={`ml-2 flex-shrink-0 p-1 rounded-md hover:bg-gray-100 transition-colors ${config.iconColor} hover:${config.iconColor}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              {/* Action buttons */}
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={handleAccept}
                  className={`px-3 py-1 text-xs font-medium rounded-md border transition-colors ${
                    alert.severity === AlertSeverity.CRITICAL
                      ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                      : alert.severity === AlertSeverity.WARNING
                      ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700'
                      : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Accept & Navigate
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
          
          {/* Metadata */}
          <div className="mt-3 pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <span>Real-time Alert</span>
                {alert.confidenceScore && (
                  <span>Confidence: {Math.round(alert.confidenceScore * 100)}%</span>
                )}
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{new Date(alert.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertToast; 