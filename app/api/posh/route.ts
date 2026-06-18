import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN";

  if (isAdmin) {
    const reports = await prisma.pOSHReport.findMany({
      orderBy: { createdAt: "desc" },
      include: { employee: { select: { firstName: true, lastName: true, employeeId: true } } },
    });
    return NextResponse.json({ reports });
  }

  // Employees only see their own reports
  const employee = await prisma.employee.findFirst({ where: { userId: session.user.id } });
  if (!employee) return NextResponse.json({ reports: [] });

  const reports = await prisma.pOSHReport.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ reports });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employee = await prisma.employee.findFirst({ where: { userId: session.user.id } });
  if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  if (employee.gender?.toUpperCase() !== "FEMALE") {
    return NextResponse.json({ error: "POSH reporting is available only to female employees" }, { status: 403 });
  }

  const { subject, description } = await req.json();
  if (!subject?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Subject and description are required" }, { status: 400 });
  }

  const report = await prisma.pOSHReport.create({
    data: { employeeId: employee.id, subject, description },
  });

  // Notify HR admins privately
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN"] } },
  });
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: "POSH_REPORT" as const,
      title: "Confidential: New POSH Report",
      body: "A female employee has submitted a POSH report. Please review it urgently.",
      link: "/posh",
    })),
  });

  return NextResponse.json({ report }, { status: 201 });
}
