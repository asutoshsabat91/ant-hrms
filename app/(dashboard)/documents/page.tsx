import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { DocumentsHub } from "@/components/documents/DocumentsHub";

export default async function DocumentsPage() {
  const session = await auth();
  const isSuperAdmin = session?.user?.role === "ADMIN";
  const isCompanyAdmin = session?.user?.role === "COMPANY_ADMIN";
  const managedCompany = session?.user?.managedCompany;

  let currentEmployeeId: string | null = null;
  if (!isSuperAdmin && !isCompanyAdmin && session?.user?.id) {
    const emp = await prisma.employee.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    currentEmployeeId = emp?.id ?? null;
  }

  let docWhere = {};
  if (isSuperAdmin) {
    docWhere = {};
  } else if (isCompanyAdmin && managedCompany) {
    docWhere = { employee: { deployedCompany: managedCompany } };
  } else if (currentEmployeeId) {
    docWhere = { employeeId: currentEmployeeId };
  } else {
    docWhere = { id: "none" };
  }

  let employeeQuery;
  if (isSuperAdmin) {
    employeeQuery = prisma.employee.findMany({
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, employeeId: true },
    });
  } else if (isCompanyAdmin && managedCompany) {
    employeeQuery = prisma.employee.findMany({
      where: { deployedCompany: managedCompany },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, employeeId: true },
    });
  } else {
    employeeQuery = Promise.resolve([]);
  }

  const [documents, employees] = await Promise.all([
    prisma.hRDocument.findMany({
      where: docWhere,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    employeeQuery,
  ]);

  return (
    <DocumentsHub
      isAdmin={isSuperAdmin || isCompanyAdmin}
      currentEmployeeId={currentEmployeeId}
      documents={documents.map((d) => ({
        id: d.id,
        title: d.title,
        type: d.type,
        fileUrl: d.fileUrl,
        issuedDate: d.issuedDate.toISOString(),
        issuedBy: d.issuedBy,
        metadata: d.metadata as Record<string, unknown> | null,
        employee: {
          id: d.employee.id,
          firstName: d.employee.firstName,
          lastName: d.employee.lastName,
          employeeId: d.employee.employeeId,
        },
      }))}
      employees={employees}
    />
  );
}
