import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { DocumentsHub } from "@/components/documents/DocumentsHub";

export default async function DocumentsPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  let currentEmployeeId: string | null = null;
  if (!isAdmin && session?.user?.id) {
    const emp = await prisma.employee.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    currentEmployeeId = emp?.id ?? null;
  }

  const [documents, employees] = await Promise.all([
    prisma.hRDocument.findMany({
      where: isAdmin ? {} : currentEmployeeId ? { employeeId: currentEmployeeId } : { id: "none" },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    isAdmin
      ? prisma.employee.findMany({
          orderBy: { firstName: "asc" },
          select: { id: true, firstName: true, lastName: true, employeeId: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <DocumentsHub
      isAdmin={isAdmin}
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
