import logger from './logger.js';

export async function retry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30_000,
    backoffFactor = 2,
    retryableErrors = [],
    label = 'operation',
  } = options;

  let lastError;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isRetryable = retryableErrors.length === 0 || retryableErrors.some(e => err instanceof e || err.code === e);

      if (attempt > maxRetries || !isRetryable) {
        throw err;
      }

      const delay = Math.min(baseDelayMs * Math.pow(backoffFactor, attempt - 1), maxDelayMs);
      const jitter = Math.random() * 500;
      logger.warn({ attempt, maxRetries, delay: delay + jitter, label, error: err.message }, `Retry ${attempt}/${maxRetries} for ${label}`);
      await new Promise(r => setTimeout(r, delay + jitter));
    }
  }
  throw lastError;
}
