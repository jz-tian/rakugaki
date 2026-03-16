'use client';

import { useState, useEffect } from 'react';
import type { PastWork } from '@/lib/types';
import type { Language } from '@/lib/types';
import { t } from '@/lib/i18n';
import { deletePastWork } from '@/lib/storage';

interface Props {
  work: PastWork;
  lang: Language;
  onDelete?: () => void;
}

function scoreColor(score: number) {
  if (score >= 75) return { border: '#4a7c59', bg: 'oklch(93% 0.048 152)', text: '#2d5a3d' };
  if (score >= 50) return { border: '#8a6a28', bg: 'oklch(93% 0.052 63)',  text: '#5c4318' };
  return               { border: '#8b3228', bg: 'oklch(93% 0.048 27)',   text: '#6b2218' };
}

/** Wrap text into lines that fit within maxWidth, returns array of lines. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  // For CJK characters, split by char; otherwise split by word
  const isCJK = /[\u4e00-\u9fff\u3000-\u303f]/.test(text);
  const tokens = isCJK ? text.split('') : text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const token of tokens) {
    const candidate = current ? (isCJK ? current + token : current + ' ' + token) : token;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = token;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export default function GalleryCard({ work, lang, onDelete }: Props) {
  const [open, setOpen]                 = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [withComment, setWithComment]   = useState(true);

  function handleDelete() {
    deletePastWork(work.id);
    setOpen(false);
    setConfirmDelete(false);
    onDelete?.();
  }

  function handleOpen() {
    setWithComment(true); // reset toggle each time lightbox opens
    setOpen(true);
  }

  const c       = scoreColor(work.score);
  const lvLabel = lang === 'zh' ? `第${work.level}关` : `Lv.${work.level}`;
  const hasComment = !!work.comment;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setConfirmDelete(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // ── Export ────────────────────────────────────────────────────────────────
  function exportJPG() {
    const img = new Image();
    img.onload = () => {
      const IMG_W  = 800;
      const IMG_H  = 600;
      const showFooter = withComment && hasComment && work.comment;
      const FOOTER_H   = showFooter ? 100 : 0;
      const TOTAL_H    = IMG_H + FOOTER_H;

      const canvas = document.createElement('canvas');
      canvas.width  = IMG_W;
      canvas.height = TOTAL_H;
      const ctx = canvas.getContext('2d')!;

      // White base
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, IMG_W, TOTAL_H);

      // Drawing
      ctx.drawImage(img, 0, 0, IMG_W, IMG_H);

      // Footer strip
      if (showFooter && work.comment) {
        // Washi-toned background
        ctx.fillStyle = '#faf7f3';
        ctx.fillRect(0, IMG_H, IMG_W, FOOTER_H);

        // Top rule
        ctx.strokeStyle = '#ddd5c8';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, IMG_H + 0.5);
        ctx.lineTo(IMG_W, IMG_H + 0.5);
        ctx.stroke();

        // Score stamp — top-right corner of strip
        const STAMP = 44;
        const sx = IMG_W - 20 - STAMP;
        const sy = IMG_H + (FOOTER_H - STAMP) / 2;
        ctx.strokeStyle = c.border;
        ctx.lineWidth = 1.5;
        ctx.fillStyle = c.bg;
        ctx.fillRect(sx, sy, STAMP, STAMP);
        ctx.strokeRect(sx, sy, STAMP, STAMP);
        ctx.font = 'bold 18px Georgia, serif';
        ctx.fillStyle = c.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(work.score), sx + STAMP / 2, sy + STAMP / 2);

        // Comment text — centred, with wrapping, leaving room for score
        const textMaxW = IMG_W - STAMP - 60;
        ctx.font = 'italic 13px Georgia, serif';
        ctx.fillStyle = '#6b5f55';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lines = wrapText(ctx, `"${work.comment}"`, textMaxW);
        const LINE_H = 18;
        const blockH = lines.length * LINE_H;
        const startY = IMG_H + (FOOTER_H - blockH) / 2 + LINE_H / 2;
        lines.forEach((line, i) => {
          ctx.fillText(line, (IMG_W - STAMP - 20) / 2, startY + i * LINE_H);
        });

        // Prompt label — bottom-left, tiny
        ctx.font = '10px Georgia, serif';
        ctx.fillStyle = '#b0a898';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(work.prompt, 16, IMG_H + FOOTER_H - 10, IMG_W - STAMP - 40);
      }

      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href    = url;
        const safe = work.prompt.replace(/[^\w\u4e00-\u9fff]/g, '_').slice(0, 28);
        a.download = `rakugaki_${safe}_${work.score}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/jpeg', 0.93);
    };
    img.src = work.imageBase64;
  }

  return (
    <>
      {/* ── Card ── */}
      <div
        className="relative bg-white overflow-hidden cursor-pointer transition-colors hover:bg-stone-50"
        onClick={handleOpen}
      >
        <div className="aspect-[4/3] bg-white flex items-center justify-center p-3">
          {work.imageBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={work.imageBase64} alt={work.prompt} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full bg-stone-100" />
          )}
        </div>

        {/* Score stamp */}
        <div
          className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center text-sm font-bold"
          style={{
            border: `1.5px solid ${c.border}`,
            background: c.bg,
            color: c.text,
            transform: 'rotate(-2deg)',
            fontFamily: "'Shippori Mincho B1', serif",
            boxShadow: `0 1px 6px ${c.border}22`,
          }}
        >
          {work.score}
        </div>

        {/* Level badge */}
        <div
          className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 text-stone-100"
          style={{ background: 'rgba(26,26,36,0.72)', backdropFilter: 'blur(4px)' }}
        >
          {lvLabel}
        </div>

        {/* Prompt label */}
        <div className="px-2.5 py-2 border-t border-stone-100">
          <p className="text-[11px] text-stone-400 truncate">
            <b className="text-stone-600 font-medium">{t(lang, 'home.gallery.drawLabel')}</b>{' '}
            {work.prompt}
          </p>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: 'oklch(13% 0.018 258 / 0.72)', zIndex: 100, backdropFilter: 'blur(6px)' }}
          onClick={() => { setOpen(false); setConfirmDelete(false); }}
        >
          <div
            className="relative flex flex-col"
            style={{
              background: 'var(--surface)',
              border: '0.5px solid var(--rule)',
              maxWidth: 'min(720px, 92vw)',
              width: '100%',
              boxShadow: '0 24px 80px oklch(13% 0.018 258 / 0.3)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawing */}
            <div className="aspect-[4/3] bg-white flex items-center justify-center p-6">
              {work.imageBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={work.imageBase64} alt={work.prompt} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-stone-100" />
              )}
            </div>

            {/* AI comment */}
            {work.comment && (
              <div
                className="px-5 py-3"
                style={{ borderTop: '0.5px solid var(--rule)', background: 'oklch(13% 0.018 258 / 0.02)' }}
              >
                <p
                  className="font-cormorant italic text-center leading-relaxed"
                  style={{ fontSize: '0.92rem', color: 'var(--ink-2)', letterSpacing: '0.03em' }}
                >
                  &ldquo;{work.comment}&rdquo;
                </p>
              </div>
            )}

            {/* Footer bar */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderTop: '0.5px solid var(--rule)', flexWrap: 'wrap', gap: '8px' }}
            >
              {/* Level + prompt */}
              <div className="flex items-center gap-3 min-w-0" style={{ minWidth: 0 }}>
                <span
                  className="shrink-0 text-[11px] px-2 py-0.5"
                  style={{
                    fontFamily: "'Shippori Mincho B1', serif",
                    background: 'oklch(13% 0.018 258 / 0.08)',
                    color: 'var(--ink-2)',
                    letterSpacing: '0.08em',
                  }}
                >
                  {lvLabel}
                </span>
                <p className="font-shippori text-[0.82rem] truncate" style={{ color: 'var(--ink-2)', letterSpacing: '0.06em' }}>
                  {work.prompt}
                </p>
              </div>

              <div className="flex items-center gap-3 ml-2 shrink-0">

                {/* ── Download controls ── */}
                <div className="flex items-center gap-2">
                  {/* Comment toggle — only when comment exists */}
                  {hasComment && (
                    <button
                      onClick={() => setWithComment(v => !v)}
                      className="font-cormorant italic tracking-[0.06em] transition-all"
                      style={{
                        fontSize: '0.75rem',
                        color: withComment ? 'var(--ink-2)' : 'var(--ink-3)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px 0',
                        borderBottom: withComment ? '1px solid var(--ink-3)' : '1px solid transparent',
                        textDecoration: withComment ? 'none' : 'line-through',
                        textDecorationColor: 'var(--ink-3)',
                      }}
                      title={withComment
                        ? (lang === 'zh' ? '点击：不含评语' : 'Click: without comment')
                        : (lang === 'zh' ? '点击：含评语' : 'Click: with comment')}
                    >
                      {lang === 'zh' ? '评语' : 'comment'}
                    </button>
                  )}

                  {/* Download button */}
                  <button
                    onClick={exportJPG}
                    className="flex items-center gap-1.5 font-cormorant tracking-[0.08em] transition-all"
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--ink-2)',
                      background: 'transparent',
                      border: '0.5px solid var(--rule)',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      padding: '3px 10px',
                      transition: 'border-color 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--ink-3)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--ink)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--rule)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--ink-2)';
                    }}
                    title={lang === 'zh' ? '保存为 JPG' : 'Save as JPG'}
                  >
                    <svg viewBox="0 0 14 14" fill="none" style={{ width: '11px', height: '11px' }}>
                      <path d="M7 1v8M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    {lang === 'zh' ? '存图' : 'Save'}
                  </button>
                </div>

                <div style={{ width: '0.5px', height: '16px', background: 'var(--rule)', flexShrink: 0 }} />

                {/* Delete button / confirm inline */}
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="font-cormorant tracking-[0.08em]"
                      style={{ fontSize: '0.8rem', color: 'var(--ink-3)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      {lang === 'zh' ? '取消' : 'Cancel'}
                    </button>
                    <span style={{ color: 'var(--rule)', fontSize: '0.7rem' }}>|</span>
                    <button
                      onClick={handleDelete}
                      className="font-cormorant tracking-[0.08em]"
                      style={{ fontSize: '0.8rem', color: 'var(--beni)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      {lang === 'zh' ? '确认删除' : 'Confirm'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="font-cormorant tracking-[0.08em]"
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--ink-3)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 0',
                      borderBottom: '1px solid transparent',
                      transition: 'color 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--beni)';
                      (e.currentTarget as HTMLElement).style.borderBottomColor = 'var(--beni)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.color = 'var(--ink-3)';
                      (e.currentTarget as HTMLElement).style.borderBottomColor = 'transparent';
                    }}
                  >
                    {lang === 'zh' ? '删除' : 'Delete'}
                  </button>
                )}

                {/* Score stamp */}
                <div
                  className="w-11 h-11 flex items-center justify-center text-[0.95rem] font-bold"
                  style={{
                    border: `1.5px solid ${c.border}`,
                    background: c.bg,
                    color: c.text,
                    transform: 'rotate(-2deg)',
                    fontFamily: "'Shippori Mincho B1', serif",
                    boxShadow: `0 2px 10px ${c.border}30`,
                  }}
                >
                  {work.score}
                </div>
              </div>
            </div>

            {/* Close hint */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 font-cormorant"
              style={{
                fontSize: '1.1rem',
                color: 'var(--ink-3)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                lineHeight: 1,
                padding: '4px 6px',
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
