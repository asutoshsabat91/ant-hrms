
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendLeaveApprovalEmail } from "@/lib/mail";
import { createGoogleCalendarEvent } from "@/lib/googleCalendar";
import { syncEmployeePayrollForDate } from "@/lib/utils/payrollEngine";
import { triggerN8nWebhook } from "@/lib/utils/n8n";

const decisionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().optional(),
});

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
  const isCompanyAdmin = session.user.role === "COMPANY_ADMIN";
  const isManager = session.user.role === "EMPLOYEE";
  const isHr = ["ADMIN"].includes(session.user.role);

  let allowed = false;
  if (isHr) {
    allowed = true;
  } else if (isManager && request.employee.managerId === currentEmployee.id) {
    allowed = true;
  } else if (isCompanyAdmin && currentEmployee.managedCompany && request.employee.deployedCompany === currentEmployee.managedCompany) {
    allowed = true;
  }

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { action, rejectionReason } = parsed.data;
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
        await triggerN8nWebhook("N8N_LEAVE_WEBHOOK_URL", {
          event: "leave.approved",
          employeeName,
          officialEmail: result.employee.email,
          startDate: result.startDate.toISOString().split("T")[0],
          endDate: result.endDate.toISOString().split("T")[0],
          leaveType: result.leaveType.name,
          days: result.days,
        });
      } catch (n8nErr) {
        console.error("[N8N] Leave webhook failed", n8nErr);
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
