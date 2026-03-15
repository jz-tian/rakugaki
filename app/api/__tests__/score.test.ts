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
