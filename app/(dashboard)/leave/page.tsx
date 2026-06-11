import { auth } from "@/auth";
import { getLeaveOverview } from "@/lib/leave";
import { prisma } from "@/lib/prisma";
import { LeavePageClient } from "./LeavePageClient";

import type { LeaveType } from "@prisma/client";

export default async function LeavePage() {
  const session = await auth();
  const userRole = session?.user?.role || "EMPLOYEE";
  const userId = session?.user?.id || "";

  const initialData = await getLeaveOverview(userId, userRole);
  
  let leaveTypes: LeaveType[] = [];
  try {
    leaveTypes = await prisma.leaveType.findMany({ orderBy: { name: "asc" } });
  } catch {
    // DB offline fallback
  }

  return (
    <LeavePageClient initialData={initialData} leaveTypes={leaveTypes} userRole={userRole} />
  );
}
