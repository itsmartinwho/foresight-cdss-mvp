'use client';

import React, { useState, useEffect, useRef } from 'react';
import { UnifiedAlert, AlertSeverity } from '@/types/alerts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info, AlertCircle, X } from 'lucide-react';

interface AlertToastProps {
  alert: UnifiedAlert;
  duration?: number;
  onExpire?: () => void;
  onClose?: () => void; // Only close functionality needed
  onHover?: () => void;
  onLeave?: () => void;
}

export const AlertToast: React.FC<AlertToastProps> = ({
  alert,
  duration = 8000,
  onExpire,
  onClose,
  onHover,
  onLeave
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const pausedTimeRef = useRef<number>(0);

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case AlertSeverity.WARNING:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case AlertSeverity.INFO:
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return 'border-red-500 bg-red-50';
      case AlertSeverity.WARNING:
        return 'border-yellow-500 bg-yellow-50';
      case AlertSeverity.INFO:
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300); // Allow time for exit animation
  };

  const updateProgress = () => {
    const elapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
    const remaining = Math.max(0, duration - elapsed);
    const progressPercent = (remaining / duration) * 100;
    
    setProgress(progressPercent);
    
    if (remaining <= 0) {
      onExpire?.();
      handleClose();
    }
  };

  // Auto-expire timer
  useEffect(() => {
    if (!isPaused && isVisible) {
      timerRef.current = setInterval(updateProgress, 50);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPaused, isVisible, duration]);

  // Mouse handlers
  const handleMouseEnter = () => {
    setIsPaused(true);
    pausedTimeRef.current = Date.now() - startTimeRef.current - pausedTimeRef.current;
    onHover?.();
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    startTimeRef.current = Date.now() - pausedTimeRef.current;
    onLeave?.();
  };

  // Touch handlers for swipe-to-close
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaX = e.touches[0].clientX - startX;
    setCurrentX(Math.max(0, deltaX)); // Only allow right swipe
  };

  const handleTouchEnd = () => {
    if (currentX > 100) { // Swipe threshold
      handleClose();
    } else {
      setCurrentX(0);
    }
    setIsDragging(false);
    setIsPaused(false);
  };

  const toastStyle = {
    transform: `translateX(${currentX}px)`,
    opacity: currentX > 50 ? 1 - (currentX / 200) : 1,
    transition: isDragging ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Card 
      className={`
        ${getSeverityColor(alert.severity)} 
        border-l-4 shadow-lg cursor-pointer transition-all duration-300 min-w-80 max-w-96
        ${isVisible ? 'animate-in slide-in-from-right' : 'animate-out slide-out-to-right'}
      `}
      style={toastStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            {getSeverityIcon(alert.severity)}
            <CardTitle className="text-sm font-medium line-clamp-2">
              {alert.title}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-gray-200/50"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 pb-3">
        <p className="text-sm text-gray-700 mb-2 line-clamp-3">
          {alert.message}
        </p>
        
        {alert.suggestion && (
          <p className="text-xs text-gray-600 italic">
            <strong>Suggestion:</strong> {alert.suggestion}
          </p>
        )}

        <div className="flex items-center justify-between mt-3">
          <Badge variant="outline" className="text-xs">
            {alert.severity}
          </Badge>
          
          {alert.confidenceScore && (
            <span className="text-xs text-gray-500">
              {Math.round(alert.confidenceScore * 100)}% confidence
            </span>
          )}
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-1 mt-3">
          <div 
            className="bg-gray-400 h-1 rounded-full transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertToast; 