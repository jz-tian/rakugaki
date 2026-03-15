'use client';

import type { BrushStyle } from './Canvas';

const PALETTE = [
  '#1a1a24', '#4a3728', '#8b4513', '#c0392b', '#e74c3c',
  '#e67e22', '#f1c40f', '#2ecc71', '#27ae60', '#1abc9c',
  '#3498db', '#2980b9', '#9b59b6', '#8e44ad', '#ec407a',
  '#f8bbd0', '#ffffff', '#bdc3c7', '#95a5a6', '#7f8c8d',
];

/* ── SVG icons ───────────────────────────────────── */
function BrushIcon({ active }: { active: boolean }) {
  const c = active ? 'var(--beni)' : 'var(--ink-2)';
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-[22px] h-[22px]">
      <path
        d="M15 2C16.6 0.4 19.2 0.4 19.2 3C19.2 5.4 16.8 6.6 15 7L8 13.5L5 16L3 18L3.5 14L6.5 11.5Z"
        fill={c}
      />
      <path d="M3 18C2 19.5 3.2 20.5 4.2 19.8L3.5 14Z" fill={c} opacity="0.4"/>
    </svg>
  );
}
function EraserIcon({ active }: { active: boolean }) {
  const c = active ? 'var(--beni)' : 'var(--ink-2)';
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-[22px] h-[22px]">
      <path d="M4.5 14L9 9.5L15 15.5L11 19L4.5 19Z" fill={c} opacity="0.9"/>
      <path d="M9 9.5L15.5 9.5L19 13L15 15.5Z" fill={c} opacity="0.45"/>
      <line x1="3" y1="19" x2="18" y2="19" stroke={c} strokeWidth="1.4" strokeLinecap="round" opacity="0.3"/>
    </svg>
  );
}
function FillIcon({ active }: { active: boolean }) {
  const c = active ? 'var(--beni)' : 'var(--ink-2)';
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-[22px] h-[22px]">
      <path d="M6 2L6 11" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M4 6.5L6 2L8 6.5" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M3.5 12Q3.5 17.5 8 17.5Q12.5 17.5 12.5 13Q12.5 9.5 8 9.5Q4 9.5 3.5 12Z" fill={c} opacity="0.85"/>
      <circle cx="16.5" cy="7.5" r="2.5" fill={c} opacity="0.35"/>
    </svg>
  );
}

/* ── Undo/Redo/Clear icons ───────────────────────── */
function UndoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-[20px] h-[20px]">
      <path d="M4 8C5.5 5 8.5 3.5 12 4C15.5 4.5 18 7.5 18 11C18 14.5 15.5 17 12 17C9 17 6.5 15 5.5 12"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M4 4L4 8L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
function RedoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-[20px] h-[20px]">
      <path d="M16 8C14.5 5 11.5 3.5 8 4C4.5 4.5 2 7.5 2 11C2 14.5 4.5 17 8 17C11 17 13.5 15 14.5 12"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M16 4L16 8L12 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
function ClearIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-[20px] h-[20px]">
      <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

/* ── Brush stroke previews ───────────────────────── */
function StrokePreview({ style, active }: { style: BrushStyle; active: boolean }) {
  const c = active ? 'var(--beni)' : 'var(--ink-3)';
  return (
    <svg viewBox="0 0 48 12" style={{ width: '100%', height: '13px' }}>
      {style === 'normal' && (
        <path d="M3 6Q16 6 24 6Q32 6 45 6"
          stroke={c} strokeWidth="2.6" strokeLinecap="round" fill="none"/>
      )}
      {style === 'pencil' && (
        <>
          <path d="M3 5.5Q16 4.5 24 5Q32 5.5 45 4.5"
            stroke={c} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.9"/>
          <path d="M3 7Q16 8 24 7Q32 6 45 7.5"
            stroke={c} strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.38"/>
          <path d="M14 4Q18 6 22 5"
            stroke={c} strokeWidth="0.5" strokeLinecap="round" fill="none" opacity="0.22"/>
        </>
      )}
      {style === 'ink' && (
        <>
          <path d="M3 5.5C7 5.5 14 5 22 5.5C30 6 38 6.5 45 7"
            stroke={c} strokeWidth="4.5" strokeLinecap="round" fill="none" opacity="0.88"/>
          <path d="M32 6.2C37 6.5 41 6.8 45 7"
            stroke={c} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.45"/>
        </>
      )}
    </svg>
  );
}

