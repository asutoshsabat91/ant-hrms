import { auth } from "@/auth";
import { getLeaveOverview } from "@/lib/leave";
import { prisma } from "@/lib/prisma";
import { LeavePageClient } from "./LeavePageClient";

import type { LeaveType } from "@prisma/client";

export default async function LeavePage() {
  const session = await auth();
  const userRole = session?.user?.role || "EMPLOYEE";
  const userId = session?.user?.id || "";

  let rawData;
  try {
    rawData = await getLeaveOverview(userId, userRole);
  } catch (e) {
    console.error("[LeavePage] getLeaveOverview failed:", e);
    rawData = { year: new Date().getFullYear(), leaveBalances: [], counts: {}, recentRequests: [] };
  }

  // Serialize to plain objects — Next.js can't pass Date/Prisma objects to client components
  const initialData = {
    year: rawData.year,
    leaveBalances: rawData.leaveBalances,
    counts: rawData.counts,
    recentRequests: (rawData.recentRequests ?? []).map((r: {
      id: string; days: number; status: string; reason?: string | null;
      startDate: Date; endDate: Date;
      leaveType?: { name: string }; employee?: { firstName: string; lastName: string; employeeId: string };
    }) => ({
      id: r.id,
      days: r.days,
      status: r.status,
      reason: r.reason ?? undefined,
      startDate: r.startDate instanceof Date ? r.startDate.toISOString() : String(r.startDate),
      endDate: r.endDate instanceof Date ? r.endDate.toISOString() : String(r.endDate),
      leaveType: { name: r.leaveType?.name ?? "" },
      employee: {
        firstName: r.employee?.firstName ?? "",
        lastName: r.employee?.lastName ?? "",
        employeeId: r.employee?.employeeId ?? "",
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
    applicableTo: lt.applicableTo,
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

