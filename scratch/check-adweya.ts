import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const employee = await prisma.employee.findFirst({
    where: {
      OR: [
        { firstName: { contains: "Adweya", mode: "insensitive" } },
        { email: { contains: "adweya", mode: "insensitive" } }
      ]
    },
    include: {
      user: true
    }
  });

  console.log("Employee details:", JSON.stringify(employee, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
