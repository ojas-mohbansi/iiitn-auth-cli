import { warn, info } from './logger';

export interface BackoffOptions {
  maxAttempts: number;
  baseMs: number;
  maxMs?: number;
  jitter?: boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: BackoffOptions,
  label = 'operation',
): Promise<T> {
  const { maxAttempts, baseMs, maxMs = 60000, jitter = true } = opts;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLast = attempt === maxAttempts;
      const errMsg = err instanceof Error ? err.message : String(err);

      if (isLast) {
        warn(`${label} failed after ${maxAttempts} attempts: ${errMsg}`);
        throw err;
      }

      const expDelay = Math.min(baseMs * Math.pow(2, attempt - 1), maxMs);
      const delay = jitter ? expDelay * (0.5 + Math.random() * 0.5) : expDelay;
      info(
        `${label} failed (attempt ${attempt}/${maxAttempts}). Retrying in ${(delay / 1000).toFixed(1)}s… (${errMsg})`,
      );
      await sleep(delay);
    }
  }

  throw new Error(`${label} exhausted all attempts`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function exponentialDelay(attempt: number, baseMs: number, maxMs = 60000): number {
  return Math.min(baseMs * Math.pow(2, attempt), maxMs);
}
