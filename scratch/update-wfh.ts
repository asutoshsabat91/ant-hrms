import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const wfh = await prisma.leaveType.findUnique({
    where: { code: "WFH" },
  });
  if (wfh) {
    await prisma.leaveType.update({
      where: { code: "WFH" },
      data: {
        applicableTo: {
          set: ["FULL_TIME", "INTERN", "PART_TIME", "CONTRACT"],
        },
        daysPerYear: 0,
      },
    });
    console.log("Updated WFH leave type in database.");
  } else {
    await prisma.leaveType.create({
      data: {
        name: "Work From Home",
        code: "WFH",
        daysPerYear: 0,
        carryoverLimit: 0,
        isPaid: true,
        applicableTo: ["FULL_TIME", "INTERN", "PART_TIME", "CONTRACT"],
      },
    });
    console.log("Created WFH leave type in database.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
