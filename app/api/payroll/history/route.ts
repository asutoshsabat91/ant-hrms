import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const runs = await prisma.payrollRun.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { _count: { select: { lines: true } } },
  });

  return NextResponse.json(
    runs.map((r) => ({
      id: r.id,
      month: r.month,
      year: r.year,
      status: r.status,
      lineCount: r._count.lines,
      createdAt: r.createdAt.toISOString(),
    }))
  );
}
