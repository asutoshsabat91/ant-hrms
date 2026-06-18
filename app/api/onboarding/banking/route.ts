import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId, bankName, bankAccountNo, ifscCode, pan, uan } = await req.json();

  // Employee can only update their own banking details; admin can update any
  const isAdmin = session.user.role === "ADMIN";
  const emp = await prisma.employee.findUnique({ where: { id: employeeId }, include: { user: true } });
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  if (!isAdmin && emp.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: { bankName, bankAccountNo, ifscCode, pan, uan },
  });

  // Mark banking task as completed in onboarding tasks
  await prisma.onboardingTask.updateMany({
    where: { employeeId, title: { contains: "Bank" } },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  // Notify admins that banking details submitted
  const admins = await prisma.user.findMany({ where: { role: { in: ["ADMIN"] } } });
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: "ONBOARDING_TASK" as const,
      title: "Banking Details Submitted",
      body: `${emp.firstName} ${emp.lastName} has submitted their banking details for payroll setup.`,
      link: `/onboarding/${employeeId}`,
    })),
  });

  return NextResponse.json({ employee: updated });
}
