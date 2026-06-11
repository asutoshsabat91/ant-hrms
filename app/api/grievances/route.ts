import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  subject: z.string().min(5),
  category: z.string().min(1),
  description: z.string().min(10),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  isAnonymous: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isHrOrAdmin = ["HR_ADMIN", "SUPER_ADMIN"].includes(session.user.role);

  const grievances = await prisma.grievance.findMany({
    where: isHrOrAdmin
      ? {}
      : { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, email: true } },
      employee: { select: { id: true, firstName: true, lastName: true } },
    },
    take: 50,
  });

  return NextResponse.json({ grievances });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });

  const grievance = await prisma.grievance.create({
    data: {
      ticketNo: `GRV-${Date.now()}`,
      userId: session.user.id,
      employeeId: currentUser?.employee?.id,
      subject: parsed.data.subject,
      description: parsed.data.description,
      category: parsed.data.category,
      priority: parsed.data.priority,
      status: "OPEN",
      isAnonymous: parsed.data.isAnonymous ?? false,
    },
  });

  // Notify HR users
  const hrUsers = await prisma.user.findMany({
    where: {
      role: { in: ["HR_ADMIN", "SUPER_ADMIN"] },
    },
  });

  for (const hr of hrUsers) {
    await prisma.notification.create({
      data: {
        userId: hr.id,
        type: "GRIEVANCE_UPDATE",
        title: "New Grievance Submitted",
        body: `A new grievance ticket ${grievance.ticketNo} has been reported.`,
        link: `/grievances`,
      },
    });
  }

  return NextResponse.json({ grievance }, { status: 201 });
}
