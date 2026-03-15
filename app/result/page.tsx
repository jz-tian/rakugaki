'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getGameState, setGameState, getSessionState, setSessionState, clearSessionState, addPastWork } from '@/lib/storage';
import { t } from '@/lib/i18n';
import type { Language } from '@/lib/types';

interface Result {
  score: number;
  comment: string;
  passed: boolean;
  timedOut: boolean;
}

export default function ResultPage() {
  const router = useRouter();
  const [lang, setLang]         = useState<Language>('zh');
  const [result, setResult]     = useState<Result | null>(null);
  const [imageBase64, setImage] = useState<string>('');
  const [prompt, setPrompt]     = useState('');

  useEffect(() => {
    const { language } = getGameState();
    setLang(language);

    const session = getSessionState();
    if (!session.lastResult) {
      // No result in session — redirect home
      router.replace('/');
      return;
    }

    setResult(session.lastResult as Result);
    setImage(session.lastImageBase64 ?? '');
    setPrompt(session.prompt ?? '');

    // Persist to gallery if passed — guard against duplicate on re-mount
    if (session.lastResult.passed && !session.persisted) {
      const state = getGameState();
      addPastWork({
        prompt: session.prompt ?? '',
        imageBase64: session.lastImageBase64 ?? '',
        score: (session.lastResult as Result).score,
        level: state.level,
        difficulty: state.difficulty,
      });
      setSessionState({ persisted: true });
    }
  }, [router]);

  function nextLevel() {
    const state = getGameState();
    setGameState({ level: state.level + 1 });
    clearSessionState();
    router.push('/game');
  }

  function retry() {
    setSessionState({ isRetry: true, lastResult: undefined, lastImageBase64: undefined });
    router.push('/game');
  }

  function changeDifficulty() {
    clearSessionState();
    router.push('/');
  }

  if (!result) return null;

  const scoreColor = result.score >= 75 ? '#4a7c59' : result.score >= 50 ? '#8a6a28' : '#8b3228';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-lg space-y-8">

        {/* Drawing thumbnail */}
        {imageBase64 && (
          <div className="w-full aspect-[4/3] bg-white border border-stone-200 shadow-sm overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageBase64} alt={prompt} className="w-full h-full object-contain" />
          </div>
        )}

        {/* Prompt */}
        <p className="text-sm text-center tracking-wide" style={{ color: 'var(--ink-2)' }}>
          <span style={{ color: 'var(--ink-3)' }}>{t(lang, 'home.gallery.drawLabel')}</span>{' '}
          {prompt}
        </p>

        {/* Score */}
        <div className="text-center space-y-2">
          {result.timedOut && (
            <p className="text-sm text-amber-600 tracking-wide">{t(lang, 'result.timedOut')}</p>
          )}
          <div className="flex items-baseline justify-center gap-2">
            <span
              className="font-cormorant font-normal leading-none"
              style={{ fontSize: 'clamp(4rem, 10vw, 7rem)', color: scoreColor }}
            >
              {result.score}
            </span>
            <span
              className="font-cormorant font-light text-2xl"
              style={{ color: 'var(--ink-3)' }}
            >
              {t(lang, 'result.score')}
            </span>
          </div>
        </div>

        {/* AI comment */}
        <p
          className="font-cormorant italic text-center text-[1.1rem] leading-relaxed tracking-wide"
          style={{ color: 'var(--ink-2)' }}
        >
          &ldquo;{result.comment}&rdquo;
        </p>

        <div className="h-px" style={{ background: 'var(--rule)' }} />

        {/* CTA buttons */}
        <div className="flex flex-col gap-3">
          {result.passed ? (
            <button
              onClick={nextLevel}
              className="w-full py-3 font-cormorant text-[1.05rem] tracking-[0.1em] transition-colors"
              style={{ background: 'var(--ink)', color: 'var(--bg)', borderRadius: '2px' }}
            >
              {t(lang, 'result.pass')}
            </button>
          ) : (
            <button
              onClick={retry}
              className="w-full py-3 font-cormorant text-[1.05rem] tracking-[0.1em] transition-colors"
              style={{
                background: 'transparent',
                color: 'var(--beni)',
                border: '1px solid var(--beni)',
                borderRadius: '2px',
              }}
            >
              {t(lang, 'result.fail')}
            </button>
          )}
          <button
            onClick={changeDifficulty}
            className="text-sm text-center transition-colors"
            style={{ color: 'var(--ink-3)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {t(lang, 'result.changeDifficulty')}
          </button>
        </div>
      </div>
    </div>
  );
}
