process.env.PROMPT_SECRET = 'test-secret-32-bytes-xxxxxxxxxx';

import { signToken, verifyToken } from '../promptToken';

describe('signToken / verifyToken', () => {
  it('round-trips a token', () => {
    const token = signToken({ prompt: 'Draw a cat', difficulty: 'easy' });
    const payload = verifyToken(token);
    expect(payload.prompt).toBe('Draw a cat');
    expect(payload.difficulty).toBe('easy');
  });

  it('throws on tampered payload', () => {
    const token = signToken({ prompt: 'Draw a cat', difficulty: 'easy' });
    const [data, sig] = token.split('.');
    const tampered = Buffer.from(JSON.stringify({ prompt: 'Evil', exp: Date.now() + 9999 }))
      .toString('base64url');
    expect(() => verifyToken(`${tampered}.${sig}`)).toThrow();
  });

  it('throws on tampered signature', () => {
    const token = signToken({ prompt: 'Draw a cat', difficulty: 'easy' });
    const [data] = token.split('.');
    expect(() => verifyToken(`${data}.invalidsig`)).toThrow();
  });

  it('throws on expired token', () => {
    // Create token with exp in the past by manually building payload
    const data = Buffer.from(JSON.stringify({
      prompt: 'test', difficulty: 'easy', exp: Date.now() - 1000,
    })).toString('base64url');
    const crypto = require('crypto');
    const sig = crypto.createHmac('sha256', process.env.PROMPT_SECRET!)
      .update(data).digest('base64url');
    expect(() => verifyToken(`${data}.${sig}`)).toThrow('expired');
  });

  it('throws on malformed token', () => {
    expect(() => verifyToken('notavalidtoken')).toThrow();
  });
});
