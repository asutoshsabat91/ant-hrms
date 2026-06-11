import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { DocumentManager } from "@/components/documents/DocumentManager";

export default async function DocumentsPage() {
  const [documents, employees] = await Promise.all([
    prisma.hRDocument.findMany({
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { issuedDate: "desc" },
      take: 50,
    }),
    prisma.employee.findMany({
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Generate offer letters, certificates, LORs, and more"
      />

      <DocumentManager
        documents={documents.map((document) => ({
          id: document.id,
          title: document.title,
          type: document.type,
          issuedDate: document.issuedDate.toISOString(),
          description: (document.metadata as { notes?: string } | null)?.notes ?? null,
          employee: {
            id: document.employee.id,
            firstName: document.employee.firstName,
            lastName: document.employee.lastName,
          },
        }))}
        employees={employees}
      />
    </div>
  );
}
