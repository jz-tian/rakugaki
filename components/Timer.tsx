'use client';

import { useEffect, useRef, useState } from 'react';

interface TimerProps {
  durationSeconds: number;
  onExpire: () => void;
  paused?: boolean;
}

const R = 19;
const C = 2 * Math.PI * R; // ≈ 119.38

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
  const urgent  = remaining <= 20;
  const fraction = remaining / durationSeconds;
  const offset   = C * (1 - fraction);

  return (
    <div
      className={urgent ? 'animate-timer-urgent' : ''}
      style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}
      aria-live="polite"
      aria-label={`${minutes}:${String(seconds).padStart(2, '0')} remaining`}
    >
      <svg width="48" height="48" viewBox="0 0 48 48" style={{ display: 'block' }}>
        {/* Track */}
        <circle
          cx="24" cy="24" r={R}
          fill="none"
          stroke="var(--rule)"
          strokeWidth="1.5"
        />
        {/* Depleting ring — enso brushstroke feel */}
        <circle
          cx="24" cy="24" r={R}
          fill="none"
          stroke={urgent ? 'var(--beni)' : 'var(--ink-3)'}
          strokeWidth="1.5"
          strokeDasharray={C}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '24px 24px',
            transition: 'stroke-dashoffset 1s linear, stroke 0.8s ease',
          }}
        />
      </svg>

      {/* Time centered inside ring */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <span
          className="font-cormorant tabular-nums"
          style={{
            fontSize: '12px',
            fontWeight: urgent ? 600 : 400,
            letterSpacing: '0.05em',
            color: urgent ? 'var(--beni)' : 'var(--ink-2)',
            transition: 'color 0.8s ease',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          {minutes}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
