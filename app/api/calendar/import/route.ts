import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden. Only Super Admins can import the holiday calendar." }, { status: 403 });
  }

  try {
    const { holidays } = await req.json();

    if (!Array.isArray(holidays) || holidays.length === 0) {
      return NextResponse.json({ error: "No holiday data provided." }, { status: 400 });
    }

    // Parse dates and extract target years
    const parsedHolidays: Array<{ name: string; date: Date; type: string; description: string }> = [];
    const targetYears = new Set<number>();

    for (const h of holidays) {
      if (!h.name || !h.date) {
        return NextResponse.json({ error: "Each holiday must have a name and a date." }, { status: 400 });
      }

      // Robust date parsing
      // Handle dd/mm/yyyy, dd-mm-yyyy, dd-mmm-yyyy, yyyy-mm-dd
      let dateObj: Date | null = null;
      const parts = h.date.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // yyyy-mm-dd
          dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
          // dd-mm-yyyy or dd-mmm-yyyy
          const day = parseInt(parts[0]);
          let month = parseInt(parts[1]) - 1;
          if (isNaN(month)) {
            const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
            const mStr = parts[1].toLowerCase().slice(0, 3);
            month = months.indexOf(mStr);
          }
          const year = parseInt(parts[2]);
          dateObj = new Date(year, month, day);
        }
      } else {
        dateObj = new Date(h.date);
      }

      if (!dateObj || isNaN(dateObj.getTime())) {
        return NextResponse.json({ error: `Invalid date format: ${h.date} for holiday ${h.name}` }, { status: 400 });
      }

      parsedHolidays.push({
        name: h.name,
        date: dateObj,
        type: h.description?.toUpperCase().includes("OPTIONAL") ? "OPTIONAL" : "MANDATORY",
        description: h.description || "Mandatory",
      });

      targetYears.add(dateObj.getFullYear());
    }

    // Run delete and insert operations in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing holidays for the target years
      for (const year of Array.from(targetYears)) {
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
        await tx.holiday.deleteMany({
          where: {
            date: {
              gte: startOfYear,
              lte: endOfYear,
            },
          },
        });
      }

      // Create new holidays
      await tx.holiday.createMany({
        data: parsedHolidays,
      });
    });

    return NextResponse.json({
      message: `Successfully imported ${parsedHolidays.length} holidays for year(s): ${Array.from(targetYears).join(", ")}.`,
    });
  } catch (err) {
    console.error("Error importing holidays:", err);
    const errMsg = err instanceof Error ? err.message : "Failed to import holidays.";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
