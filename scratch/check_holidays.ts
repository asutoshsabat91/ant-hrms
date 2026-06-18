import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const holidays = await prisma.holiday.findMany({
    orderBy: { date: "asc" }
  });
  console.log("Holidays in DB:", holidays);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
