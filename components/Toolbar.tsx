'use client';

import type { BrushStyle } from './Canvas';

const PALETTE = [
  '#1a1a24', '#4a3728', '#8b4513', '#c0392b', '#e74c3c',
  '#e67e22', '#f1c40f', '#2ecc71', '#27ae60', '#1abc9c',
  '#3498db', '#2980b9', '#9b59b6', '#8e44ad', '#ec407a',
  '#f8bbd0', '#ffffff', '#bdc3c7', '#95a5a6', '#7f8c8d',
];

interface ToolbarProps {
  tool: 'brush' | 'eraser' | 'fill';
  brushStyle: BrushStyle;
  color: string;
  size: number;
  onToolChange: (t: 'brush' | 'eraser' | 'fill') => void;
  onBrushStyleChange: (s: BrushStyle) => void;
  onColorChange: (c: string) => void;
  onSizeChange: (s: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

export default function Toolbar({
  tool, brushStyle, color, size,
  onToolChange, onBrushStyleChange, onColorChange, onSizeChange,
  onUndo, onRedo, onClear,
}: ToolbarProps) {
  const btnBase = 'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded text-xs transition-colors';
  const btnActive = 'bg-stone-800 text-stone-100';
  const btnIdle   = 'text-stone-500 hover:bg-stone-100 hover:text-stone-700';

  return (
    <div className="flex flex-col gap-3 p-3 border-r border-stone-200 bg-stone-50 w-[72px] shrink-0 select-none">

      {/* Tools */}
      <div className="flex flex-col gap-1">
        <button
          className={`${btnBase} ${tool === 'brush' ? btnActive : btnIdle}`}
          onClick={() => onToolChange('brush')}
          title="Brush"
        >
          <span className="text-lg">✏️</span>
          <span>Brush</span>
        </button>
        <button
          className={`${btnBase} ${tool === 'eraser' ? btnActive : btnIdle}`}
          onClick={() => onToolChange('eraser')}
          title="Eraser"
        >
          <span className="text-lg">⬜</span>
          <span>Erase</span>
        </button>
        <button
          className={`${btnBase} ${tool === 'fill' ? btnActive : btnIdle}`}
          onClick={() => onToolChange('fill')}
          title="Fill"
        >
          <span className="text-lg">🪣</span>
          <span>Fill</span>
        </button>
      </div>

      <div className="border-t border-stone-200" />

      {/* Brush styles (only when brush active) */}
      {tool === 'brush' && (
        <div className="flex flex-col gap-1">
          {(['normal', 'pencil', 'ink'] as BrushStyle[]).map(s => (
            <button
              key={s}
              className={`${btnBase} ${brushStyle === s ? btnActive : btnIdle}`}
              onClick={() => onBrushStyleChange(s)}
            >
              <span className="text-sm capitalize">{s}</span>
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-stone-200" />

      {/* Stroke size */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] text-stone-400 uppercase tracking-wide">Size</span>
        <input
          type="range" min={1} max={30} value={size}
          onChange={e => onSizeChange(Number(e.target.value))}
          className="w-full accent-stone-700"
          title={`Size: ${size}px`}
        />
        <span className="text-[10px] text-stone-500">{size}px</span>
      </div>

      <div className="border-t border-stone-200" />

      {/* Colour palette */}
      <div className="grid grid-cols-4 gap-0.5">
        {PALETTE.map(c => (
          <button
            key={c}
            className={`w-4 h-4 rounded-sm border transition-transform ${
              color === c ? 'border-stone-700 scale-110' : 'border-stone-200'
            }`}
            style={{ background: c }}
            onClick={() => onColorChange(c)}
            title={c}
          />
        ))}
      </div>

      {/* Custom colour */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] text-stone-400 uppercase tracking-wide">Custom</span>
        <input
          type="color" value={color}
          onChange={e => onColorChange(e.target.value)}
          className="w-8 h-6 cursor-pointer rounded border border-stone-200"
        />
      </div>

      <div className="border-t border-stone-200" />

      {/* Actions */}
      <div className="flex flex-col gap-1">
        <button className={`${btnBase} ${btnIdle}`} onClick={onUndo} title="Undo (⌘Z)">
          <span>↩</span><span>Undo</span>
        </button>
        <button className={`${btnBase} ${btnIdle}`} onClick={onRedo} title="Redo (⌘⇧Z)">
          <span>↪</span><span>Redo</span>
        </button>
        <button
          className={`${btnBase} text-red-400 hover:bg-red-50 hover:text-red-600`}
          onClick={onClear}
          title="Clear canvas"
        >
          <span>🗑</span><span>Clear</span>
        </button>
      </div>
    </div>
  );
}
