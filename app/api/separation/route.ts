import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "HR_ADMIN";

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
}

export async function POST(req: Request) {
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

  // Notice period depends on employment type
  const noticeDays = employee.employmentType === "INTERN" ? 10 : 60;

  const separation = await prisma.separation.create({
    data: { employeeId: employee.id, reason, status: "PENDING", noticeDays },
  });

  // Notify admins
  const admins = await prisma.user.findMany({ where: { role: { in: ["SUPER_ADMIN", "HR_ADMIN"] } } });
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: "SEPARATION_REQUEST" as const,
      title: "Resignation Submitted",
      body: `${employee.firstName} ${employee.lastName} has initiated a resignation. Please review.`,
      link: "/separation",
    })),
  });

  return NextResponse.json({ separation }, { status: 201 });
}
