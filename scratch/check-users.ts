import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_yPYF5RxUlp9d@ep-muddy-haze-athkvly7-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
    }
  }
});

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
      isActive: true,
      passwordHash: true,
    }
  });
  console.log("Users in Neon:", JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
