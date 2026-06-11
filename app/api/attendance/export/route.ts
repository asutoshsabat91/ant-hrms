import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const weeklyRecords = await prisma.attendanceRecord.findMany({
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
    csvContent += `Generated At:,${new Date().toISOString()}\n\n`;
    csvContent += `Employee ID,First Name,Last Name,Date,First Punch,Latest Punch,Punches Count,Total Hours,Status\n`;

    weeklyRecords.forEach((record) => {
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

      const workDate = new Date(record.workDate).toISOString().slice(0, 10);
      csvContent += `"${record.employee.employeeId}","${record.employee.firstName}","${record.employee.lastName}","${workDate}","${firstPunch}","${lastPunch}",${record.punches.length},${record.totalHours ?? 0},"${record.status}"\n`;
    });

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="Attendance_Report_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Failed to export attendance:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
