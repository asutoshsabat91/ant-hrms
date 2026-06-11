import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { breakdownFromCTC } from "@/lib/utils/payrollEngine";
import { addMonths } from "date-fns";

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  designation: z.string().min(1),
  departmentId: z.string(),
  managerId: z.string().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "INTERN", "CONTRACT"]),
  joiningDate: z.string(),
  ctc: z.number().optional(),
  password: z.string().min(6).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employees = await prisma.employee.findMany({
    include: { department: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(employees);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !["HR_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const count = await prisma.employee.count();
  const employeeId = `ANT-${String(count + 1).padStart(3, "0")}`;
  const joiningDate = new Date(data.joiningDate);
  const compensation = data.ctc ? breakdownFromCTC(data.ctc) : null;
  const tempPassword = data.password ?? "AntBox@2025";
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.employmentType === "INTERN" ? "INTERN" : "EMPLOYEE",
      },
    });

    const employee = await tx.employee.create({
      data: {
        userId: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        phone: data.phone,
        employeeId,
        designation: data.designation,
        departmentId: data.departmentId,
        managerId: data.managerId,
        employmentType: data.employmentType,
        status: "ONBOARDING",
        joiningDate,
        probationEnds: addMonths(joiningDate, 3),
        ctc: data.ctc,
        basicSalary: compensation?.basicSalary,
        hra: compensation?.hra,
        specialAllowance: compensation?.specialAllowance,
        pf: compensation?.pf,
      },
      include: { department: true },
    });

    return employee;
  });

  return NextResponse.json(result, { status: 201 });
}
