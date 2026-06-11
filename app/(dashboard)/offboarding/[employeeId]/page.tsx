import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { OffboardingChecklist } from "@/components/offboarding/OffboardingChecklist";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/dateHelpers";

interface OffboardingDetailPageProps {
  params: { employeeId: string };
}

export default async function OffboardingDetailPage({ params }: OffboardingDetailPageProps) {
  const employee = await prisma.employee.findUnique({
    where: { id: params.employeeId },
    include: {
      department: true,
      manager: true,
      offboardingTasks: { orderBy: { order: "asc" } },
    },
  });

  if (!employee) {
    notFound();
  }

  const completed = employee.offboardingTasks.filter((task) => task.status === "COMPLETED").length;
  const total = employee.offboardingTasks.length;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Offboarding — ${employee.firstName} ${employee.lastName}`}
        description="Exit workflow, tasks, and handover checklist"
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-[var(--neutral-500)]">Employee</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--brand-secondary)]">{employee.firstName} {employee.lastName}</h2>
            </div>
            <Badge>{employee.status}</Badge>
          </div>

          <div className="mt-6 space-y-4 text-sm text-[var(--neutral-600)]">
            <div>
              <p className="text-[var(--neutral-500)]">Designation</p>
              <p className="font-medium text-[var(--brand-secondary)]">{employee.designation}</p>
            </div>
            <div>
              <p className="text-[var(--neutral-500)]">Department</p>
              <p className="font-medium text-[var(--brand-secondary)]">{employee.department.name}</p>
            </div>
            <div>
              <p className="text-[var(--neutral-500)]">Last Working Date</p>
              <p className="font-medium text-[var(--brand-secondary)]">{employee.lastWorkingDate ? formatDate(employee.lastWorkingDate) : "Pending"}</p>
            </div>
            <div>
              <p className="text-[var(--neutral-500)]">Manager</p>
              <p className="font-medium text-[var(--brand-secondary)]">
                {employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : "Unassigned"}
              </p>
            </div>
            <div>
              <p className="text-[var(--neutral-500)]">Checklist progress</p>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--neutral-100)]">
                <div className="h-full rounded-full bg-[var(--brand-primary)]" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-xs text-[var(--neutral-500)]">{completed}/{total} tasks completed</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
          <h3 className="text-sm font-semibold text-[var(--brand-secondary)]">Offboarding checklist</h3>
          <p className="mt-2 text-sm text-[var(--neutral-600)]">Complete exit actions and confirm handover before final separation.</p>
          <div className="mt-4">
            <OffboardingChecklist initialTasks={employee.offboardingTasks.map((task) => ({
              id: task.id,
              title: task.title,
              category: task.category,
              assignedTo: task.assignedTo,
              dueDate: task.dueDate ? task.dueDate.toISOString() : null,
              status: task.status,
              notes: task.notes,
              order: task.order,
            }))} />
          </div>
        </section>
      </div>
    </div>
  );
}
