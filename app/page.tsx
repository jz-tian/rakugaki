'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LanguageToggle from '@/components/LanguageToggle';
import GalleryCard from '@/components/GalleryCard';
import { getGameState, setGameState, getPastWorks } from '@/lib/storage';
import { t } from '@/lib/i18n';
import type { Difficulty, Language, PastWork } from '@/lib/types';

// Mini brush SVG for header logo
function BrushIcon() {
  return (
    <svg height="38" viewBox="0 0 30 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.5 4Q13.5 1 15 0.5Q16.5 1 16.5 4" stroke="#1a1a24" strokeWidth="1.2" strokeLinecap="round"/>
      <ellipse cx="15" cy="6" rx="5.5" ry="2.5" fill="#D4AA50" stroke="#1a1a24" strokeWidth="1"/>
      <rect x="8" y="6" width="14" height="54" rx="2.5" fill="#D4AA50" stroke="#1a1a24" strokeWidth="1"/>
      <line x1="11.5" y1="10" x2="11.5" y2="58" stroke="#F0CC78" strokeWidth="1" opacity="0.6"/>
      <rect x="6.5" y="24" width="17" height="2.5" rx="1.2" fill="#A07828" stroke="#1a1a24" strokeWidth="0.8"/>
      <rect x="6.5" y="40" width="17" height="2.5" rx="1.2" fill="#A07828" stroke="#1a1a24" strokeWidth="0.8"/>
      <rect x="6.5" y="54" width="17" height="2.5" rx="1.2" fill="#A07828" stroke="#1a1a24" strokeWidth="0.8"/>
      <rect x="6" y="60" width="18" height="9" rx="1.2" fill="#B54028" stroke="#1a1a24" strokeWidth="1"/>
      <line x1="6" y1="63.5" x2="24" y2="63.5" stroke="#8B2E18" strokeWidth="0.6"/>
      <line x1="6" y1="66.5" x2="24" y2="66.5" stroke="#8B2E18" strokeWidth="0.6"/>
      <rect x="6" y="69" width="18" height="5" rx="0.8" fill="#1a1a24"/>
      <path d="M6 74Q3.5 80 7 87Q10 92 15 95Q20 92 23 87Q26.5 80 24 74Z" fill="#1a1a24"/>
      <path d="M10.5 75Q9.5 83 11 90" stroke="#2c2c3c" strokeWidth="0.7" strokeLinecap="round"/>
      <path d="M15 75Q15 84 15 92" stroke="#2c2c3c" strokeWidth="0.7" strokeLinecap="round"/>
      <path d="M19.5 75Q20.5 83 19 90" stroke="#2c2c3c" strokeWidth="0.7" strokeLinecap="round"/>
    </svg>
  );
}

