import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { firstName, lastName, gender, phone, dateOfBirth, personalEmail } = await req.json();

  if (!firstName || !lastName || !gender || !personalEmail) {
    return NextResponse.json({ error: "firstName, lastName, gender and personalEmail are required" }, { status: 400 });
  }

  // Generate corporate email: first.last@theantbox.com, de-duplicate with suffix
  const base = `${firstName.toLowerCase().replace(/\s+/g, "")}.${lastName.toLowerCase().replace(/\s+/g, "")}`;
  let corpEmail = `${base}@theantbox.com`;
  const existing = await prisma.user.findUnique({ where: { email: corpEmail } });
  if (existing) {
    const count = await prisma.user.count({ where: { email: { startsWith: base } } });
    corpEmail = `${base}${count + 1}@theantbox.com`;
  }

  // Find or create a default department for new joiners
  let dept = await prisma.department.findFirst();
  if (!dept) {
    dept = await prisma.department.create({ data: { name: "General", code: "GEN" } });
  }

  const tempPassword = "AntBox@2025";
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  // Generate employee ID
  const empCount = await prisma.employee.count();
  const employeeId = `ANT-${String(empCount + 100).padStart(3, "0")}`;

  try {
    const user = await prisma.user.create({
      data: {
        email: corpEmail,
        passwordHash,
        role: "INTERN",
        employee: {
          create: {
            firstName,
            lastName,
            email: corpEmail,
            personalEmail,
            phone: phone ?? null,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            gender,
            employeeId,
            designation: "New Joinee",
            departmentId: dept.id,
            employmentType: "INTERN",
            status: "ONBOARDING",
            joiningDate: new Date(),
          },
        },
      },
    });

    return NextResponse.json({
      corporateEmail: corpEmail,
      temporaryPassword: tempPassword,
      userId: user.id,
    }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
