import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendOnboardingEmail } from "@/lib/mail";
import { appendEmployeeToSheet } from "@/lib/googleSheets";
import { createOfferLetterFromTemplate } from "@/lib/googleDocs";
import { breakdownFromCTC } from "@/lib/utils/payrollEngine";
import { sendGoogleChatNotification } from "@/lib/googleChat";
import { addDays, subDays } from "date-fns";
import type { TaskCategory } from "@prisma/client";

const DEFAULT_TASKS: Array<{
  title: string;
  category: TaskCategory;
  assignedTo: string;
  dueDaysFrom: number;
  order: number;
  isRequired: boolean;
}> = [
  { title: "Submit Aadhaar / PAN Copy", category: "DOCUMENTATION", assignedTo: "Employee", dueDaysFrom: -3, order: 1, isRequired: true },
  { title: "Submit Bank Account Details", category: "DOCUMENTATION", assignedTo: "Employee", dueDaysFrom: -3, order: 2, isRequired: true },
  { title: "Submit Educational Certificates", category: "DOCUMENTATION", assignedTo: "Employee", dueDaysFrom: -3, order: 3, isRequired: true },
  { title: "Sign NDA & Agreement", category: "DOCUMENTATION", assignedTo: "Employee", dueDaysFrom: 1, order: 4, isRequired: true },
  { title: "Create Company Email", category: "IT_SETUP", assignedTo: "IT Admin", dueDaysFrom: -1, order: 5, isRequired: true },
  { title: "Add to Slack & Notion", category: "IT_SETUP", assignedTo: "IT Admin", dueDaysFrom: 1, order: 6, isRequired: false },
  { title: "Set up GitHub access", category: "IT_SETUP", assignedTo: "IT Admin", dueDaysFrom: 1, order: 7, isRequired: false },
  { title: "Allocate Laptop/Device", category: "ASSET", assignedTo: "IT Admin", dueDaysFrom: 1, order: 8, isRequired: false },
  { title: "Schedule Day 1 Welcome Call", category: "ORIENTATION", assignedTo: "HR", dueDaysFrom: 1, order: 9, isRequired: true },
  { title: "Introduce to Team", category: "ORIENTATION", assignedTo: "HR", dueDaysFrom: 1, order: 10, isRequired: false },
  { title: "Company Culture & Values Session", category: "ORIENTATION", assignedTo: "HR", dueDaysFrom: 2, order: 11, isRequired: false },
  { title: "Complete POSH Training", category: "COMPLIANCE", assignedTo: "HR Admin", dueDaysFrom: 7, order: 12, isRequired: true },
];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !["ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const {
      requestId,
      action, // "APPROVE" or "REJECT"
      designation = "New Joinee",
      departmentId,
      managerId,
      employmentType = "INTERN",
      joiningDate = new Date().toISOString(),
      templateId,
      ctc
    } = await req.json();

    if (!requestId) {
      return NextResponse.json({ error: "requestId is required" }, { status: 400 });
    }

    const requestIds = Array.isArray(requestId) ? requestId : [requestId];
    const results = [];

    for (const reqId of requestIds) {
      const request = await prisma.onboardingRequest.findUnique({
        where: { id: reqId }
      });

      if (!request) {
        if (requestIds.length === 1) {
          return NextResponse.json({ error: `Onboarding request not found: ${reqId}` }, { status: 404 });
        }
        continue;
      }

      if (request.status !== "PENDING") {
        if (requestIds.length === 1) {
          return NextResponse.json({ error: `Request ${reqId} has already been processed` }, { status: 400 });
        }
        continue;
      }

      if (action === "REJECT") {
        await prisma.onboardingRequest.update({
          where: { id: reqId },
          data: { status: "REJECTED" }
        });
        results.push({ id: reqId, status: "REJECTED" });
        continue;
      }

      // Otherwise APPROVE
      let finalDeptId = departmentId;
      if (!finalDeptId) {
        let dept = await prisma.department.findFirst();
        if (!dept) {
          dept = await prisma.department.create({ data: { name: "General", code: "GEN" } });
        }
        finalDeptId = dept.id;
      }

      const loginEmail = request.personalEmail.toLowerCase().trim();

      const tempPassword = crypto.randomBytes(6).toString("hex") + "!";
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      // Generate unique employee ID safely in case of concurrent approvals
      let employeeId = "";
      let attempts = 0;
      while (attempts < 10) {
        const empCount = await prisma.employee.count();
        const candidateId = `ANT-${String(empCount + 100 + attempts).padStart(3, "0")}`;
        const exists = await prisma.employee.findUnique({ where: { employeeId: candidateId } });
        if (!exists) {
          employeeId = candidateId;
          break;
        }
        attempts++;
      }
      if (!employeeId) {
        employeeId = `ANT-${Date.now().toString().slice(-6)}`;
      }

      const compensation = ctc ? breakdownFromCTC(ctc, employmentType) : null;
      const parsedJoiningDate = new Date(joiningDate);

      // Create User and Employee
      const user = await prisma.user.create({
        data: {
          email: loginEmail,
          passwordHash,
          role: "EMPLOYEE",
          employee: {
            create: {
              firstName: request.firstName,
              lastName: request.lastName,
              email: loginEmail,
              personalEmail: request.personalEmail,
              phone: request.phone,
              dateOfBirth: request.dateOfBirth,
              gender: request.gender,
              employeeId,
              designation,
              departmentId: finalDeptId,
              managerId: managerId || undefined,
              employmentType,
              status: "ONBOARDING",
              joiningDate: parsedJoiningDate,
              probationEnds: addDays(parsedJoiningDate, 90),
              ctc,
              basicSalary: compensation?.basicSalary,
              hra: compensation?.hra,
              specialAllowance: compensation?.specialAllowance,
              personalDetailsFilled: true,
              onboardingWizardCompleted: true
            }
          }
        },
        include: { employee: true }
      });

      const employee = user.employee!;

      // Resolve onboarding tasks
      let templateTasks = DEFAULT_TASKS;
      const templateSource = templateId
        ? await prisma.onboardingTemplate.findUnique({ where: { id: templateId }, include: { tasks: { orderBy: { order: "asc" } } } })
        : await prisma.onboardingTemplate.findFirst({ where: { isDefault: true }, include: { tasks: { orderBy: { order: "asc" } } } });

      if (templateSource?.tasks?.length) {
        templateTasks = templateSource.tasks.map((t) => ({
          title: t.title,
          category: t.category,
          assignedTo: t.assignedTo ?? "HR",
          dueDaysFrom: t.dueDaysFrom,
          order: t.order,
          isRequired: t.isRequired,
        }));
      }

      // Populate tasks
      const taskData = templateTasks.map((t) => {
        const dueDate = t.dueDaysFrom >= 0
          ? addDays(parsedJoiningDate, t.dueDaysFrom)
          : subDays(parsedJoiningDate, Math.abs(t.dueDaysFrom));
        return {
          employeeId: employee.id,
          title: t.title,
          category: t.category,
          assignedTo: t.assignedTo,
          dueDate,
          isRequired: t.isRequired,
          order: t.order,
          status: "PENDING" as const,
        };
      });

      await prisma.onboardingTask.createMany({ data: taskData });

      // Update status in onboarding request
      await prisma.onboardingRequest.update({
        where: { id: reqId },
        data: { status: "APPROVED" }
      });

      let pdfBuffer: Buffer | undefined;
      try {
        const offerRes = await createOfferLetterFromTemplate({
          candidateName: `${request.firstName} ${request.lastName}`,
          email: request.personalEmail,
          designation,
          salary: ctc || 0,
          joiningDate: parsedJoiningDate.toISOString(),
        });
        if (offerRes.success && offerRes.pdfBuffer) {
          pdfBuffer = offerRes.pdfBuffer;
        }
      } catch (docErr) {
        console.error("[Google Docs] Failed to build offer letter attachment", docErr);
      }

      // Send welcome email with credentials to personalEmail
      await sendOnboardingEmail(request.personalEmail, loginEmail, tempPassword, request.firstName, pdfBuffer);

      try {
        await appendEmployeeToSheet({
          employeeId,
          firstName: request.firstName,
          lastName: request.lastName,
          email: loginEmail,
          designation,
          joiningDate: parsedJoiningDate,
          status: "ONBOARDING",
        });
      } catch (sheetErr) {
        console.error("[Google Sheets] Sync failed during approval", sheetErr);
      }

      try {
        await sendGoogleChatNotification(
          `🎉 *New Team Member Announcement!* 🎉\n\n` +
          `Please join us in welcoming *${request.firstName} ${request.lastName}* to the team! \n` +
          `• *Designation:* ${designation}\n` +
          `• *Email:* ${loginEmail}\n` +
          `• *Joining Date:* ${parsedJoiningDate.toLocaleDateString()}`
        );
      } catch (chatErr) {
        console.error("[Google Chat] Onboarding welcome notification failed", chatErr);
      }

      results.push({
        id: reqId,
        status: "APPROVED",
        corporateEmail: loginEmail,
        temporaryPassword: tempPassword,
        employeeId
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${results.length} onboarding request(s).`,
      results
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
