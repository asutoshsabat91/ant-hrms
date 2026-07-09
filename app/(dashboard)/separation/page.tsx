import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { SeparationPortal } from "@/components/separation/SeparationPortal";

export default async function SeparationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  const isCompanyAdmin = session.user.role === "COMPANY_ADMIN";
  const managedCompany = session.user.managedCompany;

  let mySeparation = null;
  let allSeparations: unknown[] = [];
  let companyEmployees: { id: string; firstName: string; lastName: string; employeeId: string }[] = [];

  try {
    if (isAdmin) {
      allSeparations = await prisma.separation.findMany({
        orderBy: { initiatedAt: "desc" },
        include: {
          employee: {
            select: {
              status: true,
              firstName: true,
              lastName: true,
              employeeId: true,
              designation: true,
              department: { select: { name: true } },
            },
          },
        },
      });
    } else if (isCompanyAdmin && managedCompany) {
      allSeparations = await prisma.separation.findMany({
        where: {
          employee: { deployedCompany: managedCompany },
        },
        orderBy: { initiatedAt: "desc" },
        include: {
          employee: {
            select: {
              status: true,
              firstName: true,
              lastName: true,
              employeeId: true,
              designation: true,
              department: { select: { name: true } },
            },
          },
        },
      });
      companyEmployees = await prisma.employee.findMany({
        where: { deployedCompany: managedCompany },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
        },
        orderBy: { firstName: "asc" },
      });
    } else {
      const emp = await prisma.employee.findFirst({ where: { userId: session.user.id } });
      if (emp) {
        mySeparation = await prisma.separation.findUnique({ where: { employeeId: emp.id } });
      }
    }
  } catch {
    // DB not connected
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Separation"
        description={isAdmin ? "Review and manage employee resignation requests" : isCompanyAdmin ? "View company separations and apply on behalf of employees" : "Initiate and track your resignation"}
      />
      <SeparationPortal
        isAdmin={isAdmin}
        isCompanyAdmin={isCompanyAdmin}
        companyEmployees={companyEmployees}
        mySeparation={mySeparation ? {
          id: mySeparation.id,
          status: mySeparation.status as "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED",
          reason: mySeparation.reason,
          noticeDays: mySeparation.noticeDays,
          initiatedAt: mySeparation.initiatedAt.toISOString(),
          approvedAt: mySeparation.approvedAt?.toISOString() ?? null,
          lastWorkingDate: mySeparation.lastWorkingDate?.toISOString() ?? null,
        } : null}
        allSeparations={(allSeparations as Parameters<typeof SeparationPortal>[0]["allSeparations"])}
      />
    </div>
  );
}
