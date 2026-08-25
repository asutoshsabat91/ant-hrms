import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendSeparationRequestEmail } from "@/lib/mail";
import { sendGoogleChatNotification } from "@/lib/googleChat";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = session.user.role === "ADMIN";
    const isCompanyAdmin = session.user.role === "COMPANY_ADMIN";
    const managedCompany = session.user.managedCompany;

    if (isAdmin) {
      const separations = await prisma.separation.findMany({
        orderBy: { initiatedAt: "desc" },
        include: { employee: { select: { firstName: true, lastName: true, employeeId: true, designation: true, department: { select: { name: true } } } } },
      });
      return NextResponse.json({ separations });
    }

    if (isCompanyAdmin && managedCompany) {
      const separations = await prisma.separation.findMany({
        where: {
          employee: { deployedCompany: managedCompany },
        },
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

    const { reason, employeeId } = await req.json();

    const isCompanyAdmin = session.user.role === "COMPANY_ADMIN";
    const managedCompany = session.user.managedCompany;

    let targetEmployee;
    if (isCompanyAdmin && managedCompany) {
      if (!employeeId) {
        return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
      }
      targetEmployee = await prisma.employee.findFirst({
        where: { id: employeeId, deployedCompany: managedCompany }
      });
      if (!targetEmployee) {
        return NextResponse.json({ error: "Employee not found in your company" }, { status: 404 });
      }
    } else {
      targetEmployee = await prisma.employee.findFirst({ where: { userId: session.user.id } });
      if (!targetEmployee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const existing = await prisma.separation.findUnique({ where: { employeeId: targetEmployee.id } });
    if (existing && ["PENDING", "APPROVED"].includes(existing.status)) {
      return NextResponse.json({ error: "A separation request is already active." }, { status: 400 });
    }

    if (!reason?.trim()) return NextResponse.json({ error: "Reason is required" }, { status: 400 });

    const noticeDays = targetEmployee.employmentType === "INTERN" ? 10 : 60;

    const separation = await prisma.separation.create({
      data: { employeeId: targetEmployee.id, reason, status: "PENDING", noticeDays },
    });

    const admins = await prisma.user.findMany({ where: { role: { in: ["ADMIN"] } } });
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: "SEPARATION_REQUEST" as const,
        title: "Resignation Submitted",
        body: `${targetEmployee.firstName} ${targetEmployee.lastName} has initiated a resignation. Please review.`,
        link: "/separation",
      })),
    });

    try {
      const employeeName = `${targetEmployee.firstName} ${targetEmployee.lastName}`;
      await sendSeparationRequestEmail(
        employeeName,
        targetEmployee.email,
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
