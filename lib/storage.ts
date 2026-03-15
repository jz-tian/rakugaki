import type { Difficulty, Language, PastWork } from './types';

export interface GameState {
  level: number;
  difficulty: Difficulty;
  language: Language;
}

export interface SessionState {
  promptToken: string;
  prompt: string;
  lastResult?: {
    score: number;
    comment: string;
    passed: boolean;
    timedOut: boolean;
  };
  lastImageBase64?: string;
  isRetry: boolean;
  persisted?: boolean; // true after addPastWork fires; prevents duplicate on re-mount
}

const DEFAULTS: GameState = { level: 1, difficulty: 'normal', language: 'zh' };

// ── localStorage ─────────────────────────────────────────

export function getGameState(): GameState {
  if (typeof localStorage === 'undefined') return DEFAULTS;
  try {
    const level = parseInt(localStorage.getItem('level') ?? '1', 10) || 1;
    const difficulty = (localStorage.getItem('difficulty') as Difficulty) ?? 'normal';
    const language = (localStorage.getItem('language') as Language) ?? 'zh';
    return { level, difficulty, language };
  } catch {
    return DEFAULTS;
  }
}

export function setGameState(patch: Partial<GameState>): void {
  if (typeof localStorage === 'undefined') return;
  const next = { ...getGameState(), ...patch };
  try {
    localStorage.setItem('level', String(next.level));
    localStorage.setItem('difficulty', next.difficulty);
    localStorage.setItem('language', next.language);
  } catch { /* storage full */ }
}

export function getPastWorks(): PastWork[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem('pastWorks');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addPastWork(work: Omit<PastWork, 'id' | 'timestamp'>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const works = getPastWorks();
    const newWork: PastWork = {
      ...work,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    localStorage.setItem('pastWorks', JSON.stringify([newWork, ...works].slice(0, 50)));
  } catch { /* storage full */ }
}

// ── sessionStorage ────────────────────────────────────────

export function getSessionState(): Partial<SessionState> {
  if (typeof sessionStorage === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem('gameSession');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setSessionState(patch: Partial<SessionState>): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const current = getSessionState();
    sessionStorage.setItem('gameSession', JSON.stringify({ ...current, ...patch }));
  } catch { /* storage full */ }
}

export function clearSessionState(): void {
  if (typeof sessionStorage === 'undefined') return;
  try { sessionStorage.removeItem('gameSession'); } catch { /* ignore */ }
}
