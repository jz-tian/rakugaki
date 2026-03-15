// Mock localStorage / sessionStorage with a simple in-memory store
const makeStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
};

Object.defineProperty(global, 'localStorage', { value: makeStorage(), writable: true });
Object.defineProperty(global, 'sessionStorage', { value: makeStorage(), writable: true });

import {
  getGameState, setGameState,
  getSessionState, setSessionState, clearSessionState,
  getPastWorks, addPastWork,
} from '../storage';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('getGameState', () => {
  it('returns defaults when storage is empty', () => {
    const state = getGameState();
    expect(state).toEqual({ level: 1, difficulty: 'normal', language: 'zh' });
  });

  it('returns saved values', () => {
    localStorage.setItem('level', '5');
    localStorage.setItem('difficulty', 'hard');
    localStorage.setItem('language', 'en');
    expect(getGameState()).toEqual({ level: 5, difficulty: 'hard', language: 'en' });
  });
});

describe('setGameState', () => {
  it('persists partial update', () => {
    setGameState({ level: 3 });
    expect(getGameState().level).toBe(3);
    expect(getGameState().difficulty).toBe('normal'); // default unchanged
  });
});

describe('session state', () => {
  it('returns empty object when storage is empty', () => {
    expect(getSessionState()).toEqual({});
  });

  it('round-trips session state', () => {
    setSessionState({ prompt: 'Draw a cat', promptToken: 'tok123', isRetry: false });
    expect(getSessionState().prompt).toBe('Draw a cat');
  });

  it('clearSessionState removes the key', () => {
    setSessionState({ prompt: 'test', promptToken: 'x', isRetry: false });
    clearSessionState();
    expect(getSessionState()).toEqual({});
  });
});

describe('past works', () => {
  it('returns empty array when empty', () => {
    expect(getPastWorks()).toEqual([]);
  });

  it('addPastWork prepends and round-trips', () => {
    addPastWork({
      prompt: 'An apple', imageBase64: 'data:...', score: 87,
      level: 1, difficulty: 'easy',
    });
    const works = getPastWorks();
    expect(works).toHaveLength(1);
    expect(works[0].prompt).toBe('An apple');
    expect(works[0].score).toBe(87);
    expect(works[0].id).toBeDefined();
  });

  it('caps past works at 50 entries', () => {
    for (let i = 0; i < 55; i++) {
      addPastWork({ prompt: `p${i}`, imageBase64: '', score: 50, level: 1, difficulty: 'easy' });
    }
    expect(getPastWorks()).toHaveLength(50);
  });
});
