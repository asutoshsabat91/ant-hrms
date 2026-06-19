import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReimbursementPortal } from "@/components/reimbursements/ReimbursementPortal";

export default async function ReimbursementsPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const user = await prisma.user.findUnique({
    where: { id: session?.user?.id ?? "" },
    include: { employee: true },
  });

  const reimbursements = await prisma.reimbursement.findMany({
    where: isAdmin ? {} : { employeeId: user?.employee?.id ?? "" },
    orderBy: { createdAt: "desc" },
    include: {
      employee: { select: { firstName: true, lastName: true, employeeId: true } },
    },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reimbursements & Procurement"
        description="Submit expense claims and request procurement approvals"
      />

      <ReimbursementPortal
        isAdmin={isAdmin}
        employmentType={user?.employee?.employmentType}
        reimbursements={reimbursements.map((item) => ({
          id: item.id,
          type: (item.type ?? "REIMBURSEMENT") as "REIMBURSEMENT" | "PROCUREMENT",
          title: item.title,
          category: item.category,
          amount: item.amount,
          date: item.date.toISOString(),
          status: item.status as "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "PAID",
          approvedBy: item.approvedBy,
          receiptUrl: item.receiptUrl,
          description: item.description,
          employee: item.employee
            ? {
                firstName: item.employee.firstName,
                lastName: item.employee.lastName,
                employeeId: item.employee.employeeId,
              }
            : null,
        }))}
      />
    </div>
  );
}
