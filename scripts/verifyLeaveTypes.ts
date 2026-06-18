import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const leaveTypes = await prisma.leaveType.findMany();
  console.log('Leave Types:', leaveTypes.map(t => t.code));
}
main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