/* ── Horizontal stroke preview (compact) ────────── */
function StrokePreviewH({ style, active }: { style: BrushStyle; active: boolean }) {
  const c = active ? 'var(--beni)' : 'var(--ink-3)';
  return (
    <svg viewBox="0 0 28 12" style={{ width: '28px', height: '12px' }}>
      {style === 'normal' && (
        <path d="M2 6Q10 6 14 6Q18 6 26 6"
          stroke={c} strokeWidth="2.6" strokeLinecap="round" fill="none"/>
      )}
      {style === 'pencil' && (
        <>
          <path d="M2 5.5Q10 4.5 14 5Q18 5.5 26 4.5"
            stroke={c} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.9"/>
          <path d="M2 7Q10 8 14 7Q18 6 26 7.5"
            stroke={c} strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.38"/>
        </>
      )}
      {style === 'ink' && (
        <>
          <path d="M2 5.5C5 5.5 10 5 14 5.5C18 6 22 6.5 26 7"
            stroke={c} strokeWidth="4.5" strokeLinecap="round" fill="none" opacity="0.88"/>
        </>
      )}
    </svg>
  );
}

interface ToolbarProps {
  tool: 'brush' | 'eraser' | 'fill';
  brushStyle: BrushStyle;
  color: string;
  size: number;
  lang?: 'en' | 'zh';
  layout?: 'vertical' | 'horizontal';
  onToolChange: (t: 'brush' | 'eraser' | 'fill') => void;
  onBrushStyleChange: (s: BrushStyle) => void;
  onColorChange: (c: string) => void;
  onSizeChange: (s: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

function Sep() {
  return <div style={{ margin: '2px 10px', height: '0.5px', background: 'var(--rule)', flexShrink: 0 }} />;
}

function VertSep() {
  return <div className="shrink-0" style={{ width: '0.5px', height: '28px', background: 'var(--rule)', margin: '0 6px' }} />;
}

export default function Toolbar({
  tool, brushStyle, color, size, lang = 'zh', layout = 'vertical',
  onToolChange, onBrushStyleChange, onColorChange, onSizeChange,
  onUndo, onRedo, onClear,
}: ToolbarProps) {
  const en = lang === 'en';

  /* ── Horizontal layout ────────────────────────────── */
  if (layout === 'horizontal') {
    return (
      <div
        className="flex items-center toolbar-scroll overflow-x-auto shrink-0"
        style={{
          height: '52px',
          background: 'var(--surface)',
          borderTop: '0.5px solid var(--rule)',
          paddingLeft: '8px',
          paddingRight: '8px',
        }}
      >
        {/* Tool icons */}
        {([
          { id: 'brush'  as const, Icon: BrushIcon  },
          { id: 'eraser' as const, Icon: EraserIcon },
          { id: 'fill'   as const, Icon: FillIcon   },
        ]).map(({ id, Icon }) => {
          const active = tool === id;
          return (
            <button
              key={id}
              onClick={() => onToolChange(id)}
              title={id}
              className="shrink-0 flex items-center justify-center rounded transition-all"
              style={{
                width: '36px', height: '36px',
                background: active ? 'var(--beni-soft)' : 'transparent',
                position: 'relative',
              }}
            >
              {active && (
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t"
                  style={{ width: '20px', height: '2px', background: 'var(--beni)' }}
                />
              )}
              <Icon active={active} />
            </button>
          );
        })}

        <VertSep />

        {/* Undo / Redo / Clear */}
        {([
          { label: 'Undo', fn: onUndo, Icon: UndoIcon },
          { label: 'Redo', fn: onRedo, Icon: RedoIcon },
          { label: 'Clear', fn: onClear, Icon: ClearIcon, beni: true },
        ] as { label: string; fn: () => void; Icon: () => JSX.Element; beni?: boolean }[]).map(({ label, fn, Icon, beni }) => (
          <button
            key={label}
            onClick={fn}
            title={label}
            className="shrink-0 flex items-center justify-center rounded transition-all"
            style={{
              width: '36px', height: '36px',
              background: 'transparent',
              color: beni ? 'var(--beni)' : 'var(--ink-2)',
            }}
          >
            <Icon />
          </button>
        ))}

        {/* Brush styles — only when brush active */}
        {tool === 'brush' && (
          <>
            <VertSep />
            {(['normal', 'pencil', 'ink'] as BrushStyle[]).map(s => {
              const active = brushStyle === s;
              return (
                <button
                  key={s}
                  onClick={() => onBrushStyleChange(s)}
                  title={s}
                  className="shrink-0 flex items-center justify-center rounded transition-all"
                  style={{
                    minWidth: '40px', height: '36px',
                    padding: '0 6px',
                    background: active ? 'var(--beni-soft)' : 'transparent',
                  }}
                >
                  <StrokePreviewH style={s} active={active} />
                </button>
              );
            })}
          </>
        )}

        <VertSep />

        {/* Color swatch */}
        <div className="shrink-0 relative flex items-center justify-center" style={{ width: '36px', height: '36px' }}>
          <div
            className="rounded"
            style={{
              width: '22px', height: '22px',
              background: color,
              border: '0.5px solid var(--rule)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="color"
            value={color}
            onChange={e => onColorChange(e.target.value)}
            style={{
              position: 'absolute', inset: 0,
              opacity: 0,
              width: '100%', height: '100%',
              cursor: 'pointer',
            }}
            aria-label="Pick color"
          />
        </div>

        <VertSep />

        {/* Size − number + */}
        <div className="shrink-0 flex items-center gap-1">
          <button
            onClick={() => onSizeChange(Math.max(1, size - 1))}
            className="flex items-center justify-center rounded transition-all"
            style={{ width: '28px', height: '36px', color: 'var(--ink-2)', background: 'transparent', fontSize: '1rem' }}
            aria-label="Decrease size"
          >
            −
          </button>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-dm)', color: 'var(--ink-3)', minWidth: '18px', textAlign: 'center' }}>
            {size}
          </span>
          <button
            onClick={() => onSizeChange(Math.min(30, size + 1))}
            className="flex items-center justify-center rounded transition-all"
            style={{ width: '28px', height: '36px', color: 'var(--ink-2)', background: 'transparent', fontSize: '1rem' }}
            aria-label="Increase size"
          >
            +
          </button>
        </div>
      </div>
    );
  }

  /* ── Vertical layout (default) ────────────────────── */
  return (
    <aside
      className="flex flex-col shrink-0 toolbar-scroll overflow-y-auto"
      style={{
        width: '92px',
        background: 'var(--surface)',
        borderRight: '0.5px solid var(--rule)',
      }}
    >
      {/* ── Main tools ────────────────────────────── */}
      <div className="flex flex-col gap-1 px-2.5 pt-4 pb-2">
        {([
          { id: 'brush'  as const, label: '筆',  enLabel: 'Brush'  },
          { id: 'eraser' as const, label: '消す', enLabel: 'Eraser' },
          { id: 'fill'   as const, label: '塗る', enLabel: 'Fill'   },
        ]).map(({ id, label, enLabel }) => {
          const active = tool === id;
          return (
            <button
              key={id}
              onClick={() => onToolChange(id)}
              title={label}
              className="relative flex flex-col items-center gap-[6px] py-3 rounded transition-all"
              style={{
                background: active ? 'var(--beni-soft)' : 'transparent',
              }}
            >
              {active && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r"
                  style={{ width: '3px', height: '24px', background: 'var(--beni)' }}
                />
              )}
              {id === 'brush'  && <BrushIcon  active={active} />}
              {id === 'eraser' && <EraserIcon active={active} />}
              {id === 'fill'   && <FillIcon   active={active} />}
              <span className="flex flex-col items-center gap-[2px]">
                <span
                  className="font-shippori"
                  style={{ fontSize: '11px', letterSpacing: '0.06em', color: active ? 'var(--beni)' : 'var(--ink-3)' }}
                >
                  {label}
                </span>
                {en && (
                  <span style={{ fontSize: '8px', fontFamily: 'var(--font-dm)', letterSpacing: '0.08em', color: active ? 'var(--beni)' : 'var(--ink-3)', opacity: 0.65 }}>
                    {enLabel}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <Sep />

      {/* ── Brush styles (brush only) ──────────────── */}
      {tool === 'brush' && (
        <>
          <div className="flex flex-col gap-1 px-2.5 py-2">
            {(['normal', 'pencil', 'ink'] as BrushStyle[]).map(s => {
              const active = brushStyle === s;
              return (
                <button
                  key={s}
                  onClick={() => onBrushStyleChange(s)}
                  className="flex flex-col items-center gap-2 py-2.5 px-2 rounded transition-all"
                  style={{ background: active ? 'var(--beni-soft)' : 'transparent' }}
                >
                  <StrokePreview style={s} active={active} />
                  <span
                    style={{
                      fontSize: '10px',
                      fontFamily: 'var(--font-dm)',
                      textTransform: 'capitalize',
                      letterSpacing: '0.06em',
                      color: active ? 'var(--beni)' : 'var(--ink-3)',
                    }}
                  >
                    {s}
                  </span>
                </button>
              );
            })}
          </div>
          <Sep />
        </>
      )}

      {/* ── Size ──────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2.5 px-3 py-3.5">
        <div className="flex justify-between items-center w-full">
          <span className="flex items-baseline gap-1.5">
            <span className="font-shippori" style={{ fontSize: '11px', color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
              太さ
            </span>
            {en && <span style={{ fontSize: '8px', fontFamily: 'var(--font-dm)', color: 'var(--ink-3)', opacity: 0.65, letterSpacing: '0.08em' }}>Size</span>}
          </span>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-dm)', color: 'var(--ink-3)' }}>
            {size}
          </span>
        </div>
        <input
          type="range" min={1} max={30} value={size}
          onChange={e => onSizeChange(Number(e.target.value))}
          className="w-full"
          style={{ accentColor: 'var(--beni)' }}
        />
        {/* Live dot preview */}
        <div
          className="rounded-full transition-all"
          style={{
            width:  `${Math.max(4, Math.min(Math.round(size * 0.9), 32))}px`,
            height: `${Math.max(4, Math.min(Math.round(size * 0.9), 32))}px`,
            background: color,
            border: '0.5px solid var(--rule)',
          }}
        />
      </div>

      <Sep />

      {/* ── Colour palette ────────────────────────── */}
      <div className="px-3 py-3">
        <span
          className="font-shippori"
          style={{ fontSize: '11px', color: 'var(--ink-3)', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}
        >
          色{en && <span style={{ marginLeft: '5px', fontSize: '8px', fontFamily: 'var(--font-dm)', opacity: 0.65, letterSpacing: '0.08em' }}>Color</span>}
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
          {PALETTE.map(c => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              title={c}
              style={{
                width: '16px', height: '16px',
                background: c,
                borderRadius: '2px',
                outline: color === c ? '2px solid var(--beni)' : '0.5px solid var(--rule)',
                outlineOffset: color === c ? '1px' : '0',
                transform: color === c ? 'scale(1.12)' : 'scale(1)',
                transition: 'all 0.1s',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '11px' }}>
          <input
            type="color" value={color}
            onChange={e => onColorChange(e.target.value)}
            style={{
              width: '26px', height: '20px',
              cursor: 'pointer', borderRadius: '2px',
              border: '0.5px solid var(--rule)',
            }}
          />
          <span style={{ fontSize: '8px', fontFamily: 'monospace', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '44px' }}>
            {color}
          </span>
        </div>
      </div>

      <Sep />

      {/* ── Actions ───────────────────────────────── */}
      <div className="flex flex-col gap-1 px-2.5 py-2.5 pb-5">
        {([
          { label: '戻る',    enLabel: 'Undo', short: '⌘Z',  fn: onUndo },
          { label: 'やり直す', enLabel: 'Redo', short: '⇧⌘Z', fn: onRedo },
        ]).map(({ label, enLabel, short, fn }) => (
          <button
            key={enLabel}
            onClick={fn}
            title={`${enLabel} (${short})`}
            className="flex items-center justify-between px-2.5 py-2 rounded transition-all"
            style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-shippori)', fontSize: '11px' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--ink)';
              (e.currentTarget as HTMLElement).style.background = 'var(--bg)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--ink-3)';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <span className="flex flex-col gap-[1px]">
              <span>{label}</span>
              {en && <span style={{ fontSize: '8px', fontFamily: 'var(--font-dm)', opacity: 0.65, letterSpacing: '0.08em' }}>{enLabel}</span>}
            </span>
            <span style={{ fontSize: '8px', opacity: 0.4, fontFamily: 'var(--font-dm)' }}>{short}</span>
          </button>
        ))}
        <button
          onClick={onClear}
          title="Clear canvas"
          className="flex items-center px-2.5 py-2 rounded transition-all mt-1"
          style={{ color: 'var(--beni)', fontFamily: 'var(--font-shippori)', fontSize: '11px' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--beni-soft)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <span className="flex flex-col gap-[1px]">
            <span>クリア</span>
            {en && <span style={{ fontSize: '8px', fontFamily: 'var(--font-dm)', opacity: 0.65, letterSpacing: '0.08em' }}>Clear</span>}
          </span>
        </button>
      </div>
    </aside>
  );
}
