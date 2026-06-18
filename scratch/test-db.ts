import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const leaveTypes = await prisma.leaveType.findMany();
  console.log("Leave Types in DB:", leaveTypes.length);
  for (const lt of leaveTypes) {
    console.log(`- ${lt.name} (${lt.code})`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
