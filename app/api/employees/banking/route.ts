import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bankName, bankAccountNo, ifscCode, pan, uan, targetEmployeeId } = await req.json();

  const isAdmin = session.user.role === "ADMIN";

  let employeeId = targetEmployeeId;

  if (!isAdmin) {
    // Self-update: use the employee linked to the current user
    const emp = await prisma.employee.findFirst({ where: { userId: session.user.id } });
    if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    employeeId = emp.id;
  } else if (!employeeId) {
    return NextResponse.json({ error: "targetEmployeeId required for admin updates" }, { status: 400 });
  }

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      bankName: bankName ?? undefined,
      bankAccountNo: bankAccountNo ?? undefined,
      ifscCode: ifscCode ?? undefined,
      pan: pan ?? undefined,
      uan: uan ?? undefined,
    },
    select: { id: true, bankName: true, bankAccountNo: true, ifscCode: true, pan: true, uan: true },
  });

  return NextResponse.json({ employee: updated });
}
