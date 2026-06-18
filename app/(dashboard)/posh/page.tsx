import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { POSHPortal } from "@/components/posh/POSHPortal";

export default async function POSHPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";

  let reports: { id: string; subject: string; description: string; createdAt: string; employee?: { firstName: string; lastName: string; employeeId: string } }[] = [];

  try {
    if (isAdmin) {
      const data = await prisma.pOSHReport.findMany({
        orderBy: { createdAt: "desc" },
        include: { employee: { select: { firstName: true, lastName: true, employeeId: true } } },
      });
      reports = data.map((r) => ({
        id: r.id,
        subject: r.subject,
        description: r.description,
        createdAt: r.createdAt.toISOString(),
        employee: r.employee,
      }));
    } else {
      const employee = await prisma.employee.findFirst({ where: { userId: session.user.id } });
      if (!employee || employee.gender?.toUpperCase() !== "FEMALE") redirect("/");

      const data = await prisma.pOSHReport.findMany({
        where: { employeeId: employee.id },
        orderBy: { createdAt: "desc" },
      });
      reports = data.map((r) => ({
        id: r.id,
        subject: r.subject,
        description: r.description,
        createdAt: r.createdAt.toISOString(),
      }));
    }
  } catch {
    // DB not connected
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="POSH — Prevention of Sexual Harassment"
        description="Confidential reporting — your report goes directly to HR leadership"
      />
      <POSHPortal reports={reports} isAdmin={isAdmin} />
    </div>
  );
}
