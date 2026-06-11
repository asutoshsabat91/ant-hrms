import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

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

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Sidebar role={session.user.role} gender={employee?.gender} />
      <div className="ml-64 flex flex-col">
        <Topbar user={session.user} employee={employee} />
        <main className="mt-16 min-h-[calc(100vh-4rem)] p-8">{children}</main>
      </div>
    </div>
  );
}
