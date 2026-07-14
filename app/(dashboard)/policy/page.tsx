import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { PolicyPageClient } from "@/components/policy/PolicyPageClient";

export default async function PolicyPage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() || "";
  const isRitesh = email === "ritesh@theantbox.com";
  const isSuperAdmin = (session?.user?.role === "ADMIN") && !isRitesh;

  // Fetch all leave types ordered by name
  const leaveTypes = await prisma.leaveType.findMany({
    orderBy: { name: "asc" },
  });

  // Load current employee profile to find their employmentType
  const userEmployee = await prisma.employee.findUnique({
    where: { userId: session?.user?.id ?? "" },
  });
  const employmentType = userEmployee?.employmentType ?? "FULL_TIME";

  // Map to safe client types
  const safeLeaveTypes = leaveTypes.map((lt) => ({
    id: lt.id,
    name: lt.name,
    code: lt.code,
    daysPerYear: lt.daysPerYear,
    accrual: lt.accrual,
    priorNoticeHours: lt.priorNoticeHours,
    applicableTo: lt.applicableTo,
    isPaid: lt.isPaid,
  }));

  const filteredLeaveTypes = isSuperAdmin
    ? safeLeaveTypes
    : safeLeaveTypes.filter((lt) => lt.applicableTo && Array.isArray(lt.applicableTo) && lt.applicableTo.includes(employmentType));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Policy Directory"
        description="View and configure company-wide leave allocations, accrual rates, and notice constraints"
      />

      <PolicyPageClient
        isSuperAdmin={isSuperAdmin}
        initialLeaveTypes={filteredLeaveTypes}
      />
    </div>
  );
}
