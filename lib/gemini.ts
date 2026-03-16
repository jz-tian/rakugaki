import { GoogleGenAI } from '@google/genai';
import type { Difficulty, Language } from './types';

function getGenAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });
}

const TIMEOUT_MS = 8000;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Error && err.message.includes('429')) {
      await new Promise(r => setTimeout(r, 5000));
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

// Complexity tier within each difficulty — level drives a gentle ramp
function levelTier(level: number): string {
  if (level <= 2)  return 'tier 1 (simplest possible — a single word concept anyone can sketch)';
  if (level <= 5)  return 'tier 2 (one object with a minor detail or setting)';
  if (level <= 9)  return 'tier 3 (two elements interacting in a straightforward scene)';
  return               'tier 4 (a simple scene with a light twist or mild whimsy)';
}

const STYLE_BANDS: Record<Difficulty, string> = {
  easy:   'universally recognisable single objects or animals that a child could draw in under a minute (e.g. sun, apple, fish, star, flower, cat)',
  normal: 'simple objects or animals with one added element or gentle action (e.g. a cat napping, a dog with a ball, a house with smoke from the chimney)',
  hard:   'short everyday scenes with two or three elements (e.g. a person riding a bicycle, a child flying a kite, a dog jumping over a puddle)',
};

export async function generatePrompt(
  level: number,
  difficulty: Difficulty,
  language: Language,
): Promise<string> {
  const ai = getGenAI();
  const langNote = language === 'zh' ? 'Respond in simplified Chinese.' : 'Respond in English.';

  const userPrompt = `You are a drawing game prompt generator. Keep prompts SHORT and drawable in 2 minutes by an average person.
Generate ONE prompt at ${levelTier(level)} for the "${difficulty}" style band.
Style band: ${STYLE_BANDS[difficulty]}.
IMPORTANT: stay close to the tier description — do NOT over-complicate. Simpler is better.
${langNote}
Rules: fun and friendly. No political figures, sexual content, graphic violence, or content targeting ethnic/religious groups.
Return ONLY the prompt text — no explanations, no quotes, no punctuation at the end.`;

  return withRetry(() =>
    withTimeout(async () => {
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
      });
      return result.text?.trim() ?? '';
    })
  );
}

export async function scoreDrawing(
  imageBase64: string,
  prompt: string,
  language: Language,
): Promise<{ score: number; comment: string }> {
  const ai = getGenAI();
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
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [
            { text: systemPrompt },
            { inlineData: { mimeType: 'image/png', data: base64Data } },
          ]},
        ],
      });
      const text = result.text?.trim() ?? '';
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