// Large hero brush SVG
function HeroBrush() {
  return (
    <svg className="w-[clamp(70px,8vw,108px)] h-auto max-h-[58vh] drop-shadow-md" viewBox="0 0 140 520" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M66 10Q66 3 70 2Q74 3 74 10" stroke="#1a1a24" strokeWidth="1.8" strokeLinecap="round"/>
      <ellipse cx="70" cy="16" rx="11" ry="5.5" fill="#D4A850" stroke="#1a1a24" strokeWidth="1.5"/>
      <ellipse cx="70" cy="12" rx="8" ry="3.5" fill="#E0B860" stroke="#1a1a24" strokeWidth="1.3"/>
      <rect x="48" y="16" width="44" height="248" rx="5" fill="#D4AA50" stroke="#1a1a24" strokeWidth="1.6"/>
      <line x1="56" y1="24" x2="56" y2="258" stroke="#F0CC78" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
      <rect x="45" y="100" width="50" height="6" rx="3" fill="#A87828" stroke="#1a1a24" strokeWidth="1.3"/>
      <rect x="45" y="162" width="50" height="6" rx="3" fill="#A87828" stroke="#1a1a24" strokeWidth="1.3"/>
      <rect x="45" y="224" width="50" height="6" rx="3" fill="#A87828" stroke="#1a1a24" strokeWidth="1.3"/>
      <ellipse cx="70" cy="264" rx="22" ry="6" fill="#A87828" stroke="#1a1a24" strokeWidth="1.4"/>
      <rect x="45" y="264" width="50" height="30" rx="3" fill="#B54028" stroke="#1a1a24" strokeWidth="1.6"/>
      <line x1="49" y1="265" x2="49" y2="293" stroke="#D46048" strokeWidth="2" strokeLinecap="round" opacity="0.55"/>
      <line x1="45" y1="272" x2="95" y2="272" stroke="#8B2E18" strokeWidth="0.9"/>
      <line x1="45" y1="279" x2="95" y2="279" stroke="#8B2E18" strokeWidth="0.9"/>
      <line x1="45" y1="286" x2="95" y2="286" stroke="#8B2E18" strokeWidth="0.9"/>
      <ellipse cx="70" cy="294" rx="25" ry="6" fill="#8B2E18" stroke="#1a1a24" strokeWidth="1.3"/>
      <rect x="44" y="296" width="52" height="18" rx="2" fill="#1a1a24"/>
      <path d="M44 314Q38 335 44 380Q50 415 60 455Q65 475 70 500Q75 475 80 455Q90 415 96 380Q102 335 96 314Z" fill="#1a1a24"/>
      <path d="M56 318Q53 358 56 408Q58 432 62 466" stroke="#2c2c3c" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M70 318Q70 362 70 412Q70 440 70 478" stroke="#2c2c3c" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M84 318Q87 358 84 408Q82 432 78 466" stroke="#2c2c3c" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
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

        <div className="flex items-center gap-4">
          <div
            className="text-[0.72rem] tracking-[0.08em] px-3 py-1 hidden sm:block"
            style={{ color: 'var(--ink-2)', border: '0.5px solid var(--rule)', borderRadius: '2px' }}
          >
            {lang === 'zh' ? `第 ${level} 关` : `Level ${level}`}
          </div>
          <LanguageToggle lang={lang} onChange={l => { setLang(l); setWorks(getPastWorks()); }} />
        </div>
      </header>

      {/* ── HERO (full viewport) ──────────────────────────── */}
      <section className="flex flex-col min-h-svh px-[clamp(2rem,6vw,5rem)]">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-[clamp(2rem,5vw,5rem)] items-center pt-24 pb-8 max-w-[1080px] w-full mx-auto animate-fadeup">

          {/* Left */}
          <div className="flex flex-col">
            <p className="font-shippori text-[0.82rem] tracking-[0.22em] mb-[clamp(1.25rem,2.5vw,2rem)]" style={{ color: 'var(--beni)' }}>
              落書き判定 <span style={{ color: 'oklch(68% 0.13 27)' }}>·</span> {t(lang, 'home.eyebrow')}
            </p>
            <h1 className="font-shippori font-bold text-[clamp(3.5rem,6.5vw,6rem)] leading-[1.05] tracking-[0.05em]" style={{ color: 'var(--ink)' }}>
              落書き
            </h1>
            <p className="font-cormorant font-light text-[clamp(1rem,1.8vw,1.5rem)] tracking-[0.28em] mt-1.5 uppercase" style={{ color: 'var(--ink-3)' }}>
              RAKUGAKI
            </p>
            <div className="mt-[clamp(1.5rem,3vw,2.5rem)] space-y-1" style={{ color: 'var(--ink-2)' }}>
              <p className="text-[clamp(0.9rem,1.2vw,1.05rem)] font-light">{t(lang, 'home.tagline.1')}</p>
              <p className="text-[clamp(0.9rem,1.2vw,1.05rem)] font-light">{t(lang, 'home.tagline.2')}</p>
              <p className="text-[clamp(0.9rem,1.2vw,1.05rem)] font-light">{t(lang, 'home.tagline.3')}</p>
            </div>

            <div className="flex gap-[clamp(1.5rem,3vw,2.5rem)] items-end mt-[clamp(2rem,4vw,3rem)]">
              {[
                { num: '∞', label: t(lang, 'home.stat.levels') },
                { num: '3',  label: t(lang, 'home.stat.difficulties') },
                { num: "3'", label: t(lang, 'home.stat.perRound') },
              ].map(s => (
                <div key={s.label} className="flex flex-col gap-0.5">
                  <span className="font-cormorant font-normal text-[clamp(1.8rem,3vw,2.6rem)] leading-none" style={{ color: 'var(--ink)' }}>
                    {s.num}
                  </span>
                  <span className="text-[0.65rem] font-medium tracking-[0.16em] uppercase" style={{ color: 'var(--ink-3)' }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: brush */}
          <div className="hidden md:flex items-center justify-center">
            <HeroBrush />
          </div>
        </div>

        {/* Controls bar */}
        <div
          className="flex items-center justify-center relative py-6 max-w-[1080px] w-full mx-auto"
          style={{ borderTop: '0.5px solid var(--rule)' }}
        >
          <div className="flex items-center gap-10">
            {/* Difficulty tabs */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[0.6rem] tracking-[0.2em] uppercase" style={{ color: 'var(--ink-3)' }}>
                {t(lang, 'home.diff.label')}
              </span>
              <div className="flex items-center gap-1">
                {diffs.map(({ key, threshold }, i) => (
                  <span key={key} className="flex items-center gap-1">
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
                      <em className="font-cormorant italic text-[0.72rem] opacity-45 not-italic" style={{ fontStyle: 'italic' }}>
                        {threshold}
                      </em>
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="h-8 w-px" style={{ background: 'var(--rule)' }} />

            {/* Start button */}
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
          </div>

          {/* Scroll hint */}
          <a
            href="#gallery"
            className="absolute right-0 flex items-center gap-1.5 font-cormorant italic text-[0.8rem] tracking-[0.1em] no-underline transition-colors"
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
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                background: 'var(--rule)',
                border: '0.5px solid var(--rule)',
              }}
            >
              {works.map(w => <GalleryCard key={w.id} work={w} lang={lang} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
