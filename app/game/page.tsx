'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Canvas, { CanvasHandle, BrushStyle } from '@/components/Canvas';
import Toolbar from '@/components/Toolbar';
import Timer from '@/components/Timer';
import { getGameState, setSessionState } from '@/lib/storage';
import { t } from '@/lib/i18n';
import type { Language, Difficulty } from '@/lib/types';

type Phase = 'loading' | 'drawing' | 'submitting' | 'error';

export default function GamePage() {
  const router = useRouter();
  const canvasRef = useRef<CanvasHandle>(null);

  // Game state (from localStorage)
  const [level, setLevel]       = useState(1);
  const [difficulty, setDiff]   = useState<Difficulty>('normal');
  const [lang, setLang]         = useState<Language>('zh');

  // Tool state
  const [tool, setTool]               = useState<'brush' | 'eraser' | 'fill'>('brush');
  const [brushStyle, setBrushStyle]   = useState<BrushStyle>('normal');
  const [color, setColor]             = useState('#1a1a24');
  const [size, setSize]               = useState(6);

  // Round state
  const [phase, setPhase]     = useState<Phase>('loading');
  const [prompt, setPrompt]   = useState('');
  const [token, setToken]     = useState('');
  const [timedOut, setTimedOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync refs so submit callback can read current values without stale closure
  const phaseRef    = useRef<Phase>('loading');
  const tokenRef    = useRef('');
  const diffRef     = useRef<Difficulty>('normal');
  const langRef     = useRef<Language>('zh');
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { diffRef.current = difficulty; }, [difficulty]);
  useEffect(() => { langRef.current = lang; }, [lang]);

  // ── Init ──────────────────────────────────────────────
  useEffect(() => {
    const state = getGameState();
    setLevel(state.level);
    setDiff(state.difficulty);
    setLang(state.language);
    fetchPrompt(state.level, state.difficulty, state.language);
  }, []);

  async function fetchPrompt(lv: number, diff: Difficulty, language: Language) {
    setPhase('loading');
    try {
      const res = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: lv, difficulty: diff, language }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setPrompt(data.prompt);
      setToken(data.token);
      setSessionState({ prompt: data.prompt, promptToken: data.token, isRetry: false });
      setPhase('drawing');
    } catch {
      setPhase('error');
      setErrorMsg(t(language, 'error.unknown'));
    }
  }

  // ── Submit ────────────────────────────────────────────
  const submit = useCallback(async (expired = false) => {
    if (phaseRef.current !== 'drawing') return;
    setTimedOut(expired);
    setPhase('submitting');

    const imageBase64 = canvasRef.current?.exportPNG() ?? '';

    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          promptToken: tokenRef.current,
          difficulty: diffRef.current,
          language: langRef.current,
        }),
      });

      if (res.status === 400) {
        setPhase('error');
        setErrorMsg(t(langRef.current, 'result.expired'));
        return;
      }
      if (!res.ok) {
        setPhase('error');
        setErrorMsg(t(langRef.current, res.status === 503 ? 'error.serviceBusy' : 'error.unknown'));
        return;
      }

      const result = await res.json();
      setSessionState({
        lastResult: { ...result, timedOut: expired },
        lastImageBase64: imageBase64,
      });
      router.push('/result');
    } catch {
      setPhase('error');
      setErrorMsg(t(langRef.current, 'error.unknown'));
    }
  }, [router]);

  const onTimerExpire = useCallback(() => submit(true), [submit]);

  return (
    <div className="flex flex-col h-screen bg-stone-50 font-sans">

      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-stone-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400 uppercase tracking-widest">
            {t(lang, 'game.level')} {level}
          </span>
          {phase === 'drawing' && (
            <span className="text-sm font-medium text-stone-800 max-w-[50ch] truncate">
              {prompt}
            </span>
          )}
          {phase === 'loading' && (
            <span className="text-sm text-stone-400 italic">{t(lang, 'game.loading')}</span>
          )}
          {phase === 'submitting' && (
            <span className="text-sm text-stone-400 italic">{t(lang, 'game.scoring')}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {phase === 'drawing' && (
            <Timer durationSeconds={180} onExpire={onTimerExpire} paused={phase !== 'drawing'} />
          )}
          {timedOut && (
            <span className="text-xs text-amber-600">{t(lang, 'game.timedOut')}</span>
          )}
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">

        {/* Toolbar */}
        <Toolbar
          tool={tool} brushStyle={brushStyle} color={color} size={size}
          onToolChange={setTool}
          onBrushStyleChange={setBrushStyle}
          onColorChange={setColor}
          onSizeChange={setSize}
          onUndo={() => canvasRef.current?.undo()}
          onRedo={() => canvasRef.current?.redo()}
          onClear={() => canvasRef.current?.clear()}
        />

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center bg-stone-100 p-4 overflow-hidden">
          {phase === 'error' ? (
            <div className="text-center space-y-4">
              <p className="text-stone-600 text-sm">{errorMsg}</p>
              <button
                className="px-6 py-2 border border-stone-700 text-stone-700 text-sm hover:bg-stone-700 hover:text-white transition-colors"
                onClick={() => fetchPrompt(level, difficulty, lang)}
              >
                {t(lang, 'result.newRound')}
              </button>
            </div>
          ) : (
            <div className="w-full max-w-[800px] aspect-[4/3] shadow-sm border border-stone-200">
              <Canvas
                ref={canvasRef}
                brushStyle={brushStyle}
                color={color}
                size={size}
                tool={tool}
                locked={phase !== 'drawing'}
              />
            </div>
          )}
        </div>
      </div>

      {/* Submit bar */}
      {phase === 'drawing' && (
        <footer className="flex justify-end px-6 py-3 border-t border-stone-200 bg-white shrink-0">
          <button
            className="px-8 py-2 bg-red-700 text-white text-sm font-medium tracking-wide hover:bg-red-800 transition-colors"
            onClick={() => submit(false)}
          >
            {t(lang, 'game.submit')}
          </button>
        </footer>
      )}
    </div>
  );
}
