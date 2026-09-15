import { PrismaClient } from "@prisma/client";
import { getDynamicBalances } from "../lib/leave";

const prisma = new PrismaClient();

async function main() {
  const natasha = await prisma.employee.findFirst({
    where: { firstName: { contains: "Natasha", mode: "insensitive" } }
  });
  if (!natasha) {
    console.log("Natasha not found");
    return;
  }
  console.log("Natasha Sabat / Karim:", natasha.firstName, natasha.lastName, "Type:", natasha.employmentType);
  const balances = await getDynamicBalances(natasha.id, natasha.employmentType, 2026);
  console.log("Balances for 2026:", JSON.stringify(balances, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
