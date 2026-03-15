# Drawing Game (落書き) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 14 web app where players draw AI-generated prompts, get scored by Gemini Vision, and level up through increasingly complex/absurd challenges.

**Architecture:** App Router Next.js with two serverless API routes (`/api/generate-prompt`, `/api/score`). All game state in localStorage/sessionStorage — no database. Prompt integrity enforced via stateless HMAC-signed tokens so clients cannot forge prompts.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, `@google/generative-ai`, native Canvas API + Pointer Events, Vercel Hobby (free tier).

---

## File Map

| File | Responsibility |
|------|----------------|
| `lib/types.ts` | Shared TypeScript types and constants |
| `lib/promptToken.ts` | HMAC-SHA256 sign/verify for prompt tokens |
| `lib/gemini.ts` | Gemini API client (text + vision, timeout, retry) |
| `lib/storage.ts` | localStorage / sessionStorage read-write helpers |
| `lib/i18n.ts` | Static language pack loader |
| `locales/en.json` | English UI strings |
| `locales/zh.json` | Chinese UI strings |
| `app/layout.tsx` | Root layout, fonts, global CSS |
| `app/globals.css` | Tailwind base + CSS variables |
| `app/page.tsx` | Home page (hero, gallery, controls) |
| `app/game/page.tsx` | Game page (canvas, timer, submit) |
| `app/result/page.tsx` | Result page (score, comment, next/retry) |
| `app/api/generate-prompt/route.ts` | POST — calls Gemini text, returns `{ prompt, token }` |
| `app/api/score/route.ts` | POST — verifies token, calls Gemini Vision, returns `{ score, comment, passed }` |
| `components/Canvas.tsx` | Drawing canvas, Pointer Events, undo/redo, export |
| `components/Toolbar.tsx` | Tool selector (brush styles, eraser, fill, color, size, undo, clear) |
| `components/Timer.tsx` | 3-minute countdown, fires callback on expiry |
| `components/LanguageToggle.tsx` | EN / 中文 toggle, persists to localStorage |
| `components/GalleryCard.tsx` | Past-work card with score hanko stamp |

---

## Chunk 1: Scaffold + Core Libraries + API Routes

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `.env.example`

- [ ] **Step 1: Bootstrap Next.js project**

Run in the repo root (`/Users/jiazheng/idol/claude_projects/drawinggame`):

```bash
npx create-next-app@14 . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --no-git
```

Accept all defaults. This creates `app/`, `components/` (empty), `public/`, `package.json`, `tailwind.config.ts`, `tsconfig.json`, `next.config.ts`.

- [ ] **Step 2: Install Gemini SDK and test deps**

```bash
npm install @google/generative-ai
npm install -D jest jest-environment-node @types/jest ts-jest \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jest-environment-jsdom
```

- [ ] **Step 3: Configure Jest**

Create `jest.config.ts`:

```typescript
import type { Config } from 'jest';

const config: Config = {
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['**/lib/__tests__/**/*.test.ts', '**/app/api/**/*.test.ts'],
      transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'commonjs' } }] },
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: ['**/components/__tests__/**/*.test.tsx'],
      transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { module: 'commonjs' } }] },
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
      setupFilesAfterEnv: ['@testing-library/jest-dom'],
    },
  ],
};
export default config;
```

- [ ] **Step 4: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 5: Create .env.example**

```bash
cat > .env.example << 'EOF'
# Gemini API key — get from https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_key_here

# Random secret for signing prompt tokens — generate with: openssl rand -hex 32
PROMPT_SECRET=your_32_byte_hex_secret_here
EOF
```

Copy to `.env.local` and fill in real values:
```bash
cp .env.example .env.local
```

- [ ] **Step 6: Verify project starts**

```bash
npm run dev
```

Expected: server starts on `http://localhost:3000` with the default Next.js page.

- [ ] **Step 7: Commit scaffold**

```bash
git add -A
git commit -m "chore: scaffold Next.js 14 project with Tailwind + Jest"
```

---

### Task 2: Shared types + locale files + i18n

**Files:**
- Create: `lib/types.ts`, `locales/en.json`, `locales/zh.json`, `lib/i18n.ts`
- Create: `lib/__tests__/i18n.test.ts`

- [ ] **Step 1: Write failing i18n test**

Create `lib/__tests__/i18n.test.ts`:

```typescript
import { t, getTranslations } from '../i18n';

describe('i18n', () => {
  it('returns English string by key', () => {
    expect(t('en', 'home.cta.start')).toBe('Start Drawing');
  });

  it('returns Chinese string by key', () => {
    expect(t('zh', 'home.cta.start')).toBe('开始作画');
  });

  it('falls back to key if not found', () => {
    expect(t('en', 'nonexistent.key')).toBe('nonexistent.key');
  });

  it('getTranslations returns full object', () => {
    const tr = getTranslations('en');
    expect(tr['home.cta.start']).toBe('Start Drawing');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern=i18n
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create shared types**

Create `lib/types.ts`:

```typescript
export type Difficulty = 'easy' | 'normal' | 'hard';
export type Language = 'en' | 'zh';

export const PASS_THRESHOLDS: Record<Difficulty, number> = {
  easy: 60,
  normal: 75,
  hard: 85,
};

export interface ScoreResult {
  score: number;
  comment: string;
  passed: boolean;
}

export interface GeneratePromptResponse {
  prompt: string;
  token: string;
}

export interface ScoreRequest {
  imageBase64: string;
  promptToken: string;
  difficulty: Difficulty;
  language: Language;
}

