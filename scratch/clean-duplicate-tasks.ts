import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up duplicate Offboarding & Onboarding tasks...");

  // 1. OffboardingTask duplicates
  const allOffboardingTasks = await prisma.offboardingTask.findMany({
    orderBy: { createdAt: "asc" },
  });

  const seenOffboarding = new Set<string>();
  const offboardingIdsToDelete: string[] = [];

  for (const task of allOffboardingTasks) {
    const key = `${task.employeeId}:${task.title.toLowerCase().trim()}`;
    if (seenOffboarding.has(key)) {
      offboardingIdsToDelete.push(task.id);
    } else {
      seenOffboarding.add(key);
    }
  }

  if (offboardingIdsToDelete.length > 0) {
    const res = await prisma.offboardingTask.deleteMany({
      where: { id: { in: offboardingIdsToDelete } },
    });
    console.log(`Deleted ${res.count} duplicate OffboardingTasks.`);
  } else {
    console.log("No duplicate OffboardingTasks found.");
  }

  // 2. OnboardingTask duplicates
  const allOnboardingTasks = await prisma.onboardingTask.findMany({
    orderBy: { createdAt: "asc" },
  });

  const seenOnboarding = new Set<string>();
  const onboardingIdsToDelete: string[] = [];

  for (const task of allOnboardingTasks) {
    const key = `${task.employeeId}:${task.title.toLowerCase().trim()}`;
    if (seenOnboarding.has(key)) {
      onboardingIdsToDelete.push(task.id);
    } else {
      seenOnboarding.add(key);
    }
  }

  if (onboardingIdsToDelete.length > 0) {
    const res = await prisma.onboardingTask.deleteMany({
      where: { id: { in: onboardingIdsToDelete } },
    });
    console.log(`Deleted ${res.count} duplicate OnboardingTasks.`);
  } else {
    console.log("No duplicate OnboardingTasks found.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
