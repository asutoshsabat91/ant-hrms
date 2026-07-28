import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    // Demote asutosh
    await prisma.user.updateMany({
      where: { email: 'asutosh.sabat@theantbox.com' },
      data: { role: 'EMPLOYEE' }
    });
    console.log('Demoted Asutosh to EMPLOYEE');

    // Promote rohit
    await prisma.user.updateMany({
      where: { email: 'rohit@theantbox.com' },
      data: { role: 'ADMIN' }
    });
    console.log('Promoted Rohit to ADMIN');
  } catch (err) {
    console.error('Error updating DB:', err);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
