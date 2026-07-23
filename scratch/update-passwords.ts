import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const newPassword = "AntBox@2025";
  const hashedPassword = await bcrypt.hash(newPassword, 12);
  
  console.log("Updating all user passwords...");
  
  const result = await prisma.user.updateMany({
    data: {
      passwordHash: hashedPassword
    }
  });

  console.log(`Successfully updated ${result.count} users' passwords to ${newPassword}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
