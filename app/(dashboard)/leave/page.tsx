import { auth } from "@/auth";
import { getLeaveOverview } from "@/lib/leave";
import { prisma } from "@/lib/prisma";
import { LeavePageClient } from "./LeavePageClient";

import type { LeaveType } from "@prisma/client";

export default async function LeavePage() {
  const session = await auth();
  const userRole = session?.user?.role || "EMPLOYEE";
  const userId = session?.user?.id || "";

  const rawData = await getLeaveOverview(userId, userRole);

  // Serialize to plain objects — Next.js can't pass Date/Prisma objects to client components
  const initialData = {
    year: rawData.year,
    leaveBalances: rawData.leaveBalances,
    counts: rawData.counts,
    recentRequests: rawData.recentRequests.map((r) => ({
      id: r.id,
      days: r.days,
      status: r.status,
      reason: r.reason ?? undefined,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate.toISOString(),
      leaveType: { name: (r as { leaveType?: { name: string } }).leaveType?.name ?? "" },
      employee: {
        firstName: (r as { employee?: { firstName: string } }).employee?.firstName ?? "",
        lastName: (r as { employee?: { lastName: string } }).employee?.lastName ?? "",
        employeeId: (r as { employee?: { employeeId: string } }).employee?.employeeId ?? "",
      },
    })),
  };

  let leaveTypes: LeaveType[] = [];
  let employmentType = "FULL_TIME";
  try {
    leaveTypes = await prisma.leaveType.findMany({ orderBy: { name: "asc" } });
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { employee: true },
      });
      if (user?.employee) {
        employmentType = user.employee.employmentType;
      }
    }
  } catch {
    // DB offline fallback
  }

  // Serialize leaveTypes to strip any Date fields
  const safeLeaveTypes = leaveTypes.map((lt) => ({
    id: lt.id,
    name: lt.name,
    code: lt.code,
  }));

  return (
    <LeavePageClient
      initialData={initialData}
      leaveTypes={safeLeaveTypes}
      userRole={userRole}
      employmentType={employmentType}
    />
  );
}

