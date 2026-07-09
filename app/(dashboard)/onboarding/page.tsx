import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { OnboardingHub } from "@/components/onboarding/OnboardingHub";
import { NewHireWizard } from "@/components/onboarding/NewHireWizard";
import { BulkOnboardingModal } from "@/components/onboarding/BulkOnboardingModal";
import { PendingOnboardings } from "@/components/onboarding/PendingOnboardings";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isChandrita = session.user.email?.toLowerCase() === "chandrita@theantbox.com";

  const [employees, departments, managers, templates, pendingRequests] = await Promise.all([
    prisma.employee.findMany({
      where: { status: { in: ["ONBOARDING", "ACTIVE"] } },
      include: {
        department: true,
        manager: true,
        onboardingTasks: { orderBy: { order: "asc" } },
        documents: true,
      },
      orderBy: { joiningDate: "asc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({
      where: { status: "ACTIVE" },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.onboardingTemplate.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    }),
    prisma.onboardingRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboarding"
        description="Manage new hire pipelines, launch onboarding, and track milestone progress."
        action={
          <BulkOnboardingModal
            departments={departments}
            isChandrita={isChandrita}
            employees={employees.map((employee) => ({
              id: employee.id,
              firstName: employee.firstName,
              lastName: employee.lastName,
              designation: employee.designation,
              employeeId: employee.employeeId,
              joiningDate: employee.joiningDate.toISOString(),
              department: { name: employee.department.name },
              onboardingTasks: employee.onboardingTasks.map((task) => ({
                id: task.id,
                title: task.title,
                category: task.category,
                status: task.status,
              })),
            }))}
          />
        }
      />

      <PendingOnboardings
        requests={pendingRequests.map((r) => ({
          id: r.id,
          firstName: r.firstName,
          lastName: r.lastName,
          personalEmail: r.personalEmail,
          gender: r.gender,
          phone: r.phone,
          dateOfBirth: r.dateOfBirth ? r.dateOfBirth.toISOString() : null,
          createdAt: r.createdAt.toISOString(),
        }))}
        departments={departments}
        managers={managers}
        templates={templates}
        isChandrita={isChandrita}
      />

      <OnboardingHub
        employees={employees.map((employee) => {
          const hasIdProof = employee.documents.some((d) =>
            d.title?.toLowerCase().includes("aadhaar") ||
            d.title?.toLowerCase().includes("pan") ||
            d.title?.toLowerCase().includes("certificate") ||
            d.title?.toLowerCase().includes("degree")
          );
          const hasBanking = !!(employee.bankName && employee.bankAccountNo && employee.ifscCode);
          const hasIdForm = employee.documents.some((d) => d.title === "ID Card Form Data");

          return {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            designation: employee.designation,
            employeeId: employee.employeeId,
            joiningDate: employee.joiningDate.toISOString(),
            department: { name: employee.department.name },
            manager: employee.manager
              ? { firstName: employee.manager.firstName, lastName: employee.manager.lastName }
              : null,
            hasIdProof,
            hasBanking,
            hasIdForm,
            status: employee.status,
          };
        })}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <NewHireWizard departments={departments} managers={managers} templates={templates} isChandrita={isChandrita} />
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
          <h2 className="text-sm font-semibold text-[var(--brand-secondary)]">Hiring checklist</h2>
          <p className="mt-3 text-sm text-[var(--neutral-600)]">
            New hires will be added to the onboarding board. The system creates tasks based on the selected template and updates their progress in real time.
          </p>
        </div>
      </div>
    </div>
  );
}
