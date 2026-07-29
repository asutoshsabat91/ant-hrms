
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendLeaveApprovalEmail } from "@/lib/mail";
import { createGoogleCalendarEvent } from "@/lib/googleCalendar";
import { syncEmployeePayrollForDate } from "@/lib/utils/payrollEngine";
import { sendGoogleChatNotification } from "@/lib/googleChat";

const decisionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().optional(),
});

async function isAncestorManager(approverEmployeeId: string, applicantEmployeeId: string): Promise<boolean> {
  const allEmployees = await prisma.employee.findMany({
    select: { id: true, managerId: true },
  });
  const empMap = new Map<string, string | null>(allEmployees.map((e) => [e.id, e.managerId]));
  
  let currentManagerId = empMap.get(applicantEmployeeId);
  const visited = new Set<string>();
  while (currentManagerId && !visited.has(currentManagerId)) {
    if (currentManagerId === approverEmployeeId) {
      return true;
    }
    visited.add(currentManagerId);
    currentManagerId = empMap.get(currentManagerId) ?? null;
  }
  return false;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!params?.id) {
    return NextResponse.json({ error: "Leave request id is required." }, { status: 400 });
  }

  const body = await req.json();
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });

  if (!user?.employee) {
    return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
  }

  const request = await prisma.leaveRequest.findUnique({
    where: { id: params.id },
    include: { employee: { include: { user: true } }, leaveType: true },
  });

  if (!request) {
    return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
  }

  if (request.status !== "PENDING") {
    return NextResponse.json({ error: "Only pending requests can be updated." }, { status: 400 });
  }

  const currentEmployee = user.employee;
  
  if (currentEmployee.id === request.employeeId) {
    return NextResponse.json({ error: "You cannot approve your own leave request." }, { status: 403 });
  }

  const approverEmail = (session.user.email || user.email || "").toLowerCase();
  const applicantEmail = (request.employee.email || "").toLowerCase();

  const isSuperAdmin = ["hive@theantbox.com", "rohit@theantbox.com", "chandrita@theantbox.com"].includes(approverEmail);
  const isCompanyAdmin = session.user.role === "COMPANY_ADMIN";
  const isHr = ["ADMIN"].includes(session.user.role);

  let allowed = false;

  if (applicantEmail === "chandrita@theantbox.com") {
    // Only Super Admins (Hive & Rohit) can approve or reject Chandrita's leave requests
    allowed = ["hive@theantbox.com", "rohit@theantbox.com"].includes(approverEmail);
  } else if (isSuperAdmin || isHr) {
    // Super Admins and HR Admins can approve anyone's leave
    allowed = true;
  } else if (await isAncestorManager(currentEmployee.id, request.employeeId)) {
    // Direct or Senior Reporting Manager up the reporting chain
    allowed = true;
  } else if (isCompanyAdmin && currentEmployee.managedCompany && request.employee.deployedCompany === currentEmployee.managedCompany) {
    allowed = true;
  }

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden: You do not have permission to review this leave request." }, { status: 403 });
  }

  const { action, rejectionReason } = parsed.data;
  if (action === "REJECT" && (!rejectionReason || !rejectionReason.trim())) {
    return NextResponse.json({ error: "Rejection reason is required." }, { status: 400 });
  }
  const year = request.startDate.getFullYear();
  const requestDays = request.days;

  const result = await prisma.$transaction(async (tx) => {
    if (action === "APPROVE") {
      await tx.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year,
          },
        },
        create: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year,
          allocated: 0,
          used: requestDays,
          pending: 0,
          carryover: 0,
        },
        update: {
          used: { increment: requestDays },
          pending: { decrement: requestDays },
        },
      });
    } else {
      await tx.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year,
          },
        },
        create: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year,
          allocated: 0,
          used: 0,
          pending: 0,
          carryover: 0,
        },
        update: {
          pending: { decrement: requestDays },
        },
      });
    }

    const updatedRequest = await tx.leaveRequest.update({
      where: { id: params.id },
      data: {
        status: action === "APPROVE" ? "APPROVED" : "REJECTED",
        approvedAt: new Date(),
        approverId: currentEmployee.id,
        rejectionReason: action === "REJECT" ? rejectionReason ?? null : null,
      },
      include: {
        employee: { include: { user: true } },
        leaveType: true,
      },
    });

    if (updatedRequest.employee.userId) {
      await tx.notification.create({
        data: {
          userId: updatedRequest.employee.userId,
          type: action === "APPROVE" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
          title: action === "APPROVE" ? "Leave request approved" : "Leave request rejected",
          body: action === "APPROVE"
            ? `Your ${updatedRequest.leaveType.name} request for ${updatedRequest.days} day${updatedRequest.days === 1 ? "" : "s"} has been approved.`
            : `Your ${updatedRequest.leaveType.name} request for ${updatedRequest.days} day${updatedRequest.days === 1 ? "" : "s"} was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`,
          link: "/leave",
        },
      });
    }

    return updatedRequest;
  });

  try {
    const employeeName = `${result.employee.firstName} ${result.employee.lastName}`;
    
    // Send email notification
    await sendLeaveApprovalEmail(
      result.employee.email,
      employeeName,
      result.leaveType.name,
      result.days,
      result.status as "APPROVED" | "REJECTED",
      result.rejectionReason
    );

    // Sync to Google Calendar if approved
    if (result.status === "APPROVED") {
      await createGoogleCalendarEvent({
        title: `${employeeName} — Out of Office (${result.leaveType.name})`,
        description: `Leave Request Approved.\nReason: ${result.reason || ""}`,
        startDate: result.startDate,
        endDate: result.endDate,
        allDay: true,
      });

      try {
        await sendGoogleChatNotification(
          `🌴 *Out of Office Announcement* 🌴\n\n` +
          `*${employeeName}* is on approved *${result.leaveType.name}* leave. \n` +
          `• *Duration:* ${result.days} day${result.days === 1 ? "" : "s"} \n` +
          `• *Dates:* ${result.startDate.toISOString().split("T")[0]} to ${result.endDate.toISOString().split("T")[0]}`
        );
      } catch (chatErr) {
        console.error("[Google Chat] Leave approved notification failed", chatErr);
      }
    }
  } catch (err) {
    console.error("Failed post-leave decision integrations (email/calendar)", err);
  }

  if (result.status === "APPROVED") {
    try {
      await syncEmployeePayrollForDate(result.employeeId, result.startDate);
    } catch (err) {
      console.error("Failed to sync employee payroll on leave approval:", err);
    }
  }

  return NextResponse.json({ request: result });
}
