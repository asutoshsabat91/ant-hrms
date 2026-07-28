"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CircleCheck, Clock3, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OffboardingTask = {
  id: string;
  title: string;
  category: string;
  assignedTo: string | null;
  dueDate: string | null;
  status: string;
  notes: string | null;
  order: number;
};

interface OffboardingChecklistProps {
  initialTasks: OffboardingTask[];
}

const categoryOrder = ["IT_SETUP", "ASSET", "ORIENTATION", "FINANCE", "DOCUMENTATION", "COMPLIANCE"];

const badgeStyles: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  BLOCKED: "bg-orange-100 text-orange-800",
  SKIPPED: "bg-slate-100 text-slate-800",
};

export function OffboardingChecklist({ initialTasks }: OffboardingChecklistProps) {
  const [tasks, setTasks] = useState(() => {
    const seen = new Set<string>();
    return initialTasks.filter((t) => {
      const key = t.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);

  const groupedTasks = useMemo(() => {
    return tasks.reduce<Record<string, OffboardingTask[]>>((acc, task) => {
      if (!acc[task.category]) acc[task.category] = [];
      acc[task.category].push(task);
      return acc;
    }, {});
  }, [tasks]);

  const updateTask = async (taskId: string, status: string) => {
    setLoadingTaskId(taskId);
    try {
      const response = await fetch("/api/offboarding/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status }),
      });
      if (!response.ok) return;
      const updated = await response.json();
      setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
    } finally {
      setLoadingTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      {categoryOrder.map((category) => {
        const items = groupedTasks[category] ?? [];
        if (!items.length) return null;

        return (
          <section key={category} className="rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--brand-secondary)]">{category.replaceAll("_", " ")}</p>
                <p className="text-xs text-[var(--neutral-500)]">{items.length} task{items.length > 1 ? "s" : ""}</p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-[var(--neutral-100)] px-3 py-1 text-xs text-[var(--neutral-500)]">
                <Clock3 className="h-3.5 w-3.5" />
                {items.filter((task) => task.status !== "COMPLETED").length} open
              </div>
            </div>
            <div className="space-y-4">
              {items.map((task) => (
                <div key={task.id} className="rounded-2xl border border-[var(--card-border)] bg-[var(--neutral-50)] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--brand-secondary)]">{task.title}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-[var(--neutral-500)]">
                        <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> {task.assignedTo ?? "Unassigned"}</span>
                        <span className="inline-flex items-center gap-1">Due: {task.dueDate ? format(parseISO(task.dueDate), "dd MMM yyyy") : "TBD"}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:items-end">
                      <span className={cn("rounded-full px-3 py-1 text-xs font-semibold uppercase", badgeStyles[task.status] ?? "bg-slate-100 text-slate-800")}>{task.status.replaceAll("_", " ")}</span>
                      {task.status !== "COMPLETED" ? (
                        <Button size="sm" variant="secondary" disabled={loadingTaskId === task.id} onClick={() => updateTask(task.id, "COMPLETED")}>Mark complete</Button>
                      ) : (
                        <div className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700"><CircleCheck className="h-3.5 w-3.5" /> Completed</div>
                      )}
                    </div>
                  </div>
                  {task.notes && <p className="mt-3 text-sm text-[var(--neutral-600)]">Notes: {task.notes}</p>}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
