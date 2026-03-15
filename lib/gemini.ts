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
  const ai = getGenAI();
  const langNote = language === 'zh' ? 'Respond in simplified Chinese.' : 'Respond in English.';

  const userPrompt = `You are a creative drawing game prompt generator.
Generate ONE drawing prompt for complexity level ${level} in the "${difficulty}" style band.
Style band: ${STYLE_BANDS[difficulty]}.
Higher complexity levels should add more details, characters, or whimsy within the same style band.
${langNote}
Rules: Be fun and creative. Avoid political figures, sexual content, graphic violence, or content targeting ethnic/religious groups.
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
