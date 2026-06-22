import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendSeparationRequestEmail } from "@/lib/mail";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = session.user.role === "ADMIN";

    if (isAdmin) {
      const separations = await prisma.separation.findMany({
        orderBy: { initiatedAt: "desc" },
        include: { employee: { select: { firstName: true, lastName: true, employeeId: true, designation: true, department: { select: { name: true } } } } },
      });
      return NextResponse.json({ separations });
    }

    const employee = await prisma.employee.findFirst({ where: { userId: session.user.id } });
    if (!employee) return NextResponse.json({ separation: null });

    const separation = await prisma.separation.findUnique({ where: { employeeId: employee.id } });
    return NextResponse.json({ separation });
  } catch (e) {
    console.error("[SEPARATION GET]", e);
    return NextResponse.json({ error: "Failed to fetch separations" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const employee = await prisma.employee.findFirst({ where: { userId: session.user.id } });
    if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const existing = await prisma.separation.findUnique({ where: { employeeId: employee.id } });
    if (existing && ["PENDING", "APPROVED"].includes(existing.status)) {
      return NextResponse.json({ error: "A separation request is already active." }, { status: 400 });
    }

    const { reason } = await req.json();
    if (!reason?.trim()) return NextResponse.json({ error: "Reason is required" }, { status: 400 });

    const noticeDays = employee.employmentType === "INTERN" ? 10 : 60;

    const separation = await prisma.separation.create({
      data: { employeeId: employee.id, reason, status: "PENDING", noticeDays },
    });

    const admins = await prisma.user.findMany({ where: { role: { in: ["ADMIN"] } } });
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: "SEPARATION_REQUEST" as const,
        title: "Resignation Submitted",
        body: `${employee.firstName} ${employee.lastName} has initiated a resignation. Please review.`,
        link: "/separation",
      })),
    });

    try {
      const employeeName = `${employee.firstName} ${employee.lastName}`;
      await sendSeparationRequestEmail(
        employeeName,
        employee.email,
        reason,
        noticeDays
      );
    } catch (mailErr) {
      console.error("Failed to send separation request email", mailErr);
    }

    return NextResponse.json({ separation }, { status: 201 });
  } catch (e) {
    console.error("[SEPARATION POST]", e);
    return NextResponse.json({ error: "Failed to submit separation request" }, { status: 500 });
  }
}
