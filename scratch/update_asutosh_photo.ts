import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Setting professional avatar photo for Asutosh Sabat ===");

  // High quality professional avatar URL
  const avatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400";

  const updated = await prisma.employee.updateMany({
    where: {
      OR: [
        { employeeId: "ANT-181" },
        { email: "asutosh.sabat@theantbox.com" }
      ]
    },
    data: {
      profilePhoto: avatarUrl
    }
  });

  console.log(`Updated ${updated.count} record for Asutosh Sabat with profile photo.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
