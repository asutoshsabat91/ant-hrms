import { logger } from "./logger";

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
];

export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    logger.error({
      message: "CRITICAL: Production startup environment validation failed",
      context: { missingVariables: missing },
    });
    return { valid: false, missing };
  }

  logger.info({
    message: "Production environment startup validation passed successfully",
  });
  return { valid: true, missing: [] };
}
