import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Setting Asutosh Sabat Work Mode to REMOTE ===");

  const updated = await prisma.employee.updateMany({
    where: {
      OR: [
        { employeeId: "ANT-181" },
        { email: "asutosh.sabat@theantbox.com" },
        { email: "asutoshsabat91@gmail.com" }
      ]
    },
    data: {
      workMode: "REMOTE"
    }
  });

  console.log(`Updated ${updated.count} record for Asutosh Sabat to REMOTE.`);

  const { exportDbToGoogleSheetsOnly } = await import("../lib/googleSheets");
  console.log("Syncing database to Google Sheets...");
  await exportDbToGoogleSheetsOnly();
  console.log("Sync completed successfully!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
