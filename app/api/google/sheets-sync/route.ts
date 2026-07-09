import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncGoogleSheetsWithDb } from "@/lib/googleSheets";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await syncGoogleSheetsWithDb();

    if (!result.success) {
      const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "";
      const diagnostics = {
        length: rawKey.length,
        startsWith: rawKey.slice(0, 30),
        endsWith: rawKey.slice(-30),
        hasNewlines: rawKey.includes("\n"),
        hasEscapedNewlines: rawKey.includes("\\n"),
      };
      return NextResponse.json({ 
        error: result.error || "Failed to perform sync",
        diagnostics
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      simulated: result.simulated ?? false,
      updatedCount: result.updatedCount ?? 0,
      createdCount: result.createdCount ?? 0,
      message: result.message || "Sync completed successfully."
    });
  } catch (error) {
    const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "";
    const diagnostics = {
      length: rawKey.length,
      startsWith: rawKey.slice(0, 30),
      endsWith: rawKey.slice(-30),
      hasNewlines: rawKey.includes("\n"),
      hasEscapedNewlines: rawKey.includes("\\n"),
    };
    console.error("[SHEETS SYNC POST]", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error), 
      diagnostics 
    }, { status: 500 });
  }
}
