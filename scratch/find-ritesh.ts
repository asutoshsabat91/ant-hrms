import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const ritesh = await prisma.user.findFirst({
    where: {
      email: { contains: "ritesh", mode: "insensitive" }
    },
    include: { employee: true }
  });
  console.log("Ritesh User Account:", JSON.stringify(ritesh, null, 2));

  const admins = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "COMPANY_ADMIN"] }
    },
    include: { employee: true }
  });
  console.log("Admins Count:", admins.length);
  admins.forEach(a => {
    console.log(`- Email: ${a.email}, Role: ${a.role}, DeployedCompany: ${a.employee?.deployedCompany}, ManagedCompany: ${a.employee?.managedCompany}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
