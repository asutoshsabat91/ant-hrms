import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  employeeId: z.string().min(1),
  type: z.enum([
    "OFFER_LETTER",
    "INTERNSHIP_AGREEMENT",
    "RELIEVING_LETTER",
    "INTERNSHIP_CERTIFICATE",
    "BOOTCAMP_CERTIFICATE",
    "EXPERIENCE_LETTER",
    "LOR",
    "PPO_LETTER",
    "PROMOTION_LETTER",
    "APPOINTMENT_LETTER",
    "OTHER",
  ]),
  title: z.string().min(1),
  issuedDate: z.string().min(1),
  description: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const docs = await prisma.hRDocument.findMany({
    orderBy: { issuedDate: "desc" },
    include: { employee: true },
    take: 50,
  });

  return NextResponse.json({ documents: docs });
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

  const { employeeId, type, title, issuedDate, description } = parsed.data;
  const issued = new Date(issuedDate);
  if (Number.isNaN(issued.getTime())) {
    return NextResponse.json({ error: "Invalid issue date." }, { status: 400 });
  }

  const document = await prisma.hRDocument.create({
    data: {
      employeeId,
      type,
      title,
      fileUrl: `https://example.com/documents/${Math.random().toString(36).slice(2)}.pdf`,
      issuedDate: issued,
      issuedBy: session.user.id,
      metadata: description ? { notes: description } : undefined,
    },
    include: { employee: true },
  });

  return NextResponse.json({ document }, { status: 201 });
}
