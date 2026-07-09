import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addDays, subDays } from "date-fns";
import type { TaskCategory, Employee } from "@prisma/client";
import { appendEmployeeToSheet, importEmployeesFromGoogleSheets } from "@/lib/googleSheets";

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

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !["ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isChandrita = session.user.email?.toLowerCase() === "chandrita@theantbox.com";
  const body = await req.json();
  let employeesToProcess = [];

  if (body.source === "google_sheets") {
    const departments = await prisma.department.findMany();
    employeesToProcess = await importEmployeesFromGoogleSheets(departments);
    if (!employeesToProcess.length) {
      return NextResponse.json({ error: "No employee data found in Google Sheets" }, { status: 400 });
    }
  } else {
    employeesToProcess = body.employees;
  }

  if (!Array.isArray(employeesToProcess) || !employeesToProcess.length) {
    return NextResponse.json({ error: "No employees provided" }, { status: 400 });
  }

  if (isChandrita) {
    employeesToProcess = employeesToProcess.map((emp) => {
      const cleaned = { ...(emp as Record<string, unknown>) };
      delete cleaned.ctc;
      delete cleaned.basicSalary;
      delete cleaned.hra;
      delete cleaned.specialAllowance;
      delete cleaned.pf;
      return cleaned;
    });
  }

  try {
    const createdEmployees: Employee[] = [];
    const count = await prisma.employee.count();
    let currentCount = count;

    for (const data of employeesToProcess) {
      if (!data.firstName || !data.lastName || !data.email || !data.designation || !data.departmentId || !data.joiningDate) {
        throw new Error("Missing required fields for one or more employees.");
      }

      let empIdToUse = data.employeeId;
      if (!empIdToUse || empIdToUse === "—") {
        currentCount++;
        empIdToUse = `ANT-${String(currentCount).padStart(3, "0")}`;
      }
      const joiningDate = new Date(data.joiningDate);

      // Resolve template tasks
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

      const result = await prisma.$transaction(async (tx) => {
        const existingUser = await tx.user.findUnique({ where: { email: data.email.toLowerCase() } });
        if (existingUser) throw new Error(`User with email ${data.email} already exists.`);

        const user = await tx.user.create({
          data: {
            email: data.email.toLowerCase(),
            role: "EMPLOYEE",
            isActive: true,
          },
        });

        const employee = await tx.employee.create({
          data: {
            userId: user.id,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email.toLowerCase(),
            employeeId: empIdToUse,
            designation: data.designation,
            departmentId: data.departmentId,
            managerId: data.managerId || undefined,
            employmentType: data.employmentType || "FULL_TIME",
            status: data.status || "ONBOARDING",
            joiningDate,
            probationEnds: addDays(joiningDate, 90),
            personalEmail: (data.personalEmail && data.personalEmail !== "—") ? data.personalEmail : null,
            phone: (data.phone && data.phone !== "—") ? data.phone : null,
            dateOfBirth: (data.dateOfBirth && data.dateOfBirth !== "—") ? new Date(data.dateOfBirth) : null,
            gender: (data.gender && data.gender !== "—") ? data.gender : null,
            bloodGroup: (data.bloodGroup && data.bloodGroup !== "—") ? data.bloodGroup : null,
            permanentAddress: (data.permanentAddress && data.permanentAddress !== "—") ? data.permanentAddress : null,
            city: (data.city && data.city !== "—") ? data.city : null,
            state: (data.state && data.state !== "—") ? data.state : "Odisha",
            pincode: (data.pincode && data.pincode !== "—") ? data.pincode : null,
            emergencyContact: (data.emergencyContact && data.emergencyContact !== "—") ? data.emergencyContact : null,
            emergencyPhone: (data.emergencyPhone && data.emergencyPhone !== "—") ? data.emergencyPhone : null,
            ctc: data.ctc ? parseFloat(data.ctc) : null,
            basicSalary: data.basicSalary ? parseFloat(data.basicSalary) : null,
            hra: data.hra ? parseFloat(data.hra) : null,
            specialAllowance: data.specialAllowance ? parseFloat(data.specialAllowance) : null,
            pf: data.pf ? parseFloat(data.pf) : null,
            professionalTax: data.professionalTax ? parseFloat(data.professionalTax) : 200,
            bankName: (data.bankName && data.bankName !== "—") ? data.bankName : null,
            bankAccountNo: (data.bankAccountNo && data.bankAccountNo !== "—") ? data.bankAccountNo : null,
            ifscCode: (data.ifscCode && data.ifscCode !== "—") ? data.ifscCode : null,
            pan: (data.pan && data.pan !== "—") ? data.pan : null,
            uan: (data.uan && data.uan !== "—") ? data.uan : null,
            personalDetailsFilled: data.personalDetailsFilled === true || data.personalDetailsFilled === "true",
            onboardingWizardCompleted: data.onboardingWizardCompleted === true || data.onboardingWizardCompleted === "true",
          },
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

      createdEmployees.push(result);
      
      // Sync with Google Sheets
      await appendEmployeeToSheet(result);
    }

    // Notify admins in bulk
    const admins = await prisma.user.findMany({ where: { role: { in: ["ADMIN"] } } });
    await prisma.notification.createMany({
      data: admins.flatMap((a) =>
        createdEmployees.map((emp) => ({
          userId: a.id,
          type: "ONBOARDING_TASK" as const,
          title: "New Hire Onboarding Invited (Bulk)",
          body: `${emp.firstName} ${emp.lastName} (${emp.employeeId}) invited to complete onboarding in bulk.`,
          link: `/onboarding/${emp.id}`,
        }))
      ),
    });

    return NextResponse.json({ success: true, count: createdEmployees.length, employees: createdEmployees });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || !["ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { employeeIds, action } = await req.json();
  if (!Array.isArray(employeeIds) || !employeeIds.length) {
    return NextResponse.json({ error: "Invalid employeeIds" }, { status: 400 });
  }

  try {
    if (action === "request_banking") {
      const employees = await prisma.employee.findMany({
        where: { id: { in: employeeIds } },
      });

      const notifications = employees.map((emp) => ({
        userId: emp.userId,
        type: "ONBOARDING_TASK" as const,
        title: "Action Required: Submit Banking Details",
        body: "Your admin has requested your bank details for payroll setup. Please complete Task 2 in your onboarding checklist.",
        link: `/portal`,
      }));

      await prisma.notification.createMany({
        data: notifications,
      });

      return NextResponse.json({ success: true, message: `Successfully requested banking details for ${employees.length} employees.` });
    }

    if (action === "approve_banking") {
      await prisma.onboardingTask.updateMany({
        where: {
          employeeId: { in: employeeIds },
          title: { contains: "Bank" },
        },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      // Also trigger a notification for each employee that banking was approved
      const employees = await prisma.employee.findMany({
        where: { id: { in: employeeIds } },
      });

      await prisma.notification.createMany({
        data: employees.map((emp) => ({
          userId: emp.userId,
          type: "ONBOARDING_TASK" as const,
          title: "Banking Details Approved",
          body: "Your submitted banking details have been approved and saved by the administrator.",
          link: "/portal",
        })),
      });

      return NextResponse.json({ success: true, message: `Successfully approved banking details for selected employees.` });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
