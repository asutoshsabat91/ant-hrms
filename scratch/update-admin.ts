import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.update({
      where: { email: 'admin@theantbox.com' },
      data: { email: 'hive@theantbox.com' }
    });
    console.log('Updated user email:', user.email);

    const emp = await prisma.employee.updateMany({
      where: { email: 'admin@theantbox.com' },
      data: { email: 'hive@theantbox.com' }
    });
    console.log('Updated employee records:', emp.count);
  } catch (err) {
    console.error('Error updating DB:', err);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
