import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Looking for Ashuytosham and Riya Sabat...");
  
  const employees = await prisma.employee.findMany({
    where: {
      OR: [
        { firstName: { contains: "Ashuytosham", mode: "insensitive" } },
        { firstName: { contains: "Riya", mode: "insensitive" } }
      ]
    },
    include: { user: true }
  });

  if (employees.length === 0) {
    console.log("No employees found matching those names.");
    return;
  }

  for (const emp of employees) {
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    if (fullName.includes("ashuytosham") || fullName.includes("riya sabat")) {
      console.log(`Deleting employee: ${emp.firstName} ${emp.lastName} (${emp.email})...`);
      
      // Delete employee record
      await prisma.employee.delete({ where: { id: emp.id } });
      
      // Delete associated user record
      if (emp.userId) {
        await prisma.user.delete({ where: { id: emp.userId } });
      }
      console.log(`Successfully deleted ${emp.firstName} ${emp.lastName}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
