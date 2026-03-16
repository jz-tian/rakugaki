'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LanguageToggle from '@/components/LanguageToggle';
import GalleryCard from '@/components/GalleryCard';
import { getGameState, setGameState, getPastWorks } from '@/lib/storage';
import { t } from '@/lib/i18n';
import type { Difficulty, Language, PastWork } from '@/lib/types';

// Header logo
function BrushIcon() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.svg" alt="Rakugaki logo" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />;
}

// Large hero logo
function HeroBrush() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.svg" alt="" aria-hidden className="w-[clamp(200px,28vw,340px)] h-auto" />;
}

export default function HomePage() {
  const router = useRouter();
  const [lang, setLang]         = useState<Language>('zh');
  const [level, setLevel]       = useState(1);
  const [difficulty, setDiff]   = useState<Difficulty>('normal');
  const [works, setWorks]       = useState<PastWork[]>([]);

  useEffect(() => {
    const state = getGameState();
    setLang(state.language);
    setLevel(state.level);
    setDiff(state.difficulty);
    setWorks(getPastWorks());
  }, []);

  function selectDiff(d: Difficulty) {
    setDiff(d);
    setGameState({ difficulty: d });
  }

  function startGame() {
    router.push('/game');
  }

  function resetLevel() {
    setLevel(1);
    setGameState({ level: 1 });
  }

  const diffs: { key: Difficulty; threshold: string }[] = [
    { key: 'easy',   threshold: '60+' },
    { key: 'normal', threshold: '75+' },
    { key: 'hard',   threshold: '85+' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── HEADER ────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-[clamp(2rem,6vw,5rem)] py-5">
        <a href="/" className="flex items-center gap-3 no-underline">
          <BrushIcon />
          <div className="flex flex-col gap-[2px]">
            <span className="font-shippori font-bold text-[1.1rem] tracking-[0.1em]" style={{ color: 'var(--ink)' }}>
              落書き
            </span>
            <span className="font-cormorant italic text-[0.62rem] tracking-[0.2em]" style={{ color: 'var(--ink-3)' }}>
              rakugaki
            </span>
          </div>
        </a>

        <LanguageToggle lang={lang} onChange={l => { setLang(l); setWorks(getPastWorks()); }} />
      </header>

      {/* ── HERO (full viewport) ──────────────────────────── */}
      <section className="flex flex-col min-h-svh px-[clamp(2rem,6vw,5rem)]">
        {/* flex-1 wrapper centers the content block vertically (avoids dead space on iPad) */}
        <div className="flex-1 flex items-center">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-[clamp(1.5rem,3vw,3rem)] items-center pt-24 pb-8 max-w-[900px] w-full mx-auto animate-fadeup">

          {/* Left */}
          <div className="flex flex-col">
            {/* Logo mark — mobile only, desktop uses the sidebar brush image */}
            <div className="md:hidden mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="" aria-hidden style={{ height: '56px', width: '56px', objectFit: 'contain', opacity: 0.88 }} />
            </div>
            <h1 className="font-shippori font-bold text-[clamp(3.5rem,8vw,6rem)] leading-[1.05] tracking-[0.05em]" style={{ color: 'var(--ink)' }}>
              落書き
            </h1>
            <p className="font-cormorant font-light text-[clamp(1rem,1.8vw,1.5rem)] tracking-[0.28em] mt-1.5 uppercase" style={{ color: 'var(--ink-3)' }}>
              RAKUGAKI
            </p>
            <div className="mt-[clamp(1.5rem,3vw,2.5rem)] flex flex-col gap-[0.55rem]">
              {([1,2,3] as const).map(n => (
                <div key={n} className="flex items-baseline gap-2.5">
                  <span
                    className="font-cormorant shrink-0"
                    style={{ fontSize: '0.7rem', color: 'var(--beni)', letterSpacing: '0.12em', opacity: 0.7 }}
                  >
                    {String(n).padStart(2, '0')}
                  </span>
                  <p
                    className="font-shippori"
                    style={{ fontSize: 'clamp(0.82rem,1.4vw,1rem)', color: 'var(--ink-2)', letterSpacing: '0.06em', lineHeight: 1.5 }}
                  >
                    {t(lang, `home.tagline.${n}`)}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-[clamp(1.5rem,3vw,2.5rem)] items-end mt-[clamp(2rem,4vw,3rem)]">
              {[
                { num: '∞', label: t(lang, 'home.stat.levels') },
                { num: '3',  label: t(lang, 'home.stat.difficulties') },
                { num: '2′', label: t(lang, 'home.stat.perRound') },
              ].map(s => (
                <div key={s.label} className="flex flex-col gap-2">
                  <span className="font-cormorant font-normal text-[clamp(1.8rem,4vw,2.8rem)] leading-none" style={{ color: 'var(--ink)' }}>
                    {s.num}
                  </span>
                  <span className="text-[0.65rem] font-medium tracking-[0.16em] uppercase" style={{ color: 'var(--ink-3)' }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: brush — desktop only (mobile: too tall, breaks layout) */}
          <div className="hidden md:flex items-center justify-center">
            <HeroBrush />
          </div>
        </div>
        </div>{/* end centering wrapper */}

        {/* Controls bar */}
        <div
          className="flex items-center justify-center relative py-6 max-w-[820px] w-full mx-auto"
          style={{ borderTop: '0.5px solid var(--rule)' }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-10">
            {/* Difficulty tabs */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[0.6rem] tracking-[0.2em] uppercase" style={{ color: 'var(--ink-3)' }}>
                {t(lang, 'home.diff.label')}
              </span>
              <div className="flex items-center gap-3">
                {diffs.map(({ key, threshold }, i) => (
                  <span key={key} className="flex items-center gap-3">
                    {i > 0 && <span className="text-[0.65rem]" style={{ color: 'var(--ink-3)' }}>·</span>}
                    <button
                      onClick={() => selectDiff(key)}
                      className="flex items-baseline gap-1 pb-0.5 text-[0.88rem] transition-colors"
                      style={{
                        color: difficulty === key ? 'var(--ink)' : 'var(--ink-3)',
                        fontWeight: difficulty === key ? 500 : 400,
                        background: 'transparent',
                        border: 'none',
                        borderBottom: difficulty === key ? '1px solid var(--ink)' : '1px solid transparent',
                        cursor: 'pointer',
                      }}
                    >
                      {t(lang, `home.diff.${key}`)}
                      <em className="font-cormorant text-[0.78rem] opacity-70" style={{ fontStyle: 'italic' }}>
                        {threshold}
                      </em>
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="hidden sm:block h-8 w-px" style={{ background: 'var(--rule)' }} />

            {/* Start button + optional reset */}
            <div className="flex items-center gap-4">
              <button
                onClick={startGame}
                className="group flex items-center gap-2 px-8 py-2.5 font-cormorant text-[1.05rem] tracking-[0.12em] transition-colors"
                style={{
                  color: 'var(--beni)',
                  border: '1px solid var(--beni)',
                  borderRadius: '2px',
                  background: 'transparent',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--beni)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'oklch(98.5% 0.006 74)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--beni)';
                }}
              >
                {t(lang, 'home.cta.start')}
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </button>

              {/* Reset level — only shown when past level 1 */}
              {level > 1 && (
                <button
                  onClick={resetLevel}
                  className="font-cormorant italic text-[0.82rem] tracking-[0.1em] transition-all"
                  style={{
                    color: 'var(--ink-3)',
                    background: 'transparent',
                    border: 'none',
                    padding: '4px 0',
                    cursor: 'pointer',
                    borderBottom: '1px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-2)';
                    (e.currentTarget as HTMLButtonElement).style.borderBottomColor = 'var(--ink-3)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-3)';
                    (e.currentTarget as HTMLButtonElement).style.borderBottomColor = 'transparent';
                  }}
                  title={t(lang, 'home.cta.reset')}
                >
                  <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>↺</span>
                  {t(lang, 'home.cta.reset')}
                </button>
              )}
            </div>
          </div>

          {/* Scroll hint — visible on all sizes */}
          <a
            href="#gallery"
            className="flex absolute right-0 items-center gap-1.5 font-cormorant italic text-[0.8rem] tracking-[0.1em] no-underline transition-colors"
            style={{ color: 'var(--ink-3)' }}
          >
            {t(lang, 'home.scroll.label')}
            <span className="animate-bob not-italic">↓</span>
          </a>
        </div>
      </section>

      {/* ── GALLERY ───────────────────────────────────────── */}
      <section
        id="gallery"
        className="px-[clamp(2rem,6vw,5rem)] py-[clamp(3rem,6vw,5rem)]"
        style={{ borderTop: '0.5px solid var(--rule)' }}
      >
        <div className="max-w-[1080px] mx-auto">
          <div className="flex justify-between items-end mb-6">
            <div className="flex flex-col gap-0.5">
              <span className="font-shippori font-medium text-[clamp(1.1rem,2vw,1.5rem)] tracking-[0.1em]" style={{ color: 'var(--ink)' }}>
                {t(lang, 'home.gallery.title.jp')}
              </span>
              <span className="font-cormorant italic text-[0.78rem] tracking-[0.16em]" style={{ color: 'var(--ink-3)' }}>
                {t(lang, 'home.gallery.title.en')}
              </span>
            </div>
            <span className="text-[0.73rem] tracking-[0.06em]" style={{ color: 'var(--ink-3)' }}>
              {works.length > 0
                ? (lang === 'zh' ? `共 ${works.length} 幅` : `${works.length} work${works.length !== 1 ? 's' : ''}`)
                : ''}
            </span>
          </div>

          <div className="h-px mb-6" style={{ background: 'var(--rule)' }} />

          {works.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-cormorant italic text-[0.95rem] tracking-[0.08em]" style={{ color: 'var(--ink-3)' }}>
                {t(lang, 'home.gallery.empty')}
              </p>
            </div>
          ) : (
            <div
              className="grid gap-px"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                background: 'var(--rule)',
                border: '0.5px solid var(--rule)',
              }}
            >
              {works.map(w => <GalleryCard key={w.id} work={w} lang={lang} onDelete={() => setWorks(getPastWorks())} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
