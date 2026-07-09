import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.updateMany({
    where: {
      email: {
        in: ["chandrita@theantbox.com", "ritesh@theantbox.com"]
      }
    },
    data: {
      role: "ADMIN"
    }
  });
  console.log("Successfully updated chandrita@theantbox.com and ritesh@theantbox.com to ADMIN role in database.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
