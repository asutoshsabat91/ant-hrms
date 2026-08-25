import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Reverting fabricated Check In / Check Out timestamps in DB ===");

  const count = await prisma.$executeRaw`
    UPDATE "AttendanceRecord"
    SET 
      "checkIn" = NULL,
      "checkOut" = NULL,
      "totalHours" = 0
    WHERE 
      ("checkIn" = '2026-08-11 04:00:00+00' OR "checkIn" = '2026-08-13 04:00:00+00' OR "checkIn"::text LIKE '%04:00:00%')
      AND NOT EXISTS (
        SELECT 1 FROM "AttendancePunch" p WHERE p."attendanceId" = "AttendanceRecord".id
      );
  `;

  console.log(`Successfully reverted ${count} records to null checkIn/checkOut in DB.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
