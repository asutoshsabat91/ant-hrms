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
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isCompanyAdmin = session.user.role === "COMPANY_ADMIN";
    const managedCompany = session.user.managedCompany;

    let whereClause = {};
    if (isCompanyAdmin && managedCompany) {
      whereClause = { deployedCompany: managedCompany };
    }

    let employees = await prisma.employee.findMany({
      where: whereClause,
      include: { department: true },
      orderBy: { createdAt: "desc" },
    });

    if (session.user.email?.toLowerCase() === "chandrita@theantbox.com") {
      employees = employees.map((emp) => {
        const cleaned = { ...emp } as Record<string, unknown>;
        delete cleaned.ctc;
        delete cleaned.basicSalary;
        delete cleaned.hra;
        delete cleaned.specialAllowance;
        delete cleaned.pf;
        return cleaned;
      }) as typeof employees;
    }

    return NextResponse.json(employees);
  } catch (e) {
    console.error("[EMPLOYEES GET]", e);
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const isChandrita = session.user.email?.toLowerCase() === "chandrita@theantbox.com";
    const data = parsed.data;
    if (isChandrita) {
      delete data.ctc;
    }

    const count = await prisma.employee.count();
    const employeeId = `ANT-${String(count + 1).padStart(3, "0")}`;
    const joiningDate = new Date(data.joiningDate);
    const compensation = data.ctc ? breakdownFromCTC(data.ctc) : null;
    const tempPassword = data.password ?? "AntBox@2025";
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: data.email.toLowerCase(), passwordHash, role: "EMPLOYEE" },
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
  } catch (e) {
    console.error("[EMPLOYEES POST]", e);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}

const updateSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  designation: z.string().min(1).optional(),
  deployedCompany: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  personalEmail: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  bloodGroup: z.string().nullable().optional(),
  permanentAddress: z.string().nullable().optional(),
  emergencyContact: z.string().nullable().optional(),
  emergencyPhone: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  bankAccountNo: z.string().nullable().optional(),
  ifscCode: z.string().nullable().optional(),
  pan: z.string().nullable().optional(),
  uan: z.string().nullable().optional(),
  ctc: z.number().nullable().optional(),
});

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden. Admin only." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const isChandrita = session.user.email?.toLowerCase() === "chandrita@theantbox.com";
    const { id, ...data } = parsed.data;

    if (isChandrita) {
      delete data.ctc;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatePayload: any = { ...data };
    if (data.ctc !== undefined) {
      if (data.ctc) {
        const comp = breakdownFromCTC(data.ctc);
        updatePayload.ctc = data.ctc;
        updatePayload.basicSalary = comp.basicSalary;
        updatePayload.hra = comp.hra;
        updatePayload.specialAllowance = comp.specialAllowance;
        updatePayload.pf = comp.pf;
      } else {
        updatePayload.ctc = null;
        updatePayload.basicSalary = null;
        updatePayload.hra = null;
        updatePayload.specialAllowance = null;
        updatePayload.pf = null;
      }
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: updatePayload,
    });

    // Automatically sync back to Google Sheets to keep sheet updated in real time!
    try {
      const { syncGoogleSheetsWithDb } = await import("@/lib/googleSheets");
      await syncGoogleSheetsWithDb();
    } catch (sheetErr) {
      console.error("[Google Sheets] Sync failed during profile update:", sheetErr);
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[EMPLOYEES PUT]", e);
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}
