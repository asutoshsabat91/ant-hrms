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

  // Fetch employee to check if they are an unpaid intern
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { ctc: true },
  });
  const isUnpaidIntern = employmentType === "INTERN" && (!employee?.ctc || employee.ctc === 0);

  const balances = allLeaveTypes.map((lt) => {
    const isApplicable = lt.applicableTo.includes(employmentType as EmploymentType);
    if (!isApplicable) {
      return null;
    }

    const typeRequests = requests.filter((r) => r.leaveType.id === lt.id);
    let used = typeRequests.filter((r) => r.status === "APPROVED").reduce((sum, r) => sum + r.days, 0);
    let pending = typeRequests.filter((r) => r.status === "PENDING").reduce((sum, r) => sum + r.days, 0);

    let allocated = lt.daysPerYear;

    if (isUnpaidIntern) {
      allocated = 999; // Unlimited
    } else {
      const accrualMode = lt.accrual || "ANNUAL";
      const now = new Date();
      if (now.getFullYear() === year) {
        if (accrualMode === "QUARTERLY") {
          const startQuarter = Math.floor(now.getMonth() / 3) * 3;
          const quarterBase = lt.daysPerYear / 4;
          const monthInQuarter = now.getMonth() - startQuarter + 1; // 1, 2, or 3
          allocated = Math.round((quarterBase / 3) * monthInQuarter * 10) / 10;
          
          // Accumulate used/pending only inside the current quarter
          const qStartDate = new Date(year, startQuarter, 1);
          const qEndDate = new Date(year, startQuarter + 3, 0, 23, 59, 59, 999);
          
          const qRequests = typeRequests.filter((r) => r.startDate >= qStartDate && r.startDate <= qEndDate);
          used = qRequests.filter((r) => r.status === "APPROVED").reduce((sum, r) => sum + r.days, 0);
          pending = qRequests.filter((r) => r.status === "PENDING").reduce((sum, r) => sum + r.days, 0);

          // Add SICK leave paid portion inside current quarter
          const qSickRequests = requests.filter(
            (r) => r.leaveType.code === "SICK" && r.startDate >= qStartDate && r.startDate <= qEndDate
          );
          const sickPaidApproved = qSickRequests.filter((r) => r.status === "APPROVED").reduce((sum, r) => sum + (r.sickPaidDays ?? 0), 0);
          const sickPaidPending = qSickRequests.filter((r) => r.status === "PENDING").reduce((sum, r) => sum + (r.sickPaidDays ?? 0), 0);
          used += sickPaidApproved;
          pending += sickPaidPending;
        } else if (accrualMode === "MONTHLY") {
          const currentMonthIndex = now.getMonth();
          const monthlyAccrued = (lt.daysPerYear / 12) * (currentMonthIndex + 1);
          allocated = Math.round(monthlyAccrued * 10) / 10;

          // Accumulate used/pending only inside the current month
          const mStartDate = new Date(year, currentMonthIndex, 1);
          const mEndDate = new Date(year, currentMonthIndex + 1, 0, 23, 59, 59, 999);

          const mRequests = typeRequests.filter((r) => r.startDate >= mStartDate && r.startDate <= mEndDate);
          used = mRequests.filter((r) => r.status === "APPROVED").reduce((sum, r) => sum + r.days, 0);
          pending = mRequests.filter((r) => r.status === "PENDING").reduce((sum, r) => sum + r.days, 0);
        }
      } else {
        // Different year logic
        if (accrualMode === "QUARTERLY" || accrualMode === "MONTHLY") {
          allocated = 0;
          used = 0;
          pending = 0;
        }
      }
    }

    if (lt.code === "EARNED" && employmentType === "FULL_TIME") {
      const sickRequests = requests.filter((r) => r.leaveType.code === "SICK");
      const sickPaidApproved = sickRequests.filter((r) => r.status === "APPROVED").reduce((sum, r) => sum + (r.sickPaidDays ?? 0), 0);
      const sickPaidPending = sickRequests.filter((r) => r.status === "PENDING").reduce((sum, r) => sum + (r.sickPaidDays ?? 0), 0);
      used += sickPaidApproved;
      pending += sickPaidPending;
    }

    if (lt.code === "LOP") {
      const sickRequests = requests.filter((r) => r.leaveType.code === "SICK");
      const sickLopApproved = sickRequests.filter((r) => r.status === "APPROVED").reduce((sum, r) => sum + (r.sickLopDays ?? 0), 0);
      const sickLopPending = sickRequests.filter((r) => r.status === "PENDING").reduce((sum, r) => sum + (r.sickLopDays ?? 0), 0);
      used += sickLopApproved;
      pending += sickLopPending;
    }

    return {
      leaveType: { id: lt.id, name: lt.name, code: lt.code },
      allocated,
      used,
      pending,
      carryover: 0,
    };
  });

  const LEAVE_PRIORITY: Record<string, number> = {
    EARNED: 1,
    PAID_QUARTER: 1,
    OPTIONAL_HOLIDAY: 2,
    FLOATER: 3,
    SICK: 4,
    WFH: 5,
    COMP_OFF: 6,
    BEREAVEMENT: 7,
    ACADEMIC: 8,
    CLIENT_LEAVE: 9,
    LOP: 10,
  };

  const validBalances = balances.filter(Boolean) as Array<{
    leaveType: { id: string; name: string; code: string };
    allocated: number;
    used: number;
    pending: number;
    carryover: number;
  }>;

  return validBalances.sort((a, b) => {
    const pA = LEAVE_PRIORITY[a.leaveType.code] ?? 99;
    const pB = LEAVE_PRIORITY[b.leaveType.code] ?? 99;
    if (pA !== pB) return pA - pB;
    return a.leaveType.name.localeCompare(b.leaveType.name);
  });
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
    take: 12,
  });

  const recentRequestsWithBalances = await Promise.all(
    recentRequests.map(async (r) => {
      const balances = await getDynamicBalances(r.employeeId, r.employee.employmentType, currentYear);
      const paidLeavesLeft = balances
        .filter((b) => b.leaveType.code !== "LOP" && b.leaveType.code !== "WFH")
        .reduce((sum, b) => sum + Math.max(0, b.allocated - b.used - b.pending), 0);

      return {
        ...r,
        paidLeavesLeft,
      };
    })
  );

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
    recentRequests: recentRequestsWithBalances,
    counts,
  };
}

