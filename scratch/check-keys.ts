import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
console.log("Prisma keys:", Object.keys(prisma).filter(k => !k.startsWith("_") && typeof (prisma as any)[k] === "object"));
prisma.$disconnect();
