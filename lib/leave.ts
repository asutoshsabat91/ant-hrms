import { prisma } from "@/lib/prisma";

export async function getLeaveOverview(userId?: string, userRole?: string) {
  const currentYear = new Date().getFullYear();
  const isSuperAdmin = userRole === "SUPER_ADMIN";

  let employeeId: string | undefined = undefined;
  if (userId && !isSuperAdmin) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });
    employeeId = user?.employee?.id || "NO_EMPLOYEE_FOUND";
  }

  const statusGroups = await prisma.leaveRequest.groupBy({
    where: employeeId ? { employeeId } : {},
    by: ["status"],
    _count: {
      status: true,
    },
  });

  const leaveBalances = await prisma.leaveBalance.findMany({
    where: {
      year: currentYear,
      ...(employeeId ? { employeeId } : {}),
    },
    include: {
      employee: true,
      leaveType: true,
    },
    orderBy: [{ employee: { firstName: "asc" } }, { leaveType: { name: "asc" } }],
  });

  const recentRequests = await prisma.leaveRequest.findMany({
    where: employeeId ? { employeeId } : {},
    include: {
      employee: true,
      leaveType: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  const counts = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
  } as Record<string, number>;

  for (const group of statusGroups) {
    counts[group.status] = group._count.status;
  }

  return {
    year: currentYear,
    leaveBalances,
    recentRequests,
    counts,
  };
}
