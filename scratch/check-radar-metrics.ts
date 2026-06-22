import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Onboarding candidates count
  const onboardingCount = await prisma.employee.count({
    where: { status: "ONBOARDING" }
  });

  // 2. Active interns count (PPOs Claimed mapping)
  const internCount = await prisma.employee.count({
    where: {
      employmentType: "INTERN",
      status: { in: ["ACTIVE", "ONBOARDING"] }
    }
  });

  // 3. Avg Onboarding checklist completion (Avg Readiness mapping)
  const onboardingTasks = await prisma.onboardingTask.findMany({
    select: { status: true }
  });
  
  const totalTasks = onboardingTasks.length;
  const completedTasks = onboardingTasks.filter(t => t.status === "COMPLETED").length;
  const avgReadiness = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 85.0;

  // 4. Sprints Live mapping (e.g. number of departments or active departments)
  const departmentCount = await prisma.department.count();

  console.log({
    onboardingCount,
    internCount,
    avgReadiness,
    departmentCount
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
