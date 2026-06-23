import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { TaskStatus } from "@prisma/client";
import { updateEmployeeInSheet } from "@/lib/googleSheets";

const patchSchema = z.object({
  id: z.string(),
  status: z.nativeEnum(TaskStatus).optional(),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId");
  if (!employeeId) {
    return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
  }

  const tasks = await prisma.offboardingTask.findMany({
    where: { employeeId },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(tasks);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updateData: {
    status?: TaskStatus;
    notes?: string | null;
    completedAt?: Date | null;
  } = {};

  if (parsed.data.status) {
    updateData.status = parsed.data.status;
    if (parsed.data.status === "COMPLETED") {
      updateData.completedAt = new Date();
    }
  }
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

  const task = await prisma.offboardingTask.update({
    where: { id: parsed.data.id },
    data: updateData,
  });

  // Check if all offboarding tasks for this employee are now completed/skipped
  const remainingPending = await prisma.offboardingTask.count({
    where: {
      employeeId: task.employeeId,
      status: { notIn: ["COMPLETED", "SKIPPED"] },
    },
  });

  if (remainingPending === 0) {
    const updatedEmployee = await prisma.employee.update({
      where: { id: task.employeeId },
      data: {
        status: "INACTIVE",
        deployedCompany: "Out of System",
      },
    });

    // Sync status update directly to Google Sheet
    await updateEmployeeInSheet(updatedEmployee.employeeId, "INACTIVE", "Out of System");
  }

  return NextResponse.json(task);
}
