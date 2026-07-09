import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { importBiometricFromGoogleSheets } from "@/lib/googleSheets";

export async function POST() {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Super Admin only." }, { status: 403 });
    }

    const result = await importBiometricFromGoogleSheets();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[BIOMETRIC_SHEETS_IMPORT]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
