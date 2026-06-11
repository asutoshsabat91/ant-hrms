import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { breakdownFromCTC } from "@/lib/utils/payrollEngine";
import { addDays, subDays } from "date-fns";
import { z } from "zod";

const onboardingSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  personalEmail: z.string().email().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
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
  templateId: z.string().optional(),
});

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
  const compensation = data.ctc ? breakdownFromCTC(data.ctc) : null;
  const templateId = data.templateId ?? "default-intern-template";

  const template = await prisma.onboardingTemplate.findUnique({
    where: { id: templateId },
    include: { tasks: { orderBy: { order: "asc" } } },
  });

  if (!template) {
    return NextResponse.json({ error: "Onboarding template not found" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
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
        personalEmail: data.personalEmail,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        address: data.address,
        city: data.city,
        state: data.state ?? "Odisha",
        pincode: data.pincode,
        emergencyContact: data.emergencyContact,
        emergencyPhone: data.emergencyPhone,
        profilePhoto: data.profilePhoto,
        employeeId,
        designation: data.designation,
        departmentId: data.departmentId,
        managerId: data.managerId,
        employmentType: data.employmentType,
        status: "ONBOARDING",
        joiningDate,
        probationEnds: addDays(joiningDate, 90),
        ctc: data.ctc,
        basicSalary: compensation?.basicSalary,
        hra: compensation?.hra,
        specialAllowance: compensation?.specialAllowance,
        pf: compensation?.pf,
      },
      include: { department: true, manager: true },
    });

    const tasks = template.tasks.map((task) => {
      const dueDate = task.dueDaysFrom >= 0
        ? addDays(joiningDate, task.dueDaysFrom)
        : subDays(joiningDate, Math.abs(task.dueDaysFrom));

      return {
        employeeId: employee.id,
        title: task.title,
        description: task.description,
        category: task.category,
        assignedTo: task.assignedTo,
        dueDate,
        order: task.order,
        isRequired: task.isRequired,
      };
    });

    await tx.onboardingTask.createMany({ data: tasks });

    return employee;
  });

  const onboardingTasks = await prisma.onboardingTask.findMany({
    where: { employeeId: result.id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ employee: result, onboardingTasks }, { status: 201 });
}
