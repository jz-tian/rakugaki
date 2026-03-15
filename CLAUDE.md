# Rakugaki — Claude Context

## Commands

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build (runs ESLint + type check)
npm test             # Run all 33 tests
npm run test:watch   # Watch mode
npx tsc --noEmit     # Type check only (faster than build)
```

## Environment

Two required env vars. Copy `.env.example` to `.env.local`:

```
GEMINI_API_KEY=...      # From https://aistudio.google.com/app/apikey
PROMPT_SECRET=...       # openssl rand -hex 32
```

## Architecture

```
app/
  page.tsx              # Home (gallery, difficulty picker, start)
  game/page.tsx         # Drawing canvas + toolbar + timer
  result/page.tsx       # Score display, next level / retry
  api/generate-prompt/  # POST → Gemini text → signed HMAC token
  api/score/            # POST → verify token → Gemini Vision → pass/fail
components/
  Canvas.tsx            # Drawing engine (Pointer Events, brush/eraser/fill, undo/redo)
  Toolbar.tsx           # Tool selector sidebar
  Timer.tsx             # 3-min countdown
  LanguageToggle.tsx    # EN / 中文 toggle
  GalleryCard.tsx       # Past-work card with score stamp
lib/
  gemini.ts             # Gemini client (8s timeout, 429 retry-once)
  promptToken.ts        # HMAC-SHA256 sign / verify
  storage.ts            # localStorage / sessionStorage helpers
  i18n.ts               # Language pack loader
  types.ts              # Shared types + PASS_THRESHOLDS
locales/en.json zh.json # UI strings (imported at build time, no runtime fetch)
```

## Testing

Jest has **two projects** — do not mix their test locations:

| Project | Environment | Test paths |
|---|---|---|
| `node` | Node | `lib/__tests__/**` and `app/api/**/__tests__/**` |
| `jsdom` | jsdom | `components/__tests__/**` |

API route tests live inside `app/api/<route>/__tests__/`.

## Critical Gotchas

**localStorage guard** — use `typeof localStorage === 'undefined'`, not `typeof window === 'undefined'`. Jest's node environment sets `global.localStorage` directly without a `window` object.

**Gemini client** — `getGenAI()` is a factory called per-invocation, not a module-level singleton. This is required for Jest mocks to apply correctly. Do not move it back to module scope.

**HMAC comparison** — `crypto.timingSafeEqual` requires both buffers to be the same length. Always use `.digest()` (returns a Buffer) for both sides, never `.digest('base64url')` (returns a string). See `lib/promptToken.ts`.

**Prompt token format** — `base64url(JSON.stringify({ prompt, difficulty, exp })) + "." + hmac_signature`. Token TTL is 10 minutes. The score route verifies the token before calling Gemini Vision.

**SessionState.persisted** — guards against `addPastWork` being called twice on React Strict Mode double-mount in `app/result/page.tsx`. Set to `true` after the first `addPastWork` call.

**Canvas stale closures** — tool/brush/color/size are mirrored into refs (`toolRef`, `brushRef`, etc.) so Pointer Event handlers always read current values without being recreated. The same ref pattern is used in `app/game/page.tsx` for the `submit` callback (`phaseRef`, `tokenRef`, etc.).

**Flood fill color parser** — reuses a single persistent 1×1 `<canvas>` via `colorParserRef` rather than creating a new DOM element on each fill click.
