# Drawing Game Web App — Design Spec

**Date:** 2026-03-15
**Status:** Approved

---

## Overview

A web-based drawing game where players receive AI-generated prompts and draw them on a canvas. An AI vision model scores the drawing and provides feedback. Difficulty increases with each level, and prompts get progressively more complex and absurd. The app is fully free to run, with zero backend infrastructure cost.

---

## Goals

- Let players freely draw using mouse, trackpad, or Apple Pencil
- Generate creative, increasingly absurd drawing prompts via AI
- Score drawings using Gemini Vision and give humorous, encouraging feedback
- Support Chinese and English UI languages
- Deploy for free on Vercel with no database or backend costs

---

## Architecture

```
Browser
  └── Next.js 14 App (Vercel static + serverless)
        ├── Pages: Home / Game / Result
        ├── Canvas drawing component
        ├── i18n language pack (JSON, bundled at build time)
        └── API Routes (serverless functions)
              ├── /api/generate-prompt  ← Gemini Flash text
              └── /api/score            ← Gemini Flash Vision

State: localStorage (level, difficulty, language)
Deployment: Vercel free tier
Cost: $0
```

**Data flow (happy path):**
1. Player selects language + difficulty on Home page → stored in localStorage
2. On entering `/game`, the page calls `/api/generate-prompt` with `{ level, language }` → prompt stored in component state and in `sessionStorage` (keyed by a short-lived token, used to prevent client forgery on scoring)
3. Player draws on canvas within 3-minute time limit
4. On submit (manual or timer expiry), canvas serialized to base64 PNG → POST to `/api/score` with `{ imageBase64, promptToken, difficulty, language }` where `promptToken` is the server-issued key
5. Server looks up the actual prompt by `promptToken`, calls Gemini Vision, computes `passed = score >= threshold[difficulty]` server-side
6. Returns `{ score: number, comment: string, passed: boolean }`
7. Game page stores result in sessionStorage, navigates to `/result`
8. Result page reads result + canvas image from sessionStorage, displays thumbnail + score + comment

**Retry flow:**
- "Try Again" on result page navigates back to `/game`
- `/game` detects retry flag in sessionStorage, calls `/api/generate-prompt` again (new prompt, same level)

---

## Tech Stack

| Layer | Technology | Cost |
|-------|------------|------|
| Framework | Next.js 14 (App Router) | Free |
| Styling | Tailwind CSS | Free |
| Canvas | Native Canvas API + Pointer Events | Free |
| AI scoring | Gemini 2.0 Flash Vision API | Free tier (1500 req/day, 15 RPM) |
| AI prompt gen | Gemini 2.0 Flash API | Free tier |
| i18n | Custom JSON language packs (bundled) | Free |
| Deployment | Vercel Hobby free tier | Free |
| Storage | localStorage + sessionStorage (no database) | Free |

---

## Game Mechanics

### Difficulty Modes

Players choose a mode at the start. The mode controls two things: the pass threshold, and the **prompt style band** (what kind of content Gemini generates). Level controls complexity *within* that band.

| Mode | Pass Score | Prompt Style Band |
|------|-----------|-------------------|
| Easy (简单) | 60 | Single common objects; complexity increases from "apple" → "a fancy apple with a bow tie" |
| Normal (普通) | 75 | Combined scenes; complexity increases from "kid jumping rope" → "five kids jumping rope in the rain" |
| Hard (困难) | 85 | Absurd/surreal; complexity increases from "pig in the Forbidden City" → "three pigs in the Forbidden City hosting a press conference" |

**Rule:** Difficulty determines the *style category*; level determines *how complex or detailed* the prompt within that category is. At level 1, even Hard mode prompts are relatively simple absurd scenes. At level 20, they are elaborate and detailed. The two axes do not conflict.

### Level Progression

- New players start at **level 1** (displayed as "Level 1", complexity index sent to API is `1`)
- Each passed level increments `level` by 1 (stored in localStorage)
- `level` is passed to `/api/generate-prompt` as a complexity index (1–∞)
- At very high levels (e.g., >15), the prompt API instruction is to keep generating maximally detailed and creative prompts — there is no ceiling on complexity
- Changing difficulty does **not** reset level — the player's progression carries over

### Timer

