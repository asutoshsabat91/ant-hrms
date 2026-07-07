import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { syncEmployeePayrollForDate } from "@/lib/utils/payrollEngine";

function sumWorkedHours(punches: { punchType: "IN" | "OUT"; punchedAt: Date }[]) {
  let totalMs = 0;
  let openIn: Date | null = null;

  for (const punch of punches) {
    if (punch.punchType === "IN") {
      openIn = punch.punchedAt;
    } else if (openIn) {
      totalMs += punch.punchedAt.getTime() - openIn.getTime();
      openIn = null;
    }
  }

  return Math.round((totalMs / 3600000) * 100) / 100;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !["ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { action, comment } = await req.json();

  try {
    const request = await prisma.regularizationRequest.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (request.status !== "PENDING") {
      return NextResponse.json({ error: "Request has already been processed" }, { status: 400 });
    }

    if (action === "reject") {
      const updated = await prisma.regularizationRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          approverId: session.user.id,
          approvedAt: new Date(),
        },
      });

      await prisma.notification.create({
        data: {
          userId: request.employee.userId,
          type: "ATTENDANCE_ALERT" as const,
          title: "Regularization Request Rejected",
          body: `Your regularization request for ${new Date(request.date).toDateString()} was not approved.${comment ? ` Reason: ${comment}` : ""}`,
          link: "/attendance",
        },
      });

      return NextResponse.json({ success: true, request: updated });
    }

    if (action === "approve") {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Update request status
        const updatedRequest = await tx.regularizationRequest.update({
          where: { id },
          data: {
            status: "APPROVED",
            approverId: session.user.id,
            approvedAt: new Date(),
          },
        });

        const workDate = new Date(request.date);

        // 2. Create or find AttendanceRecord
        const record = await tx.attendanceRecord.upsert({
          where: {
            employeeId_workDate: {
              employeeId: request.employeeId,
              workDate,
            },
          },
          create: {
            employeeId: request.employeeId,
            workDate,
            status: request.type === "LEAVE" ? "LEAVE" : request.type === "REMOTE" ? "REMOTE" : "PRESENT",
          },
          update: {
            status: request.type === "LEAVE" ? "LEAVE" : request.type === "REMOTE" ? "REMOTE" : "PRESENT",
          },
        });

        // 3. Handle punch logging for CLOCK_IN / CLOCK_OUT / BOTH
        if (["CLOCK_IN", "CLOCK_OUT", "BOTH"].includes(request.type)) {
          // Clean existing punches for this date to avoid overlaps/conflicts if they regularized BOTH
          if (request.type === "BOTH") {
            await tx.attendancePunch.deleteMany({
              where: {
                attendanceId: record.id,
              },
            });
          }

          if (request.type === "BOTH" || request.type === "CLOCK_IN") {
            if (request.clockIn) {
              await tx.attendancePunch.create({
                data: {
                  attendanceId: record.id,
                  employeeId: request.employeeId,
                  punchType: "IN",
                  punchedAt: request.clockIn,
                  location: "Regularized Manual Entry",
                  device: "Admin Approved",
                },
              });
            }
          }

          if (request.type === "BOTH" || request.type === "CLOCK_OUT") {
            if (request.clockOut) {
              await tx.attendancePunch.create({
                data: {
                  attendanceId: record.id,
                  employeeId: request.employeeId,
                  punchType: "OUT",
                  punchedAt: request.clockOut,
                  location: "Regularized Manual Entry",
                  device: "Admin Approved",
                },
              });
            }
          }

          // Fetch all punches for this record and recalculate totalHours
          const allPunches = await tx.attendancePunch.findMany({
            where: { attendanceId: record.id },
            orderBy: { punchedAt: "asc" },
          });

          const totalHours = sumWorkedHours(allPunches);
          const firstIn = allPunches.find((p) => p.punchType === "IN");
          const lastOut = [...allPunches].reverse().find((p) => p.punchType === "OUT");
          const isIncomplete = allPunches.at(-1)?.punchType === "IN";

          await tx.attendanceRecord.update({
            where: { id: record.id },
            data: {
              checkIn: firstIn?.punchedAt ?? null,
              checkOut: isIncomplete ? null : lastOut?.punchedAt ?? null,
              totalHours,
              status: isIncomplete ? "INCOMPLETE" : "PRESENT",
            },
          });
        }

        // 4. Send notification to employee
        await tx.notification.create({
          data: {
            userId: request.employee.userId,
            type: "ATTENDANCE_ALERT" as const,
            title: "Regularization Request Approved",
            body: `Your regularization request for ${workDate.toDateString()} has been approved.`,
            link: "/attendance",
          },
        });

        return updatedRequest;
      });

      // Sync payroll line for this employee date to update LOP
      await syncEmployeePayrollForDate(request.employeeId, new Date(request.date));

      return NextResponse.json({ success: true, request: result });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
