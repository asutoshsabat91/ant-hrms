import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: "asc" }
    });
    return NextResponse.json(holidays);
  } catch (error) {
    console.error("[HOLIDAYS GET]", error);
    return NextResponse.json({ error: "Failed to fetch holidays" }, { status: 500 });
  }
}
