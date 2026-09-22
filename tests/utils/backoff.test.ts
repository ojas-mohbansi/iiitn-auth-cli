import { withRetry, sleep, exponentialDelay } from '../../src/utils/backoff';

// Silence logger output during tests
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
}));

describe('sleep', () => {
  it('resolves after the specified ms', async () => {
    const start = Date.now();
    await sleep(50);
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });
});

describe('exponentialDelay', () => {
  it('doubles each attempt', () => {
    expect(exponentialDelay(0, 1000)).toBe(1000);
    expect(exponentialDelay(1, 1000)).toBe(2000);
    expect(exponentialDelay(2, 1000)).toBe(4000);
  });

  it('caps at maxMs', () => {
    expect(exponentialDelay(10, 1000, 5000)).toBe(5000);
  });
});

describe('withRetry', () => {
  it('returns immediately on first success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxAttempts: 3, baseMs: 10 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and eventually succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const result = await withRetry(fn, { maxAttempts: 3, baseMs: 1, jitter: false });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting all attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always fails'));
    await expect(
      withRetry(fn, { maxAttempts: 2, baseMs: 1, jitter: false }, 'test-op'),
    ).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
