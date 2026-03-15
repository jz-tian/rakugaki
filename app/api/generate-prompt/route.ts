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
