import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId");

  const isAdmin = session.user.role === "ADMIN";

  try {
    let requests;
    if (isAdmin && !employeeId) {
      // Admin gets all pending requests
      requests = await prisma.regularizationRequest.findMany({
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeId: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Get requests for self or specific employee (if authorized)
      const emp = await prisma.employee.findFirst({
        where: { userId: session.user.id },
      });

      const targetEmpId = employeeId || emp?.id;
      if (!targetEmpId) {
        return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
      }

      if (!isAdmin && targetEmpId !== emp?.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      requests = await prisma.regularizationRequest.findMany({
        where: { employeeId: targetEmpId },
        orderBy: { date: "desc" },
      });
    }

    return NextResponse.json({ success: true, requests });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const emp = await prisma.employee.findFirst({
    where: { userId: session.user.id },
  });
  if (!emp) return NextResponse.json({ error: "Employee record not found" }, { status: 404 });

  try {
    const body = await req.json();
    const { date, type, clockIn, clockOut, reason } = body;

    if (!date || !type || !reason?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const parsedDate = new Date(date);

    // Check existing
    const existing = await prisma.regularizationRequest.findFirst({
      where: { employeeId: emp.id, date: parsedDate },
    });
    if (existing) {
      return NextResponse.json({ error: "A regularization request already exists for this date." }, { status: 400 });
    }

    let clockInDate = null;
    let clockOutDate = null;

    if (clockIn) {
      clockInDate = new Date(`${date}T${clockIn}:00`);
    }
    if (clockOut) {
      clockOutDate = new Date(`${date}T${clockOut}:00`);
    }

    const request = await prisma.regularizationRequest.create({
      data: {
        employeeId: emp.id,
        date: parsedDate,
        type,
        clockIn: clockInDate,
        clockOut: clockOutDate,
        reason,
        status: "PENDING",
      },
    });

    // Notify admins
    const admins = await prisma.user.findMany({ where: { role: { in: ["ADMIN"] } } });
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: "ATTENDANCE_REGULARIZATION" as const,
        title: "Attendance Regularization Request",
        body: `${emp.firstName} ${emp.lastName} requested regularization for ${date}.`,
        link: "/attendance",
      })),
    });

    return NextResponse.json({ success: true, request });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

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

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || !["ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { ids, action, comment } = await req.json();
    if (!Array.isArray(ids) || !ids.length) {
      return NextResponse.json({ error: "No request IDs provided" }, { status: 400 });
    }

    const results = [];

    for (const id of ids) {
      const request = await prisma.regularizationRequest.findUnique({
        where: { id },
        include: { employee: true },
      });

      if (!request || request.status !== "PENDING") {
        continue;
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
            title: "Regularization Request Rejected (Bulk)",
            body: `Your regularization request for ${new Date(request.date).toDateString()} was not approved.${comment ? ` Reason: ${comment}` : ""}`,
            link: "/attendance",
          },
        });

        results.push(updated);
      } else if (action === "approve") {
        const result = await prisma.$transaction(async (tx) => {
          const updatedRequest = await tx.regularizationRequest.update({
            where: { id },
            data: {
              status: "APPROVED",
              approverId: session.user.id,
              approvedAt: new Date(),
            },
          });

          const workDate = new Date(request.date);

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

          if (["CLOCK_IN", "CLOCK_OUT", "BOTH"].includes(request.type)) {
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

          await tx.notification.create({
            data: {
              userId: request.employee.userId,
              type: "ATTENDANCE_ALERT" as const,
              title: "Regularization Request Approved (Bulk)",
              body: `Your regularization request for ${workDate.toDateString()} has been approved.`,
              link: "/attendance",
            },
          });

          return updatedRequest;
        });

        results.push(result);
      }
    }

    return NextResponse.json({ success: true, count: results.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
