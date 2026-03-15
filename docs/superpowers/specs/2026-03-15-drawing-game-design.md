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
  └── Next.js App (Vercel static + serverless)
        ├── Pages: Home / Game / Result
        ├── Canvas drawing component
        ├── i18n language pack (JSON)
        └── API Routes (serverless functions)
              ├── /api/generate-prompt  ← Gemini Flash text
              └── /api/score            ← Gemini Flash Vision

State: localStorage (level, difficulty, score history)
Deployment: Vercel free tier
Cost: $0
```

**Data flow:**
1. Player selects language + difficulty on Home page
2. `/api/generate-prompt` called with level number and language → returns prompt string
3. Player draws on canvas within time limit
4. On submit, canvas serialized to base64 PNG → POST to `/api/score` with prompt + difficulty
5. Gemini Vision returns `{ score, comment, passed }`
6. Result page shown; if passed, level +1 stored in localStorage

---

## Tech Stack

| Layer | Technology | Cost |
|-------|------------|------|
| Framework | Next.js 14 (App Router) | Free |
| Styling | Tailwind CSS | Free |
| Canvas | Native Canvas API + Pointer Events | Free |
| AI scoring | Gemini 2.0 Flash Vision API | Free tier (1500 req/day) |
| AI prompt gen | Gemini 2.0 Flash API | Free tier |
| i18n | Custom JSON language packs | Free |
| Deployment | Vercel free tier | Free |
| Storage | localStorage (no database) | Free |

---

## Game Mechanics

### Difficulty Modes

Players choose a mode at the start. The mode sets the pass threshold and influences prompt complexity:

| Mode | Pass Score | Prompt Style |
|------|-----------|--------------|
| Easy (简单) | 60 | Single common objects (apple, sun, cat) |
| Normal (普通) | 75 | Combined scenes (kid jumping rope, rainy street) |
| Hard (困难) | 85 | Absurd scenes (pig in the Forbidden City, alien on the subway) |

### Level Progression

- Each passed level increments `level` counter (stored in localStorage)
- `level` is passed to `/api/generate-prompt` as a complexity index (1–10+)
- At low levels, prompts are simple single objects
- At high levels, prompts become multi-element, absurd, surreal combinations
- No upper bound — infinite progression

### Prompt Generation

`POST /api/generate-prompt`
Input: `{ level: number, language: "zh" | "en" }`

System prompt to Gemini (simplified):
> "Generate a fun drawing prompt suitable for difficulty level {n}/10. Be creative and whimsical, but avoid political, sexual, or violent content. Return only the prompt text in {language}."

### AI Scoring

`POST /api/score`
Input: `{ imageBase64: string, prompt: string, difficulty: "easy"|"normal"|"hard", language: "zh"|"en" }`
Output: `{ score: number, comment: string, passed: boolean }`

System prompt to Gemini (simplified):
> "You are a fun drawing judge. The player was asked to draw: '{prompt}'. Score the drawing 0–100 based on how well it matches the prompt. Be encouraging and humorous in your comment. Return JSON: { score, comment, passed } where passed is true if score >= {threshold}."

---

## Pages

### `/` — Home

- Game title and tagline
- Language toggle (中文 / English) — top right
- Difficulty selector: Easy / Normal / Hard (with score threshold shown)
- Current level display (from localStorage)
- "Start Drawing" button → navigates to `/game`

### `/game` — Game

- **Top bar:** Prompt text, countdown timer (3 min default), level indicator
- **Left sidebar:** Drawing tools
- **Center:** Canvas (800×600, white background, scales on mobile)
- **Bottom:** Submit button (locks canvas, triggers scoring)

### `/result` — Result

- Thumbnail of the submitted drawing
- Large score display
- AI comment text
- Pass: "Next Level →" button (level +1)
- Fail: "Try Again" button (same level, new prompt)
- "Change Difficulty" link back to home

---

## Canvas & Drawing Tools

Implemented with native Canvas API. Input handled via Pointer Events API for unified mouse/trackpad/Apple Pencil support.

**Tools:**

| Tool | Details |
|------|---------|
| Brush | 3 styles: normal, pencil texture, ink brush |
| Eraser | Adjustable size |
| Color picker | Basic palette (20 colors) + custom hex input |
| Stroke width | Slider, 1–30px |
| Fill | Flood fill on click (scanline algorithm) |
| Undo / Redo | Cmd+Z / Cmd+Shift+Z, up to 30 steps (canvas snapshot stack) |
| Clear | Resets canvas to white |

Canvas exports as PNG (base64) for submission.

---

## Internationalization (i18n)

Two language packs as static JSON files:

```
/locales/zh.json   — Chinese UI strings
/locales/en.json   — English UI strings
```

- Language preference stored in localStorage
- All static UI text (buttons, labels, difficulty names, error messages) sourced from language pack
- Dynamic content (prompts, AI comments) generated by Gemini in the selected language via the `language` parameter

---

## Content Safety

Prompt generation system prompt explicitly instructs Gemini to avoid:
- Political figures or sensitive political topics
- Sexual or adult content
- Graphic violence
- Content targeting specific ethnic or religious groups

Scoring prompt is similarly constrained. Since both calls go through our serverless API, the system prompts are server-side and cannot be tampered with by users.

---

## State Management

All state persists in `localStorage`:

```json
{
  "level": 7,
  "difficulty": "normal",
  "highScore": 94,
  "language": "zh",
  "totalGames": 23
}
```

No user accounts, no database. State resets if localStorage is cleared.

---

## File Structure

```
drawinggame/
├── app/
│   ├── page.tsx              # Home page
│   ├── game/page.tsx         # Game page
│   ├── result/page.tsx       # Result page
│   └── api/
│       ├── generate-prompt/route.ts
│       └── score/route.ts
├── components/
│   ├── Canvas.tsx            # Drawing canvas + tools
│   ├── Toolbar.tsx           # Tool selector sidebar
│   ├── Timer.tsx             # Countdown display
│   └── LanguageToggle.tsx
├── lib/
│   ├── gemini.ts             # Gemini API client
│   ├── i18n.ts               # Language pack loader
│   └── storage.ts            # localStorage helpers
├── locales/
│   ├── zh.json
│   └── en.json
└── public/
```

---

## Constraints & Limitations

- **Gemini free tier:** 1500 requests/day across all users. Each game uses ~2 requests (generate + score). Supports ~750 games/day before hitting limits — more than sufficient for personal/small-group use.
- **No persistence:** Scores and progress are per-browser. Sharing progress between devices is not supported in this version.
- **API key exposure risk:** Key lives in Vercel environment variables, never in client code. Safe for public deployment.
- **Canvas on mobile:** Touch input supported via Pointer Events. Layout adapts but Apple Pencil experience is best on iPad with a keyboard.