export interface PastWork {
  id: string;
  prompt: string;
  imageBase64: string;
  score: number;
  level: number;
  difficulty: Difficulty;
  timestamp: number;
}
```

- [ ] **Step 4: Create locale files**

Create `locales/en.json`:

```json
{
  "game.title.jp": "落書き",
  "game.title.en": "RAKUGAKI",
  "home.eyebrow": "AI DRAWING JUDGE",
  "home.tagline.1": "Draw anything.",
  "home.tagline.2": "Get judged by AI.",
  "home.tagline.3": "Level up — or try again.",
  "home.stat.levels": "LEVELS",
  "home.stat.difficulties": "DIFFICULTIES",
  "home.stat.perRound": "PER ROUND",
  "home.diff.label": "DIFFICULTY",
  "home.diff.easy": "Easy",
  "home.diff.normal": "Normal",
  "home.diff.hard": "Hard",
  "home.cta.start": "Start Drawing",
  "home.gallery.title.jp": "作品集",
  "home.gallery.title.en": "past works",
  "home.gallery.drawLabel": "Draw:",
  "home.gallery.empty": "No works yet. Start your first game.",
  "home.scroll.label": "Past Works",
  "home.level": "Level",
  "game.loading": "Generating prompt…",
  "game.scoring": "Scoring your drawing…",
  "game.submit": "Submit",
  "game.timedOut": "⏰ Time's Up",
  "game.level": "Level",
  "result.score": "/ 100",
  "result.pass": "Next Level →",
  "result.fail": "Try Again",
  "result.changeDifficulty": "Change Difficulty",
  "result.timedOut": "⏰ Time's Up",
  "result.expired": "Session expired — please start a new round.",
  "result.newRound": "New Round",
  "error.serviceBusy": "Service is busy. Please wait a moment.",
  "error.timeout": "Request timed out. Please try again.",
  "error.unknown": "Something went wrong. Please try again.",
  "lang.en": "EN",
  "lang.zh": "中文"
}
```

Create `locales/zh.json`:

```json
{
  "game.title.jp": "落書き",
  "game.title.en": "RAKUGAKI",
  "home.eyebrow": "AI 绘画评分",
  "home.tagline.1": "画任何东西。",
  "home.tagline.2": "接受 AI 评判。",
  "home.tagline.3": "升级，或者重试。",
  "home.stat.levels": "关卡",
  "home.stat.difficulties": "难度",
  "home.stat.perRound": "每局时间",
  "home.diff.label": "难度",
  "home.diff.easy": "简单",
  "home.diff.normal": "普通",
  "home.diff.hard": "困难",
  "home.cta.start": "开始作画",
  "home.gallery.title.jp": "作品集",
  "home.gallery.title.en": "往期作品",
  "home.gallery.drawLabel": "题目：",
  "home.gallery.empty": "还没有作品，开始第一局吧。",
  "home.scroll.label": "往期作品",
  "home.level": "第",
  "game.loading": "正在生成题目…",
  "game.scoring": "AI 正在评分…",
  "game.submit": "提交",
  "game.timedOut": "⏰ 时间到",
  "game.level": "第",
  "result.score": "/ 100",
  "result.pass": "下一关 →",
  "result.fail": "再试一次",
  "result.changeDifficulty": "更换难度",
  "result.timedOut": "⏰ 时间到",
  "result.expired": "会话已过期，请重新开始。",
  "result.newRound": "新一局",
  "error.serviceBusy": "服务繁忙，请稍后再试。",
  "error.timeout": "请求超时，请重试。",
  "error.unknown": "出现错误，请重试。",
  "lang.en": "EN",
  "lang.zh": "中文"
}
```

- [ ] **Step 5: Create i18n loader**

Create `lib/i18n.ts`:

```typescript
import en from '../locales/en.json';
import zh from '../locales/zh.json';
import type { Language } from './types';

type Strings = Record<string, string>;
const packs: Record<Language, Strings> = { en, zh };

export function t(lang: Language, key: string): string {
  return packs[lang][key] ?? packs['en'][key] ?? key;
}

export function getTranslations(lang: Language): Strings {
  return packs[lang];
}
```

- [ ] **Step 6: Run test — expect PASS**

```bash
npm test -- --testPathPattern=i18n
```

Expected: PASS — 4 tests pass.

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts lib/i18n.ts lib/__tests__/i18n.test.ts locales/
git commit -m "feat: add shared types, i18n loader, and locale files"
```

---

### Task 3: Storage helpers

**Files:**
- Create: `lib/storage.ts`, `lib/__tests__/storage.test.ts`

- [ ] **Step 1: Write failing storage tests**

Create `lib/__tests__/storage.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern=storage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement storage helpers**

Create `lib/storage.ts`:

```typescript
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
  if (typeof window === 'undefined') return DEFAULTS;
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
  if (typeof window === 'undefined') return;
  const next = { ...getGameState(), ...patch };
  try {
    localStorage.setItem('level', String(next.level));
    localStorage.setItem('difficulty', next.difficulty);
    localStorage.setItem('language', next.language);
  } catch { /* storage full */ }
}

