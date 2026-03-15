# 落書き — Rakugaki

> Draw anything. Get judged by AI. Level up or try again.

Rakugaki is a web-based drawing game where players receive AI-generated prompts and sketch them on a canvas within three minutes. A Gemini Vision model scores each drawing with humorous, encouraging feedback. Difficulty increases with each level — from single objects in Easy mode to elaborate absurdist scenes in Hard mode.

---

## Features

- **AI Prompt Generation** — Gemini Flash generates creative, level-appropriate drawing prompts in Chinese or English
- **AI Scoring** — Gemini Flash Vision evaluates each drawing against the prompt and returns a 0–100 score with commentary
- **Three Difficulty Modes** — Easy (pass at 60), Normal (pass at 75), Hard (pass at 85); each with distinct prompt style bands
- **Infinite Levels** — Complexity scales with level; no ceiling on how elaborate prompts become
- **Drawing Canvas** — Native Canvas API with Pointer Events: three brush styles (normal, pencil, ink), eraser, flood fill, and 30-step undo/redo
- **3-Minute Timer** — Auto-submits when time runs out
- **Past Works Gallery** — Every passed drawing is saved to a local gallery with a score stamp
- **Bilingual UI** — Full Chinese / English support; prompts and AI comments are generated in the selected language
- **Zero Backend Cost** — Runs entirely on Vercel Hobby free tier with no database

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Canvas | Native Canvas API + Pointer Events |
| AI | Google Gemini 2.0 Flash (text + vision) |
| Fonts | Shippori Mincho B1, DM Sans, Cormorant Garamond |
| Deployment | Vercel Hobby (free tier) |
| Storage | `localStorage` + `sessionStorage` — no database |

---

## Architecture

```
Browser
  └── Next.js 14 App (Vercel static + serverless)
        ├── /             Home page — gallery, difficulty picker, start CTA
        ├── /game         Drawing canvas, toolbar, countdown timer, submit
        ├── /result       Score display, AI comment, next level / retry
        └── API Routes
              ├── POST /api/generate-prompt   Gemini Flash text → signed prompt token
              └── POST /api/score             Verify token → Gemini Vision → pass/fail
```

**Prompt integrity** is enforced via stateless HMAC-SHA256 signed tokens (`PROMPT_SECRET` env var). The server never trusts a client-supplied prompt string — it always verifies and extracts the prompt from the signed token. This works correctly across multiple serverless instances and cold starts.

**State** lives entirely in the browser:
- `localStorage` — level, difficulty, language preference, past works gallery
- `sessionStorage` — current round's prompt token, drawing, and result

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com/app/apikey) API key (free)

### Local Development

```bash
# Clone the repo
git clone https://github.com/jz-tian/rakugaki.git
cd rakugaki

# Install dependencies
npm install

# Create your local environment file
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PROMPT_SECRET=your_random_32_char_secret_here
```

To generate a secure `PROMPT_SECRET`:

```bash
openssl rand -hex 32
```

```bash
# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Running Tests

```bash
npm test
```

33 tests across 6 suites covering the HMAC token logic, Gemini client (timeout + retry), API routes, storage helpers, i18n, and shared types.

---

## Deployment

### Deploy to Vercel

1. Fork or push this repo to your GitHub account
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add the following environment variables in the Vercel dashboard:

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Your Google AI Studio API key |
| `PROMPT_SECRET` | Random 32-byte secret (`openssl rand -hex 32`) |

4. Click **Deploy**

The `vercel.json` in this repo sets a 9-second function timeout for both API routes (Vercel Hobby hard limit is 10 seconds; the Gemini client uses an 8-second abort).

### Rate Limits

Gemini free tier allows 1,500 requests/day and 15 RPM. Each game round uses ~2 requests (one for prompt generation, one for scoring), supporting roughly 750 games per day. The scoring route retries once on 429 before returning a 503 to the client.

---

## Project Structure

```
rakugaki/
├── app/
│   ├── page.tsx                    # Home page
│   ├── game/page.tsx               # Game page
│   ├── result/page.tsx             # Result page
│   ├── layout.tsx                  # Root layout + fonts
│   ├── globals.css                 # Tailwind base + CSS variables
│   └── api/
│       ├── generate-prompt/route.ts
│       └── score/route.ts
├── components/
│   ├── Canvas.tsx                  # Drawing canvas (Pointer Events, brush, fill, undo/redo)
│   ├── Toolbar.tsx                 # Tool selector sidebar
│   ├── Timer.tsx                   # 3-minute countdown
│   ├── LanguageToggle.tsx          # EN / 中文 toggle
│   └── GalleryCard.tsx             # Past-work card with score stamp
├── lib/
│   ├── gemini.ts                   # Gemini API client (timeout + retry)
│   ├── i18n.ts                     # Language pack loader
│   ├── storage.ts                  # localStorage / sessionStorage helpers
│   ├── promptToken.ts              # HMAC-SHA256 sign / verify
│   └── types.ts                    # Shared TypeScript types
├── locales/
│   ├── en.json                     # English UI strings
│   └── zh.json                     # Chinese UI strings
└── vercel.json                     # Serverless function config
```

---

## Game Mechanics

### Difficulty Modes

| Mode | Pass Score | Prompt Style |
|---|---|---|
| Easy (简单) | 60 | Single common objects, gradually more detailed |
| Normal (普通) | 75 | Combined scenes with multiple elements |
| Hard (困难) | 85 | Absurd / surreal scenarios |

### Level Progression

- Start at Level 1; each passed round increments the level
- Level controls prompt complexity within the chosen difficulty band
- Changing difficulty does **not** reset the level
- There is no level cap — at high levels, prompts become maximally elaborate

### Drawing Tools

| Tool | Details |
|---|---|
| Brush | 3 styles: normal, pencil (texture), ink (speed-sensitive width) |
| Eraser | Adjustable size |
| Fill | Flood fill (BFS) |
| Color | 20-color palette + custom hex input |
| Size | Slider, 1–30px |
| Undo / Redo | Cmd+Z / Cmd+Shift+Z, up to 30 steps |
| Clear | Resets canvas to white |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google AI Studio API key |
| `PROMPT_SECRET` | Yes | Secret used to sign and verify prompt tokens (min 32 chars) |

---

## License

MIT
