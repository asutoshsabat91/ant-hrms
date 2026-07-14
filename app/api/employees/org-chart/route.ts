import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        designation: true,
        managerId: true,
        profilePhoto: true,
        status: true,
        department: {
          select: {
            name: true,
          },
        },
      },
      where: {
        status: {
          in: ["ACTIVE", "ONBOARDING", "OFFBOARDING"],
        },
      },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error("[ORG_CHART_GET]", error);
    return NextResponse.json({ error: "Failed to fetch org structure" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email?.toLowerCase() || "";
    const isRitesh = email === "ritesh@theantbox.com";
    const isChandrita = email === "chandrita@theantbox.com";
    const isSuperAdmin = (session.user.role === "ADMIN") && !isRitesh;
    const canEdit = isSuperAdmin || isChandrita;

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden: Super Admin or HR Admin access only" }, { status: 403 });
    }

    const { employeeId, managerId } = await req.json();

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    // Prevent circular reference: an employee cannot report to themselves
    if (employeeId === managerId) {
      return NextResponse.json({ error: "An employee cannot report to themselves" }, { status: 400 });
    }

    // Verify manager exists if provided
    if (managerId) {
      const managerExists = await prisma.employee.findUnique({
        where: { id: managerId },
      });
      if (!managerExists) {
        return NextResponse.json({ error: "Selected manager does not exist" }, { status: 404 });
      }

      // Prevent simple circular references (e.g. A reports to B, B reports to A)
      // Check if the new manager reports to the employee directly or indirectly
      let currentManagerId = managerExists.managerId;
      while (currentManagerId) {
        if (currentManagerId === employeeId) {
          return NextResponse.json({ error: "Circular reporting hierarchy detected" }, { status: 400 });
        }
        const nextManager = await prisma.employee.findUnique({
          where: { id: currentManagerId },
          select: { managerId: true },
        });
        currentManagerId = nextManager?.managerId || null;
      }
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        managerId: managerId || null,
      },
    });

    return NextResponse.json(updatedEmployee);
  } catch (error) {
    console.error("[ORG_CHART_PUT]", error);
    return NextResponse.json({ error: "Failed to update reporting line" }, { status: 500 });
  }
}
