import crypto from 'crypto';
import type { Difficulty } from './types';

interface TokenPayload {
  prompt: string;
  difficulty: Difficulty;
  exp: number; // unix ms
}

const TTL_MS = 10 * 60 * 1000; // 10 minutes

function getSecret(): string {
  const s = process.env.PROMPT_SECRET;
  if (!s) throw new Error('PROMPT_SECRET env var is required');
  return s;
}

export function signToken(payload: Omit<TokenPayload, 'exp'>): string {
  const full: TokenPayload = { ...payload, exp: Date.now() + TTL_MS };
  const data = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token: string): TokenPayload {
  const dotIdx = token.lastIndexOf('.');
  if (dotIdx === -1) throw new Error('Invalid token format');

  const data = token.slice(0, dotIdx);
  const sig  = token.slice(dotIdx + 1);

  const expected = crypto.createHmac('sha256', getSecret()).update(data).digest();
  // expected is a 32-byte Buffer (SHA-256 output)
  const sigBuf = Buffer.from(sig, 'base64url');
  if (sigBuf.length !== expected.length || !crypto.timingSafeEqual(sigBuf, expected)) {
    throw new Error('Invalid token signature');
  }

  const payload: TokenPayload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  if (Date.now() > payload.exp) throw new Error('Token expired');
  return payload;
}
