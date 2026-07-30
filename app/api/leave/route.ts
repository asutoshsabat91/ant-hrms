import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { format } from "date-fns";
import { getDynamicBalances } from "@/lib/leave";
import { sendLeaveRequestEmail } from "@/lib/mail";
import { sendGoogleChatNotification } from "@/lib/googleChat";

const requestSchema = z.object({
  leaveTypeId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().min(5),
});

async function getSubordinateEmployeeIds(managerEmployeeId: string): Promise<string[]> {
  const allEmployees = await prisma.employee.findMany({
    select: { id: true, managerId: true },
  });
  const map = new Map<string, string[]>();
  for (const emp of allEmployees) {
    if (emp.managerId) {
      if (!map.has(emp.managerId)) map.set(emp.managerId, []);
      map.get(emp.managerId)!.push(emp.id);
    }
  }

  const subordinates: string[] = [];
  const queue = [...(map.get(managerEmployeeId) || [])];
  while (queue.length > 0) {
    const current = queue.shift()!;
    subordinates.push(current);
    if (map.has(current)) {
      queue.push(...map.get(current)!);
    }
  }
  return subordinates;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });

  if (!user?.employee) {
    return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
  }

  const currentYear = new Date().getFullYear();
  const userEmail = (session.user.email || user.email || "").toLowerCase();
  const isSuperAdmin = ["rohit@theantbox.com", "chandrita@theantbox.com", "hive@theantbox.com"].includes(userEmail);

  const [leaveTypes, myRequests] = await Promise.all([
    prisma.leaveType.findMany({ orderBy: { name: "asc" } }),
    prisma.leaveRequest.findMany({
      where: { employeeId: user.employee.id },
      include: {
        leaveType: true,
        employee: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const leaveBalances = await getDynamicBalances(user.employee.id, user.employee.employmentType, currentYear);

  let approvalRequests: Awaited<ReturnType<typeof prisma.leaveRequest.findMany>> = [];
  if (session.user.role === "ADMIN" || isSuperAdmin) {
    approvalRequests = await prisma.leaveRequest.findMany({
      where: { status: "PENDING" },
      include: {
        leaveType: true,
        employee: true,
      },
      orderBy: { createdAt: "desc" },
      take: 16,
    });
  } else if (session.user.role === "COMPANY_ADMIN") {
    const managedCompany = user.employee.managedCompany;
    approvalRequests = await prisma.leaveRequest.findMany({
      where: {
        status: "PENDING",
        employee: { deployedCompany: managedCompany || undefined },
      },
      include: {
        leaveType: true,
        employee: true,
      },
      orderBy: { createdAt: "desc" },
      take: 16,
    });
  } else {
    // Hierarchical reporting managers (direct & indirect subordinates)
    const subordinateIds = await getSubordinateEmployeeIds(user.employee.id);
    if (subordinateIds.length > 0) {
      approvalRequests = await prisma.leaveRequest.findMany({
        where: {
          status: "PENDING",
          employeeId: { in: subordinateIds },
        },
        include: {
          leaveType: true,
          employee: true,
        },
        orderBy: { createdAt: "desc" },
        take: 16,
      });
    }
  }

  return NextResponse.json({
    leaveTypes,
    leaveBalances,
    myRequests,
    approvalRequests,
  });
}

export async function POST(req: Request) {
  try {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });

  if (!user?.employee) {
    return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
  }

  const employee = user.employee;
  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { leaveTypeId, startDate, endDate, reason } = parsed.data;
  const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!leaveType) {
    return NextResponse.json({ error: "Leave type not found." }, { status: 404 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  }

  if (end < start) {
    return NextResponse.json({ error: "End date must be after start date." }, { status: 400 });
  }

  // Fetch holidays to exclude them from the calculation
  const holidays = await prisma.holiday.findMany();
  const holidayStrings = new Set(holidays.map(h => h.date.toISOString().split("T")[0]));

  let computedDays = 0;
  const curr = new Date(start);
  while (curr <= end) {
    const dayOfWeek = curr.getDay(); // 0 is Sunday, 6 is Saturday
    const dateStr = curr.toISOString().split("T")[0];
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidayStrings.has(dateStr);
    
    if (!isWeekend && !isHoliday) {
      computedDays++;
    }
    curr.setDate(curr.getDate() + 1);
  }

  if (computedDays <= 0) {
    return NextResponse.json({ error: "Leave duration is 0 days after excluding weekends and holidays." }, { status: 400 });
  }

  const days = computedDays;
  const year = start.getFullYear();

  const result = await prisma.$transaction(async (tx) => {
    // 1. Acquire an exclusive row-level lock on the Employee table to serialize concurrent leave submissions for this employee
    await tx.$executeRaw`SELECT * FROM "Employee" WHERE id = ${employee.id} FOR UPDATE`;

    const isUnpaidIntern = employee.employmentType === "INTERN" && (!employee.ctc || employee.ctc === 0);

    // 2. Holiday Overlap Check - Removed as holidays are automatically excluded from days calculation

    // 3. Notice Period check
    if (!isUnpaidIntern && leaveType.priorNoticeHours > 0) {
      // Assume the workday starts at 9:00 AM of the start date in the local timezone
      const startWorkday = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 9, 0, 0);
      const now = new Date();
      const diffHours = (startWorkday.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (diffHours < leaveType.priorNoticeHours) {
        throw new Error(
          `This leave type requires at least ${leaveType.priorNoticeHours} hours of prior notice. Since your leave starts on ${format(start, "dd MMM yyyy")}, you must apply earlier.`
        );
      }
    }

    // 4. Optional Holiday limit check (2 days per year)
    if (!isUnpaidIntern && leaveType.code === "OPTIONAL_HOLIDAY") {
      const startOfYear = new Date(start.getFullYear(), 0, 1);
      const endOfYear = new Date(start.getFullYear(), 11, 31, 23, 59, 59, 999);
      const existingOptional = await tx.leaveRequest.findMany({
        where: {
          employeeId: employee.id,
          leaveType: { code: "OPTIONAL_HOLIDAY" },
          status: { in: ["PENDING", "APPROVED"] },
          startDate: { gte: startOfYear, lte: endOfYear },
        },
      });
      const totalOptionalUsed = existingOptional.reduce((sum, r) => sum + r.days, 0);
      if (totalOptionalUsed + days > 2) {
        throw new Error(`Optional Holiday limit exceeded. You can take at most 2 Optional Holidays per year. Already used/pending: ${totalOptionalUsed} day(s).`);
      }
    }

    // 5. Intern Paid/Quarter Leave quarterly accrual & rollover rules
    if (!isUnpaidIntern && leaveType.code === "PAID_QUARTER" && employee.employmentType === "INTERN") {
      const startQuarter = Math.floor(start.getMonth() / 3);
      const endQuarter = Math.floor(end.getMonth() / 3);
      if (startQuarter !== endQuarter || start.getFullYear() !== end.getFullYear()) {
        throw new Error("Paid/Quarter Leaves cannot span across quarters. Please submit separate requests for each quarter.");
      }

      const qStartMonth = startQuarter * 3;
      const targetMonthInQuarter = start.getMonth() - qStartMonth + 1; // 1, 2, or 3
      const accrued = targetMonthInQuarter;

      const qStartDate = new Date(start.getFullYear(), qStartMonth, 1);
      const qEndDate = new Date(start.getFullYear(), qStartMonth + 3, 0, 23, 59, 59, 999);

      const quarterRequests = await tx.leaveRequest.findMany({
        where: {
          employeeId: employee.id,
          leaveType: { code: "PAID_QUARTER" },
          status: { in: ["PENDING", "APPROVED"] },
          startDate: { gte: qStartDate, lte: qEndDate },
        },
      });

      const usedInQuarter = quarterRequests.reduce((sum, r) => sum + r.days, 0);
      const remaining = accrued - usedInQuarter;

      if (days > remaining) {
        throw new Error(`Insufficient Paid/Quarter Leaves balance. Up to ${format(start, "MMMM")}, you have accrued ${accrued} day(s) this quarter and used/applied for ${usedInQuarter} day(s). Available balance: ${remaining} day(s).`);
      }
    }

    // 5.1 General Leave Balance Check (Exempt for LOP, WFH, SICK and Unpaid Interns)
    if (!isUnpaidIntern && leaveType.code !== "LOP" && leaveType.code !== "WFH" && leaveType.code !== "SICK") {
      const balances = await getDynamicBalances(employee.id, employee.employmentType, year);
      const balance = balances.find((b) => b.leaveType.id === leaveTypeId);
      if (balance) {
        const remaining = balance.allocated - balance.used - balance.pending;
        if (days > remaining) {
          throw new Error(`Insufficient leave balance. You are requesting ${days} day(s), but only have ${remaining} day(s) remaining for ${leaveType.name}.`);
        }
      } else {
        throw new Error(`This leave type (${leaveType.name}) is not applicable to your employment type.`);
      }
    }

    // 6. Existing Overlap Check
    const existingOverlap = await tx.leaveRequest.findFirst({
      where: {
        employeeId: user.employee!.id,
        status: { in: ["PENDING", "APPROVED"] },
        AND: [
          { startDate: { lte: end } },
          { endDate: { gte: start } },
        ],
      },
    });

    if (existingOverlap) {
      throw new Error("You already have a leave request covering this period.");
    }

    // 7. Sick Leave Split calculations (calculated under lock using current values)
    let sickPaidDays = 0;
    let sickLopDays = 0;

    if (leaveType.code === "SICK") {
      if (isUnpaidIntern) {
        sickPaidDays = days;
        sickLopDays = 0;
      } else {
        const [allBalances, allRequests] = await Promise.all([
          tx.leaveBalance.findMany({
            where: { employeeId: employee.id, year },
            include: { leaveType: true },
          }),
          tx.leaveRequest.findMany({
            where: { employeeId: employee.id, status: { in: ["APPROVED", "PENDING"] } },
            include: { leaveType: true },
          }),
        ]);

        const paidTypeCode = employee.employmentType === "INTERN" ? "PAID_QUARTER" : "EARNED";
        const paidBalanceRecord = allBalances.find((b) => b.leaveType.code === paidTypeCode);
        const paidReqs = allRequests.filter((r) => r.leaveType.code === paidTypeCode);

        const used = paidReqs.filter((r) => r.status === "APPROVED").reduce((sum, r) => sum + r.days, 0);
        const pending = paidReqs.filter((r) => r.status === "PENDING").reduce((sum, r) => sum + r.days, 0);
        const allocated = paidBalanceRecord?.allocated ?? (employee.employmentType === "INTERN" ? 12 : 18);
        const remainingPaid = Math.max(0, allocated - used - pending);

        if (remainingPaid >= days) {
          sickPaidDays = days;
          sickLopDays = 0;
        } else {
          sickPaidDays = remainingPaid;
          sickLopDays = days - remainingPaid;
        }
      }
    }

    // Upsert leave balance table for record-keeping
    await tx.leaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: employee.id,
          leaveTypeId,
          year,
        },
      },
      create: {
        employeeId: employee.id,
        leaveTypeId,
        year,
        allocated: leaveType.daysPerYear,
        used: 0,
        pending: days,
        carryover: 0,
      },
      update: {
        pending: { increment: days },
      },
    });

    const leaveRequest = await tx.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveTypeId,
        startDate: start,
        endDate: end,
        days,
        reason,
        status: "PENDING",
        sickPaidDays,
        sickLopDays,
      },
      include: { leaveType: true },
    });

    const notificationMessage = `${employee.firstName} ${employee.lastName} requested ${days} day${days === 1 ? "" : "s"} of ${leaveType.name} leave from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}.`;
    const recipients = [] as { userId: string; title: string; body: string; link: string }[];

    let companyAdmins: { id: string; email: string }[] = [];
    if (employee.deployedCompany) {
      companyAdmins = await tx.user.findMany({
        where: {
          role: "COMPANY_ADMIN",
          employee: {
            managedCompany: employee.deployedCompany,
          },
        },
        select: {
          id: true,
          email: true,
        },
      });
    }

    if (companyAdmins.length > 0) {
      // Prioritize Company Admin approval - bypass manager and super admin
      companyAdmins.forEach((admin) => {
        recipients.push({
          userId: admin.id,
          title: "Leave request pending approval",
          body: notificationMessage,
          link: "/leave",
        });
      });
    } else {
      if (employee.managerId) {
        const manager = await tx.employee.findUnique({
          where: { id: employee.managerId },
          include: { user: true },
        });
        if (manager?.user) {
          recipients.push({
            userId: manager.user.id,
            title: "Leave request pending approval",
            body: notificationMessage,
            link: "/leave",
          });
        }
      }

      const hrUsers = await tx.user.findMany({
        where: { role: { in: ["ADMIN"] } },
      });

      hrUsers.forEach((hr) => {
        if (!recipients.some((recipient) => recipient.userId === hr.id)) {
          recipients.push({
            userId: hr.id,
            title: "Leave request submitted",
            body: notificationMessage,
            link: "/leave",
          });
        }
      });
    }

    if (recipients.length > 0) {
      await tx.notification.createMany({
        data: recipients.map((recipient) => ({
          userId: recipient.userId,
          type: "LEAVE_REQUEST",
          title: recipient.title,
          body: recipient.body,
          link: recipient.link,
        })),
      });
    }

    return leaveRequest;
  });

  try {
    const employeeName = `${employee.firstName} ${employee.lastName}`;
    
    // Route email to Reporting Manager and Super Admins
    let emailRecipients = ["chandrita@theantbox.com", "hive@theantbox.com", "rohit@theantbox.com"];
    
    if (employee.managerId) {
      const managerEmp = await prisma.employee.findUnique({
        where: { id: employee.managerId },
        select: { email: true },
      });
      if (managerEmp?.email) {
        emailRecipients.unshift(managerEmp.email);
      }
    }

    if (employee.email?.toLowerCase() === "chandrita@theantbox.com") {
      emailRecipients = emailRecipients.filter(e => e !== "chandrita@theantbox.com");
    } else if (employee.deployedCompany) {
      const admins = await prisma.user.findMany({
        where: {
          role: "COMPANY_ADMIN",
          employee: {
            managedCompany: employee.deployedCompany,
          },
        },
      });
      if (admins.length > 0) {
        emailRecipients = Array.from(new Set([...emailRecipients, ...admins.map((a) => a.email)]));
      }
    }
    emailRecipients = Array.from(new Set(emailRecipients.map(e => e.toLowerCase())));

    for (const recipientEmail of emailRecipients) {
      await sendLeaveRequestEmail(
        recipientEmail,
        employeeName,
        leaveType.name,
        days,
        format(start, "dd MMM yyyy"),
        format(end, "dd MMM yyyy"),
        reason
      );
    }

    try {
      await sendGoogleChatNotification(
        `📝 *New Leave Request Submitted*\n\n` +
        `• *Employee:* ${employeeName}\n` +
        `• *Leave Type:* ${leaveType.name}\n` +
        `• *Duration:* ${days} Day(s) (${format(start, "dd MMM yyyy")} to ${format(end, "dd MMM yyyy")})\n` +
        `• *Reason:* ${reason}`
      );
    } catch (chatErr) {
      console.error("[Google Chat] Leave request notification failed", chatErr);
    }

    // Export updated DB state to Google Master Sheet
    const { exportDbToGoogleSheetsOnly } = await import("@/lib/googleSheets");
    exportDbToGoogleSheetsOnly().catch(err => console.error("[Google Sheets Export]", err));
  } catch (mailErr) {
    console.error("Failed to send leave request email", mailErr);
  }

  return NextResponse.json({ request: result }, { status: 201 });
  } catch (e: unknown) {
    console.error("[LEAVE POST]", e);
    const errMsg = e instanceof Error ? e.message : "";
    const isValidationError = errMsg && !errMsg.includes("prisma") && !errMsg.includes("raw");
    return NextResponse.json({ error: isValidationError ? errMsg : "Failed to submit leave request" }, { status: isValidationError ? 400 : 500 });
  }
}