- Each round has a **3-minute countdown** displayed in the top bar
- When the timer reaches zero, the canvas is locked and submission proceeds automatically (same as pressing Submit manually)
- The result page shows a "⏰ Time's Up" indicator when submission was triggered by timer expiry

### Prompt Generation

`POST /api/generate-prompt`
Input: `{ level: number, difficulty: "easy"|"normal"|"hard", language: "zh" | "en" }`
Output: `{ prompt: string, token: string }`

The `token` is a **stateless signed token**: the prompt text is embedded in the token and signed with an HMAC-SHA256 using a `PROMPT_SECRET` environment variable (set in Vercel). This eliminates any server-side state and works correctly across multiple serverless instances and cold starts.

Token format: `base64url(JSON.stringify({ prompt, exp })) + "." + hmac_signature`

The client stores the token (for submission) and the plaintext prompt (for display only). The server never trusts the client-supplied plaintext prompt — it always extracts and verifies the prompt from the signed token.

System prompt to Gemini (simplified):
> "Generate a drawing game prompt in the '{difficulty}' style (see style band descriptions) at complexity level {level}. Be creative and whimsical. Avoid political, sexual, or violent content. Return only the prompt text in {language}."

### AI Scoring

`POST /api/score`
Input: `{ imageBase64: string, promptToken: string, difficulty: "easy"|"normal"|"hard", language: "zh"|"en" }`

Server-side logic:
1. Verify HMAC signature on `promptToken`; return 400 if invalid or expired (10-min TTL embedded in token)
2. Extract `prompt` from the verified token payload
3. Call Gemini Vision with the image and prompt
4. Gemini returns `{ score: number, comment: string }` (score only, no `passed`)
5. Server computes `passed = score >= threshold[difficulty]`
6. Return `{ score, comment, passed }`

**On 400 (invalid/expired token):** Frontend shows "Session expired — please start a new round" with a button that navigates back to `/game` (triggering a fresh prompt fetch). This does not count as a failed attempt.

**Score is always an integer (0–100).** Gemini is instructed to return a whole number. Comment is displayed as plain text (never rendered as HTML to prevent injection).

