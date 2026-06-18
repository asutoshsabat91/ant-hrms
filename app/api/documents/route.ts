import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ALL_TYPES = [
  "OFFER_LETTER", "INTERNSHIP_AGREEMENT", "RELIEVING_LETTER",
  "INTERNSHIP_CERTIFICATE", "BOOTCAMP_CERTIFICATE", "EXPERIENCE_LETTER",
  "LOR", "PPO_LETTER", "PROMOTION_LETTER", "APPOINTMENT_LETTER", "OTHER",
] as const;

const createSchema = z.object({
  employeeId: z.string().min(1),
  type: z.enum(ALL_TYPES),
  title: z.string().min(1),
  issuedDate: z.string().min(1),
  description: z.string().optional(),
  fileUrl: z.string().optional(),
  fileData: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const isAdmin = session.user.role === "ADMIN";

    let whereClause: Record<string, unknown> = {};
    if (!isAdmin) {
      const emp = await prisma.employee.findFirst({ where: { userId: session.user.id } });
      if (!emp) return NextResponse.json({ documents: [] });
      whereClause = { employeeId: emp.id };
    } else if (employeeId) {
      whereClause = { employeeId };
    }

    const docs = await prisma.hRDocument.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: { employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } } },
      take: 200,
    });

    return NextResponse.json({ documents: docs });
  } catch (e) {
    console.error("[DOCUMENTS GET]", e);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { employeeId, type, title, issuedDate, description, fileUrl, fileData } = parsed.data;

    const isAdmin = session.user.role === "ADMIN";
    if (!isAdmin) {
      const emp = await prisma.employee.findFirst({ where: { userId: session.user.id } });
      if (!emp || emp.id !== employeeId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const issued = new Date(issuedDate);
    if (Number.isNaN(issued.getTime())) return NextResponse.json({ error: "Invalid issue date." }, { status: 400 });

    const document = await prisma.hRDocument.create({
      data: {
        employeeId,
        type,
        title,
        fileUrl: fileData ?? fileUrl ?? `https://docs.theantbox.com/${Math.random().toString(36).slice(2)}`,
        issuedDate: issued,
        issuedBy: session.user.name ?? session.user.id,
        metadata: description ? { notes: description } : undefined,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } } },
    });

    const COMPLIANCE_TYPES = ["OTHER", "APPOINTMENT_LETTER", "INTERNSHIP_AGREEMENT"];
    const COMPLIANCE_TITLES = ["aadhaar", "pan", "degree", "certificate", "experience"];
    const isComplianceDoc =
      COMPLIANCE_TYPES.includes(type) ||
      COMPLIANCE_TITLES.some((t) => title.toLowerCase().includes(t));

    if (isComplianceDoc) {
      await prisma.onboardingTask.updateMany({
        where: { employeeId, category: "DOCUMENTATION", title: { contains: title.slice(0, 10) }, status: { not: "COMPLETED" } },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      const admins = await prisma.user.findMany({ where: { role: { in: ["ADMIN"] } } });
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: "ONBOARDING_TASK" as const,
          title: "Document Uploaded",
          body: `${document.employee.firstName} ${document.employee.lastName} uploaded: ${title}`,
          link: `/onboarding/${employeeId}`,
        })),
      });
    }

    return NextResponse.json({ document }, { status: 201 });
  } catch (e) {
    console.error("[DOCUMENTS POST]", e);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
