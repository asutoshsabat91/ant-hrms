import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { breakdownFromCTC } from "@/lib/utils/payrollEngine";
import { addDays, subDays } from "date-fns";
import { z } from "zod";
import type { TaskCategory } from "@prisma/client";

const onboardingSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
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

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !["HR_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
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
    const result = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { email: data.email.toLowerCase() } });
      if (existingUser) throw new Error(`User with email ${data.email} already exists.`);

      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          role: data.employmentType === "INTERN" ? "INTERN" : "EMPLOYEE",
          isActive: true,
        },
      });

      const employee = await tx.employee.create({
        data: {
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email.toLowerCase(),
          personalEmail: data.personalEmail || undefined,
          phone: data.phone,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          gender: data.gender,
          bloodGroup: data.bloodGroup,
          address: data.currentAddress ?? data.address,
          city: data.city,
          state: data.state ?? "Odisha",
          pincode: data.pincode,
          emergencyContact: data.emergencyContact,
          emergencyPhone: data.emergencyPhone,
          profilePhoto: data.profilePhoto,
          employeeId,
          designation: data.designation,
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

      // Notify all admins
      const admins = await tx.user.findMany({ where: { role: { in: ["SUPER_ADMIN", "HR_ADMIN"] } } });
      await tx.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: "ONBOARDING_TASK" as const,
          title: "New Hire Onboarding Started",
          body: `${data.firstName} ${data.lastName} (${employeeId}) added to onboarding pipeline.`,
          link: `/onboarding/${employee.id}`,
        })),
      });

      // Notify the employee to complete documents (24hr reminder setup handled by daily cron)
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