**Timeout handling:** Vercel Hobby serverless functions have a 10-second execution limit. The Gemini client is configured with an 8-second timeout. On timeout or API error, the route returns a 503 with a user-friendly message; the frontend shows an error state with a "Try Again" button (does not consume the player's round).

**Rate limit handling:** Gemini free tier enforces 15 requests per minute. On 429 response, the route retries once after 2 seconds. If still rate-limited, returns 503 to the client with a "service busy, please wait" message.

---

## Pages

### `/` — Home

- Game title and tagline
- Language toggle (中文 / English) — top right; persists to localStorage
- Difficulty selector: Easy / Normal / Hard (with pass score shown, e.g., "pass: 60+")
- Current level display — reads from localStorage; defaults to **Level 1** if no saved state
- "Start Drawing" button → navigates to `/game`

### `/game` — Game

- On mount: reads difficulty + level + language from localStorage, calls `/api/generate-prompt`, stores `{ prompt, token }` in component state and sessionStorage
- **Top bar:** Prompt text, countdown timer, "Level {n}" indicator
- **Left sidebar:** Drawing tools
- **Center:** Canvas (800×600, white background, scales on mobile)
- **Bottom:** Submit button
- **Loading state:** While prompt is being fetched, show a spinner with "Generating prompt..." text
- **Submission state:** After submit, canvas is locked, show "Scoring your drawing..." spinner
- On timer expiry: canvas locks, submission triggers automatically with "⏰ Time's Up" toast

### `/result` — Result

- Reads `{ score, comment, passed, imageBase64, timedOut }` from sessionStorage
- Displays drawing thumbnail (from base64 stored in sessionStorage — no server roundtrip needed)
- Large score number (e.g., "78 / 100")
- AI comment (plain text)
- Pass state: "Next Level →" button → increments level in localStorage, navigates to `/game`
- Fail state: "Try Again" button → sets retry flag in sessionStorage, navigates to `/game`
- "Change Difficulty" link → navigates to `/` (level is preserved)
- If sessionStorage has no result (e.g., direct navigation to `/result`), redirect to `/`

---

## Canvas & Drawing Tools

Implemented with native Canvas API. Input handled via Pointer Events API for unified mouse, trackpad, and Apple Pencil support (pressure sensitivity mapped to opacity for ink brush style).

**Tools:**

| Tool | Details |
|------|---------|
| Brush | 3 styles: normal, pencil texture, ink brush |
| Eraser | Adjustable size |
| Color picker | Basic palette (20 colors) + custom hex input |
| Stroke width | Slider, 1–30px |
| Fill | Flood fill on click (scanline algorithm; note: may be slow on low-end devices — consider Web Worker if needed) |
| Undo / Redo | Cmd+Z / Cmd+Shift+Z, up to 30 steps (canvas snapshot stack) |
| Clear | Resets canvas to white |

Canvas exports as PNG (base64) for submission. Typical file size for an 800×600 drawing is well within Vercel's 4.5 MB serverless request body limit.

**Empty canvas:** If the player submits a blank canvas, scoring proceeds normally — Gemini will return a low score. No special validation is applied; the AI's low score is sufficient feedback.

---

## Internationalization (i18n)

Two language pack files, imported at build time (not loaded from `/public/`):

```
/locales/zh.json   — Chinese UI strings
/locales/en.json   — English UI strings
```

Loaded in `lib/i18n.ts` as static imports; no runtime fetch needed.

- Language preference stored in localStorage, defaults to Chinese
- All static UI text sourced from language pack
- Dynamic content (prompts, AI comments) generated by Gemini in the selected language via the `language` API parameter

---

## Content Safety

Prompt generation system prompt explicitly instructs Gemini to avoid:
- Political figures or sensitive political topics
- Sexual or adult content
- Graphic violence
- Content targeting specific ethnic or religious groups

System prompts live server-side and cannot be bypassed by clients. The `promptToken` design prevents clients from injecting arbitrary prompt strings into the scoring API. AI comments are rendered as plain text only.

---

## State Management

**localStorage** (persistent across sessions):
```json
{
  "level": 7,
  "difficulty": "normal",
  "language": "zh"
}
```

`highScore` is not tracked in this version — no leaderboard or personal best display is in scope.

**sessionStorage** (current game session only, cleared on tab close):
```json
{
  "promptToken": "abc-123",
  "prompt": "A pig hosting a press conference in the Forbidden City",
  "lastResult": { "score": 78, "comment": "...", "passed": true },
  "lastImageBase64": "data:image/png;base64,...",
  "timedOut": false,
  "isRetry": false
}
```

No user accounts, no database. State resets if storage is cleared.

---

## File Structure

```
drawinggame/
├── app/
│   ├── page.tsx                    # Home page
│   ├── game/page.tsx               # Game page
│   ├── result/page.tsx             # Result page
│   └── api/
│       ├── generate-prompt/route.ts
│       └── score/route.ts
├── components/
│   ├── Canvas.tsx                  # Drawing canvas
│   ├── Toolbar.tsx                 # Tool selector sidebar
│   ├── Timer.tsx                   # Countdown display
│   └── LanguageToggle.tsx
├── lib/
│   ├── gemini.ts                   # Gemini API client (with timeout + retry)
│   ├── i18n.ts                     # Language pack loader
│   ├── storage.ts                  # localStorage/sessionStorage helpers
│   └── promptToken.ts              # HMAC sign/verify for prompt tokens
├── locales/
│   ├── zh.json
│   └── en.json
└── public/
```

---

## Constraints & Limitations

- **Gemini free tier:** 1500 requests/day, 15 RPM. Each game uses ~2 requests. Supports ~750 games/day before hitting daily limit. RPM limit handled with retry-once-then-503 strategy.
- **Vercel function timeout:** 10-second hard limit on Hobby plan. Gemini client uses 8-second timeout to fail fast and return a graceful error.
- **No persistence:** Scores and progress are per-browser. No cross-device sync in this version.
- **Stateless prompt tokens:** Signed with HMAC-SHA256 using `PROMPT_SECRET` env var. Works across multiple serverless instances and cold starts. Requires `PROMPT_SECRET` to be set in Vercel environment variables.
- **Canvas on mobile:** Touch input supported via Pointer Events. Layout adapts; Apple Pencil experience is best on iPad.
