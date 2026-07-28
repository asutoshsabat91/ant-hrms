import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { breakdownFromCTC } from "@/lib/utils/payrollEngine";
import { addDays, subDays } from "date-fns";
import { z } from "zod";
import type { TaskCategory } from "@prisma/client";
import bcrypt from "bcryptjs";
import { sendOnboardingEmail } from "@/lib/mail";
import { appendEmployeeToSheet } from "@/lib/googleSheets";
import { createOfferLetterFromTemplate } from "@/lib/googleDocs";
import { sendGoogleChatNotification } from "@/lib/googleChat";

const onboardingSchema = z.object({
  mode: z.enum(["invite", "complete", "direct"]).optional(),
  employeeDbId: z.string().optional(), // Used for complete mode
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  personalEmail: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  currentAddress: z.string().optional(),
  permanentAddress: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  profilePhoto: z.string().optional(),
  designation: z.string().min(1),
  jobRole: z.string().optional(),
  departmentId: z.string(),
  managerId: z.string().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "INTERN", "CONTRACT"]),
  joiningDate: z.string(),
  ctc: z.number().optional(),
  variablePay: z.number().optional(),
  templateId: z.string().optional(),
});

const DEFAULT_TASKS: Array<{
  title: string; category: TaskCategory; assignedTo: string;
  dueDaysFrom: number; order: number; isRequired: boolean;
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

export async function GET() {
  const session = await auth();
  if (!session?.user || !["ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get pending hires who have filled personal details but not finished wizard setup
  const pendingHires = await prisma.employee.findMany({
    where: {
      status: "ONBOARDING",
      personalDetailsFilled: true,
      onboardingWizardCompleted: false,
    },
    include: {
      department: true,
      manager: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(pendingHires);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !["ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isChandrita = session.user.email?.toLowerCase() === "chandrita@theantbox.com";
  const body = await req.json();
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  if (isChandrita) {
    delete data.ctc;
    delete data.variablePay;
  }
  const count = await prisma.employee.count();
  const employeeId = `ANT-${String(count + 1).padStart(3, "0")}`;
  const joiningDate = new Date(data.joiningDate);
  const compensation = data.ctc ? breakdownFromCTC(data.ctc, data.employmentType) : null;

  // Resolve template tasks — gracefully fall back to built-ins
  let templateTasks = DEFAULT_TASKS;
  const templateSource = data.templateId
    ? await prisma.onboardingTemplate.findUnique({ where: { id: data.templateId }, include: { tasks: { orderBy: { order: "asc" } } } })
    : await prisma.onboardingTemplate.findFirst({ where: { isDefault: true }, include: { tasks: { orderBy: { order: "asc" } } } });

  if (templateSource?.tasks?.length) {
    templateTasks = templateSource.tasks.map((t) => ({
      title: t.title, category: t.category, assignedTo: t.assignedTo ?? "HR",
      dueDaysFrom: t.dueDaysFrom, order: t.order, isRequired: t.isRequired,
    }));
  }

  try {
    if (data.mode === "complete" && data.employeeDbId) {
      // Complete onboarding wizard for an existing employee
      const existingEmployee = await prisma.employee.findUnique({
        where: { id: data.employeeDbId },
        include: { user: true },
      });

      if (!existingEmployee) {
        return NextResponse.json({ error: "Employee not found." }, { status: 404 });
      }

      const updated = await prisma.employee.update({
        where: { id: data.employeeDbId },
        data: {
          designation: data.designation,
          departmentId: data.departmentId,
          managerId: data.managerId || undefined,
          employmentType: data.employmentType,
          joiningDate,
          probationEnds: addDays(joiningDate, 90),
          ctc: data.ctc,
          basicSalary: compensation?.basicSalary,
          hra: compensation?.hra,
          specialAllowance: compensation?.specialAllowance,
          onboardingWizardCompleted: true,
        },
        include: { department: true, manager: true },
      });

      // Update User role if employment type dictates it
      await prisma.user.update({
        where: { id: existingEmployee.userId },
        data: {
          role: "EMPLOYEE",
        },
      });

      // Re-initialize tasks for this employee based on the final template details if they don't have tasks
      const taskCount = await prisma.onboardingTask.count({ where: { employeeId: updated.id } });
      if (taskCount === 0) {
        await prisma.onboardingTask.createMany({
          data: templateTasks.map((task) => ({
            employeeId: updated.id,
            title: task.title,
            category: task.category,
            assignedTo: task.assignedTo,
            dueDate: task.dueDaysFrom >= 0
              ? addDays(joiningDate, task.dueDaysFrom)
              : subDays(joiningDate, Math.abs(task.dueDaysFrom)),
            order: task.order,
            isRequired: task.isRequired,
          })),
        });
      }

      // Notify employee that their job profile is updated
      await prisma.notification.create({
        data: {
          userId: existingEmployee.userId,
          type: "ONBOARDING_TASK" as const,
          title: "Onboarding Wizard Setup Finalized",
          body: "Your HR setup and salary structure have been finalized by the administrator.",
          link: `/portal`,
        },
      });

      return NextResponse.json({ employee: updated }, { status: 200 });
    }

    if (data.mode === "invite") {
      // Onboarding initiation pipeline (Invite mode)
      if (!data.firstName || !data.lastName || !data.email) {
        return NextResponse.json({ error: "firstName, lastName and email are required for inviting an employee" }, { status: 400 });
      }

      const tempPassword = "AntBox@2025";
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      const result = await prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({ where: { email: data.email!.toLowerCase() } });
        if (existingUser) throw new Error(`User with email ${data.email} already exists.`);

        const user = await tx.user.create({
          data: {
            email: data.email!.toLowerCase(),
            passwordHash,
            role: "EMPLOYEE",
            isActive: true,
          },
        });

        const employee = await tx.employee.create({
          data: {
            userId: user.id,
            firstName: data.firstName!,
            lastName: data.lastName!,
            email: data.email!.toLowerCase(),
            personalEmail: data.personalEmail || null,
            employeeId,
            designation: data.designation,
            jobRole: data.jobRole || undefined,
            departmentId: data.departmentId,
            managerId: data.managerId || undefined,
            employmentType: data.employmentType,
            status: "ONBOARDING",
            joiningDate,
            probationEnds: addDays(joiningDate, 90),
            personalDetailsFilled: false,
            onboardingWizardCompleted: false,
          },
          include: { department: true, manager: true },
        });

        // Pre-create onboarding tasks
        await tx.onboardingTask.createMany({
          data: templateTasks.map((task) => ({
            employeeId: employee.id,
            title: task.title,
            category: task.category,
            assignedTo: task.assignedTo,
            dueDate: task.dueDaysFrom >= 0
              ? addDays(joiningDate, task.dueDaysFrom)
              : subDays(joiningDate, Math.abs(task.dueDaysFrom)),
            order: task.order,
            isRequired: task.isRequired,
          })),
        });

        // Notify admins
        const admins = await tx.user.findMany({ where: { role: { in: ["ADMIN"] } } });
        await tx.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            type: "ONBOARDING_TASK" as const,
            title: "New Hire Onboarding Invited",
            body: `${data.firstName} ${data.lastName} (${employeeId}) invited to complete onboarding.`,
            link: `/onboarding/${employee.id}`,
          })),
        });

        // Notify employee
        await tx.notification.create({
          data: {
            userId: user.id,
            type: "ONBOARDING_TASK" as const,
            title: "Welcome to AntBox! Fill in your details",
            body: "Please click here to fill in your personal information and complete your onboarding.",
            link: `/portal`,
          },
        });

        return employee;
      });

      let pdfBuffer: Buffer | undefined;
      try {
        const offerRes = await createOfferLetterFromTemplate({
          candidateName: `${data.firstName} ${data.lastName}`,
          email: data.personalEmail || data.email,
          designation: data.designation,
          salary: data.ctc || 0,
          joiningDate: data.joiningDate,
        });
        if (offerRes.success && offerRes.pdfBuffer) {
          pdfBuffer = offerRes.pdfBuffer;
        }
      } catch (docErr) {
        console.error("[Google Docs] Failed to build offer letter attachment", docErr);
      }

      // Send the welcome email with credentials to personalEmail (fallback to work email if personal not provided)
      const targetEmail = data.personalEmail || data.email;
      await sendOnboardingEmail(targetEmail, data.email.toLowerCase(), tempPassword, data.firstName, pdfBuffer);

      // Sync with Google Sheets
      await appendEmployeeToSheet(result);

      try {
        await sendGoogleChatNotification(
          `✉️ *Offer Letter Generated* ✉️\n\n` +
          `An offer letter has been sent to candidate *${data.firstName} ${data.lastName}*! \n` +
          `• *Designation:* ${data.designation}\n` +
          `• *CTC:* ₹${data.ctc || 0}\n` +
          `• *Joining Date:* ${new Date(data.joiningDate).toLocaleDateString()}`
        );
      } catch (chatErr) {
        console.error("[Google Chat] Offer notification failed", chatErr);
      }

      return NextResponse.json({ employee: result }, { status: 201 });
    }

    // Direct mode (default)
    if (!data.firstName || !data.lastName || !data.email) {
      return NextResponse.json({ error: "firstName, lastName and email are required" }, { status: 400 });
    }

    const tempPassword = "AntBox@2025";
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const result = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { email: data.email!.toLowerCase() } });
      if (existingUser) throw new Error(`User with email ${data.email} already exists.`);

      const user = await tx.user.create({
        data: {
          email: data.email!.toLowerCase(),
          passwordHash,
          role: "EMPLOYEE",
          isActive: true,
        },
      });

      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          firstName: data.firstName!,
          lastName: data.lastName!,
          email: data.email!.toLowerCase(),
          personalEmail: data.personalEmail || undefined,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          gender: data.gender,
          bloodGroup: data.bloodGroup,
          address: data.currentAddress ?? data.address,
          permanentAddress: data.permanentAddress,
          city: data.city,
          state: data.state ?? "Odisha",
          pincode: data.pincode,
          emergencyContact: data.emergencyContact,
          emergencyPhone: data.emergencyPhone,
          profilePhoto: data.profilePhoto,
          employeeId,
          designation: data.designation,
          jobRole: data.jobRole || undefined,
          departmentId: data.departmentId,
          managerId: data.managerId || undefined,
          employmentType: data.employmentType,
          status: "ONBOARDING",
          joiningDate,
          probationEnds: addDays(joiningDate, 90),
          ctc: data.ctc,
          basicSalary: compensation?.basicSalary,
          hra: compensation?.hra,
          specialAllowance: compensation?.specialAllowance,
          pf: 0,
          personalDetailsFilled: true,
          onboardingWizardCompleted: true,
        },
        include: { department: true, manager: true },
      });

      await tx.onboardingTask.createMany({
        data: templateTasks.map((task) => ({
          employeeId: employee.id,
          title: task.title,
          category: task.category,
          assignedTo: task.assignedTo,
          dueDate: task.dueDaysFrom >= 0
            ? addDays(joiningDate, task.dueDaysFrom)
            : subDays(joiningDate, Math.abs(task.dueDaysFrom)),
          order: task.order,
          isRequired: task.isRequired,
        })),
      });

      // Notify admins
      const admins = await tx.user.findMany({ where: { role: { in: ["ADMIN"] } } });
      await tx.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: "ONBOARDING_TASK" as const,
          title: "New Hire Onboarding Started",
          body: `${data.firstName} ${data.lastName} (${employeeId}) added to onboarding pipeline.`,
          link: `/onboarding/${employee.id}`,
        })),
      });

      // Notify the employee
      await tx.notification.create({
        data: {
          userId: user.id,
          type: "ONBOARDING_TASK" as const,
          title: "Welcome to AntBox! Complete your onboarding",
          body: "Please upload your ID documents and certificates to proceed with onboarding.",
          link: `/onboarding/${employee.id}`,
        },
      });

      return employee;
    });

    let pdfBuffer: Buffer | undefined;
    try {
      const offerRes = await createOfferLetterFromTemplate({
        candidateName: `${data.firstName} ${data.lastName}`,
        email: data.personalEmail || data.email,
        designation: data.designation,
        salary: data.ctc || 0,
        joiningDate: data.joiningDate,
      });
      if (offerRes.success && offerRes.pdfBuffer) {
        pdfBuffer = offerRes.pdfBuffer;
      }
    } catch (docErr) {
      console.error("[Google Docs] Failed to build offer letter attachment", docErr);
    }

    // Send the welcome email with credentials to personalEmail (fallback to work email if personal not provided)
    const targetEmail = data.personalEmail || data.email;
    await sendOnboardingEmail(targetEmail, data.email.toLowerCase(), tempPassword, data.firstName, pdfBuffer);

    // Sync with Google Sheets
    await appendEmployeeToSheet(result);

    try {
      await sendGoogleChatNotification(
        `✉️ *Offer Letter Generated* ✉️\n\n` +
        `An offer letter has been sent to candidate *${data.firstName} ${data.lastName}*! \n` +
        `• *Designation:* ${data.designation}\n` +
        `• *CTC:* ₹${data.ctc || 0}\n` +
        `• *Joining Date:* ${new Date(data.joiningDate).toLocaleDateString()}`
      );
    } catch (chatErr) {
      console.error("[Google Chat] Offer notification failed", chatErr);
    }

    const onboardingTasks = await prisma.onboardingTask.findMany({
      where: { employeeId: result.id },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ employee: result, onboardingTasks }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
