import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";

interface OnboardingDetailPageProps {
  params: { hireId: string };
}

export default async function OnboardingDetailPage({ params }: OnboardingDetailPageProps) {
  const employee = await prisma.employee.findUnique({
    where: { id: params.hireId },
    include: {
      department: true,
      manager: true,
      onboardingTasks: { orderBy: { order: "asc" } },
    },
  });

  if (!employee) {
    notFound();
  }

  const completed = employee.onboardingTasks.filter((task) => task.status === "COMPLETED").length;
  const total = employee.onboardingTasks.length;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
        <PageHeader
          title={`${employee.firstName} ${employee.lastName}`}
          description="Onboarding checklist and task progress"
        />
        <div className="mt-6 space-y-4 text-sm text-[var(--neutral-600)]">
          <div>
            <p className="text-[var(--neutral-500)]">Designation</p>
            <p className="font-semibold text-[var(--brand-secondary)]">{employee.designation}</p>
          </div>
          <div>
            <p className="text-[var(--neutral-500)]">Department</p>
            <p className="font-semibold text-[var(--brand-secondary)]">{employee.department.name}</p>
          </div>
          <div>
            <p className="text-[var(--neutral-500)]">Manager</p>
            <p className="font-semibold text-[var(--brand-secondary)]">{employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : "Unassigned"}</p>
          </div>
          <div>
            <p className="text-[var(--neutral-500)]">Joining Date</p>
            <p className="font-semibold text-[var(--brand-secondary)]">{employee.joiningDate.toDateString()}</p>
          </div>
          <div>
            <p className="text-[var(--neutral-500)]">Progress</p>
            <p className="font-semibold text-[var(--brand-secondary)]">{progress}% complete</p>
          </div>
        </div>
      </div>
      <div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--brand-secondary)]">Onboarding Tasks</p>
              <p className="text-sm text-[var(--neutral-600)]">Mark tasks complete as the hire progresses.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--neutral-100)] px-3 py-1 text-xs text-[var(--neutral-500)]">
              {completed}/{total} completed
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--neutral-100)]">
            <div className="h-full rounded-full bg-[var(--brand-primary)]" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="mt-6">
          <OnboardingChecklist
            initialTasks={employee.onboardingTasks.map((task) => ({
              id: task.id,
              title: task.title,
              category: task.category,
              assignedTo: task.assignedTo,
              dueDate: task.dueDate ? task.dueDate.toISOString() : null,
              status: task.status,
              notes: task.notes,
              order: task.order,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
