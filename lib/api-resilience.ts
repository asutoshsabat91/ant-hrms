import { logger } from "./logger";

interface ResilienceOptions {
  timeoutMs?: number;
  maxRetries?: number;
  backoffMs?: number;
  routeName?: string;
  fallbackValue?: any;
}

/**
  Executes an async task (e.g. external HTTP call to Google API, AI service, etc.)
  with bounded timeouts, exponential backoff retries, and safe fallback handling.
 */
export async function withResilience<T>(
  fn: () => Promise<T>,
  options: ResilienceOptions = {}
): Promise<T> {
  const {
    timeoutMs = 8000,
    maxRetries = 2,
    backoffMs = 500,
    routeName = "external-api",
    fallbackValue,
  } = options;

  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new Error(`Operation timed out after ${timeoutMs}ms`));
          });
        }),
      ]);

      clearTimeout(timeoutId);
      return result;
    } catch (err: any) {
      clearTimeout(timeoutId);

      logger.warn({
        message: `External call attempt ${attempt}/${maxRetries + 1} failed for ${routeName}`,
        route: routeName,
        error: err?.message || err,
      });

      if (attempt > maxRetries) {
        if (fallbackValue !== undefined) {
          logger.warn({
            message: `Executing fallback strategy for ${routeName} after exhausted retries`,
            route: routeName,
          });
          return fallbackValue;
        }
        throw err;
      }

      // Exponential backoff wait
      const waitTime = backoffMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw new Error(`Execution failed after ${maxRetries} retries`);
}
