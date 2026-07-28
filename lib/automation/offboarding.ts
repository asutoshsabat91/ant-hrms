import { TaskCategory } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { addDays, subDays } from "date-fns";

const defaultTasks: Array<{
  title: string;
  category: TaskCategory;
  assignedTo: string;
  dueOffset: number;
  order: number;
}> = [
  { title: "Revoke email access", category: "IT_SETUP", assignedTo: "IT Admin", dueOffset: 0, order: 1 },
  { title: "Disable Slack, Notion, GitHub access", category: "IT_SETUP", assignedTo: "IT Admin", dueOffset: 0, order: 2 },
  { title: "Confirm device return", category: "ASSET", assignedTo: "IT Admin", dueOffset: 1, order: 3 },
  { title: "Complete exit interview", category: "ORIENTATION", assignedTo: "HR", dueOffset: -2, order: 4 },
  { title: "Settle pending reimbursements", category: "FINANCE", assignedTo: "Finance", dueOffset: 0, order: 5 },
  { title: "Settle FNF", category: "FINANCE", assignedTo: "Finance", dueOffset: 45, order: 6 },
  { title: "Generate relieving letter", category: "DOCUMENTATION", assignedTo: "HR", dueOffset: 0, order: 7 },
  { title: "Generate experience letter", category: "DOCUMENTATION", assignedTo: "HR", dueOffset: 0, order: 8 },
  { title: "Update employee status to ALUMNI", category: "COMPLIANCE", assignedTo: "HR", dueOffset: 1, order: 9 },
];

export async function createOffboardingChecklist(
  tx: Prisma.TransactionClient,
  employeeId: string,
  lastWorkingDate: Date,
  letters: string[],
  reason: string,
  notes?: string,
  exitInterviewDate?: Date | null
) {
  const existingTasks = await tx.offboardingTask.findMany({
    where: { employeeId },
    select: { title: true }
  });
  const existingTitles = new Set(existingTasks.map(t => t.title.toLowerCase().trim()));

  const tasks: Prisma.OffboardingTaskCreateManyInput[] = [];

  for (const task of defaultTasks) {
    if (existingTitles.has(task.title.toLowerCase().trim())) continue;
    if (task.title.includes("relieving") && !letters.includes("Relieving Letter")) continue;
    if (task.title.includes("experience") && !letters.includes("Experience Letter")) continue;
    if (task.title.includes("LOR") && !letters.includes("LOR")) continue;

    const dueDate = task.dueOffset >= 0
      ? addDays(lastWorkingDate, task.dueOffset)
      : subDays(lastWorkingDate, Math.abs(task.dueOffset));

    tasks.push({
      employeeId,
      title: task.title,
      description: `${task.title} for offboarding reason: ${reason}`,
      category: task.category,
      assignedTo: task.assignedTo,
      dueDate,
      order: task.order,
    });
  }

  if (exitInterviewDate && !existingTitles.has("conduct exit interview")) {
    tasks.push({
      employeeId,
      title: "Conduct exit interview",
      description: "Schedule and complete the exit interview with the employee.",
      category: "ORIENTATION",
      assignedTo: "HR",
      dueDate: exitInterviewDate,
      order: 10,
    });
  }

  if (tasks.length > 0) {
    await tx.offboardingTask.createMany({ data: tasks });
  }
}
