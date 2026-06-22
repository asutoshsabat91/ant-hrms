import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { contains: "asutoshsabat91@gmail.com", mode: "insensitive" } }
  });
  console.log("Users with email:", users);

  const employees = await prisma.employee.findMany({
    where: {
      OR: [
        { email: { contains: "asutoshsabat91@gmail.com", mode: "insensitive" } },
        { personalEmail: { contains: "asutoshsabat91@gmail.com", mode: "insensitive" } }
      ]
    }
  });
  console.log("Employees with email:", employees);
}

main().catch(console.error).finally(() => prisma.$disconnect());
