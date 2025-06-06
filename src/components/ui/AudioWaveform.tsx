import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, Mic, MicOff } from 'lucide-react';
import { Button } from './button';

interface AudioWaveformProps {
  isRecording: boolean;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  className?: string;
  height?: number;
  barCount?: number;
  barColor?: string;
  backgroundColor?: string;
  showMicIcon?: boolean;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isRecording,
  isPaused,
  onPause,
  onResume,
  onStop,
  className = '',
  height = 40,
  barCount = 20,
  barColor = '#22c55e', // green-500
  backgroundColor = 'transparent',
  showMicIcon = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const streamRef = useRef<MediaStream>();
  const [hasPermission, setHasPermission] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initAudio = async () => {
      if (isRecording && !isPaused && !isInitialized) {
        try {
          // Request microphone permission
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;
          setHasPermission(true);

          // Create audio context and analyser
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = audioContext;

          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          analyserRef.current = analyser;

          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);

          setIsInitialized(true);
        } catch (error) {
          console.error('Error accessing microphone:', error);
          setHasPermission(false);
        }
      } else if ((!isRecording || isPaused) && isInitialized) {
        // Pause the animation but keep the audio context for resume
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        
        // Only clean up completely when stopping
        if (!isRecording) {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
          if (audioContextRef.current) {
            audioContextRef.current.close();
          }
          setIsInitialized(false);
        }
      }
    };

    initAudio();

    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, isPaused, isInitialized]);

  useEffect(() => {
    if (!isRecording || isPaused || !isInitialized || !analyserRef.current || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate bar dimensions
      const barWidth = 2;
      const barSpacing = 3;
      const totalBarsWidth = barCount * barWidth + (barCount - 1) * barSpacing;
      const startX = (canvas.width - totalBarsWidth) / 2;

      // Draw bars
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const barHeight = Math.max(2, (dataArray[dataIndex] / 255) * canvas.height * 0.8);
        
        const x = startX + i * (barWidth + barSpacing);
        const y = (canvas.height - barHeight) / 2;

        ctx.fillStyle = barColor;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, isPaused, isInitialized, barCount, barColor]);

  // Draw idle state when not recording or paused
  useEffect(() => {
    if (!canvasRef.current || (isRecording && !isPaused)) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw idle bars at minimum height
    const barWidth = 2;
    const barSpacing = 3;
    const totalBarsWidth = barCount * barWidth + (barCount - 1) * barSpacing;
    const startX = (canvas.width - totalBarsWidth) / 2;
    const minBarHeight = 4;

    ctx.fillStyle = isPaused ? `${barColor}80` : `${barColor}40`; // More transparent when idle
    for (let i = 0; i < barCount; i++) {
      const x = startX + i * (barWidth + barSpacing);
      const y = (canvas.height - minBarHeight) / 2;
      ctx.fillRect(x, y, barWidth, minBarHeight);
    }
  }, [isRecording, isPaused, barCount, barColor]);

  if (!isRecording) return null;

  return (
    <div className={`inline-flex items-center gap-3 px-4 py-2 bg-secondary/50 backdrop-blur-sm border border-border/50 rounded-full shadow-sm ${className}`}>
      {/* Waveform */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={80}
          height={height}
          className="block"
          style={{ backgroundColor }}
        />
        
        {!hasPermission && (
          <div className="absolute inset-0 flex items-center justify-center">
            <MicOff size={16} className="text-destructive" />
          </div>
        )}
      </div>
      
      {/* Microphone indicator */}
      {showMicIcon && (
        <div className={`flex items-center ${isRecording && !isPaused ? 'text-green-500' : 'text-muted-foreground'}`}>
          <Mic size={16} />
        </div>
      )}
      
      {/* Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={isPaused ? onResume : onPause}
          className="h-8 w-8 p-0"
          title={isPaused ? "Resume Recording" : "Pause Recording"}
        >
          {isPaused ? <Play size={14} /> : <Pause size={14} />}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onStop}
          className="h-8 px-2 text-xs text-destructive hover:text-destructive"
          title="Stop Recording"
        >
          Stop
        </Button>
      </div>
      
      {/* Status text */}
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {isPaused ? "Paused" : "Recording..."}
      </span>
    </div>
  );
}; 