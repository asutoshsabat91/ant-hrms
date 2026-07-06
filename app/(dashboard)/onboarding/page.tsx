import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { OnboardingHub } from "@/components/onboarding/OnboardingHub";
import { NewHireWizard } from "@/components/onboarding/NewHireWizard";
import { BulkOnboardingModal } from "@/components/onboarding/BulkOnboardingModal";
import { PendingOnboardings } from "@/components/onboarding/PendingOnboardings";

export default async function OnboardingPage() {
  const [employees, departments, managers, templates, pendingRequests] = await Promise.all([
    prisma.employee.findMany({
      where: { status: { in: ["ONBOARDING", "ACTIVE"] } },
      include: {
        department: true,
        manager: true,
        onboardingTasks: { orderBy: { order: "asc" } },
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
      />

      <OnboardingHub
        employees={employees.map((employee) => ({
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
          onboardingTasks: employee.onboardingTasks.map((task) => ({
            id: task.id,
            title: task.title,
            category: task.category,
            status: task.status,
            dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          })),
        }))}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <NewHireWizard departments={departments} managers={managers} templates={templates} />
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
