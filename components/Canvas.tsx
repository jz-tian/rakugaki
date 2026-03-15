'use client';

import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

export type BrushStyle = 'normal' | 'pencil' | 'ink';

export interface CanvasHandle {
  exportPNG: () => string;
  clear: () => void;
  undo: () => void;
  redo: () => void;
}

interface CanvasProps {
  brushStyle: BrushStyle;
  color: string;
  size: number;
  tool: 'brush' | 'eraser' | 'fill';
  locked?: boolean;
}

const CANVAS_W = 800;
const CANVAS_H = 600;
const MAX_HISTORY = 30;

const Canvas = forwardRef<CanvasHandle, CanvasProps>(
  ({ brushStyle, color, size, tool, locked = false }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // History for undo/redo
    const historyRef    = useRef<ImageData[]>([]);
    const historyIdxRef = useRef(-1);

    // Drawing state
    const drawingRef = useRef(false);
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);
    const lastTimeRef = useRef<number>(0);

    // Keep latest tool/brush/color/size in refs so event handlers always see current values
    const toolRef       = useRef(tool);
    const brushRef      = useRef(brushStyle);
    const colorRef      = useRef(color);
    const sizeRef       = useRef(size);
    useEffect(() => { toolRef.current = tool; }, [tool]);
    useEffect(() => { brushRef.current = brushStyle; }, [brushStyle]);
    useEffect(() => { colorRef.current = color; }, [color]);
    useEffect(() => { sizeRef.current = size; }, [size]);

    // ── Init canvas ───────────────────────────────────────
    useEffect(() => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      saveSnapshot();
    }, []);

    // ── Keyboard shortcuts ─────────────────────────────────
    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo(); else undo();
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }, []);

    // ── Imperative handle ─────────────────────────────────
    useImperativeHandle(ref, () => ({
      exportPNG() {
        return canvasRef.current?.toDataURL('image/png') ?? '';
      },
      clear() {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        saveSnapshot();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        saveSnapshot();
      },
      undo,
      redo,
    }));

    // ── History ───────────────────────────────────────────
    function saveSnapshot() {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      const snapshot = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
      historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
      historyRef.current.push(snapshot);
      if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
      historyIdxRef.current = historyRef.current.length - 1;
    }

    function undo() {
      if (historyIdxRef.current <= 0) return;
      historyIdxRef.current--;
      const ctx = canvasRef.current?.getContext('2d');
      ctx?.putImageData(historyRef.current[historyIdxRef.current], 0, 0);
    }

    function redo() {
      if (historyIdxRef.current >= historyRef.current.length - 1) return;
      historyIdxRef.current++;
      const ctx = canvasRef.current?.getContext('2d');
      ctx?.putImageData(historyRef.current[historyIdxRef.current], 0, 0);
    }

    // ── Drawing ────────────────────────────────────────────
    function applyBrushSettings(ctx: CanvasRenderingContext2D, pressure: number, speed: number) {
      ctx.strokeStyle = toolRef.current === 'eraser' ? '#ffffff' : colorRef.current;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (toolRef.current === 'eraser') {
        ctx.lineWidth = sizeRef.current * 2;
        ctx.globalAlpha = 1;
        return;
      }

      switch (brushRef.current) {
        case 'normal':
          ctx.lineWidth = sizeRef.current;
          ctx.globalAlpha = 1;
          break;
        case 'pencil':
          ctx.lineWidth = sizeRef.current * 0.7;
          ctx.globalAlpha = 0.55 + pressure * 0.35;
          break;
        case 'ink':
          // Width varies with speed: fast → thin, slow → thick
          ctx.lineWidth = Math.max(1, sizeRef.current - speed * 0.04);
          ctx.globalAlpha = 0.85 + pressure * 0.15;
          break;
      }
    }

    function drawStroke(from: { x: number; y: number }, to: { x: number; y: number }, pressure: number, speed: number) {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      ctx.globalCompositeOperation = 'source-over'; // eraser uses white strokeStyle on white canvas
      applyBrushSettings(ctx, pressure, speed);

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      // Pencil texture: random micro dots
      if (brushRef.current === 'pencil' && toolRef.current !== 'eraser') {
        ctx.globalAlpha = 0.15;
        for (let i = 0; i < 3; i++) {
          const ox = (Math.random() - 0.5) * sizeRef.current;
          const oy = (Math.random() - 0.5) * sizeRef.current;
          ctx.beginPath();
          ctx.arc(to.x + ox, to.y + oy, sizeRef.current * 0.15, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
    }

    // ── Flood fill (BFS scanline) ──────────────────────────
    function floodFill(startX: number, startY: number, fillColor: string) {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
      const data = imageData.data;

      // Parse fill color
      const temp = document.createElement('canvas');
      const tCtx = temp.getContext('2d')!;
      tCtx.fillStyle = fillColor;
      tCtx.fillRect(0, 0, 1, 1);
      const fillPixel = tCtx.getImageData(0, 0, 1, 1).data;
      const fr = fillPixel[0], fg = fillPixel[1], fb = fillPixel[2], fa = fillPixel[3];

      const idx = (startY * CANVAS_W + startX) * 4;
      const tr = data[idx], tg = data[idx + 1], tb = data[idx + 2], ta = data[idx + 3];

      if (tr === fr && tg === fg && tb === fb && ta === fa) return; // already same color

      function colorMatch(i: number) {
        return data[i] === tr && data[i + 1] === tg && data[i + 2] === tb && data[i + 3] === ta;
      }
      function setColor(i: number) {
        data[i] = fr; data[i + 1] = fg; data[i + 2] = fb; data[i + 3] = fa;
      }

      const stack: number[] = [startY * CANVAS_W + startX];
      const visited = new Uint8Array(CANVAS_W * CANVAS_H);

      while (stack.length) {
        const pos = stack.pop()!;
        if (visited[pos]) continue;
        visited[pos] = 1;

        const x = pos % CANVAS_W;
        const y = Math.floor(pos / CANVAS_W);
        if (!colorMatch(pos * 4)) continue;

        setColor(pos * 4);

        if (x > 0)           stack.push(pos - 1);
        if (x < CANVAS_W - 1) stack.push(pos + 1);
        if (y > 0)           stack.push(pos - CANVAS_W);
        if (y < CANVAS_H - 1) stack.push(pos + CANVAS_W);
      }

      ctx.putImageData(imageData, 0, 0);
    }

    // ── Pointer helpers ───────────────────────────────────
    function getPoint(e: React.PointerEvent<HTMLCanvasElement>) {
      const rect = canvasRef.current!.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (CANVAS_W / rect.width),
        y: (e.clientY - rect.top)  * (CANVAS_H / rect.height),
      };
    }

    function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
      if (locked) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const pt = getPoint(e);

      if (toolRef.current === 'fill') {
        saveSnapshot();
        floodFill(Math.round(pt.x), Math.round(pt.y), colorRef.current);
        saveSnapshot();
        return;
      }

      saveSnapshot();
      drawingRef.current = true;
      lastPosRef.current = pt;
      lastTimeRef.current = e.timeStamp;
    }

    function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
      if (!drawingRef.current || locked) return;
      const pt = getPoint(e);
      const pressure = e.nativeEvent.pressure || 0.5;
      const dt = e.timeStamp - lastTimeRef.current;
      const dx = pt.x - (lastPosRef.current?.x ?? pt.x);
      const dy = pt.y - (lastPosRef.current?.y ?? pt.y);
      const speed = dt > 0 ? Math.sqrt(dx * dx + dy * dy) / dt : 0;

      if (lastPosRef.current) {
        drawStroke(lastPosRef.current, pt, pressure, speed);
      }

      lastPosRef.current = pt;
      lastTimeRef.current = e.timeStamp;
    }

    function onPointerUp() {
      drawingRef.current = false;
      lastPosRef.current = null;
    }

    return (
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className={`w-full h-full touch-none bg-white ${locked ? 'pointer-events-none opacity-70' : 'cursor-crosshair'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
    );
  });

Canvas.displayName = 'Canvas';
export default Canvas;
