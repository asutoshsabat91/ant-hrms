import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checks: Record<string, { status: string; latencyMs?: number; details?: string }> = {};
  
  // 1. Check PostgreSQL Database
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart };
  } catch (err: any) {
    checks.database = { status: "error", details: err?.message || "PostgreSQL ping failed" };
  }

  // 2. Check Google Generative AI / Gemini API Credentials
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (apiKey) {
    checks.geminiAi = { status: "configured" };
  } else {
    checks.geminiAi = { status: "warning", details: "API Key missing" };
  }

  // 3. Check Google Sheets Integration Configuration
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_ID) {
    checks.googleIntegration = { status: "configured" };
  } else {
    checks.googleIntegration = { status: "optional_missing" };
  }

  const allOk = checks.database.status === "ok";
  return NextResponse.json(
    {
      overallStatus: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      dependencies: checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
