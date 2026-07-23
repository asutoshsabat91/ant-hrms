import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const emailToDelete = "asutosham.sabat@theantbox.com";
  
  const emp = await prisma.employee.findFirst({
    where: { email: emailToDelete },
    include: { user: true }
  });

  if (emp) {
    console.log(`Deleting employee: ${emp.firstName} ${emp.lastName} (${emp.email})...`);
    
    // Delete employee record
    await prisma.employee.delete({ where: { id: emp.id } });
    
    // Delete associated user record
    if (emp.userId) {
      await prisma.user.delete({ where: { id: emp.userId } });
    }
    console.log(`Successfully deleted ${emp.firstName} ${emp.lastName}`);
  } else {
    console.log(`Could not find ${emailToDelete}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