export function getPastWorks(): PastWork[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('pastWorks');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addPastWork(work: Omit<PastWork, 'id' | 'timestamp'>): void {
  if (typeof window === 'undefined') return;
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
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem('gameSession');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setSessionState(patch: Partial<SessionState>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getSessionState();
    sessionStorage.setItem('gameSession', JSON.stringify({ ...current, ...patch }));
  } catch { /* storage full */ }
}

export function clearSessionState(): void {
  if (typeof window === 'undefined') return;
  try { sessionStorage.removeItem('gameSession'); } catch { /* ignore */ }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- --testPathPattern=storage
```

Expected: PASS — all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts lib/__tests__/storage.test.ts
git commit -m "feat: add localStorage/sessionStorage helpers with tests"
```

---

### Task 4: Prompt token (HMAC sign/verify)

**Files:**
- Create: `lib/promptToken.ts`, `lib/__tests__/promptToken.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/promptToken.test.ts`:

```typescript
process.env.PROMPT_SECRET = 'test-secret-32-bytes-xxxxxxxxxx';

import { signToken, verifyToken } from '../promptToken';

describe('signToken / verifyToken', () => {
  it('round-trips a token', () => {
    const token = signToken({ prompt: 'Draw a cat', difficulty: 'easy' });
    const payload = verifyToken(token);
    expect(payload.prompt).toBe('Draw a cat');
    expect(payload.difficulty).toBe('easy');
  });

  it('throws on tampered payload', () => {
    const token = signToken({ prompt: 'Draw a cat', difficulty: 'easy' });
    const [data, sig] = token.split('.');
    const tampered = Buffer.from(JSON.stringify({ prompt: 'Evil', exp: Date.now() + 9999 }))
      .toString('base64url');
    expect(() => verifyToken(`${tampered}.${sig}`)).toThrow();
  });

  it('throws on tampered signature', () => {
    const token = signToken({ prompt: 'Draw a cat', difficulty: 'easy' });
    const [data] = token.split('.');
    expect(() => verifyToken(`${data}.invalidsig`)).toThrow();
  });

  it('throws on expired token', () => {
    // Create token with exp in the past by manually building payload
    const data = Buffer.from(JSON.stringify({
      prompt: 'test', difficulty: 'easy', exp: Date.now() - 1000,
    })).toString('base64url');
    const crypto = require('crypto');
    const sig = crypto.createHmac('sha256', process.env.PROMPT_SECRET!)
      .update(data).digest('base64url');
    expect(() => verifyToken(`${data}.${sig}`)).toThrow('expired');
  });

  it('throws on malformed token', () => {
    expect(() => verifyToken('notavalidtoken')).toThrow();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern=promptToken
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement promptToken**

Create `lib/promptToken.ts`:

```typescript
import crypto from 'crypto';
import type { Difficulty } from './types';

interface TokenPayload {
  prompt: string;
  difficulty: Difficulty;
  exp: number; // unix ms
}

const TTL_MS = 10 * 60 * 1000; // 10 minutes

function getSecret(): string {
  const s = process.env.PROMPT_SECRET;
  if (!s) throw new Error('PROMPT_SECRET env var is required');
  return s;
}

export function signToken(payload: Omit<TokenPayload, 'exp'>): string {
  const full: TokenPayload = { ...payload, exp: Date.now() + TTL_MS };
  const data = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token: string): TokenPayload {
  const dotIdx = token.lastIndexOf('.');
  if (dotIdx === -1) throw new Error('Invalid token format');

  const data = token.slice(0, dotIdx);
  const sig  = token.slice(dotIdx + 1);

  const expected = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');

  // Constant-time comparison — pad to same length first
  const a = Buffer.from(sig.padEnd(expected.length, '\0'));
  const b = Buffer.from(expected.padEnd(sig.length, '\0'));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Invalid token signature');
  }

  const payload: TokenPayload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  if (Date.now() > payload.exp) throw new Error('Token expired');
  return payload;
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- --testPathPattern=promptToken
```

Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/promptToken.ts lib/__tests__/promptToken.test.ts
git commit -m "feat: add HMAC prompt token sign/verify with tests"
```

---

### Task 5: Gemini API client

**Files:**
- Create: `lib/gemini.ts`, `lib/__tests__/gemini.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/gemini.test.ts`:

```typescript
// Mock the Gemini SDK
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn(),
    }),
  })),
}));

import { GoogleGenerativeAI } from '@google/generative-ai';
import { generatePrompt, scoreDrawing } from '../gemini';

const mockGenerate = jest.fn();
(GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
  getGenerativeModel: () => ({ generateContent: mockGenerate }),
}));

beforeEach(() => mockGenerate.mockReset());

describe('generatePrompt', () => {
  it('returns trimmed text from Gemini', async () => {
    mockGenerate.mockResolvedValue({ response: { text: () => '  Draw a smiling cat  ' } });
    const result = await generatePrompt(1, 'easy', 'en');
    expect(result).toBe('Draw a smiling cat');
  });

  it('retries once on 429 then succeeds', async () => {
    const err = new Error('429 Too Many Requests');
    mockGenerate
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce({ response: { text: () => 'A cat' } });
    const result = await generatePrompt(1, 'easy', 'en');
    expect(result).toBe('A cat');
    expect(mockGenerate).toHaveBeenCalledTimes(2);
  });

  it('throws after two consecutive 429s', async () => {
    const err = new Error('429 Too Many Requests');
    mockGenerate.mockRejectedValue(err);
    await expect(generatePrompt(1, 'easy', 'en')).rejects.toThrow('429');
  });
});

describe('scoreDrawing', () => {
  it('returns parsed score and comment', async () => {
    mockGenerate.mockResolvedValue({
      response: { text: () => '{"score": 78, "comment": "Nice cat!"}' },
    });
    const result = await scoreDrawing('data:image/png;base64,abc', 'Draw a cat', 'en');
    expect(result.score).toBe(78);
    expect(result.comment).toBe('Nice cat!');
  });

  it('clamps score to 0-100 range', async () => {
    mockGenerate.mockResolvedValue({
      response: { text: () => '{"score": 150, "comment": "Amazing"}' },
    });
    const result = await scoreDrawing('base64data', 'test', 'en');
    expect(result.score).toBe(100);
  });

  it('handles JSON inside markdown code block', async () => {
    mockGenerate.mockResolvedValue({
      response: { text: () => '```json\n{"score": 55, "comment": "OK"}\n```' },
    });
    const result = await scoreDrawing('base64data', 'test', 'en');
    expect(result.score).toBe(55);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern=gemini
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement Gemini client**

Create `lib/gemini.ts`:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Difficulty, Language } from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
const TIMEOUT_MS = 8000;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Error && err.message.includes('429')) {
      await new Promise(r => setTimeout(r, 2000));
      return fn(); // retry once
    }
    throw err;
  }
}

async function withTimeout<T>(fn: () => Promise<T>): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => {
        const err = new Error('Gemini request timed out');
        err.name = 'AbortError';
        reject(err);
      }, TIMEOUT_MS)
    ),
  ]);
}

const STYLE_BANDS: Record<Difficulty, string> = {
  easy:   'single common objects (e.g. an apple, a sun, a cat)',
  normal: 'combined everyday scenes (e.g. a child jumping rope, a rainy street)',
  hard:   'absurd or surreal scenarios (e.g. a pig in the Forbidden City, an alien on the subway)',
};

export async function generatePrompt(
  level: number,
  difficulty: Difficulty,
  language: Language,
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const langNote = language === 'zh' ? 'Respond in simplified Chinese.' : 'Respond in English.';

  const userPrompt = `You are a creative drawing game prompt generator.
Generate ONE drawing prompt for complexity level ${level} in the "${difficulty}" style band.
Style band: ${STYLE_BANDS[difficulty]}.
Higher complexity levels should add more details, characters, or whimsy within the same style band.
${langNote}
Rules: Be fun and creative. Avoid political figures, sexual content, graphic violence, or content targeting ethnic/religious groups.
Return ONLY the prompt text — no explanations, no quotes, no punctuation at the end.`;

  return withRetry(() =>
    withTimeout(() => model.generateContent(userPrompt).then(r => r.response.text().trim()))
  );
}

export async function scoreDrawing(
  imageBase64: string,
  prompt: string,
  language: Language,
): Promise<{ score: number; comment: string }> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const langNote = language === 'zh' ? 'Write your comment in simplified Chinese.' : 'Write your comment in English.';
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const systemPrompt = `You are a fun, encouraging drawing judge.
The player was asked to draw: "${prompt}".
Score how well the drawing matches the prompt on a scale of 0–100 (integer only).
${langNote}
Write a humorous, encouraging comment (1–2 sentences).
Respond with ONLY valid JSON (no markdown): {"score": <integer>, "comment": "<string>"}`;

  return withRetry(() =>
    withTimeout(async () => {
      const result = await model.generateContent([
        systemPrompt,
        { inlineData: { mimeType: 'image/png', data: base64Data } },
      ]);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Gemini returned non-JSON response');
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: Math.max(0, Math.min(100, Math.round(Number(parsed.score)))),
        comment: String(parsed.comment),
      };
    })
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- --testPathPattern=gemini
```

Expected: PASS — 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/gemini.ts lib/__tests__/gemini.test.ts
git commit -m "feat: add Gemini client with retry and timeout"
```

---

### Task 6: /api/generate-prompt route

**Files:**
- Create: `app/api/generate-prompt/route.ts`, `app/api/__tests__/generate-prompt.test.ts`

- [ ] **Step 1: Write failing test**

Create `app/api/__tests__/generate-prompt.test.ts`:

```typescript
process.env.GEMINI_API_KEY = 'test';
process.env.PROMPT_SECRET = 'test-secret-32-bytes-xxxxxxxxxx';

jest.mock('@/lib/gemini', () => ({
  generatePrompt: jest.fn(),
}));
jest.mock('@/lib/promptToken', () => ({
  signToken: jest.fn().mockReturnValue('signed.token'),
}));

import { POST } from '../generate-prompt/route';
import { generatePrompt } from '@/lib/gemini';
import { NextRequest } from 'next/server';

const mockGenerate = generatePrompt as jest.Mock;

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/generate-prompt', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/generate-prompt', () => {
  beforeEach(() => mockGenerate.mockReset());

  it('returns prompt and token on success', async () => {
    mockGenerate.mockResolvedValue('Draw a smiling cat');
    const res = await POST(makeRequest({ level: 1, difficulty: 'easy', language: 'en' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.prompt).toBe('Draw a smiling cat');
    expect(body.token).toBe('signed.token');
  });

  it('returns 400 for invalid difficulty', async () => {
    const res = await POST(makeRequest({ level: 1, difficulty: 'extreme', language: 'en' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid level', async () => {
    const res = await POST(makeRequest({ level: 0, difficulty: 'easy', language: 'en' }));
    expect(res.status).toBe(400);
  });

  it('returns 503 on timeout', async () => {
    const err = new Error('AbortError'); err.name = 'AbortError';
    mockGenerate.mockRejectedValue(err);
    const res = await POST(makeRequest({ level: 1, difficulty: 'easy', language: 'en' }));
    expect(res.status).toBe(503);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern=generate-prompt
```

Expected: FAIL — route file not found.

- [ ] **Step 3: Implement route**

Create `app/api/generate-prompt/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generatePrompt } from '@/lib/gemini';
import { signToken } from '@/lib/promptToken';
import type { Difficulty, Language } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 9;

const VALID_DIFFICULTIES = new Set<Difficulty>(['easy', 'normal', 'hard']);
const VALID_LANGUAGES    = new Set<Language>(['en', 'zh']);

export async function POST(req: NextRequest) {
  let body: { level?: unknown; difficulty?: unknown; language?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { level, difficulty, language } = body;

  if (!Number.isInteger(level) || (level as number) < 1) {
    return NextResponse.json({ error: 'Invalid level' }, { status: 400 });
  }
  if (!VALID_DIFFICULTIES.has(difficulty as Difficulty)) {
    return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
  }
  if (!VALID_LANGUAGES.has(language as Language)) {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
  }

  try {
    const prompt = await generatePrompt(
      level as number,
      difficulty as Difficulty,
      language as Language,
    );
    const token = signToken({ prompt, difficulty: difficulty as Difficulty });
    return NextResponse.json({ prompt, token });
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') return NextResponse.json({ error: 'timeout' }, { status: 503 });
      if (err.message.includes('429')) return NextResponse.json({ error: 'rate_limited' }, { status: 503 });
    }
    console.error('[generate-prompt]', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- --testPathPattern=generate-prompt
```

Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/api/generate-prompt/ app/api/__tests__/generate-prompt.test.ts
git commit -m "feat: add /api/generate-prompt route with tests"
```

---

### Task 7: /api/score route

**Files:**
- Create: `app/api/score/route.ts`, `app/api/__tests__/score.test.ts`

- [ ] **Step 1: Write failing test**

Create `app/api/__tests__/score.test.ts`:

```typescript
process.env.GEMINI_API_KEY = 'test';
process.env.PROMPT_SECRET = 'test-secret-32-bytes-xxxxxxxxxx';

jest.mock('@/lib/gemini', () => ({ scoreDrawing: jest.fn() }));
jest.mock('@/lib/promptToken', () => ({
  verifyToken: jest.fn().mockReturnValue({ prompt: 'Draw a cat', difficulty: 'normal', exp: Date.now() + 99999 }),
}));

import { POST } from '../score/route';
import { scoreDrawing } from '@/lib/gemini';
import { verifyToken } from '@/lib/promptToken';
import { NextRequest } from 'next/server';

const mockScore = scoreDrawing as jest.Mock;
const mockVerify = verifyToken as jest.Mock;

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/score', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const validBody = {
  imageBase64: 'data:image/png;base64,abc',
  promptToken: 'valid.token',
  difficulty: 'normal',
  language: 'en',
};

describe('POST /api/score', () => {
  beforeEach(() => mockScore.mockReset());

  it('returns score, comment and passed=true when score >= threshold', async () => {
    mockScore.mockResolvedValue({ score: 80, comment: 'Great cat!' });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBe(80);
    expect(body.comment).toBe('Great cat!');
    expect(body.passed).toBe(true); // normal threshold = 75
  });

  it('returns passed=false when score < threshold', async () => {
    mockScore.mockResolvedValue({ score: 50, comment: 'Keep trying!' });
    const res = await POST(makeRequest(validBody));
    const body = await res.json();
    expect(body.passed).toBe(false);
  });

  it('returns 400 when token is invalid', async () => {
    mockVerify.mockImplementationOnce(() => { throw new Error('Invalid signature'); });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_token');
  });

  it('returns 400 for missing fields', async () => {
    const res = await POST(makeRequest({ imageBase64: 'data', promptToken: 'tok' }));
    expect(res.status).toBe(400);
  });

  it('returns 503 on timeout', async () => {
    const err = new Error('AbortError'); err.name = 'AbortError';
    mockScore.mockRejectedValue(err);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(503);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- --testPathPattern="score.test"
```

Expected: FAIL — route not found.

- [ ] **Step 3: Implement score route**

Create `app/api/score/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { scoreDrawing } from '@/lib/gemini';
import { verifyToken } from '@/lib/promptToken';
import { PASS_THRESHOLDS } from '@/lib/types';
import type { Difficulty, Language } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 9;

const VALID_DIFFICULTIES = new Set<Difficulty>(['easy', 'normal', 'hard']);
const VALID_LANGUAGES    = new Set<Language>(['en', 'zh']);

export async function POST(req: NextRequest) {
  let body: { imageBase64?: unknown; promptToken?: unknown; difficulty?: unknown; language?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { imageBase64, promptToken, difficulty, language } = body;

  if (!imageBase64 || !promptToken || !difficulty || !language) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!VALID_DIFFICULTIES.has(difficulty as Difficulty)) {
    return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
  }
  if (!VALID_LANGUAGES.has(language as Language)) {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
  }

  let payload: ReturnType<typeof verifyToken>;
  try {
    payload = verifyToken(promptToken as string);
  } catch {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  }

  try {
    const { score, comment } = await scoreDrawing(
      imageBase64 as string,
      payload.prompt,
      language as Language,
    );
    const passed = score >= PASS_THRESHOLDS[difficulty as Difficulty];
    return NextResponse.json({ score, comment, passed });
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') return NextResponse.json({ error: 'timeout' }, { status: 503 });
      if (err.message.includes('429')) return NextResponse.json({ error: 'rate_limited' }, { status: 503 });
    }
    console.error('[score]', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test -- --testPathPattern="score.test"
```

Expected: PASS — 5 tests pass.

- [ ] **Step 5: Run all tests to confirm no regressions**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/api/score/ app/api/__tests__/score.test.ts
git commit -m "feat: add /api/score route with HMAC token verify and tests"
```

---

## Chunk 2: Canvas + Toolbar + Timer + Game Page

### Task 8: Timer component

**Files:**
- Create: `components/Timer.tsx`

- [ ] **Step 1: Implement Timer**

Create `components/Timer.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface TimerProps {
  durationSeconds: number;
  onExpire: () => void;
  paused?: boolean;
}

export default function Timer({ durationSeconds, onExpire, paused = false }: TimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const onExpireRef = useRef(onExpire);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setTimeout(() => onExpireRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const urgent  = remaining <= 30;

  return (
    <span
      className={`font-mono text-sm tabular-nums transition-colors ${
        urgent ? 'text-red-600 font-semibold' : 'text-stone-500'
      }`}
      aria-live="polite"
      aria-label={`${minutes}:${String(seconds).padStart(2, '0')} remaining`}
    >
      {minutes}:{String(seconds).padStart(2, '0')}
    </span>
  );
}
```

- [ ] **Step 2: Verify Timer compiles with no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors in `components/Timer.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/Timer.tsx
git commit -m "feat: add Timer countdown component"
```

---

### Task 9: Canvas drawing engine

**Files:**
- Create: `components/Canvas.tsx`

This is the largest component. It handles pointer events, brush rendering, undo/redo, and export.

- [ ] **Step 1: Implement Canvas component**

Create `components/Canvas.tsx`:

```tsx
'use client';

import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';

export type BrushStyle = 'normal' | 'pencil' | 'ink';

export interface CanvasHandle {
  exportPNG: () => string; // returns data:image/png;base64,...
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

const MAX_HISTORY = 30;
const CANVAS_W = 800;
const CANVAS_H = 600;

export default forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  { brushStyle, color, size, tool, locked = false },
  ref,
) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const historyRef   = useRef<ImageData[]>([]);
  const historyIdxRef= useRef(-1);
  const isDrawingRef = useRef(false);
  const lastPtRef    = useRef<{ x: number; y: number } | null>(null);
  const lastTimeRef  = useRef<number>(0);

  // ── Initialize canvas ──────────────────────────────────
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

  // ── Coordinate helper ──────────────────────────────────
  function getPoint(e: PointerEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  }

  // ── History ────────────────────────────────────────────
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
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.lineWidth = size * 2;
      ctx.globalAlpha = 1;
      return;
    }

    switch (brushStyle) {
      case 'normal':
        ctx.lineWidth = size;
        ctx.globalAlpha = 1;
        break;
      case 'pencil':
        ctx.lineWidth = size * 0.7;
        ctx.globalAlpha = 0.55 + pressure * 0.35;
        break;
      case 'ink':
        // Width varies with speed: fast → thin, slow → thick
        ctx.lineWidth = Math.max(1, size - speed * 0.04);
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
    if (brushStyle === 'pencil' && tool !== 'eraser') {
      ctx.globalAlpha = 0.15;
      for (let i = 0; i < 3; i++) {
        const ox = (Math.random() - 0.5) * size;
        const oy = (Math.random() - 0.5) * size;
        ctx.beginPath();
        ctx.arc(to.x + ox, to.y + oy, size * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
  }

  // ── Flood fill (BFS scanline) ──────────────────────────
  function floodFill(startX: number, startY: number) {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const w = CANVAS_W, h = CANVAS_H;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const idx = (x: number, y: number) => (y * w + x) * 4;
    const target = data.slice(idx(Math.floor(startX), Math.floor(startY)), idx(Math.floor(startX), Math.floor(startY)) + 4);

    // Parse fill color
    const tmp = document.createElement('canvas').getContext('2d')!;
    tmp.fillStyle = color;
    tmp.fillRect(0, 0, 1, 1);
    const fill = tmp.getImageData(0, 0, 1, 1).data;

    if (target[0] === fill[0] && target[1] === fill[1] && target[2] === fill[2]) return;

    const matches = (x: number, y: number) => {
      const i = idx(x, y);
      return data[i] === target[0] && data[i+1] === target[1] && data[i+2] === target[2] && data[i+3] === target[3];
    };
    const colorPixel = (x: number, y: number) => {
      const i = idx(x, y);
      data[i] = fill[0]; data[i+1] = fill[1]; data[i+2] = fill[2]; data[i+3] = fill[3];
    };

    const stack: [number, number][] = [[Math.floor(startX), Math.floor(startY)]];
    const visited = new Uint8Array(w * h);

    while (stack.length) {
      const [x, y] = stack.pop()!;
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      if (visited[y * w + x]) continue;
      if (!matches(x, y)) continue;
      visited[y * w + x] = 1;
      colorPixel(x, y);
      stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
    }

    ctx.putImageData(imageData, 0, 0);
  }

  // ── Pointer event handlers ─────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (locked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getPoint(e.nativeEvent);

    if (tool === 'fill') {
      saveSnapshot();
      floodFill(pt.x, pt.y);
      saveSnapshot();
      return;
    }

    saveSnapshot();
    isDrawingRef.current = true;
    lastPtRef.current = pt;
    lastTimeRef.current = Date.now();
  }, [locked, tool, color, brushStyle, size]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPtRef.current || locked) return;
    const pt = getPoint(e.nativeEvent);
    const now = Date.now();
    const dt = now - lastTimeRef.current;
    const dx = pt.x - lastPtRef.current.x;
    const dy = pt.y - lastPtRef.current.y;
    const speed = Math.sqrt(dx*dx + dy*dy) / Math.max(dt, 1);
    const pressure = e.nativeEvent.pressure || 0.5;

    drawStroke(lastPtRef.current, pt, pressure, speed);
    lastPtRef.current = pt;
    lastTimeRef.current = now;
  }, [locked, tool, brushStyle, color, size]);

  const onPointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPtRef.current = null;
  }, []);

  // ── Imperative handle ──────────────────────────────────
  useImperativeHandle(ref, () => ({
    exportPNG: () => canvasRef.current?.toDataURL('image/png') ?? '',
    clear: () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      saveSnapshot();
    },
    undo,
    redo,
  }));

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
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors in `components/Canvas.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/Canvas.tsx
git commit -m "feat: add Canvas component with brush/eraser/fill and undo/redo"
```

---

### Task 10: Toolbar component

**Files:**
- Create: `components/Toolbar.tsx`

- [ ] **Step 1: Implement Toolbar**

Create `components/Toolbar.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors in `components/Toolbar.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/Toolbar.tsx
git commit -m "feat: add Toolbar component with all drawing tools"
```

---

### Task 11: Game page

**Files:**
- Create: `app/game/page.tsx`

- [ ] **Step 1: Implement game page**

Create `app/game/page.tsx`:

```tsx
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Canvas, { CanvasHandle, BrushStyle } from '@/components/Canvas';
import Toolbar from '@/components/Toolbar';
import Timer from '@/components/Timer';
import { getGameState, getSessionState, setSessionState } from '@/lib/storage';
import { t } from '@/lib/i18n';
import type { Language, Difficulty } from '@/lib/types';

type Phase = 'loading' | 'drawing' | 'submitting' | 'error';

export default function GamePage() {
  const router = useRouter();
  const canvasRef = useRef<CanvasHandle>(null);

  // Game state (from localStorage)
  const [level, setLevel]       = useState(1);
  const [difficulty, setDiff]   = useState<Difficulty>('normal');
  const [lang, setLang]         = useState<Language>('zh');

  // Tool state
  const [tool, setTool]               = useState<'brush' | 'eraser' | 'fill'>('brush');
  const [brushStyle, setBrushStyle]   = useState<BrushStyle>('normal');
  const [color, setColor]             = useState('#1a1a24');
  const [size, setSize]               = useState(6);

  // Round state
  const [phase, setPhase]     = useState<Phase>('loading');
  const [prompt, setPrompt]   = useState('');
  const [token, setToken]     = useState('');
  const [timedOut, setTimedOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ── Init ──────────────────────────────────────────────
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

  // ── Submit ────────────────────────────────────────────
  const submit = useCallback(async (expired = false) => {
    if (phase !== 'drawing') return;
    setTimedOut(expired);
    setPhase('submitting');

    const imageBase64 = canvasRef.current?.exportPNG() ?? '';

    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, promptToken: token, difficulty, language: lang }),
      });

      if (res.status === 400) {
        // Token expired/invalid — prompt player to restart
        setPhase('error');
        setErrorMsg(t(lang, 'result.expired'));
        return;
      }
      if (!res.ok) {
        setPhase('error');
        setErrorMsg(t(lang, res.status === 503 ? 'error.serviceBusy' : 'error.unknown'));
        return;
      }

      const result = await res.json();
      setSessionState({
        lastResult: { ...result, timedOut: expired },
        lastImageBase64: imageBase64,
      });
      router.push('/result');
    } catch {
      setPhase('error');
      setErrorMsg(t(lang, 'error.unknown'));
    }
  }, [phase, token, difficulty, lang, router]);

  const onTimerExpire = useCallback(() => submit(true), [submit]);

  return (
    <div className="flex flex-col h-screen bg-stone-50 font-sans">

      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-stone-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400 uppercase tracking-widest">
            {t(lang, 'game.level')} {level}
          </span>
          {phase === 'drawing' && (
            <span className="text-sm font-medium text-stone-800 max-w-[50ch] truncate">
              {prompt}
            </span>
          )}
          {phase === 'loading' && (
            <span className="text-sm text-stone-400 italic">{t(lang, 'game.loading')}</span>
          )}
          {phase === 'submitting' && (
            <span className="text-sm text-stone-400 italic">{t(lang, 'game.scoring')}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {phase === 'drawing' && (
            <Timer durationSeconds={180} onExpire={onTimerExpire} paused={phase !== 'drawing'} />
          )}
          {timedOut && (
            <span className="text-xs text-amber-600">{t(lang, 'game.timedOut')}</span>
          )}
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">

        {/* Toolbar */}
        <Toolbar
          tool={tool} brushStyle={brushStyle} color={color} size={size}
          onToolChange={setTool}
          onBrushStyleChange={setBrushStyle}
          onColorChange={setColor}
          onSizeChange={setSize}
          onUndo={() => canvasRef.current?.undo()}
          onRedo={() => canvasRef.current?.redo()}
          onClear={() => canvasRef.current?.clear()}
        />

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center bg-stone-100 p-4 overflow-hidden">
          {phase === 'error' ? (
            <div className="text-center space-y-4">
              <p className="text-stone-600 text-sm">{errorMsg}</p>
              <button
                className="px-6 py-2 border border-stone-700 text-stone-700 text-sm hover:bg-stone-700 hover:text-white transition-colors"
                onClick={() => fetchPrompt(level, difficulty, lang)}
              >
                {t(lang, 'result.newRound')}
              </button>
            </div>
          ) : (
            <div className="w-full max-w-[800px] aspect-[4/3] shadow-sm border border-stone-200">
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

      {/* Submit bar */}
      {phase === 'drawing' && (
        <footer className="flex justify-end px-6 py-3 border-t border-stone-200 bg-white shrink-0">
          <button
            className="px-8 py-2 bg-red-700 text-white text-sm font-medium tracking-wide hover:bg-red-800 transition-colors"
            onClick={() => submit(false)}
          >
            {t(lang, 'game.submit')}
          </button>
        </footer>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start dev server and manually test game page**

```bash
npm run dev
```

Open `http://localhost:3000/game`. Expected:
- Loading spinner → prompt appears in top bar
- Canvas is responsive, tools work
- Timer counts down
- Submit button sends to `/api/score` (will fail without real API key — normal)

- [ ] **Step 4: Commit**

```bash
git add app/game/page.tsx
git commit -m "feat: add game page with canvas, toolbar, timer, and submit flow"
```

---

## Chunk 3: Home Page + Result Page + Global Layout + Deploy

### Task 12: LanguageToggle + GalleryCard components

**Files:**
- Create: `components/LanguageToggle.tsx`, `components/GalleryCard.tsx`

- [ ] **Step 1: Create LanguageToggle**

Create `components/LanguageToggle.tsx`:

```tsx
'use client';

import { setGameState } from '@/lib/storage';
import type { Language } from '@/lib/types';

interface Props {
  lang: Language;
  onChange: (lang: Language) => void;
}

export default function LanguageToggle({ lang, onChange }: Props) {
  function switchTo(l: Language) {
    setGameState({ language: l });
    onChange(l);
  }

  return (
    <div className="flex border border-stone-300" style={{ borderRadius: '2px' }}>
      {(['en', 'zh'] as Language[]).map(l => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          className={`px-3 py-1 text-xs font-medium transition-colors border-r last:border-r-0 border-stone-300 ${
            lang === l
              ? 'bg-stone-800 text-stone-100'
              : 'text-stone-400 hover:text-stone-600 bg-transparent'
          }`}
        >
          {l === 'en' ? 'EN' : '中文'}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create GalleryCard**

Create `components/GalleryCard.tsx`:

```tsx
import type { PastWork } from '@/lib/types';
import type { Language } from '@/lib/types';
import { t } from '@/lib/i18n';

interface Props {
  work: PastWork;
  lang: Language;
}

function scoreColor(score: number) {
  if (score >= 75) return { border: '#4a7c59', bg: 'oklch(93% 0.048 152)', text: '#2d5a3d' };
  if (score >= 50) return { border: '#8a6a28', bg: 'oklch(93% 0.052 63)',  text: '#5c4318' };
  return               { border: '#8b3228', bg: 'oklch(93% 0.048 27)',   text: '#6b2218' };
}

export default function GalleryCard({ work, lang }: Props) {
  const c = scoreColor(work.score);
  const lvLabel = lang === 'zh' ? `第${work.level}关` : `Lv.${work.level}`;

  return (
    <div className="relative bg-white overflow-hidden cursor-pointer transition-colors hover:bg-stone-50">
      {/* Drawing thumbnail */}
      <div className="aspect-[4/3] bg-white flex items-center justify-center p-3">
        {work.imageBase64 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={work.imageBase64} alt={work.prompt} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full bg-stone-100" />
        )}
      </div>

      {/* Score stamp (hanko-style: slightly rotated square) */}
      <div
        className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center text-sm font-bold"
        style={{
          border: `1.5px solid ${c.border}`,
          background: c.bg,
          color: c.text,
          transform: 'rotate(4deg)',
          fontFamily: "'Shippori Mincho B1', serif",
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
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/LanguageToggle.tsx components/GalleryCard.tsx
git commit -m "feat: add LanguageToggle and GalleryCard components"
```

---

### Task 13: Home page

**Files:**
- Modify: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`

- [ ] **Step 1: Set up global layout with fonts**

Replace `app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { Shippori_Mincho_B1, DM_Sans, Cormorant_Garamond } from 'next/font/google';
import './globals.css';

const shippori = Shippori_Mincho_B1({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-shippori',
  display: 'swap',
});
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm',
  display: 'swap',
});
const cormorant = Cormorant_Garamond({
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-cormorant',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '落書き — AI Drawing Judge',
  description: 'Draw anything. Get judged by AI. Level up or try again.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${shippori.variable} ${dmSans.variable} ${cormorant.variable}`}>
      <body className="bg-[oklch(96.5%_0.012_74)] text-[oklch(13%_0.018_258)] antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Update globals.css**

Replace `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg:           oklch(96.5% 0.012 74);
  --surface:      oklch(99%   0.004 74);
  --ink:          oklch(13%   0.018 258);
  --ink-2:        oklch(42%   0.012 258);
  --ink-3:        oklch(70%   0.008 258);
  --rule:         oklch(84%   0.010 258);
  --beni:         oklch(51%   0.210 27);
  --s-hi:         oklch(50%   0.160 152);
  --s-hi-bg:      oklch(93%   0.048 152);
  --s-mid:        oklch(58%   0.150 63);
  --s-mid-bg:     oklch(93%   0.052 63);
  --s-lo:         oklch(50%   0.185 27);
  --s-lo-bg:      oklch(93%   0.048 27);
}

@layer base {
  html { scroll-behavior: smooth; }
  body { font-family: var(--font-dm), 'Noto Sans JP', sans-serif; }
}

.font-shippori { font-family: var(--font-shippori), serif; }
.font-cormorant { font-family: var(--font-cormorant), serif; }

@keyframes bobDown {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(5px); }
}
.animate-bob { animation: bobDown 2.2s ease-in-out infinite; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fadeup { animation: fadeUp 0.5s ease both; }
```

- [ ] **Step 3: Build home page**

Replace `app/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify no TypeScript errors and build**

```bash
npx tsc --noEmit && npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Manually verify home page at `http://localhost:3000`**

- Logo with mini brush appears in header
- Hero is full viewport with Japanese title + large brush
- Difficulty tabs work (underline switches)
- Start → navigates to `/game`
- Language toggle switches all text
- Gallery shows "no works" empty state

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/layout.tsx app/globals.css components/LanguageToggle.tsx components/GalleryCard.tsx
git commit -m "feat: add home page with hero, gallery, and i18n"
```

---

### Task 14: Result page

**Files:**
- Create: `app/result/page.tsx`

- [ ] **Step 1: Implement result page**

Create `app/result/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getGameState, setGameState, getSessionState, setSessionState, clearSessionState, addPastWork } from '@/lib/storage';
import { t } from '@/lib/i18n';
import type { Language, Difficulty } from '@/lib/types';

interface Result {
  score: number;
  comment: string;
  passed: boolean;
  timedOut: boolean;
}

export default function ResultPage() {
  const router = useRouter();
  const [lang, setLang]         = useState<Language>('zh');
  const [difficulty, setDiff]   = useState<Difficulty>('normal');
  const [result, setResult]     = useState<Result | null>(null);
  const [imageBase64, setImage] = useState<string>('');
  const [prompt, setPrompt]     = useState('');

  useEffect(() => {
    const { language, difficulty } = getGameState();
    setLang(language);
    setDiff(difficulty);

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
          "{result.comment}"
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
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add app/result/page.tsx
git commit -m "feat: add result page with score display and next/retry flow"
```

---

### Task 15: Environment setup + Vercel deployment

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create vercel.json**

Create `vercel.json`:

```json
{
  "functions": {
    "app/api/generate-prompt/route.ts": { "maxDuration": 9 },
    "app/api/score/route.ts": { "maxDuration": 9 }
  }
}
```

- [ ] **Step 2: Final full test run**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Final production build**

```bash
npm run build
```

Expected: build succeeds. Note any warnings but no errors.

- [ ] **Step 4: Push to GitHub and deploy to Vercel**

```bash
git add vercel.json
git commit -m "chore: add vercel config with function timeout"

# Create repo on github.com, then:
git remote add origin https://github.com/<your-username>/drawinggame.git
git push -u origin main
```

Then in Vercel dashboard:
1. Import the GitHub repo
2. Add environment variables:
   - `GEMINI_API_KEY` — from [aistudio.google.com](https://aistudio.google.com/app/apikey)
   - `PROMPT_SECRET` — run `openssl rand -hex 32` and paste the output
3. Click Deploy

- [ ] **Step 5: Smoke-test production URL**

After deploy completes:
- Visit the Vercel URL — home page loads
- Click "Start Drawing" — game page loads, prompt appears
- Draw something — submit — result page shows score
- "Next Level" — level increments, new game starts

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete drawing game — home, game, result, deploy"
```

---

## Summary

| Chunk | Tasks | Deliverable |
|-------|-------|-------------|
| 1 | 1–7 | Project scaffold + all backend logic + API routes with tests |
| 2 | 8–11 | Full canvas drawing experience + game page |
| 3 | 12–15 | Home page + result page + deployment |

All tests pass after each chunk. Each chunk is independently deployable and testable.
