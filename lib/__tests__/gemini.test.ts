// Mock the new Gemini SDK
const mockGenerate = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerate,
    },
  })),
}));

import { generatePrompt, scoreDrawing } from '../gemini';

beforeEach(() => mockGenerate.mockReset());

describe('generatePrompt', () => {
  it('returns trimmed text from Gemini', async () => {
    mockGenerate.mockResolvedValue({ text: '  Draw a smiling cat  ' });
    const result = await generatePrompt(1, 'easy', 'en');
    expect(result).toBe('Draw a smiling cat');
  });

  it('retries once on 429 then succeeds', async () => {
    jest.useFakeTimers();
    const err = new Error('429 Too Many Requests');
    mockGenerate
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce({ text: 'A cat' });
    const promise = generatePrompt(1, 'easy', 'en');
    const result = promise.then(v => v); // attach handler to avoid unhandled rejection
    await jest.runAllTimersAsync();
    expect(await result).toBe('A cat');
    expect(mockGenerate).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('throws after two consecutive 429s', async () => {
    jest.useFakeTimers();
    const err = new Error('429 Too Many Requests');
    mockGenerate.mockRejectedValue(err);
    const promise = generatePrompt(1, 'easy', 'en');
    const expectation = expect(promise).rejects.toThrow('429');
    await jest.runAllTimersAsync();
    await expectation;
    jest.useRealTimers();
  });
});

describe('scoreDrawing', () => {
  it('returns parsed score and comment', async () => {
    mockGenerate.mockResolvedValue({ text: '{"score": 78, "comment": "Nice cat!"}' });
    const result = await scoreDrawing('data:image/png;base64,abc', 'Draw a cat', 'en');
    expect(result.score).toBe(78);
    expect(result.comment).toBe('Nice cat!');
  });

  it('clamps score to 0-100 range', async () => {
    mockGenerate.mockResolvedValue({ text: '{"score": 150, "comment": "Amazing"}' });
    const result = await scoreDrawing('base64data', 'test', 'en');
    expect(result.score).toBe(100);
  });

  it('handles JSON inside markdown code block', async () => {
    mockGenerate.mockResolvedValue({ text: '```json\n{"score": 55, "comment": "OK"}\n```' });
    const result = await scoreDrawing('base64data', 'test', 'en');
    expect(result.score).toBe(55);
  });
});
