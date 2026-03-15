// Mock the Gemini SDK
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn(),
    }),
  })),
}));

import { GoogleGenerativeAI } from '@google/generative-ai';
import { generatePrompt, scoreDrawing } from '../gemini';

const mockGenerate = jest.fn();
(GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
  getGenerativeModel: () => ({ generateContent: mockGenerate }),
}));

beforeEach(() => mockGenerate.mockReset());

describe('generatePrompt', () => {
  it('returns trimmed text from Gemini', async () => {
    mockGenerate.mockResolvedValue({ response: { text: () => '  Draw a smiling cat  ' } });
    const result = await generatePrompt(1, 'easy', 'en');
    expect(result).toBe('Draw a smiling cat');
  });

  it('retries once on 429 then succeeds', async () => {
    const err = new Error('429 Too Many Requests');
    mockGenerate
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce({ response: { text: () => 'A cat' } });
    const result = await generatePrompt(1, 'easy', 'en');
    expect(result).toBe('A cat');
    expect(mockGenerate).toHaveBeenCalledTimes(2);
  });

  it('throws after two consecutive 429s', async () => {
    const err = new Error('429 Too Many Requests');
    mockGenerate.mockRejectedValue(err);
    await expect(generatePrompt(1, 'easy', 'en')).rejects.toThrow('429');
  });
});

describe('scoreDrawing', () => {
  it('returns parsed score and comment', async () => {
    mockGenerate.mockResolvedValue({
      response: { text: () => '{"score": 78, "comment": "Nice cat!"}' },
    });
    const result = await scoreDrawing('data:image/png;base64,abc', 'Draw a cat', 'en');
    expect(result.score).toBe(78);
    expect(result.comment).toBe('Nice cat!');
  });

  it('clamps score to 0-100 range', async () => {
    mockGenerate.mockResolvedValue({
      response: { text: () => '{"score": 150, "comment": "Amazing"}' },
    });
    const result = await scoreDrawing('base64data', 'test', 'en');
    expect(result.score).toBe(100);
  });

  it('handles JSON inside markdown code block', async () => {
    mockGenerate.mockResolvedValue({
      response: { text: () => '```json\n{"score": 55, "comment": "OK"}\n```' },
    });
    const result = await scoreDrawing('base64data', 'test', 'en');
    expect(result.score).toBe(55);
  });
});
