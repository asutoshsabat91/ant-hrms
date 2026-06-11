import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createOffboardingChecklist } from "@/lib/automation/offboarding";
import { z } from "zod";

const initiateSchema = z.object({
  employeeId: z.string().min(1),
  lastWorkingDate: z.string().min(1),
  exitInterviewDate: z.string().optional(),
  reason: z.enum([
    "End of Internship",
    "Voluntary Resignation",
    "Contract End",
    "Termination",
    "PPO Conversion",
    "Other",
  ]),
  notes: z.string().optional(),
  issuesLetters: z.array(z.enum(["Internship Certificate", "Relieving Letter", "Experience Letter", "LOR"])),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !["HR_ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = initiateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { employeeId, lastWorkingDate, exitInterviewDate, reason, notes, issuesLetters } = parsed.data;
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const lastDay = new Date(lastWorkingDate);
  const interviewDate = exitInterviewDate ? new Date(exitInterviewDate) : null;

  const result = await prisma.$transaction(async (tx) => {
    const updatedEmployee = await tx.employee.update({
      where: { id: employeeId },
      data: {
        status: "OFFBOARDING",
        lastWorkingDate: lastDay,
      },
    });

    await createOffboardingChecklist(tx, employeeId, lastDay, issuesLetters, reason, notes, interviewDate);

    await tx.iTTask.createMany({
      data: [
        {
          employeeId,
          taskType: "ACCOUNT_DELETION",
          status: "PENDING",
          details: `Revoke company email and connected accounts for ${employee.firstName} ${employee.lastName}`,
          triggeredBy: "OFFBOARDING",
          assignedTo: "IT Admin",
        },
        {
          employeeId,
          taskType: "DEVICE_RETURN",
          status: "PENDING",
          details: "Collect company laptop / device and confirm return",
          triggeredBy: "OFFBOARDING",
          assignedTo: "IT Admin",
        },
      ],
    });

    return updatedEmployee;
  });

  return NextResponse.json({ message: "Offboarding initiated", employee: result }, { status: 201 });
}
