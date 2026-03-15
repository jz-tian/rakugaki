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

/* Thin beni-red vertical sep */
function Kiri() {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: '1px',
        height: '14px',
        background: 'var(--rule)',
        verticalAlign: 'middle',
        margin: '0 12px',
        flexShrink: 0,
      }}
    />
  );
}

export default function GamePage() {
  const router = useRouter();
  const canvasRef = useRef<CanvasHandle>(null);

  // Game state (from localStorage)
  const [level, setLevel]     = useState(1);
  const [difficulty, setDiff] = useState<Difficulty>('normal');
  const [lang, setLang]       = useState<Language>('zh');

  // Tool state
  const [tool, setTool]             = useState<'brush' | 'eraser' | 'fill'>('brush');
  const [brushStyle, setBrushStyle] = useState<BrushStyle>('normal');
  const [color, setColor]           = useState('#1a1a24');
  const [size, setSize]             = useState(6);

  // Round state
  const [phase, setPhase]             = useState<Phase>('loading');
  const [prompt, setPrompt]           = useState('');
  const [token, setToken]             = useState('');
  const [timedOut, setTimedOut]       = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');
  const [showGiveUpDialog, setShowGiveUpDialog] = useState(false);

  // Sync refs — keep submit callback stable without stale closures
  const phaseRef = useRef<Phase>('loading');
  const tokenRef = useRef('');
  const diffRef  = useRef<Difficulty>('normal');
  const langRef  = useRef<Language>('zh');
  useEffect(() => { phaseRef.current = phase; },      [phase]);
  useEffect(() => { tokenRef.current = token; },      [token]);
  useEffect(() => { diffRef.current  = difficulty; }, [difficulty]);
  useEffect(() => { langRef.current  = lang; },       [lang]);

  // ── Init ────────────────────────────────────────────
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

  // ── Submit ──────────────────────────────────────────
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
          difficulty:  diffRef.current,
          language:    langRef.current,
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
      setSessionState({ lastResult: { ...result, timedOut: expired }, lastImageBase64: imageBase64 });
      router.push('/result');
    } catch {
      setPhase('error');
      setErrorMsg(t(langRef.current, 'error.unknown'));
    }
  }, [router]);

  const onTimerExpire = useCallback(() => submit(true), [submit]);

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Header ────────────────────────────────── */}
      <header
        className="beni-bar relative shrink-0 flex items-center justify-between px-6"
        style={{
          height: '62px',
          background: 'var(--surface)',
          borderBottom: '0.5px solid var(--rule)',
        }}
      >
        {/* Left: level badge + prompt */}
        <div className="flex items-center min-w-0 flex-1">

          {/* Level — Japanese-style */}
          <div className="shrink-0 flex items-center gap-1.5">
            <span
              className="font-shippori"
              style={{ fontSize: '12px', letterSpacing: '0.18em', color: 'var(--beni)' }}
            >
              {lang === 'zh' ? '第' : 'Lv.'}
            </span>
            <span
              className="font-cormorant"
              style={{ fontSize: '1.4rem', lineHeight: 1, color: 'var(--beni)', fontWeight: 400 }}
            >
              {level}
            </span>
            {lang === 'zh' && (
              <span
                className="font-shippori"
                style={{ fontSize: '12px', letterSpacing: '0.18em', color: 'var(--beni)' }}
              >
                関
              </span>
            )}
          </div>

          <Kiri />

          {/* Prompt / status text */}
          {(phase === 'drawing' || phase === 'submitting') && prompt && (
            <span
              className="font-shippori truncate"
              style={{
                fontSize: '0.95rem',
                color: 'var(--ink)',
                letterSpacing: '0.06em',
                lineHeight: 1.4,
              }}
            >
              {prompt}
            </span>
          )}

          {phase === 'loading' && (
            <span
              className="font-cormorant italic animate-loading-pulse"
              style={{ fontSize: '1rem', color: 'var(--ink-3)' }}
            >
              {t(lang, 'game.loading')}
            </span>
          )}

          {phase === 'submitting' && (
            <>
              <Kiri />
              <span
                className="font-cormorant italic animate-loading-pulse shrink-0"
                style={{ fontSize: '1rem', color: 'var(--ink-2)' }}
              >
                {t(lang, 'game.scoring')}
              </span>
            </>
          )}
        </div>

        {/* Right: timer + timed-out */}
        <div className="flex items-center gap-5 shrink-0 ml-4">
          {timedOut && (
            <span
              className="font-shippori"
              style={{ fontSize: '12px', letterSpacing: '0.12em', color: '#a07830' }}
            >
              {t(lang, 'game.timedOut')}
            </span>
          )}
          {phase === 'drawing' && (
            <Timer durationSeconds={90} onExpire={onTimerExpire} paused={phase !== 'drawing'} />
          )}
        </div>
      </header>

      {/* ── Main: toolbar + canvas ────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        <Toolbar
          tool={tool} brushStyle={brushStyle} color={color} size={size} lang={lang}
          onToolChange={setTool}
          onBrushStyleChange={setBrushStyle}
          onColorChange={setColor}
          onSizeChange={setSize}
          onUndo={() => canvasRef.current?.undo()}
          onRedo={() => canvasRef.current?.redo()}
          onClear={() => canvasRef.current?.clear()}
        />

        {/* Canvas area — washi dot-grid ground */}
        <div
          className="flex-1 flex items-center justify-center overflow-hidden washi-grid"
          style={{ padding: '28px' }}
        >
          {phase === 'error' ? (
            <div className="text-center" style={{ maxWidth: '360px' }}>
              {/* Decorative kanji 失敗 error feel */}
              <p
                className="font-shippori"
                style={{
                  fontSize: '0.82rem',
                  letterSpacing: '0.25em',
                  color: 'var(--beni)',
                  marginBottom: '14px',
                  textTransform: 'uppercase',
                }}
              >
                エラー
              </p>
              <p
                className="font-cormorant italic"
                style={{ fontSize: '1.1rem', color: 'var(--ink-2)', marginBottom: '32px', lineHeight: 1.7 }}
              >
                {errorMsg}
              </p>
              <button
                onClick={() => fetchPrompt(level, difficulty, lang)}
                style={{
                  color: 'var(--beni)',
                  border: '1px solid var(--beni)',
                  background: 'transparent',
                  padding: '10px 36px',
                  fontFamily: 'var(--font-cormorant)',
                  fontSize: '1.1rem',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  borderRadius: '2px',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--beni)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--surface)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--beni)';
                }}
              >
                {t(lang, 'result.newRound')}
              </button>
            </div>
          ) : (
            /* Canvas card — paper sheet on washi ground */
            <div
              className="w-full max-w-[800px] aspect-[4/3] relative"
              style={{
                boxShadow: '0 2px 8px oklch(13% 0.018 258 / 0.08), 0 12px 40px oklch(13% 0.018 258 / 0.12)',
                border: '0.5px solid var(--rule)',
              }}
            >
              {/* Corner marks — like manuscript paper registration marks */}
              {(['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'] as const).map((pos, i) => (
                <div
                  key={i}
                  className={`absolute ${pos} w-4 h-4 pointer-events-none`}
                  style={{ zIndex: 2 }}
                >
                  <svg
                    viewBox="0 0 16 16" fill="none"
                    style={{
                      width: '16px', height: '16px',
                      transform: `rotate(${i * 90}deg)`,
                    }}
                  >
                    <path d="M1 15 L1 1 L15 1" stroke="var(--beni)" strokeWidth="1.2" strokeLinecap="round" opacity="0.45"/>
                  </svg>
                </div>
              ))}

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

      {/* ── Submit footer ─────────────────────────── */}
      {phase === 'drawing' && (
        <footer
          className="shrink-0 flex items-center justify-between px-6 py-4"
          style={{
            background: 'var(--surface)',
            borderTop: '0.5px solid var(--rule)',
          }}
        >
          {/* Left: give up button */}
          <button
            onClick={() => setShowGiveUpDialog(true)}
            className="font-cormorant tracking-[0.1em]"
            style={{
              color: 'var(--ink-3)',
              border: '1px solid var(--rule)',
              background: 'transparent',
              padding: '10px 24px',
              fontSize: '1rem',
              borderRadius: '2px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--ink)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-3)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--ink-3)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--rule)';
            }}
          >
            {t(lang, 'game.giveUp')}
          </button>

          {/* Right: submit button */}
          <button
            onClick={() => submit(false)}
            className="group flex items-center gap-2 font-cormorant tracking-[0.12em] transition-colors"
            style={{
              color: 'var(--beni)',
              border: '1px solid var(--beni)',
              background: 'transparent',
              padding: '10px 36px',
              fontSize: '1.15rem',
              borderRadius: '2px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--beni)';
              (e.currentTarget as HTMLElement).style.color = 'var(--surface)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--beni)';
            }}
          >
            {t(lang, 'game.submit')}
            <span style={{ transition: 'transform 0.15s', display: 'inline-block' }}>→</span>
          </button>
        </footer>
      )}

      {/* ── Give up confirmation dialog ────────────── */}
      {showGiveUpDialog && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: 'oklch(13% 0.018 258 / 0.45)', zIndex: 50 }}
          onClick={() => setShowGiveUpDialog(false)}
        >
          <div
            className="flex flex-col items-center"
            style={{
              background: 'var(--surface)',
              border: '0.5px solid var(--rule)',
              padding: '40px 48px',
              maxWidth: '360px',
              width: '90%',
              boxShadow: '0 8px 40px oklch(13% 0.018 258 / 0.18)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <p
              className="font-shippori text-center"
              style={{
                fontSize: '0.9rem',
                color: 'var(--ink-2)',
                letterSpacing: '0.08em',
                lineHeight: 1.8,
                marginBottom: '32px',
              }}
            >
              {t(lang, 'game.giveUp.confirm')}
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowGiveUpDialog(false)}
                className="flex-1 font-cormorant tracking-[0.1em]"
                style={{
                  color: 'var(--ink-2)',
                  border: '1px solid var(--rule)',
                  background: 'transparent',
                  padding: '10px 0',
                  fontSize: '1rem',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--rule)'; }}
              >
                {t(lang, 'game.giveUp.no')}
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 font-cormorant tracking-[0.1em]"
                style={{
                  color: 'var(--beni)',
                  border: '1px solid var(--beni)',
                  background: 'transparent',
                  padding: '10px 0',
                  fontSize: '1rem',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--beni)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--surface)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--beni)';
                }}
              >
                {t(lang, 'game.giveUp.yes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
