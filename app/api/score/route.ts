import { NextRequest, NextResponse } from 'next/server';
import { scoreDrawing } from '@/lib/gemini';
import { verifyToken } from '@/lib/promptToken';
import { getScoreLimiter, getClientIp } from '@/lib/ratelimit';
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

  // Rate limiting — skipped silently in local dev (no env vars set)
  if (process.env.UPSTASH_REDIS_REST_URL) {
    try {
      const { success } = await getScoreLimiter().limit(getClientIp(req));
      if (!success) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    } catch (e) {
      console.error('[ratelimit:score]', e);
    }
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
