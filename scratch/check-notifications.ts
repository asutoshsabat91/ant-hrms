import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  console.log("Recent notifications:", JSON.stringify(notifications, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
