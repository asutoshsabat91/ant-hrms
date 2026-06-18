import { prisma } from "@/lib/prisma";
import { EmploymentType } from "@prisma/client";

export async function getDynamicBalances(employeeId: string, employmentType: string, year: number) {
  // 1. Fetch all leave types
  const allLeaveTypes = await prisma.leaveType.findMany({
    orderBy: { name: "asc" },
  });

  // 2. Fetch all approved/pending requests of the employee for the year
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
  const requests = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      startDate: { gte: startOfYear, lte: endOfYear },
    },
    include: { leaveType: true },
  });

  const balances = allLeaveTypes.map((lt) => {
    const isApplicable = lt.applicableTo.includes(employmentType as EmploymentType);
    if (!isApplicable) {
      return null;
    }

    const typeRequests = requests.filter((r) => r.leaveType.id === lt.id);
    let used = typeRequests.filter((r) => r.status === "APPROVED").reduce((sum, r) => sum + r.days, 0);
    let pending = typeRequests.filter((r) => r.status === "PENDING").reduce((sum, r) => sum + r.days, 0);

    let allocated = lt.daysPerYear;

    if (lt.code === "PAID_QUARTER" && employmentType === "INTERN") {
      const now = new Date();
      if (now.getFullYear() === year) {
        const startQuarter = Math.floor(now.getMonth() / 3) * 3;
        allocated = now.getMonth() - startQuarter + 1; // Accrued up to current month in current quarter
        
        // Accumulate used/pending only inside the current quarter
        const qStartDate = new Date(year, startQuarter, 1);
        const qEndDate = new Date(year, startQuarter + 3, 0, 23, 59, 59, 999);
        
        const qRequests = typeRequests.filter((r) => r.startDate >= qStartDate && r.startDate <= qEndDate);
        used = qRequests.filter((r) => r.status === "APPROVED").reduce((sum, r) => sum + r.days, 0);
        pending = qRequests.filter((r) => r.status === "PENDING").reduce((sum, r) => sum + r.days, 0);
      } else {
        allocated = 0;
        used = 0;
        pending = 0;
      }
    }

    return {
      leaveType: { id: lt.id, name: lt.name, code: lt.code },
      allocated,
      used,
      pending,
      carryover: 0,
    };
  });

  return balances.filter(Boolean) as Array<{
    leaveType: { id: string; name: string; code: string };
    allocated: number;
    used: number;
    pending: number;
    carryover: number;
  }>;
}

export async function getLeaveOverview(userId?: string, userRole?: string) {
  const currentYear = new Date().getFullYear();
  const isSuperAdmin = userRole === "ADMIN" || userRole === "ADMIN";

  let employeeId: string | undefined = undefined;
  let employmentType = "FULL_TIME";
  
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });
    if (user?.employee) {
      employeeId = user.employee.id;
      employmentType = user.employee.employmentType;
    }
  }

  const statusGroups = await prisma.leaveRequest.groupBy({
    where: employeeId && !isSuperAdmin ? { employeeId } : {},
    by: ["status"],
    _count: {
      status: true,
    },
  });

  // Fetch dynamic balances for the logged-in user if available
  const leaveBalances = employeeId 
    ? await getDynamicBalances(employeeId, employmentType, currentYear)
    : [];

  const recentRequests = await prisma.leaveRequest.findMany({
    where: employeeId && !isSuperAdmin ? { employeeId } : {},
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

