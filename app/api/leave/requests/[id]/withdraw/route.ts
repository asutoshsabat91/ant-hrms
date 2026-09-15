import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendLeaveWithdrawalEmail } from "@/lib/mail";
import { sendLeaveGoogleChatNotification } from "@/lib/googleChat";
import { format } from "date-fns";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!params?.id) {
      return NextResponse.json({ error: "Leave request ID is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { employee: true },
    });

    if (!user?.employee) {
      return NextResponse.json({ error: "Employee record not found." }, { status: 404 });
    }

    const request = await prisma.leaveRequest.findUnique({
      where: { id: params.id },
      include: {
        employee: true,
        leaveType: true,
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Leave request not found." }, { status: 404 });
    }

    const isOwner = request.employeeId === user.employee.id;
    const isSuperAdmin = ["hive@theantbox.com", "rohit@theantbox.com", "chandrita@theantbox.com"].includes(
      (session.user.email || "").toLowerCase()
    ) || session.user.role === "ADMIN";

    if (!isOwner && !isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden: You can only withdraw your own leave requests." }, { status: 403 });
    }

    if (request.status === "WITHDRAWN") {
      return NextResponse.json({ error: "This leave request is already withdrawn." }, { status: 400 });
    }

    if (request.status === "REJECTED" || request.status === "CANCELLED") {
      return NextResponse.json({ error: `Cannot withdraw a leave request with status: ${request.status}.` }, { status: 400 });
    }

    const previousStatus = request.status;
    const year = request.startDate.getFullYear();
    const days = request.days;

    const updatedRequest = await prisma.$transaction(async (tx) => {
      // Revert leave balance
      if (previousStatus === "APPROVED") {
        await tx.leaveBalance.updateMany({
          where: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year,
          },
          data: {
            used: { decrement: days },
          },
        });
      } else if (previousStatus === "PENDING") {
        await tx.leaveBalance.updateMany({
          where: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year,
          },
          data: {
            pending: { decrement: days },
          },
        });
      }

      const updated = await tx.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: "WITHDRAWN",
        },
        include: {
          employee: true,
          leaveType: true,
        },
      });

      // Send in-app notification to reporting manager & HR
      const notificationRecipients: string[] = [];
      let currMgrId = request.employee.managerId;
      const visited = new Set<string>();
      while (currMgrId && !visited.has(currMgrId)) {
        visited.add(currMgrId);
        const mgr = await tx.employee.findUnique({
          where: { id: currMgrId },
          select: { userId: true, managerId: true },
        });
        if (mgr?.userId) notificationRecipients.push(mgr.userId);
        currMgrId = mgr?.managerId ?? null;
      }

      if (notificationRecipients.length > 0) {
        for (const targetUserId of notificationRecipients) {
          await tx.notification.create({
            data: {
              userId: targetUserId,
              type: "LEAVE_REQUEST",
              title: "Leave request withdrawn",
              body: `${request.employee.firstName} ${request.employee.lastName} has withdrawn their ${request.leaveType.name} request (${days} day(s)).`,
              link: "/leave",
            },
          });
        }
      }

      return updated;
    });

    // Send email & Google Chat notifications asynchronously
    try {
      const employeeName = `${request.employee.firstName} ${request.employee.lastName}`;
      const startDateStr = format(request.startDate, "dd MMM yyyy");
      const endDateStr = format(request.endDate, "dd MMM yyyy");

      let emailRecipients: string[] = ["chandrita@theantbox.com", "hive@theantbox.com", "rohit@theantbox.com"];
      let currMgrIdForEmail = request.employee.managerId;
      const visitedMgrs = new Set<string>();
      while (currMgrIdForEmail && !visitedMgrs.has(currMgrIdForEmail)) {
        visitedMgrs.add(currMgrIdForEmail);
        const managerEmp = await prisma.employee.findUnique({
          where: { id: currMgrIdForEmail },
          select: { email: true, managerId: true },
        });
        if (managerEmp?.email) {
          emailRecipients.unshift(managerEmp.email);
        }
        currMgrIdForEmail = managerEmp?.managerId ?? null;
      }
      emailRecipients = Array.from(new Set(emailRecipients.map((e) => e.toLowerCase())));

      for (const recipientEmail of emailRecipients) {
        await sendLeaveWithdrawalEmail(
          recipientEmail,
          employeeName,
          request.leaveType.name,
          days,
          startDateStr,
          endDateStr
        );
      }

      await sendLeaveGoogleChatNotification(
        employeeName,
        request.leaveType.name,
        days,
        startDateStr,
        endDateStr,
        request.reason,
        true
      );

      const { exportDbToGoogleSheetsOnly } = await import("@/lib/googleSheets");
      exportDbToGoogleSheetsOnly().catch((err) => console.error("[Google Sheets Export]", err));
    } catch (notifErr) {
      console.error("[Leave Withdrawal Notifications]", notifErr);
    }

    return NextResponse.json({ request: updatedRequest });
  } catch (error: unknown) {
    console.error("[LEAVE WITHDRAW POST]", error);
    const errMsg = error instanceof Error ? error.message : "Failed to withdraw leave request.";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
