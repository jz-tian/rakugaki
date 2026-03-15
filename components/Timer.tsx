'use client';

import { useEffect, useRef, useState } from 'react';

interface TimerProps {
  durationSeconds: number;
  onExpire: () => void;
  paused?: boolean;
}

export default function Timer({ durationSeconds, onExpire, paused = false }: TimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const onExpireRef = useRef(onExpire);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setTimeout(() => onExpireRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const urgent  = remaining <= 30;

  return (
    <span
      className={`font-mono text-sm tabular-nums transition-colors ${
        urgent ? 'text-red-600 font-semibold' : 'text-stone-500'
      }`}
      aria-live="polite"
      aria-label={`${minutes}:${String(seconds).padStart(2, '0')} remaining`}
    >
      {minutes}:{String(seconds).padStart(2, '0')}
    </span>
  );
}
