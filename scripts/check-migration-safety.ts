import { execSync } from "child_process";
import { logger } from "../lib/logger";

async function checkMigrationSafety() {
  logger.info({ message: "Running production migration safety check..." });

  try {
    // 1. Verify Prisma Client generation
    execSync("npx prisma generate", { stdio: "inherit" });
    logger.info({ message: "Prisma Client successfully generated" });

    // 2. Validate Prisma schema syntax
    execSync("npx prisma validate", { stdio: "inherit" });
    logger.info({ message: "Prisma schema syntax is valid" });

    logger.info({ message: "All migration safety quality gates passed!" });
  } catch (error: any) {
    logger.error({
      message: "CRITICAL: Database migration safety check failed! Deployment halted.",
      error: error?.message || error,
    });
    process.exit(1);
  }
}

checkMigrationSafety();
