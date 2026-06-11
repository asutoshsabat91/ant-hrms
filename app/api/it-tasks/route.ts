import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  taskType: z.enum([
    "ACCOUNT_CREATION",
    "ACCOUNT_DELETION",
    "DEVICE_ALLOCATION",
    "DEVICE_RETURN",
    "SOFTWARE_ACCESS",
    "SOFTWARE_REVOKE",
    "EMAIL_CREATION",
    "EMAIL_DELETION",
  ]),
  details: z.string().min(1),
  employeeId: z.string().min(1),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await prisma.iTTask.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      employee: true,
    },
    take: 50,
  });

  return NextResponse.json({ tasks });
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

  const { taskType, details, employeeId } = parsed.data;

  const task = await prisma.iTTask.create({
    data: {
      taskType,
      details,
      employeeId,
      triggeredBy: session.user.id,
      status: "PENDING",
    },
    include: { employee: true },
  });

  return NextResponse.json({ task }, { status: 201 });
}
