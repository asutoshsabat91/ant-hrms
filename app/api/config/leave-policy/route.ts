import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { EmploymentType } from "@prisma/client";

const leaveTypeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  code: z.string().min(2, "Code is required").toUpperCase(),
  daysPerYear: z.number().int().nonnegative("Days must be non-negative"),
  accrual: z.enum(["ANNUAL", "QUARTERLY", "MONTHLY", "NONE"]),
  priorNoticeHours: z.number().int().nonnegative("Notice hours must be non-negative"),
  applicableTo: z.array(z.enum(["FULL_TIME", "PART_TIME", "INTERN", "CONTRACT"])),
  isPaid: z.boolean().default(true),
});

// Create a new Leave Type
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Super Admin only." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = leaveTypeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, code, daysPerYear, accrual, priorNoticeHours, applicableTo, isPaid } = parsed.data;

    // Check for duplicate code
    const existing = await prisma.leaveType.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: `A leave type with code "${code}" already exists.` }, { status: 400 });
    }

    const leaveType = await prisma.leaveType.create({
      data: {
        name,
        code,
        daysPerYear,
        accrual,
        priorNoticeHours,
        applicableTo: applicableTo as EmploymentType[],
        isPaid,
      },
    });

    return NextResponse.json({ success: true, leaveType }, { status: 201 });
  } catch (e: unknown) {
    console.error("[LEAVE_POLICY_POST]", e);
    return NextResponse.json({ error: "Failed to create leave type" }, { status: 500 });
  }
}

// Update an existing Leave Type
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Super Admin only." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = leaveTypeSchema.extend({ id: z.string().min(1) }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { id, name, code, daysPerYear, accrual, priorNoticeHours, applicableTo, isPaid } = parsed.data;

    // Check if leave type exists
    const current = await prisma.leaveType.findUnique({ where: { id } });
    if (!current) {
      return NextResponse.json({ error: "Leave type not found." }, { status: 404 });
    }

    // Check code duplication if updated
    if (current.code !== code) {
      const duplicate = await prisma.leaveType.findUnique({ where: { code } });
      if (duplicate) {
        return NextResponse.json({ error: `A leave type with code "${code}" already exists.` }, { status: 400 });
      }
    }

    const leaveType = await prisma.leaveType.update({
      where: { id },
      data: {
        name,
        code,
        daysPerYear,
        accrual,
        priorNoticeHours,
        applicableTo: applicableTo as EmploymentType[],
        isPaid,
      },
    });

    return NextResponse.json({ success: true, leaveType });
  } catch (e: unknown) {
    console.error("[LEAVE_POLICY_PUT]", e);
    return NextResponse.json({ error: "Failed to update leave type" }, { status: 500 });
  }
}

// Delete a Leave Type
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Super Admin only." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing leave type ID parameter" }, { status: 400 });
    }

    // Check if referenced by leave requests or balances
    const [requestCount, balanceCount] = await Promise.all([
      prisma.leaveRequest.count({ where: { leaveTypeId: id } }),
      prisma.leaveBalance.count({ where: { leaveTypeId: id } }),
    ]);

    if (requestCount > 0 || balanceCount > 0) {
      return NextResponse.json({
        error: "Cannot delete this leave type because it is already associated with existing employee leave requests or balances. Please update its applicability instead.",
      }, { status: 400 });
    }

    await prisma.leaveType.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error("[LEAVE_POLICY_DELETE]", e);
    return NextResponse.json({ error: "Failed to delete leave type" }, { status: 500 });
  }
}
