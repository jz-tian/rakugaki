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
