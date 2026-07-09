import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncAttendanceToGoogleSheets } from "@/lib/googleSheets";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await syncAttendanceToGoogleSheets();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[ATTENDANCE_SHEETS_EXPORT]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
