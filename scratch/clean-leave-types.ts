import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const codesToKeep = [
    "PAID_QUARTER",
    "LOP",
    "ACADEMIC",
    "PL",
    "SL",
    "CL",
    "FLOATER",
    "COMP_OFF",
    "OPTIONAL_HOLIDAY",
    "WFH"
  ];

  console.log("Cleaning up obsolete leave types...");

  // Find leave types to delete
  const allTypes = await prisma.leaveType.findMany();
  const obsoleteTypes = allTypes.filter(t => !codesToKeep.includes(t.code));

  for (const lt of obsoleteTypes) {
    console.log(`Deleting obsolete leave type: ${lt.name} (${lt.code})`);

    // Delete related balances first
    await prisma.leaveBalance.deleteMany({
      where: { leaveTypeId: lt.id }
    });

    // Delete related requests
    await prisma.leaveRequest.deleteMany({
      where: { leaveTypeId: lt.id }
    });

    // Delete the type itself
    await prisma.leaveType.delete({
      where: { id: lt.id }
    });
  }

  console.log("Obsolete leave types cleaned up successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
