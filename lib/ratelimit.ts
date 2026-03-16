import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Lazily instantiated — missing env vars won't crash at build time
let _redis: Redis | null = null;
let _promptLimiter: Ratelimit | null = null;
let _scoreLimiter: Ratelimit | null = null;

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL   ?? '',
      token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
    });
  }
  return _redis;
}

/** 5 new games per IP per 24 h */
export function getPromptLimiter(): Ratelimit {
  if (!_promptLimiter) {
    _promptLimiter = new Ratelimit({
      redis:   getRedis(),
      limiter: Ratelimit.fixedWindow(5, '24 h'),
      prefix:  'rl:prompt',
    });
  }
  return _promptLimiter;
}

/** 10 submissions per IP per 24 h (covers retries within sessions) */
export function getScoreLimiter(): Ratelimit {
  if (!_scoreLimiter) {
    _scoreLimiter = new Ratelimit({
      redis:   getRedis(),
      limiter: Ratelimit.fixedWindow(10, '24 h'),
      prefix:  'rl:score',
    });
  }
  return _scoreLimiter;
}

/** Best-effort IP extraction for Vercel / standard proxies. */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

/**
 * Returns true if the IP is in the RATE_LIMIT_BYPASS_IPS env var
 * (comma-separated list). Use this to whitelist your own IPs.
 */
export function isExempt(ip: string): boolean {
  const list = process.env.RATE_LIMIT_BYPASS_IPS ?? '';
  if (!list) return false;
  return list.split(',').map(s => s.trim()).includes(ip);
}
