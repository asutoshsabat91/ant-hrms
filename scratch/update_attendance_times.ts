import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Fast Raw SQL Backfill for Attendance Records ===");
  const count = await prisma.$executeRaw`
    UPDATE "AttendanceRecord"
    SET 
      "checkIn" = COALESCE("checkIn", ("workDate" + INTERVAL '4 hours')),
      "checkOut" = COALESCE("checkOut", ("workDate" + INTERVAL '13 hours')),
      "totalHours" = CASE WHEN ("totalHours" IS NULL OR "totalHours" = 0) THEN 9.0 ELSE "totalHours" END
    WHERE "status" = 'PRESENT' AND ("checkIn" IS NULL OR "checkOut" IS NULL OR "totalHours" IS NULL OR "totalHours" = 0);
  `;
  console.log(`Updated ${count} attendance records instantly in PostgreSQL.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
