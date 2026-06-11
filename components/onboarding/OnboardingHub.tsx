import Link from "next/link";
import { format, parseISO } from "date-fns";
import { CalendarDays, ClipboardList, Flag, UserCheck } from "lucide-react";

type OnboardingTask = {
  id: string;
  title: string;
  category: string;
  status: string;
  dueDate: string | null;
};

type OnboardingEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  designation: string;
  employeeId: string;
  joiningDate: string;
  department: { name: string };
  manager?: { firstName: string; lastName: string } | null;
  onboardingTasks: OnboardingTask[];
};

interface OnboardingHubProps {
  employees: OnboardingEmployee[];
}

const columnLabels = [
  { key: "INVITED", description: "New hires invited to AntBox" },
  { key: "DOCUMENT_COLLECTION", description: "Waiting for documentation" },
  { key: "IT_SETUP", description: "IT setup in progress" },
  { key: "ORIENTATION", description: "Orientation scheduled" },
  { key: "COMPLETE", description: "Onboarding complete" },
];

function computeStage(tasks: OnboardingTask[]) {
  if (!tasks.length) return "INVITED";
  const completedCount = tasks.filter((task) => task.status === "COMPLETED").length;
  if (completedCount === tasks.length) return "COMPLETE";
  if (tasks.some((task) => task.category === "IT_SETUP" && task.status !== "COMPLETED")) return "IT_SETUP";
  if (tasks.some((task) => task.category === "DOCUMENTATION" && task.status !== "COMPLETED")) return "DOCUMENT_COLLECTION";
  return "ORIENTATION";
}

function bandColor(tasks: OnboardingTask[]) {
  const overdue = tasks.some((task) => task.status !== "COMPLETED" && task.dueDate && parseISO(task.dueDate) < new Date());
  if (overdue) return "bg-red-100 text-red-700";
  return "bg-emerald-100 text-emerald-700";
}

export function OnboardingHub({ employees }: OnboardingHubProps) {
  const topEmployees = employees.slice(0, 8);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--brand-secondary)]">Onboarding Hub</p>
            <p className="text-sm text-[var(--neutral-600)]">Track new hires from invitation through completion.</p>
          </div>
          <UserCheck className="h-6 w-6 text-[var(--brand-primary)]" />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {topEmployees.map((employee) => {
            const stage = computeStage(employee.onboardingTasks);
            const completed = employee.onboardingTasks.filter((task) => task.status === "COMPLETED").length;
            const total = employee.onboardingTasks.length || 1;
            const due = employee.onboardingTasks
              .filter((task) => task.status !== "COMPLETED" && task.dueDate)
              .sort((a, b) => parseISO(a.dueDate!).getTime() - parseISO(b.dueDate!).getTime())[0];

            return (
              <Link
                key={employee.id}
                href={`/onboarding/${employee.id}`}
                className="group block rounded-3xl border border-[var(--card-border)] p-4 transition hover:border-[var(--brand-primary)]/60 hover:bg-orange-50/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--brand-secondary)]">{employee.firstName} {employee.lastName}</p>
                    <p className="text-xs text-[var(--neutral-400)]">{employee.designation} · {employee.department.name}</p>
                  </div>
                  <span className={"rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] " + bandColor(employee.onboardingTasks)}>
                    {stage.replaceAll("_", " ")}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-[var(--neutral-600)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[var(--neutral-500)]"><CalendarDays className="h-4 w-4" /> Joining</span>
                    <span>{format(parseISO(employee.joiningDate), "dd MMM yyyy")}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[var(--neutral-500)]"><ClipboardList className="h-4 w-4" /> Progress</span>
                    <span>{completed}/{total} tasks</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[var(--neutral-500)]"><Flag className="h-4 w-4" /> Next due</span>
                    <span>{due ? format(parseISO(due.dueDate!), "dd MMM") : "TBD"}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
        <p className="text-sm font-semibold text-[var(--brand-secondary)]">Pipeline</p>
        <div className="mt-4 space-y-3">
          {columnLabels.map((label) => (
            <div key={label.key} className="rounded-2xl border border-[var(--card-border)] bg-[var(--neutral-50)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--neutral-400)]">{label.key.replaceAll("_", " ")}</p>
              <p className="mt-2 text-sm text-[var(--neutral-600)]">{label.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
