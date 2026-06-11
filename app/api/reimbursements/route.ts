import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(3),
  category: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["REIMBURSEMENT", "PROCUREMENT"]).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "SUPER_ADMIN" || session.user.role === "HR_ADMIN";

  let employeeId: string | undefined;
  if (!isAdmin) {
    const emp = await prisma.employee.findFirst({ where: { userId: session.user.id } });
    if (!emp) return NextResponse.json({ reimbursements: [] });
    employeeId = emp.id;
  }

  const reimbursements = await prisma.reimbursement.findMany({
    where: employeeId ? { employeeId } : {},
    orderBy: { createdAt: "desc" },
    include: {
      employee: { select: { firstName: true, lastName: true, employeeId: true } },
    },
    take: 100,
  });

  return NextResponse.json({ reimbursements });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });

  if (!currentUser?.employee) {
    return NextResponse.json({ error: "Employee record not found." }, { status: 404 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const reimbursementDate = new Date(parsed.data.date);
  if (Number.isNaN(reimbursementDate.getTime())) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const type = parsed.data.type ?? "REIMBURSEMENT";
  const initialStatus = type === "PROCUREMENT" ? "UNDER_REVIEW" : "DRAFT";

  const reimbursement = await prisma.reimbursement.create({
    data: {
      employeeId: currentUser.employee.id,
      type,
      title: parsed.data.title,
      category: parsed.data.category,
      amount: parsed.data.amount,
      date: reimbursementDate,
      description: parsed.data.description,
      status: initialStatus,
      currency: "INR",
    },
    include: {
      employee: { select: { firstName: true, lastName: true, employeeId: true } },
    },
  });

  // Notify admins on new procurement request
  if (type === "PROCUREMENT") {
    const admins = await prisma.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "HR_ADMIN"] } },
    });
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: "PROCUREMENT_UPDATE" as const,
        title: "New Procurement Request",
        body: `${currentUser.employee!.firstName} ${currentUser.employee!.lastName} requested: ${parsed.data.title} (₹${parsed.data.amount})`,
        link: "/portal/reimbursements",
      })),
    });
  }

  return NextResponse.json({ reimbursement }, { status: 201 });
}
