import { PrismaClient } from "@prisma/client";
import { exportDbToGoogleSheetsOnly } from "../lib/googleSheets";

const prisma = new PrismaClient();

const TARGET_EMAILS = [
  "sukhman@theantbox.com",
  "adweya.padhi@theantbox.com",
  "admin@theantbox.com"
];

async function main() {
  console.log("=== Purging target employees from DB ===");
  const emps = await prisma.employee.findMany({
    where: {
      OR: [
        { email: { in: TARGET_EMAILS } },
        { employeeId: { in: ["ANT-ADMIN", "ANT-QAPITA-ADMIN", "ANT-250140"] } }
      ]
    },
    select: { id: true, email: true, employeeId: true, userId: true, firstName: true, lastName: true }
  });

  console.log(`Found ${emps.length} records to remove:`, emps);

  for (const emp of emps) {
    console.log(`Deleting ${emp.firstName} ${emp.lastName} (${emp.email} / ${emp.employeeId})...`);
    await prisma.employee.updateMany({ where: { managerId: emp.id }, data: { managerId: null } });
    await prisma.attendanceRecord.deleteMany({ where: { employeeId: emp.id } }).catch(() => {});
    await prisma.attendancePunch.deleteMany({ where: { employeeId: emp.id } }).catch(() => {});
    await prisma.leaveRequest.deleteMany({ where: { employeeId: emp.id } }).catch(() => {});
    await prisma.leaveBalance.deleteMany({ where: { employeeId: emp.id } }).catch(() => {});
    await prisma.payrollLine.deleteMany({ where: { employeeId: emp.id } }).catch(() => {});
    await prisma.reimbursement.deleteMany({ where: { employeeId: emp.id } }).catch(() => {});
    await prisma.separation.deleteMany({ where: { employeeId: emp.id } }).catch(() => {});
    await prisma.hRDocument.deleteMany({ where: { employeeId: emp.id } }).catch(() => {});
    await prisma.onboardingTask.deleteMany({ where: { employeeId: emp.id } }).catch(() => {});
    await prisma.regularizationRequest.deleteMany({ where: { employeeId: emp.id } }).catch(() => {});
    await prisma.documentRequest.deleteMany({ where: { employeeId: emp.id } }).catch(() => {});
    
    await prisma.employee.delete({ where: { id: emp.id } });
    if (emp.userId) {
      await prisma.user.delete({ where: { id: emp.userId } }).catch(() => {});
    }
  }

  console.log("DB Purge complete. Refreshing Google Sheet state...");
  await exportDbToGoogleSheetsOnly();
  console.log("Google Sheet overwritten with clean DB state.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
