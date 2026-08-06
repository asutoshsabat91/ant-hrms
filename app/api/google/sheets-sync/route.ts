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
      return NextResponse.json({ 
        error: ("error" in result && result.error) ? result.error : "Failed to perform sync"
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      simulated: result.simulated ?? false,
      updatedCount: result.updatedCount ?? 0,
      createdCount: result.createdCount ?? 0,
      message: ("message" in result && result.message) ? result.message : "Sync completed successfully."
    });
  } catch (error) {
    console.error("[SHEETS SYNC POST]", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Internal Server Error"
    }, { status: 500 });
  }
}
