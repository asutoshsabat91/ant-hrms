import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const start = Date.now();
  try {
    // Execute a fast, lightweight ping to PostgreSQL to verify DB connection pool readiness
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;

    return NextResponse.json({
      status: "ready",
      database: "connected",
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "unready",
        database: "disconnected",
        error: error?.message || "Database ping failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
