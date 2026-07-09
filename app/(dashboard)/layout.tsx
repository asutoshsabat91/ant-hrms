export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ResizableLayout } from "@/components/layout/ResizableLayout";
import { SecurityHandler } from "@/components/layout/SecurityHandler";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let employee = null;
  try {
    employee = await prisma.employee.findFirst({
      where: { userId: session.user.id },
      select: { id: true, employeeId: true, gender: true, firstName: true, lastName: true, designation: true, departmentId: true, department: { select: { name: true } }, managerId: true, employmentType: true, status: true, joiningDate: true, phone: true, personalEmail: true, dateOfBirth: true, bloodGroup: true, address: true, city: true, state: true, pincode: true, bankName: true, bankAccountNo: true, ifscCode: true, pan: true },
    });
  } catch {
    // DB not connected
  }

  // Serialize Date fields — Next.js cannot pass Date objects to client components
  const safeEmployee = employee ? {
    ...employee,
    joiningDate: employee.joiningDate instanceof Date ? employee.joiningDate.toISOString() : String(employee.joiningDate),
    dateOfBirth: employee.dateOfBirth instanceof Date ? employee.dateOfBirth.toISOString() : (employee.dateOfBirth ?? null),
  } : null;

  return (
    <>
      <SecurityHandler />
      <ResizableLayout
        sidebar={<Sidebar role={session.user.role} gender={employee?.gender} email={session.user.email} />}
        topbar={<Topbar user={session.user} employee={safeEmployee} />}
      >
        {children}
      </ResizableLayout>
    </>
  );
}
