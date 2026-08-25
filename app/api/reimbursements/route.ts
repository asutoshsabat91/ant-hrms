import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendGoogleChatNotification } from "@/lib/googleChat";

const createSchema = z.object({
  title: z.string().min(3),
  category: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["REIMBURSEMENT", "PROCUREMENT"]).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = session.user.role === "ADMIN";

    let employeeId: string | undefined;
    if (!isAdmin) {
      const emp = await prisma.employee.findFirst({ where: { userId: session.user.id } });
      if (!emp) return NextResponse.json({ reimbursements: [] });
      employeeId = emp.id;
    }

    const reimbursements = await prisma.reimbursement.findMany({
      where: employeeId ? { employeeId } : {},
      orderBy: { createdAt: "desc" },
      include: { employee: { select: { firstName: true, lastName: true, employeeId: true } } },
      take: 100,
    });

    return NextResponse.json({ reimbursements });
  } catch (e) {
    console.error("[REIMBURSEMENTS GET]", e);
    return NextResponse.json({ error: "Failed to fetch reimbursements" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { employee: true },
    });

    if (!currentUser?.employee) return NextResponse.json({ error: "Employee record not found." }, { status: 404 });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const type = parsed.data.type ?? "REIMBURSEMENT";
    if (currentUser.employee.employmentType === "INTERN" && type === "REIMBURSEMENT") {
      return NextResponse.json({ error: "Interns are only allowed to submit procurement requests, not reimbursements." }, { status: 403 });
    }

    const reimbursementDate = new Date(parsed.data.date);
    if (Number.isNaN(reimbursementDate.getTime())) return NextResponse.json({ error: "Invalid date." }, { status: 400 });

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
      include: { employee: { select: { firstName: true, lastName: true, employeeId: true } } },
    });

    if (type === "PROCUREMENT") {
      const admins = await prisma.user.findMany({ where: { role: { in: ["ADMIN"] } } });
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

    try {
      await sendGoogleChatNotification(
        `💳 *New ${type === "PROCUREMENT" ? "Procurement" : "Reimbursement"} Request*\n` +
        `• *Employee:* ${currentUser.employee.firstName} ${currentUser.employee.lastName} (${currentUser.employee.employeeId})\n` +
        `• *Title:* ${parsed.data.title}\n` +
        `• *Amount:* ₹${parsed.data.amount}\n` +
        `• *Category:* ${parsed.data.category}`
      );
    } catch (chatErr) {
      console.error("[Google Chat] Reimbursement notification failed", chatErr);
    }

    // Export updated DB state to Google Master Sheet
    try {
      const { exportDbToGoogleSheetsOnly } = await import("@/lib/googleSheets");
      exportDbToGoogleSheetsOnly().catch(err => console.error("[Google Sheets Export]", err));
    } catch (sheetsErr) {
      console.error("Failed to trigger sheet export", sheetsErr);
    }

    return NextResponse.json({ reimbursement }, { status: 201 });
  } catch (e) {
    console.error("[REIMBURSEMENTS POST]", e);
    return NextResponse.json({ error: "Failed to submit reimbursement" }, { status: 500 });
  }
}
