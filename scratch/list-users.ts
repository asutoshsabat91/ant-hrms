import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany();
  for (const emp of employees) {
    console.log(`- ${emp.firstName} ${emp.lastName} (${emp.email})`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
