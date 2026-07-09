import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    const whereClause: { workDate?: Date } = {};
    if (dateParam) {
      const targetDate = new Date(dateParam);
      targetDate.setHours(0, 0, 0, 0);
      whereClause.workDate = targetDate;
    }

    const records = await prisma.attendanceRecord.findMany({
      where: whereClause,
      include: {
        employee: true,
        punches: {
          orderBy: { punchedAt: "asc" },
        },
      },
      orderBy: { workDate: "desc" },
    });

    let csvContent = "";
    csvContent += `ATTENDANCE REPORT\n`;
    if (dateParam) {
      csvContent += `For Date:,${dateParam}\n`;
    }
    csvContent += `Generated At:,${new Date().toISOString()}\n\n`;
    csvContent += `Date,Employee ID,Employee Name,Status,First Punch,Latest Punch,Clock Cycles,Total Hours\n`;

    records.forEach((record) => {
      const empName = `${record.employee.firstName} ${record.employee.lastName}`;
      const workDate = new Date(record.workDate).toISOString().slice(0, 10);

      const firstPunch = record.punches[0]?.punchedAt
        ? new Date(record.punches[0].punchedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : record.checkIn
        ? new Date(record.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : "—";

      const lastPunch = record.punches.at(-1)?.punchedAt
        ? new Date(record.punches.at(-1)!.punchedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : record.checkOut
        ? new Date(record.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : "—";

      // Calculate clock cycles
      const cycles: string[] = [];
      const punches = record.punches;
      for (let i = 0; i < punches.length; i += 2) {
        const inPunch = punches[i];
        const outPunch = punches[i + 1];
        const inStr = inPunch
          ? new Date(inPunch.punchedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
          : "—";
        const outStr = outPunch
          ? new Date(outPunch.punchedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
          : "—";

        if (inPunch && outPunch) {
          const diffMs = new Date(outPunch.punchedAt).getTime() - new Date(inPunch.punchedAt).getTime();
          const hrs = (diffMs / (1000 * 60 * 60)).toFixed(2);
          cycles.push(`${inStr} to ${outStr} (${hrs} hrs)`);
        } else if (inPunch) {
          cycles.push(`${inStr} to — (Active)`);
        }
      }
      const cyclesStr = cycles.join(" | ") || "—";

      csvContent += `"${workDate}","${record.employee.employeeId}","${empName}","${record.status}","${firstPunch}","${lastPunch}","${cyclesStr}",${record.totalHours ?? 0}\n`;
    });

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="Attendance_Report_${dateParam || new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Failed to export attendance:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
